# 变更：为 kwf 增加 validate 与 dry-run

## 背景和动机 (Context And Why)

当前 `kwf run` 可以执行 Kon workflow，但生成 workflow 的 coding agent 缺少一个安全的预检查入口：它要么直接运行并可能触发真实 agent 调用，要么只能依赖测试代码里的内部 API。为了让 agent 在写出 `.kon` 后先验证结构、再模拟流程，我们需要在 CLI 与 MCP 两个表面提供统一的 `validate` 与 `dry-run` 能力。

## “要做”和“不做” (Goals / Non-Goals)

**目标:**
- 在 `WorkflowBackend` 增加共享的 `validateWorkflow` 与 `dryRunWorkflow`，保证 CLI 与 MCP 行为一致。
- CLI 增加 `kwf validate <file.kon>` 与 `kwf dry-run <file.kon>`。
- MCP 增加 `kwf_validate_workflow` 与 `kwf_dry_run_workflow`，并支持 inline `source`。
- `validate` 只执行到第一处 yield 或 completion，不调用任何 agent adapter。
- `dry-run` 通过 schema-shaped mock 结果推进 workflow，尽量完整跑通流程。
- 输出结构化 diagnostics、yield summaries、job summaries，并默认截断 prompt。
- 覆盖 source mode、compiled binary、MCP stdio 三种入口。

**非目标:**
- 不实现完整静态类型检查或 lint 规则系统。
- 不验证真实 adapter 命令可用性，不调用模型。
- 不扩大 JSON Schema validator 的完整标准覆盖面；仅复用现有最小 schema 能力。
- 不改变 `.kon` workflow DSL 语法。

## 变更内容（What Changes）

- 新增 `packages/workflow-host/lib/validation.ts`，承载 validate/dry-run 业务逻辑、effect/job summary、schema mock 生成与 diagnostics。
- 扩展 `WorkflowBackend`，增加 `validateWorkflow` 与 `dryRunWorkflow`。
- 扩展 CLI：`validate`、`dry-run`，支持 `--args`、`--json`、`--show-prompts`，dry-run 额外支持 `--max-yields`。
- 扩展 MCP：`kwf_validate_workflow`、`kwf_dry_run_workflow`。
- 扩展 tests：backend、CLI、MCP、compiled binary、prompt redaction、schema-shaped mocks、max-yields。
- 更新 `skill/SKILL.md` 和 README 中的命令说明。

## 影响范围（Impact）

- 受影响的功能规范：`workflow-host-runtime`
- 主要代码区域：`packages/workflow-host/lib/backend.ts`、`cli.ts`、`mcp.ts`、新增 `validation.ts`，以及相关 tests / docs。
