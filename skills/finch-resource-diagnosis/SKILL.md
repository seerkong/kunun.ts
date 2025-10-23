---
name: finch-resource-diagnosis
description: 当"运行某段代码就让机器卡死/无响应/死机"时，用 Finch 容器在硬性内存+CPU 上限下逐条试探，安全地定位是哪段代码 / 哪个输入造成 CPU 无限循环或内存暴涨。适用于解释器、parser、求值器、动态 workflow 等任何会 runaway 的本地代码。
---

# Finch 资源占用问题定位技能（CPU 无限循环 / 内存暴涨）

## 何时用
- 现象：**一运行就整机无响应 / 卡死 / 死机**（不是单个报错），怀疑某段代码 runaway。
- 典型成因：**无限循环吃满 CPU** 或 **无界分配吃爆内存 → swap 抖动 → 整机失去响应**。
- 适用对象：kunun 解释器 / parser / 求值器 / 动态 workflow，或任何会失控的本地脚本/测试。

## 核心原则（不可违背）
**绝不在无界的宿主进程里跑可疑代码。** 每次试探都放进**带硬上限的容器**：runaway 被容器的 OOM/超时杀掉，**宿主毫发无伤**。一次只试一条输入，根据"被怎么杀的"定位。

> 为什么用容器而非 `ulimit`：macOS 上 `ulimit -v`（地址空间）基本不生效，挡不住内存暴涨；`ulimit -t`（CPU 秒）虽有效但只挡 CPU、不挡内存。Finch 容器的 `--memory` 是 OS 强制的硬上限，且 `--memory-swap == --memory` 可**禁用 swap**——内存型 runaway 在容器内被 OOM-kill，**不会触碰宿主的内存/swap**，所以机器不卡。

## 前置：Finch 环境
```bash
finch version            # 确认安装
finch vm status          # 需要 Running；若 Stopped：
finch vm start           # 启动 Lima VM（首次较慢，会拉取 VM 镜像）
```
- 容器镜像选**与本机匹配的运行时**，如 `oven/bun:1.3.6`（bun 版本对齐宿主，避免 node_modules/ABI 不一致）。
- **依赖挂载**：把整个 repo 挂进容器（`-v <repo>:/w -w /w`）。若有**仓库外**的本地依赖（symlink / file: 指向外部路径），需把那个外部路径**按同样的绝对路径**也挂进去，symlink 才能在容器里解析。本仓的 depa-actor 是**仓库内**的 vendored tarball（`vendor/*.tgz`），无需额外挂载。

## 定位流程（最小爆炸半径优先）

### 第 0 步 · 零执行静态审查（先做，无任何风险）
读最近改动的 diff，找**不收敛的循环**：
```bash
git diff -- <suspect-file> | grep -E '^\+' | grep -nE 'while|for ?\(|recursion|\.Next|index|\+\+'
```
逐个核对每个新 `while`/递归：**是否每条路径都让游标前进 / 让条件趋向终止**。常见 bug：某分支 `continue` 却没 `index++`；递归对同一输入无 base case；depth 计数漏某种括号。**一眼能看出来就不必跑。**

### 第 1 步 · 容器连通性验证（无害输入）
先用**绝对安全的输入**确认整条封顶管道可用（VM 起、镜像在、repo 挂上、依赖能解析、上限生效），再碰危险输入：
```bash
echo 'import {KnConverter} from "kunun-converter/KnConverter"; console.log(JSON.stringify(KnConverter.Kon.Parser.Parse("1")))' \
  | skills/finch-resource-diagnosis/scripts/capped-probe.sh
```
期望 `[RESULT] OK (exit 0)`。

### 第 2 步 · 分层封顶试探（parse → eval → typed → workflow）
对每个可疑输入，**从最小层开始**（解析风险 < 求值 < 工作流）：
1. 只解析：`KnConverter.Kon.Parser.Parse(SRC)`
2. 求值：`RuntimeInterpreter.ExecSync(...)` / `EvalBlockSourceSync(SRC)`
3. 类型化：`EvaluateTypedBlockSync(SRC)`（需 `import "kunun"`）
4. 工作流：`kwf dry-run`
每条都经 `capped-probe.sh` 跑。哪一层 / 哪条输入被 cap 杀掉，就锁定到那。

### 第 3 步 · 输入二分 & 测试文件二分
- 输入二分：把可疑输入逐个、单独地封顶跑（不要一次跑一堆）。
- 测试文件二分：**绝不跑全量测试**。逐个 `bun test <one-file>` 封顶跑，找出 hang/OOM 的那个文件，再缩到具体用例。

### 第 4 步 · 基线对照（是不是"我刚改的"引入的）
```bash
git stash            # 暂存工作树改动
# 在干净 HEAD 上封顶跑同一可疑输入
git stash pop        # 恢复
```
干净 HEAD 安全、工作树 runaway → 是未提交改动引入的，二分这些改动。

## 读懂结果（capped-probe.sh 退出码）
| 退出码 | 含义 | 结论 |
|---|---|---|
| `0` | 容器内正常跑完 | 此输入**无** runaway |
| `137` | OOM / SIGKILL | **内存型** runaway 在此（或墙钟 SIGKILL） |
| `124` | 墙钟超时 | **CPU 无限循环**在此 |
| 其它 | 代码正常抛错 | **不是** runaway（快速抛错而已） |

## 明令禁止（定位清楚前）
- ❌ 不在宿主无界跑可疑代码（`bun -e`、`bun test` 全量、起一堆并发 agent/workflow）。
- ❌ 不一次试探多条输入。
- ✅ 只用 `capped-probe.sh`，单条、封顶、读退出码。

## 关键脚本
- `scripts/capped-probe.sh`：从 stdin 读探针源码，写入 `<repo>/.tmp/`，在 `finch run --memory --memory-swap(=禁swap) --cpus --pids-limit` + 容器内 `timeout -s KILL` 下执行，按退出码判定 runaway 类型。
- `scripts/capped-codex-workflow.sh`：在**封顶容器内跑真实 dynamic workflow 并调用本机 codex**（详见下节）。把 kunun 解释器/调度的 runaway 隔离在容器内，同时让 ai_agent 步骤真实调 LLM。

## 封顶跑真实 dynamic workflow（调外部 agent CLI，如 codex）
目标：既要**真实**验证 dynamic workflow（kunun → spawn codex → 调 LLM → 回填），又要防 kunun 的 bug 把宿主 CPU/内存搞爆。把整个 kunun workflow-host（bun）连同它 `spawn` 的 codex 子进程一起放进封顶容器即可。

**隔离边界**：`--cpus`/`--memory`(+`--memory-swap` 禁 swap)/`--pids-limit` 挡住 kunun 的死循环/无界分配/fork 爆炸（死机来源）；**不挡**网络外联与 codex 的 token 花费/API 限流——靠 `maxAgents`/`timeout`/最小输入控制（codex 是网络 IO，不爆 CPU/内存）。

**容器内调到 codex 的 4 个坑（实测，已被脚本解决）**：
1. **跨平台二进制**：`@openai/codex` 是 Rust 二进制，npm 包 `vendor/` 自带各平台版本。**直接挂载本机包**、按容器 arch 选 `*-unknown-linux-musl` 那份即可，无需容器内装 node/codex。（macOS 的二进制不能进 Linux 容器，但包里就有 Linux 版。）
2. **认证**：`~/.codex` 只读挂载，`auth.json` 复制进容器内可写 `CODEX_HOME`（本机 `.codex` 不被写）。**`auth.json` 即足够认证**；`~/.codex/auth-keys/` 是用户备份的各 provider auth.json，**不要复制进容器**。若遇 `403`（额度/`Invalid token` 类），多半是网关**瞬时状态**（限流/余额波动）——重试或换有余额的网关，别误归因为"缺认证文件"。
3. **自定义网关**：复制本机 `config.toml`（`model`/`model_provider`/`base_url`），但**剥离 `[mcp_servers]` 段**（容器内 `npx` 起不来会卡 `startup_timeout`，最久几分钟）和 **`notify` 行**（指向本机 `.app`）。
4. **TLS / CA 证书**：`oven/bun`(debian-slim)**无 CA 证书** → codex(reqwest, 用系统 CA)TLS 验证失败，表现为「TCP 连上 443 但 `error sending request`」。容器内 `apt-get install -y ca-certificates` 修复。（bun 用内置 CA，所以 `bun fetch` 能通而 codex 不通——这是关键误导点。）

**网络排查顺序**（codex 报 network error 时，逐层定位，全用 `bun fetch`/`getent` 零成本）：连通(example.com 200?) → DNS(`getent hosts`) → 目标网关(`/v1/models` 给 401=连通) → **CA 证书在不在**（`ls /etc/ssl/certs/ca-certificates.crt`）→ reqwest debug(`-e RUST_LOG=debug` 看是 `connected` 后失败=TLS，还是 connect 失败=网络)。IPv6 一般不是问题（reqwest 自己选 IPv4）。

**最小验证两步（先零成本，再花钱）**：
1. `codex --version`（`--network none`，零成本）确认 Linux 二进制能在容器跑。
2. 单个 `(ai_agent …)` 最小用例（挂认证+网络+CA），确认认证/网关/TLS/LLM 全通——**这步真实花 token**，用最短 prompt、`maxAgents=1`、小 `timeout`。

## 修复后
定位到具体输入 + 代码路径后：写一个**会触发 runaway 的失败测试**（在 cap 下跑，确认它现在被杀），修复使其在 cap 内正常完成，再封顶复跑确认 `OK`。修复要么让循环收敛、要么对病态输入**给明确诊断/有界拒绝**。

## 高频 runaway 模式（经验）
- **不前进的 `while` 循环**：`while (cond) { arr.push(parseSomething()) }`，若 `parseSomething()` 某些输入下**不消费 token / 不推进游标**，则条件恒真、`arr` 无界增长 → **内存型 OOM（退出 137，不是 CPU 超时 124）**。这是最阴险的一类——它"看起来在干活"，实则在原地疯狂分配。**通用护栏**：循环里记录进入前的游标位置，若一轮后没前进就 `break`/抛诊断。
- **双义符号被误派生**：同一 token 既是运算符又是括号（如 `<` 既是"小于"又是泛型 `<...>` 开括号）。解析器无条件按"开括号"走，遇到没有对应闭括号的运算符用法时不收敛。
- **区分 137 vs 124**：`137`=内存（无界分配/OOM）；`124`=纯 CPU 死循环（不分配）。两者修法不同。

## 实战案例（本仓 · 已用本技能定位）
- **现象**：跑含 `<` 的 kon 代码 → 整机死机。
- **零执行静态审查**：先排除了本次会话所有新增 `while`（D6 `$`宏切分、D4 variadic、D9 串嵌套——都收敛），把怀疑导向既有代码。
- **封顶探针（parse 层，4 条逐一）**：`$<…>`/`$()` → OK；**`(:< 1 2)` 与 `(1 2 :<)` → KILLED 137（parse 阶段内存暴涨）**。一次锁定到 `<`，且确认是**解析阶段**、**内存型**。
- **静态定位**：`packages/converter/lib/KnParserV1.ts` `ParseGenericArgs`（~L581-590）——`<` 后无条件解析泛型参数（L548），其 `while (!End && Current!==BiggerThan) args.push(ParseValue(...))` 在 `ParseValue` 不推进时无界 `push` → OOM。
- **教训**：深读当初记的"`<` 无限循环"实为"parse 阶段无界分配 OOM"；封顶探针把模糊描述精确化，且**全程宿主零风险**（容器 512MB OOM-kill）。
