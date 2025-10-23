# 04 · 用 kwf 运行：CLI、MCP、validate/dry-run 与 agent 向导

本章讲“怎么跑”而不是“怎么写”。工作流的 Kon DSL 语法（`ai_workflow` / `ai_phase` / `ai_agent` / `ai_parallel` / `ai_pipeline` / `ai_log`、prompt 插值、`#name` 陷阱等）见前面的章节；这里聚焦把一个 `.kon` 工作流交给宿主运行时 `kwf` 的全部手段：CLI 子命令、退出码、`validate`/`dry-run` 的语义、MCP server 暴露的 `kwf_*` 工具、host 配置与 adapter，以及 `kwf agent` 四阶段向导。

> 语法约定：工作流源码用 Kon（`()` = knot，`[]` = vector，`{}` = map；容器元素之间只用空白分隔，逗号不是分隔符）。命令行示例用真实可跑的形式。凡不调用模型的命令（`validate` / `dry-run` / `examples` / `skill`）下方给出的输出都是实际跑出来的。

## 1. 入口与调用方式

`kwf` 是 `packages/workflow-host` 的命令行入口。两种等价的启动方式：

```bash
# 开发模式：直接用 bun 跑入口脚本
bun packages/workflow-host/bin/kwf.ts <command> [...args]

# 编译后的单文件可执行（bun run build:bin 产出 dist-bin/kwf）
kwf <command> [...args]
```

编译版把 prompt 资产、bundled examples 和 skill 文档都嵌进 bunfs，因此在没有仓库、没有 bun 的机器上 `kwf examples export` / `kwf skill` / `kwf mcp stdio` 依旧可用（`README.md:134-137`）。本章示例统一写成 `bun packages/workflow-host/bin/kwf.ts ...`，编译版把它替换成 `kwf ...` 即可。

参数解析规则（`packages/workflow-host/lib/cli.ts:15-34`）：`--flag value` 形式，若 `--flag` 后面紧跟另一个 `--` 开头的 token 或到达末尾，则该 flag 取布尔 `true`。非 `--` 开头的 token 按顺序进入 positional 列表。注意：**flag 的值不能以 `--` 开头**（会被当作下一个 flag），且 `--args` 这种带空格的 JSON 必须整体加引号。

用 `/dev/stdin` 可以把工作流源码直接喂给 `validate` / `dry-run` / `run`，便于在文档里贴可跑的最小例子：

```bash
bun packages/workflow-host/bin/kwf.ts validate /dev/stdin <<'KON'
(ai_workflow #greet :input = {topic = "caching"} :output = [draft]
  :[ (ai_phase #Draft :[
       (var draft (ai_agent #draftDoc :{
         sys_prompt = "You write."
         user_prompt = "Write about \(topic)." })) ]) ])
KON
```

## 2. 退出码（所有子命令统一）

来源：`packages/workflow-host/lib/cli.ts:96-381`，下面每条都实测过。

| 退出码 | 含义 | 触发场景 |
| --- | --- | --- |
| `0` | 成功 | 命令正常完成；`validate`/`dry-run` 结果 `ok:true`；`run` 在 `--wait` 下 `state==='done'`；无参数裸跑（打印 usage） |
| `1` | 业务失败 | `validate`/`dry-run` 结果 `ok:false`（解析错误、`max-yields` 超限等）；`run --wait` 的 `state==='failed'`；未知子命令；`examples`/`mcp` 用法不全 |
| `2` | 参数错误 | `validate`/`dry-run` 缺少文件参数、`--args` 不是合法 JSON、`--max-yields` 不是正数；`agent` 缺少 requirement |

陷阱：**`validate` 在“缺文件”时返回 `2`，但在“解析失败”时返回 `1`。** 二者都打印信息，但语义不同——`2` 是“你调用错了”，`1` 是“工作流有问题”。脚本里要区分对待。

实测：

```
$ kwf validate /dev/stdin --args 'not json' <<< '(ai_workflow #t :input={a=1} :output=[a] :[ ])'
error: --args must be valid JSON          # exit 2
$ kwf validate /dev/stdin <<< '(ai_workflow #t :input={a=1'
status: error (failed)                    # diagnostic: End of stream, exit 1
```

## 3. 子命令总览

`USAGE` 全文见 `packages/workflow-host/lib/cli.ts:36-56`。

```
kwf <command>

  agent "<requirement>" [--output-dir <dir>]
  run <file.kon> [--args <json>] [--wait] [--name <workflow>] [--config <path>] [--runs-root <dir>]
  validate <file.kon> [--args <json>] [--json] [--show-prompts]
  dry-run <file.kon> [--args <json>] [--max-yields <n>] [--json] [--show-prompts]
  status <runId>
  logs <runId>
  result <runId>
  pause <runId>
  resume <runId> [--wait]
  stop <runId>
  list
  examples [list|show <name>|export <dir>]
  skill
  mcp stdio
```

还有一个内部子命令 `__worker <runId>`（`cli.ts:174-178`），由宿主在后台 detached 运行时自行 fork，**不要手动调用**。

下面逐个展开。

### 3.1 `run` — 真正执行工作流（会调用模型 adapter）

用途：把一个 `.kon` 工作流交给 durable runtime 执行；每个 agent 调用都是一个 checkpoint 边界，可暂停 / 恢复 / 崩溃重放。

精确语法：

```
kwf run <file.kon> [--args <json>] [--wait] [--name <workflow>] [--config <path>] [--runs-root <dir>]
```

参数语义（`cli.ts:105-132`、`backend.ts:126-155`）：

- `<file.kon>`：必填。缺失时打印 usage 并返回 `1`。
- `--args <json>`：合法的 JSON 对象。它会作为一个**独立的全局变量 `args`** 注入运行时（`driver.ts:22` `runtime.defineGlobal('args', ...)`）。**它不会自动覆盖 `:input` 里的字面默认值**——要用 runtime 参数，必须在 `:input` 里显式写 `(args.:key)`（见 §4.3）。
- `--wait`：阻塞直到运行结束。`--wait` 时额外打印 `state:`，`done` 则打印 JSON 结果并返回 `0`，`failed` 则打印 `error:` 并返回 `1`。**不带 `--wait` 时立即返回**：宿主 fork 一个 detached `__worker` 子进程在后台跑（`backend.ts:78-96, 153`），CLI 只打印 `run: <runId>` 并返回 `0`。
- `--name <workflow>`：覆盖派生的工作流名（默认取文件名去扩展名，`backend.ts:136-137`）；这个名字只用于生成 `runId` 的 slug 和事件记录。
- `--config <path>`：host 配置文件路径（见 §7）。
- `--runs-root <dir>`：run 存储目录根（默认 `config.runsRoot`，最终默认 `~/.kwf/runs`，`config.ts:53`、`backend.ts:120`）。

输出：`run: <runId>`。`runId` 形如 `<slug>-<base36时间戳>-<6位hex>`（`store.ts:186-189`），例如 `fan-out-reduce-mqf66dha-494fa7`。

可运行示例（带 `--wait`，需要一个真实可执行的 adapter）：

```bash
bun packages/workflow-host/bin/kwf.ts run examples/fan-out-reduce.kon --wait
```

> 这条会真正调用默认 adapter `claude`。要在不接触真实模型的前提下验证整条链路，用一个 stub adapter（见 §7.4 的可跑例子），或先用 `dry-run`（§5）。

### 3.2 `validate` — 跑到第一个 yield/完成，不调用任何 agent

用途：解析 + 执行到**第一个 yield 边界或完成**，确认工作流能编译、能 lower、第一个 dispatch 的 job 名字和 prompt 都对。绝不 spawn 任何 adapter 子进程（`validation.ts:10-13, 185-213`）。

精确语法：

```
kwf validate <file.kon> [--args <json>] [--json] [--show-prompts]
```

语义：

- 内部调 `RunWorkflowSync(runtime, source)`，跑到 `yielded` 或 `completed`（`validation.ts:192`）。
- 解析/求值抛错 → `{ ok:false, status:'error', diagnostics:[...] }`，退出码 `1`。
- 跑到第一个 yield → `{ ok:true, status:'yielded', firstYield: {...} }`，退出码 `0`。
- 一直跑到完成（没有任何 agent 调用）→ `{ ok:true, status:'completed', resultPreview: <值> }`，退出码 `0`。

`firstYield` 摘要字段（`validation.ts:37-43, 105-139`）：`effect`（扩展名，如 `ai_agent`/`ai_parallel`/`ai_pipeline`）、`fixity`（`prefix`）、`sourceNodeId`、`jobCount`、`jobs[]`。每个 job 含：`id`、`name`、`label`、`adapter`、`model`、`retry`、`timeout`、`hasOutputSchema`、`promptPreview`（默认截断到 160 字符，`validation.ts:15,120-122`），加 `--show-prompts` 时额外含完整 `prompt`。

flag：

- `--json`：输出完整 JSON（否则是人类可读的简表，`cli.ts:67-79`）。
- `--show-prompts`：在 job 摘要里包含完整 prompt 文本（默认只给 160 字符的 `promptPreview`）。
- `--args <json>`：同 `run`，作为全局 `args` 注入。非法 JSON → 退出 `2`。

可运行示例（实测输出附后）：

```bash
bun packages/workflow-host/bin/kwf.ts validate /dev/stdin --json --show-prompts <<'KON'
(ai_workflow #greet
  :input = {topic = "caching"}
  :output = [draft]
  :[
    (ai_phase #Draft
      :[
        (var draft (ai_agent #draftDoc :{
          label = "writer"
          model = "claude-sonnet-4-5"
          retry = 2
          timeout = 600
          sys_prompt = "You write."
          user_prompt = "Write about \(topic)."
        }))
      ])
  ])
KON
```

实测输出（节选）：

```json
{
  "ok": true,
  "status": "yielded",
  "workflowName": "stdin",
  "firstYield": {
    "effect": "ai_agent",
    "fixity": "prefix",
    "sourceNodeId": "prefix:ai_agent:draftDoc@1",
    "jobCount": 1,
    "jobs": [{
      "id": "ai_agent:prefix:ai_agent:draftDoc@1/job:0",
      "name": "draftDoc", "label": "writer", "model": "claude-sonnet-4-5",
      "retry": 2, "timeout": 600, "hasOutputSchema": false,
      "promptPreview": "You write.\n\nWrite about caching.",
      "prompt": "You write.\n\nWrite about caching."
    }]
  }
}
```

**这是验证 `#name` 陷阱最廉价的手段**：连字符 `-` 在 `#name` 里会被解析成减法，把名字截断并静默丢掉 `:{...}` 配置。实测 `(ai_agent #draft-doc :{ sys_prompt="..." user_prompt="..." })` 被 `validate --json` 报告为 `name:"draft"`、`sourceNodeId:"prefix:ai_agent:draft@1"`、**没有 `promptPreview` 字段**——工作流照样 `ok` 并 dispatch，是一次静默错误。改用 camelCase（`#draftDoc`）或下划线（`#draft_doc`）。每写完一个工作流，跑一次 `validate --json` 确认每个 job 都有预期的 `name` 和 `promptPreview`。

### 3.3 `dry-run` — 模拟整条流程，注入 schema 形状的 mock 结果

用途：反复 yield/resume 跑完**整条**工作流，每个 yield 注入一个按 `output_schema` 生成的 mock 结果让流程继续。同样**绝不调用任何 agent**（`validation.ts:215-263`）。`validate` 只看第一跳，`dry-run` 看全程的管道连通性、prompt 插值、stage 串联。

精确语法：

```
kwf dry-run <file.kon> [--args <json>] [--max-yields <n>] [--json] [--show-prompts]
```

语义（`validation.ts:215-263`）：

- 从 `RunWorkflowSync` 起，每遇到一个 yield 就 `summarizeEffect` 记录到 `yields[]`，给每个 pending job 生成 mock 结果（`mockJobResult`），再 `ResumeWorkflowSync` 注入继续，直到 `completed`。
- mock 由 `output_schema` 决定形状（`mockValueFromSchema`，`validation.ts:144-177`）：`object` 递归造各字段、`array` 造 `max(1, minItems)` 个元素、`number`/`integer` → `0`、`boolean` → `false`、`string`/无 schema/未知类型 → 字符串 `"dry-run:<jobLabel>"`、有 `enum` 取第一个。
- 结果：`{ ok:true, status:'completed', yields:[...], resultPreview: <最终值> }`，退出码 `0`。
- 超过 `--max-yields`（默认 64，`validation.ts:16,218`）→ `{ ok:false, status:'max-yields', diagnostics:[...] }`，退出码 `1`。
- 中途 resume 抛错 → `{ ok:false, status:'failed', diagnostics:[...] }`，退出码 `1`。
- 解析阶段就抛错 → `{ ok:false, status:'error' }`，退出码 `1`。

flag：

- `--max-yields <n>`：上限 yield 次数。**必须是正数**，否则退出 `2`（`cli.ts:158-165`）。
- `--json` / `--show-prompts` / `--args`：同 `validate`。

可运行示例（顺序两步 — 两次 yield）：

```bash
bun packages/workflow-host/bin/kwf.ts dry-run /dev/stdin <<'KON'
(ai_workflow #pipeline2
  :input = {topic = "caching"}
  :output = [outline draft]
  :[
    (ai_phase #Plan
      :[
        (var outline (ai_agent #planOutline :{
          sys_prompt = "Plan."
          user_prompt = "Outline for \(topic)." }))
        (var draft (ai_agent #writeDraft :{
          sys_prompt = "Write."
          user_prompt = "Expand the outline into prose." }))
      ])
  ])
KON
```

实测输出：

```
workflow: stdin
status: completed (ok)
yields: 2
  yield: ai_agent (1 job)
    - planOutline: Plan.

Outline for caching.
  yield: ai_agent (1 job)
    - writeDraft: Write.

Expand the outline into prose.
result: ["dry-run:planOutline","dry-run:writeDraft"]
```

第二个可运行示例（`ai_parallel` 扇出 + `output_schema`，看 mock 如何形成结构化结果）：

```bash
bun packages/workflow-host/bin/kwf.ts dry-run /dev/stdin --json <<'KON'
(ai_workflow #fan
  :input = {question = "x"}
  :output = [drafts]
  :[
    (ai_phase #Draft
      :[
        (var approaches ["LRU" "cost-aware" "adaptive"])
        (var drafts (ai_parallel #draftApproaches :{ input = approaches item = approach index = i } :[
          (ai_agent #draftOne :{
            label = "draft-\(i)"
            sys_prompt = "You write."
            user_prompt = "Angle \(approach) for \(question)."
            output_schema = { type = "object" properties = { text = {type="string"} } required = ["text"] }
          })
        ]))
      ])
  ])
KON
```

实测：1 次 yield、`effect:"ai_parallel"`、3 个 job（`item:0/1/2`，`label` 分别 `draft-0/1/2`），`resultPreview` 为 `[[{"text":"dry-run:draftOne.text"},{...},{...}]]`。

**dry-run 的关键限制**（findings 已验证）：扇出宽度和循环次数来自 schema mock，不是真实数据。`ai_parallel` 对一个 mock 出来的数组扇出，宽度由 `output_schema` 的 `minItems`（默认 1）决定，不是真实的 N；`number` 类型 mock 成 `0`，所以由计数 / 条件驱动的循环会提前 `(:break)`（如 `loop-until-dry.kon` 在 dry-run 下只 yield 一次）。`dry-run` 验证的是“管道接得通、prompt 插值对”，不是真实的分支宽度。

### 3.4 `status` / `logs` / `result` — 观测一个 run

这三个都接 `<runId>`，从 run 目录的文件里读（无守护进程，CLI 只读、worker 只写，`store.ts:30-31`）。

- `kwf status <runId>`：打印 `status.json`（`cli.ts:179-182`）。字段（`store.ts:15-22`）：`state`（`created`|`running`|`paused`|`stopped`|`done`|`failed`）、`yields`、`dispatched`、`pid`、`updatedAt`。退出 `0`。
- `kwf logs <runId>`：逐行打印 `events.jsonl`（`cli.ts:183-188`）。事件类型（`driver.ts`）：`run_started`、`run_resumed`、`agent_started`、`agent_finished`、`agent_failed`、`run_paused`、`run_stopped`、`run_finished`、`run_failed`，外加 agent 内部事件（如 `option_unmapped`、schema 重试）。退出 `0`。
- `kwf result <runId>`：打印 `result.json`（`cli.ts:189-192`）。退出 `0`。

实测（用 stub adapter 跑完一个单 agent 工作流后）：

```
$ kwf status fan-out-...
{ "state": "done", "yields": 1, "dispatched": 1, "updatedAt": "..." }

$ kwf logs <runId>
{"ts":"...","type":"run_started","runId":"..."}
{"ts":"...","type":"agent_started","jobId":"ai_agent:prefix:ai_agent:draftDoc@1/job:0","label":"draftDoc"}
{"ts":"...","type":"agent_finished","jobId":"...","label":"draftDoc"}
{"ts":"...","type":"run_finished","runId":"..."}

$ kwf result <runId>
[ "stub reply" ]
```

### 3.5 `pause` / `stop` / `resume` — 控制一个 run

控制信号写到 run 目录的 `control.json`，在**下一个 yield 边界**被检查（`driver.ts:64-75`）。

- `kwf pause <runId>`：请求在下一个 yield 暂停，checkpoint 留在磁盘。打印 `pause requested: <runId>`，退出 `0`（`cli.ts:193-197`）。
- `kwf stop <runId>`：请求在下一个 yield 停止。打印 `stop requested: <runId>`，退出 `0`（`cli.ts:198-202`）。
- `kwf resume <runId> [--wait]`：清掉 control 文件后从 `checkpoint.json` 继续（`backend.ts:178-186`）。不带 `--wait` → fork detached worker，打印 `resume requested: <runId>`，退出 `0`。带 `--wait` → 阻塞，打印 `state: <state>`，`failed` 返回 `1` 否则 `0`（`cli.ts:203-212`）。

关键语义（`driver.ts:30-116`）：executeRun 在**dispatch 之前**就把 `checkpoint.json` 落盘，并且只 dispatch 那些 `jobs/` 里还没有结果的 job——所以已经完成的 agent 工作在 resume 时**不会重做**。崩溃 / 暂停 / 停止后 `kwf resume` 都能从 `checkpoint.json` + 已落盘的 job 结果原地续跑。

`pause`/`stop` 只在 yield 边界生效；正在跑的 agent 子进程不会被中途杀掉，要等它返回、到下一个 yield 才会观察到信号。对一个已 `done` 的 run 调 `resume --wait` 会重新进入循环并立刻再次完成（`state: done`），无副作用——实测确认。

### 3.6 `list` — 列出所有 run id

```
kwf list
```

打印 runs-root 下所有有 `meta.json` 的 run id（已排序，`store.ts:58-65`、`cli.ts:213-218`），退出 `0`。配合 `--runs-root` 指定非默认目录。

### 3.7 `examples` — bundled 示例工作流

子命令（`cli.ts:219-244`）：

- `kwf examples`（或 `examples list`）：列出 bundled 示例名。当前有 5 个（`assets.ts:23-29`）：`adversarial-verify`、`deep-research`、`fan-out-reduce`、`loop-until-dry`、`routing`。退出 `0`。
- `kwf examples show <name>`：打印该示例的 Kon 源码。缺 `<name>` → 打印用法，退出 `1`。
- `kwf examples export <dir>`：把全部示例写成 `<dir>/<name>.kon`（默认当前目录），打印 `exported N examples to <dir>`，退出 `0`。

可运行示例：

```bash
bun packages/workflow-host/bin/kwf.ts examples list
# adversarial-verify / deep-research / fan-out-reduce / loop-until-dry / routing

bun packages/workflow-host/bin/kwf.ts examples show fan-out-reduce | head -5
bun packages/workflow-host/bin/kwf.ts examples export ./my-workflows
```

这些示例是学习 DSL 写法的权威范本，可直接 `dry-run`：

```bash
bun packages/workflow-host/bin/kwf.ts dry-run examples/routing.kon
```

实测：`routing.kon` 跑出 2 次 yield；第一跳 `classifier` 带 `[schema]`，第二跳因为 `category` mock 成 `"dry-run:classifyRequest.category"`（不等于 `"frontend"`）而走 `else` 分支，dispatch `generalSpecialist`。这印证了 `(if ...)` 路由里**只有命中的那个分支的 agent 会 yield**。

### 3.8 `skill` — 打印工作流编写 skill 文档

```
kwf skill
```

打印权威的 skill 文档（`skill/SKILL.md`，含 DSL reference 和 CLI 用法），退出 `0`（`cli.ts:245-248`、`backend.ts:209`）。`kwf agent` 向导内部就是把这份文档（从 `## DSL reference` 起的片段）注入给 scaffold agent 学习 DSL 的（`cli.ts:281-285`），不在代码里重复 prompt。

### 3.9 `mcp stdio` — 启动 stdio MCP server

```
kwf mcp stdio
```

启动一个 JSON-RPC over stdio 的 MCP server（`cli.ts:249-258`）。`sub` 不是 `stdio` 则打印用法、退出 `1`。诊断信息走 stderr（stdout 只承载 JSON-RPC，`mcp.ts:205-206`）。详见 §6。

### 3.10 `agent` — 一站式需求→工作流→执行向导

见 §8。

## 4. `args` 与 `:input`：运行时输入怎么进工作流

这是运行 `kwf` 时最容易踩的语义坑，单独讲。

### 4.1 两个独立的输入通道

1. **`:input = {...}`**：工作流自己声明的输入，每个 key 被绑定成一个运行时**变量**（`(ai_workflow ...)` 的 lowering，findings §ai_workflow）。`:input = {topic = "caching"}` 让 `topic` 在 body 里作为普通变量可用。
2. **全局 `args`**：宿主把 `--args`（CLI）或 `args`（MCP/`run` 调用）的 JSON **整体**作为一个名为 `args` 的全局变量注入（`validation.ts:77`、`driver.ts:22`）。

### 4.2 `--args` 不会覆盖 `:input` 的字面默认值

这是核心陷阱。`:input = {topic = "default"}` **不会**被 `--args '{"topic":"x"}'` 覆盖：

```bash
$ kwf dry-run /dev/stdin --args '{"topic":"OVERRIDE"}' <<< \
  '(ai_workflow #t :input = {topic = "default"} :output = [topic] :[ ])'
result: ["default"]      # 实测：args 没有覆盖 :input 默认值
```

### 4.3 正确接线：在 `:input` 里显式读 `(args.:key)`

要让运行时参数生效，必须在 `:input` 里显式引用 `args`：

```bash
$ kwf dry-run /dev/stdin --args '{"q":"hello"}' <<< \
  '(ai_workflow #t :input = {question = (args.:q)} :output = [question] :[ ])'
result: ["hello"]        # 实测：显式接线后 args 生效
```

> 注意字段访问用 `.:` 操作符：`(args.:q)`。在字符串插值里读字段需要额外一层括号（`\((args.:q))`），裸写 `\(args.:q)` 会渲染成 `[object Object]`——这条插值规则见 DSL 章节，也在 §5 的 `[object Object]` 例子里复现。

推荐模式：把每个外部参数都在 `:input` 里映射成命名变量，再在 body 里用变量名：

```
(ai_workflow #w
  :input = {
    question = (args.:question)
    maxRounds = (args.:maxRounds)
  }
  :output = [...]
  :[ ... 用 question / maxRounds ... ])
```

这样 `validate`/`dry-run`/`run` 时传 `--args '{"question":"...","maxRounds":3}'` 才会真正进入工作流。

## 5. validate vs dry-run：选哪个

| 维度 | `validate` | `dry-run` |
| --- | --- | --- |
| 跑多远 | 到**第一个** yield 或完成 | 跑**完整条**流程 |
| 注入结果 | 不注入（停在第一跳） | 每个 yield 注入 schema 形状 mock |
| 调用模型 | 否 | 否 |
| 查什么 | 第一个 dispatch 的 job 名、prompt、adapter/model/schema 是否对；`#name` 陷阱 | 全程管道连通、stage 串联、跨 yield 的 prompt 插值 |
| 输出 | `firstYield` 摘要 | `yields[]` 全量 + `resultPreview` |
| 共用引擎 | 都复用 DSL 执行引擎、都**绕过** host bridge（`validation.ts:10-13`） | 同左 |

通用 flag：`--json`（结构化输出）、`--show-prompts`（job 摘要里带完整 prompt）、`--args`（注入全局 `args`）。`dry-run` 额外有 `--max-yields <n>`（正整数，默认 64）。

`[object Object]` 插值陷阱可以用 `validate --show-prompts` 直接看出来：

```bash
$ kwf validate /dev/stdin --json --show-prompts <<'KON'
(ai_workflow #t :input = {obj = {a = 1 b = 2}} :output = [r]
  :[ (var r (ai_agent #w :{ sys_prompt = "s" user_prompt = "paren \((obj.:a)) bare \(obj.:a)" })) ])
KON
# 实测 prompt: "s\n\nparen 1 bare [object Object]"
```

`\((obj.:a))`（双括号）渲染成 `1`；裸 `\(obj.:a)` 渲染成 `[object Object]`。这是为什么 `deep-research.kon` 用 `\((angle.:question))`。

实践流程：**先 `validate --json` 抓 `#name`/prompt 问题 → 再 `dry-run --show-prompts` 验证整条管道串得通 → 最后 `run --wait` 真跑。**

## 6. MCP server：`kwf mcp stdio` 暴露的 `kwf_*` 工具

`kwf mcp stdio` 启一个 stdio MCP server，把宿主的每个后端操作暴露成一个工具（`mcp.ts:35-184`）。**MCP 和 CLI 是同一个 `WorkflowBackend` 的两层薄壳，行为完全一致**（`backend.ts:43-44`、`mcp.ts:33-34`）。

工具清单（13 个）：

| 工具名 | 对应 CLI | 输入参数（snake_case） |
| --- | --- | --- |
| `kwf_run_workflow` | `run` | `source?`、`script_path?`、`workflow_name?`、`args?`、`wait?`（默认 `false`） |
| `kwf_validate_workflow` | `validate` | `source?`、`script_path?`、`args?`、`show_prompts?`（默认 `false`） |
| `kwf_dry_run_workflow` | `dry-run` | `source?`、`script_path?`、`args?`、`max_yields?`、`show_prompts?` |
| `kwf_run_status` | `status` | `run_id` |
| `kwf_run_events` | `logs` | `run_id` |
| `kwf_run_result` | `result` | `run_id` |
| `kwf_pause_run` | `pause` | `run_id` |
| `kwf_resume_run` | `resume` | `run_id`、`wait?`（默认 `false`） |
| `kwf_stop_run` | `stop` | `run_id` |
| `kwf_list_runs` | `list` | （无） |
| `kwf_list_examples` | `examples list` | （无） |
| `kwf_get_example` | `examples show` | `name` |
| `kwf_get_skill` | `skill` | （无） |

关键差异与约定：

- **参数名是 snake_case**（`script_path`、`workflow_name`、`show_prompts`、`max_yields`、`run_id`），不同于 CLI 的 kebab-case flag（`mcp.ts:43-49` 等）。
- `kwf_run_workflow`/`kwf_validate_workflow`/`kwf_dry_run_workflow` 接受**内联 `source` 或 `script_path` 二选一**（`backend.ts:101-116`），CLI 只接文件路径（或 `/dev/stdin`）。
- `args` 是一个对象，作为全局 `args` 暴露给工作流——同样**不会**覆盖 `:input` 字面默认值，规则同 §4。
- `kwf_validate_workflow` / `kwf_dry_run_workflow` 的 `isError` 跟随 `result.ok`（`mcp.ts:78,103`）：`ok:false` 时结果标记为 error。
- 大多数工具返回 JSON 文本（`jsonResult`），`kwf_get_example` / `kwf_get_skill` 返回纯文本（`textResult`，`mcp.ts:174,181`）。
- server 元信息：`name:"kwf"`、`version:"1.0.0"`（`mcp.ts:187`）。

宿主 agent 接入方式二选一：要么读 `skill/SKILL.md`（让 agent 学会 DSL 后直接调 CLI），要么连这个 MCP server 用 `kwf_*` 工具。两者后端一致。

## 7. Host 配置与 adapter

### 7.1 配置解析顺序

`loadConfig`（`config.ts:58-82`）从默认配置起，按这个顺序找**第一个存在**的配置文件并合并：

1. `--config <path>`（CLI 显式路径）——若显式给了但文件不存在，**抛错**（`config.ts:68-71`）。
2. 环境变量 `KWF_CONFIG`。
3. `./kwf.config.json`（当前工作目录）。
4. `~/.config/kwf/config.json`。

合并是浅合并，但 `adapters` 做一层深合并（`{ ...base.adapters, ...loaded.adapters }`，`config.ts:78`）——所以自定义配置只需写你要覆盖/新增的 adapter，内置三个仍在。

### 7.2 HostConfig 字段与默认值

来源 `config.ts:14-56`：

| 字段 | 类型 | 默认 | 含义 |
| --- | --- | --- | --- |
| `defaultAdapter` | string | `"claude"` | agent 未指定 `adapter` 时用它 |
| `concurrency` | number | `min(16, cpus-2)` | 并发 agent 上限 |
| `maxAgents` | number | `1000` | 整个 run 的 agent 总数上限 |
| `schemaRetries` | number | `2` | schema 校验失败时的纠正重试次数（实际尝试 `schemaRetries+1` 次） |
| `timeout` | number | `1800` | 每个 agent 子进程超时（秒），可被 job 的 `timeout` 覆盖 |
| `runsRoot` | string | `~/.kwf/runs` | run 存储根目录 |
| `adapters` | map | 内置 3 个 | adapter 名 → `AdapterConfig` |

### 7.3 AdapterConfig 与命令占位符

`AdapterConfig`（`config.ts:5-12`）字段：

- `label?`：人类可读名。
- `command`：命令 + 参数数组。支持占位符 `{prompt}`（完整 prompt 文本）、`{prompt_file}`（prompt 写入的临时文件路径）、`{workspace}`（工作目录）。
- `stdin?`：设为 `"{prompt}"` 表示把 prompt 通过 stdin 管道喂进去；省略则 stdin 不传。
- `timeout?`：该 adapter 的默认超时（秒）。
- `flags?`：选项名 → 命令片段数组的映射，例如 `{ model: ["--model"] }`。job 上设 `model = "x"` 时，宿主会把 `["--model", "x"]` 拼到命令里。

内置三个 adapter（`config.ts:25-43`）：

```jsonc
// claude (默认)
{ "command": ["claude", "--print", "--permission-mode", "acceptEdits"],
  "stdin": "{prompt}", "flags": { "model": ["--model"] } }
// codex
{ "command": ["codex", "exec", "--skip-git-repo-check", "--cd", "{workspace}", "-"],
  "stdin": "{prompt}", "flags": { "model": ["--model"] } }
// gemini  —— 注意：没有 stdin，prompt 通过 {prompt} 走命令行参数
{ "command": ["gemini", "--prompt", "{prompt}"], "flags": { "model": ["--model"] } }
```

**`model` 静默不传陷阱**：如果某个 job 设了 `model`，但其解析到的 adapter 的 `flags` 里**没有 `model` 映射**，模型不会被传——也不会报错，只记一条 `option_unmapped` 事件（`bridge.ts:83-85`）。自定义 adapter 想支持选模型，务必写 `"flags": { "model": ["--model"] }`（或对应该 CLI 的真实 flag）。

`skill/kwf.config.example.json` 是一份完整范本：除了显式覆盖 `claude`/`codex` 两个内置 adapter，还含一个无 stdin、用 `{prompt_file}` 的自定义 adapter（`my_agent`）。逐字内容如下：

```json
{
  "defaultAdapter": "claude",
  "concurrency": 8,
  "maxAgents": 200,
  "schemaRetries": 2,
  "timeout": 1800,
  "runsRoot": "~/.kwf/runs",
  "adapters": {
    "claude": {
      "label": "Claude Code",
      "command": ["claude", "--print", "--permission-mode", "acceptEdits"],
      "stdin": "{prompt}",
      "flags": { "model": ["--model"] }
    },
    "codex": {
      "label": "Codex CLI",
      "command": ["codex", "exec", "--skip-git-repo-check", "--cd", "{workspace}", "-"],
      "stdin": "{prompt}",
      "flags": { "model": ["--model"] }
    },
    "my_agent": {
      "label": "Custom agent CLI",
      "command": ["my-agent", "--cwd", "{workspace}", "--prompt-file", "{prompt_file}"]
    }
  }
}
```

### 7.4 不接触真实模型地端到端验证：stub adapter

要验证 `run`/`status`/`result`/`logs` 整条 durable 链路而不调用真实模型，写一个把 prompt 读掉、回固定文本的 stub adapter。下面整段可直接跑（实测 `state: done`）：

```bash
WORK=$(mktemp -d)
cat > "$WORK/echo-agent.sh" <<'SH'
#!/bin/bash
cat >/dev/null          # 读掉 stdin 上的 prompt
echo "stub reply"        # 回固定结果
SH
chmod +x "$WORK/echo-agent.sh"

cat > "$WORK/kwf.config.json" <<JSON
{ "defaultAdapter": "echo",
  "adapters": { "echo": { "command": ["$WORK/echo-agent.sh"], "stdin": "{prompt}" } } }
JSON

cat > "$WORK/wf.kon" <<'KON'
(ai_workflow #demo :input = {topic = "caching"} :output = [draft]
  :[ (ai_phase #Draft :[
       (var draft (ai_agent #draftDoc :{
         sys_prompt = "You write." user_prompt = "Write about \(topic)." })) ]) ])
KON

bun packages/workflow-host/bin/kwf.ts run "$WORK/wf.kon" --wait \
  --config "$WORK/kwf.config.json" --runs-root "$WORK/runs"
# run: wf-...  /  state: done  /  [ "stub reply" ]
# （runId 的 slug 取自文件名 wf.kon，不是工作流内部的 #demo）
```

> 把 `output_schema` 加到 agent 上时，stub 必须回**合法 JSON**（裸文本会触发 schema 纠正重试，最多 `schemaRetries+1` 次后失败）。schema 解析 / 校验逻辑在 `bridge.ts:69-132`，支持的类型见 `schema.ts`（`object`/`array`/`string`/`number`/`integer`/`boolean` + `properties`/`required`/`items`/`minItems`/`enum`）。

## 8. `kwf agent` — 需求到执行的四阶段向导

用途：给一句自然语言需求，自动生成一个 `.kon` 工作流定义、推断它的输入参数、给你 review、确认后执行——一条命令走完（`cli.ts:259-377`）。

精确语法：

```
kwf agent "<requirement>" [--output-dir <dir>]
```

- `<requirement>`：positional token 拼成的一句需求（`cli.ts:268`）。缺失 → 打印用法、退出 `2`。
- `--output-dir <dir>`：生成文件的目录，默认当前工作目录（`cli.ts:274-277`）；目录会被自动创建。

四个阶段（`cli.ts:262-377`）：

1. **`[1/4] 生成工作流定义（scaffold）`**：跑内置 meta-workflow `SCAFFOLD_WORKFLOW_SOURCE`（`agent-workflows.ts:19-70`），把 `SKILL.md` 的 DSL reference 片段作为 `skill_doc` 注入，让一个 agent 根据需求写出完整 `.kon`。产出 `{ workflow_source, workflow_name, description }`，写到 `<output-dir>/<safeName>.kon`，并立即 `validate`（不调 adapter）暴露解析错误。scaffold 失败或返回空 `workflow_source` → 退出 `1`。
2. **`[2/4] 推断输入参数（infer-input）`**：跑内置 `INFER_INPUT_SOURCE`（`agent-workflows.ts:72-113`），把需求映射到工作流 `:input` 期望的 args 对象，写到 `<output-dir>/<safeName>-input.json`。失败 → 退出 `1`。
3. **`[3/4] Review`**：打印生成的 `.kon` 源码和 `-input.json`，然后交互式询问 `Execute this workflow? [Enter to confirm, n to cancel]`（`cli.ts:354,384-392`）。输入 `n` → 打印 `cancelled — files remain on disk`、退出 `0`（文件保留在磁盘上供手改）。回车 / 其他 → 继续。
4. **`[4/4] 执行`**：用确认后的 args `run --wait` 跑生成的 `.kon`。`done` 则打印结果、退出 `0`；否则打印 `error:`、退出 `1`。

可运行示例（这一条**会真正调用模型**，因为 scaffold / infer / 执行三步都派 agent）：

```bash
bun packages/workflow-host/bin/kwf.ts agent "Summarize a GitHub repo's README and suggest 3 improvements" \
  --output-dir ./generated
```

注意点：

- scaffold/infer 这两步本身就是用 `ai_workflow` 写的工作流（即“用工作流生成工作流”），所以 `kwf agent` 需要一个可用的默认 adapter。
- 阶段 3 是交互式的（读 stdin），不适合在纯管道里用；非交互场景请改用 `dry-run` + 手动 `run`。
- 生成的 `.kon` 始终经过 `validate`，但向导**不会**强制你修复 `validate` 的 warning——它只打印 `warning: validate issues: ...`（`cli.ts:316-319`）后继续。生成后建议自己再 `dry-run` 一遍。

## 9. 速查

```bash
# 不调模型的检查（可直接跑）
kwf validate <f.kon> [--args <json>] [--json] [--show-prompts]
kwf dry-run  <f.kon> [--args <json>] [--max-yields <n>] [--json] [--show-prompts]

# 真正执行（调用 adapter）
kwf run <f.kon> [--args <json>] [--wait] [--name <w>] [--config <p>] [--runs-root <d>]

# 观测与控制（按 runId）
kwf status|logs|result|pause|stop <runId>
kwf resume <runId> [--wait]
kwf list

# 资产与服务
kwf examples [list|show <name>|export <dir>]
kwf skill
kwf mcp stdio

# 向导
kwf agent "<requirement>" [--output-dir <dir>]
```

退出码：`0` 成功 / `1` 业务失败 / `2` 参数错误。

记住三件最容易翻车的事：(1) `#name` 里别用连字符（会被当减法、静默丢配置）；(2) `--args` 不覆盖 `:input` 默认值，要在 `:input` 里显式 `(args.:key)`；(3) 提交前先 `validate --json` 再 `dry-run`，绝不靠裸跑发现问题。
