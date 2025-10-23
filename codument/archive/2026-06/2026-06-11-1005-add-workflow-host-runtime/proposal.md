# 变更：Workflow 宿主运行时（kunun-workflow-host 包 + CLI）

## 背景和动机 (Context And Why)

`add-workflow-dsl-yield-lowering` track 完成后，kunun-runtime 能把 .kon workflow 执行到 yield 边界并产出携带 checkpoint 与 pendingJobs 的 effect，但没有任何宿主侧设施来真正驱动它：无 agent 调用、无落盘、无调度、无 CLI。本 track 新建 `packages/workflow-host`（包名 `kunun-workflow-host`），实现完整的宿主运行时。设计要点：配置驱动 CLI 适配器、文件化 run 目录、异步信号量调度、schema 校验重试；核心特性是 **durable execution**：每个 yield 边界 checkpoint 落盘，进程崩溃/暂停/重启后从中间精确续跑。

**依赖**：本 track 依赖 `add-workflow-dsl-yield-lowering`（RunWorkflowSync/ResumeWorkflowSync API 与 DSL lowering）。

## "要做"和"不做" (Goals / Non-Goals)

**目标:**
- **Driver loop**：run-until-yield → checkpoint 落盘 → 并发分派 pendingJobs 给 agent → 收集结果 → resume，循环至 completed
- **Agent 适配器层**：配置驱动（claude/codex/gemini/自定义 CLI 子进程），占位符模板（{workspace}/{prompt}/{model}），stdin/文件两种 prompt 传递
- **Schema 校验与纠错重试**：ai_agent 的 output_schema → JSON 提取（fenced/balanced/整体三层候选）→ 校验 → 失败带错误反馈重试（可配次数）
- **文件化 run 目录**：runs/<workflow>/<runId>/{meta,status,checkpoint,result,error}.json + events.jsonl + control.json，原子写（temp+rename）
- **调度器**：异步信号量并发 cap（默认 min(16,cpu-2)）+ maxAgents 兜底 + budget 钩子（先桩）
- **CLI**：`kwf run|status|logs|result|pause|resume|stop`；pause/stop 经 control.json，resume 从 checkpoint 续跑（含跨进程重启续跑）
- 库 API 顺带导出（executeRun/RunStore 等）

**非目标:**
- 不做 SKILL.md、示例 workflow 移植、二进制分发（属 add-workflow-agent-integration track）
- 不做 web dashboard、桌面应用（后续独立 track）
- 不做真实 token 计量（budget 留钩子）
- 不做嵌套 workflow、git worktree 隔离（后续迭代）

## 变更内容（What Changes）

- 新增 packages/workflow-host（kunun-workflow-host）：driver/、adapters/、store/、scheduler、bridge（schema 校验重试）、cli
- 根 workspace 增加该包；依赖 kunun-runtime（实现期收窄：只消费 workflow API，无需总包）
- 新增 CLI bin 入口（bun 运行）

## 影响范围（Impact）

- 受影响的功能规范：新增 workflow-host-runtime capability
- 不修改既有包的运行时行为（仅消费其公共 API）
- 上游依赖：add-workflow-dsl-yield-lowering；下游：add-workflow-agent-integration
