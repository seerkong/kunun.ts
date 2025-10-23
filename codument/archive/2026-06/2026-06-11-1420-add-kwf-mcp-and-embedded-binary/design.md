# 设计：kwf MCP server 与 bunfs 内嵌单可执行

## 上下文

- 参考工程 multica/terminal（会话调研结论）：Backend 接口层被 CLI 与 MCP tools 共享；`mcp stdio` 子命令启动 StdioServerTransport；tool = {name, title, description, zod inputSchema, handler}，handler 返回 `{content:[{type:'text',text:JSON}]}`；stdio 模式下诊断只走 stderr；bun build --compile 单可执行。
- bunfs 实证（bun 1.3.6）：`import p from './x.txt' with {type:'file'}` 编译后嵌入二进制（路径 `/$bunfs/root/...`），`Bun.file(p)` 可读；未编译时 p 为真实文件路径，同一 API 双模式可用；`Bun.embeddedFiles` 可枚举。

## 方案概览

1. **Backend 共享层**（packages/workflow-host/lib/backend.ts）
   - `WorkflowBackend`：runWorkflow({source|scriptPath,args,name,wait})→{runId,status?}、status/events/result、pause/resume/stop、listRuns、listExamples/getExample、getSkill
   - 由现有 store/driver/cli 逻辑下沉组装；CLI 的各 case 与 MCP tools 全部改调 backend（一处实现两个界面）
2. **MCP server**（lib/mcp.ts）
   - `kwf mcp stdio` 子命令 → McpServer + StdioServerTransport；11 个 `kwf_` tools（见 decisions #4），zod inputSchema，handler 调 backend 并 JSON 文本返回
   - stdio 期间所有诊断走 stderr；启动横幅也写 stderr
3. **资产外置 + bunfs 加载层**（assets/ + lib/assets.ts）
   - 外置文件：`assets/prompts/schema-correction.txt`（bridge 纠错提示词，含 {errors} 占位）、`assets/prompts/schema-instruction.txt`（describeSchema 前导文案）；examples 与 SKILL.md 直接 import 仓库根的现有文件（决策 #5，真相源不动）
   - lib/assets.ts：集中 `with {type:'file'}` import + `loadAsset(name): Promise<string>`；dev 与 compiled 同一实现
   - 新 CLI：`kwf examples`（list）、`kwf examples show <name>`、`kwf examples export <dir>`、`kwf skill`（输出 SKILL.md 文本）
4. **单可执行构建**
   - 根/包 scripts：`build:bin` = `bun build packages/workflow-host/bin/kwf.ts --compile --outfile dist-bin/kwf`
   - worker 重入：编译态下 `process.execPath` 即 kwf 二进制，spawn 参数从 `[execPath, binPath, '__worker', dir]` 分支为 `[execPath, '__worker', dir]`（按 `Bun.embeddedFiles.length>0` 或 `process.execPath` 是否等于 bun 判定，实施验证后回写）
   - 冒烟：编译产物跑 examples/routing.kon（mock 适配器）至 done、`kwf skill`/`examples` 输出、MCP stdio 握手（initialize→tools/list）

## 影响范围与修改点（Impact）

- packages/workflow-host：新增 assets/、lib/assets.ts、lib/backend.ts、lib/mcp.ts；改 cli.ts（子命令与 backend 化）、bridge.ts（提示词资产化）、driver/runner（worker 重入分支）；package.json 新依赖与 build:bin
- 测试：新增 Backend/Mcp/Assets/CompiledBinary 测试；既有 27+ 用例不回归

## 决策摘要

- 见 decisions.md：stdio+官方 SDK、bunfs 内嵌、保留手写 CLI 解析、kwf_ 前缀、真相源留根目录

## 风险 / 权衡

- bun build --compile 对 tsconfig paths/workspace 链接的解析 → P3 首个任务先做最小探针验证，失败则改用相对导入或包内副本（决策 #5 回退）
- MCP SDK 体积与 API 变动 → 锁定主版本，握手冒烟测试覆盖
- stdio 污染 → server 启动后禁止 stdout 诊断（参考工程的坑）

## 待解决问题

- 编译态判定的具体条件（实施回写）
