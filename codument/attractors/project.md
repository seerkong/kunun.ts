# kunun.ts

## 项目概述

kunun 语言的 TypeScript 实现：受 Lisp 与 Forth 启发的实验性语言，包含解析器（Knl/Kon/Kjson 三种语法 profile）、基于 depa-actor 双栈 VM 的 RuntimeInterpreter（fiber/continuation/checkpoint）、以及可选的 row/effect 类型系统。

## 技术栈（2026-06-10 更新，track: refactor-split-bun-workspace-packages）

- **运行时与工具链：** bun（workspaces / bun test / bun build）+ TypeScript 4.6（`tsc --noEmit` 类型检查）。已移除 mocha、ts-node、vite、rimraf。
- **仓库结构：** bun workspaces 多包，根为 private workspace 根（`kunun-workspace`），源码全部在 `packages/*/lib`，测试在 `packages/*/__tests__`。
- **包边界（长期决策，见 decision://workspace-package-boundaries 候选）：**
  - `kunun-core`（Model/Util/Algo/StateManagement/TaskQueue，强连通块）
  - `kunun-converter`（解析器/格式化器）→ 依赖 core
  - `kunun-runtime`（RuntimeInterpreter/HostSupport + depa-actor）→ 依赖 core、converter；定义 `TypeSystemBridge` 钩子，**禁止静态 import type-system**
  - `kunun-type-system` → 依赖 core、converter、runtime；实现并注册 bridge（包 index 导入即注册）
  - `kunun-workflow-dsl`（2026-06-11 拆出，track: refactor-extract-workflow-dsl-package）→ 依赖 core、runtime；ai_* workflow DSL 全部语义在此（lowering/请求捕获/Run+ResumeWorkflowSync/事件）；**kunun-runtime 只保留域中立机制**——registerWorkflowExtension 的 job 展开由注册方显式声明（jobExpansion: 'single'|'perArg' 或 buildJobs 回调，无任何名字特例），并提供通用 DispatchUntilStop
  - `kunun`（总包，由 `@symtable/kunun` 改名）→ re-export 全部，导入即可 typed 执行；`npm run dist` 产出 ESM+CJS（不再提供 UMD）
- **跨包导入约定：** 必须用包名（如 `kunun-core/Model/KnKnot`），由根 `tsconfig.json` paths 解析（bun 原生读取 paths，无需 node_modules 软链）；禁止 `../../..` 相对路径穿透包边界。
- **依赖：** `depa-actor` 以 vendor tarball 引用（`vendor/depa-actor-0.2.0.tgz`，相对 file: 路径，仅声明在 `kunun-runtime`；2026-06-11 起不再使用机器相关绝对路径，fresh clone 可装可测）。npm registry 上为旧版 0.1.2，若未来发布 0.2.x 可切回 registry 依赖。
- **workflow 宿主（2026-06-11 更新，track: add-workflow-host-runtime）：** 新增 `kunun-workflow-host` 包（依赖 kunun-runtime 与 kunun-workflow-dsl）：durable driver loop（每个 yield 边界 checkpoint 先落盘再分派，崩溃/暂停后从 checkpoint + 已完成 job 结果续跑）、配置驱动 agent CLI 适配器（claude/codex/gemini/自定义，占位符模板）、output_schema 校验 + 纠错重试、文件化 run 目录（meta/status/events.jsonl/checkpoint/control 原子写，CLI 与 worker 仅经文件通信）、异步信号量调度器、CLI `kwf`（run/status/logs/result/pause/resume/stop/list）。workflow 书写格式为纯 Kon DSL（decision 已确认，不做 JS 方言兼容）。
- **kwf MCP 与单可执行（2026-06-11 更新，track: add-kwf-mcp-and-embedded-binary）：** CLI 与 MCP tools 共享 `WorkflowBackend` 业务层（参考 multica/terminal 架构）；`kwf mcp stdio` 启动 stdio MCP server（@modelcontextprotocol/sdk + zod v3，11 个 `kwf_` tools，stdout 仅 JSON-RPC）；文本资产（提示词模板/示例/SKILL）为独立文件经 bunfs（`with {type:"file"}` import）嵌入，dev/编译态同一加载 API；`bun run build:bin` 产自包含 `dist-bin/kwf`（编译态 worker 重入用 `Bun.main` 检测，`__dirname` 在打包时会被固化为构建机路径不可用于运行时判定）。TypeScript 升级至 5.4（import attributes 需要），tsconfig module=esnext + skipLibCheck。
- **agent 集成（2026-06-11 更新，track: add-workflow-agent-integration）：** `skill/SKILL.md` 教宿主 coding agent 写 Kon workflow 并调用 CLI（内嵌示例与 examples/ 可执行版本由测试锁定一致）；`examples/` 含 5 个模式示例（deep-research/fan-out-reduce/adversarial-verify/loop-until-dry/routing），全部经 mock 适配器端到端测试保障。

---

*初始化时间: 2026-06-05T12:36:44.997Z*
