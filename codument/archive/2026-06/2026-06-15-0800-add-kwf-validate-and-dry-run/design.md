# 设计：kwf validate 与 dry-run

## 上下文

`kwf run` 当前会启动 driver loop，遇到 yield 后分派 agent adapter subprocess。validate/dry-run 的关键是复用 workflow DSL 的执行能力，但绕开 adapter dispatch。`WorkflowBackend` 已是 CLI 与 MCP 的共享业务层，因此新能力应落在 backend 与一个新的 validation 模块里。

## 方案概览

1. **共享结果模型**
   - `ValidateWorkflowResult`: `ok`、`status`、`workflowName`、`diagnostics`、`firstYield`、可选 `resultPreview`。
   - `DryRunWorkflowResult`: `ok`、`status`、`workflowName`、`diagnostics`、`yields`、可选 `resultPreview`。
   - `WorkflowYieldSummary`: effect name/fixity/sourceNodeId/jobCount/jobs。
   - `WorkflowJobSummary`: id/name/label/adapter/model/retry/timeout/hasOutputSchema/promptPreview。

2. **validate 执行策略**
   - 读取 source 或 scriptPath。
   - 创建 runtime，`EnableWorkflowDsl(runtime)`。
   - 调用 `RunWorkflowSync(runtime, source)`。
   - `yielded` → ok=true + firstYield summary。
   - `completed` → ok=true + resultPreview。
   - 任意异常 → ok=false + diagnostic；CLI JSON 模式输出结构体，非 JSON 模式输出短诊断。
   - 不创建 run 目录，不写 checkpoint，不调用 adapter。

3. **dry-run 执行策略**
   - 首轮调用 `RunWorkflowSync`。
   - 每次 yielded：收集 summary；为每个 pending job 生成 mock result；调用 `ResumeWorkflowSync`。
   - mock result 规则：
     - 有 `output_schema`：按 schema 生成 deterministic value。
     - 无 schema：返回 `dry-run:<jobNameOrLabelOrId>`。
   - 达到 `maxYields` 前完成 → ok=true；超过限制 → ok=false + diagnostic。
   - 每次 yield 都不触发 adapter subprocess。

4. **CLI 入口**
   - `kwf validate <file.kon> [--args <json>] [--json] [--show-prompts]`
   - `kwf dry-run <file.kon> [--args <json>] [--max-yields <n>] [--json] [--show-prompts]`
   - 退出码：0 成功，1 validation/dry-run 失败，2 参数错误。

5. **MCP tools**
   - `kwf_validate_workflow`: accepts `source` or `scriptPath`, `args`, `showPrompts`。
   - `kwf_dry_run_workflow`: accepts `source` or `scriptPath`, `args`, `maxYields`, `showPrompts`。
   - 返回 JSON text，`isError` 跟随 result.ok。

6. **隐私与可读性**
   - 默认只给 prompt preview，截断 160 字。
   - `showPrompts=true` 时可输出完整 prompt，方便调试。

## 影响范围与修改点（Impact）

- `packages/workflow-host/lib/validation.ts`（新增）
- `packages/workflow-host/lib/backend.ts`
- `packages/workflow-host/lib/cli.ts`
- `packages/workflow-host/lib/mcp.ts`
- `packages/workflow-host/__tests__/Case/*`
- `skill/SKILL.md`
- `README.md`

## 决策摘要

- 详见 `decisions.md`。
- 当前关键结论：validate/dry-run 是 host tooling 能力，放在 `kunun-workflow-host`，不放入 `kunun-workflow-dsl`。

## 风险 / 权衡

- **dry-run mock 值不等于真实模型输出**：只承诺流程结构模拟，不承诺业务语义正确。
- **过深/循环 workflow 可能无限 yield**：用 `maxYields` 硬限制。
- **prompt 泄露风险**：默认截断；完整 prompt 必须显式 `showPrompts`。

## 兼容性设计

- 不改变现有 `run`、MCP tools 或 workflow DSL 语法。
- 新增命令与 tools 是向后兼容能力。

## 待解决问题

- 无。
