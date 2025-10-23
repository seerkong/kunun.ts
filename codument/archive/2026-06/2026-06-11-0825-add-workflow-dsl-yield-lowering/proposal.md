# 变更：Workflow DSL 与 yield/checkpoint 运行时合龙

## 背景和动机 (Context And Why)

kunun-runtime 已具备两条相互独立的 workflow 能力线：(1) `registerWorkflowExtension` → `WorkflowDispatch` 指令 → yield 出携带 checkpoint 与 pendingJobs 的 `RuntimeWorkflowEffect`（有 mock 测试覆盖）；(2) `ai_workflow/ai_agent/ai_parallel/ai_pipeline/ai_phase/ai_log` 的 Kon DSL（DeepResearch.kon 等资源测试），但目前 DSL 走的是测试桩注册的 prefix keyword **内联执行**，完全没有接到 yield/checkpoint 路径上。要构建"可集成到不同 coding agent 的 dynamic workflow"系统（总目标），必须先把这两条线合龙：DSL 节点 lower 成 WorkflowDispatch effect，并固化"yield → 注入结果 → 续跑"的标准 API。本 track 是后续 `add-workflow-host-runtime`（宿主 CLI 运行时）的前置依赖。

## "要做"和"不做" (Goals / Non-Goals)

**目标:**
- 提供内建的 Workflow DSL 注册入口（`EnableWorkflowDsl(runtime)` 之类），把 `ai_workflow/ai_phase/ai_log/ai_agent/ai_parallel/ai_pipeline` 六个 DSL 节点统一 lower 到 WorkflowDispatch → yield `RuntimeWorkflowEffect` 路径，语义与现有 .kon 资源测试一致（prompt 插值、input/item/index 绑定、stage 展开）
- 固化 resume API：`RunWorkflowSync`（run-until-yield，返回 yielded/completed 状态）与 `ResumeWorkflowSync`（hydrate checkpoint + 按 job ID 注入结果 + 继续执行）的标准循环
- checkpoint 序列化边界：strict 模式下捕获快照时检测不可 JSON 序列化的 operand/env 值并报明确错误
- `ai_agent` 等节点的 `retry/timeout/label/output_schema` 属性 lower 进 pendingJob 的 metadata，供宿主消费

**非目标:**
- 不实现真实 LLM/agent 调用、持久化落盘、调度器、CLI（属 add-workflow-host-runtime track）
- 不改变 parser 语法；DSL 形态沿用现有 .kon 资源测试中的写法（纯 Kon DSL，用户已确认不做 JS 方言兼容）
- 不改变 untyped 默认行为与既有 workflow extension 公共 API 的语义（只增不破坏）
- 不实现 workflow 级补偿/saga、分布式协调

## 变更内容（What Changes）

- packages/runtime 新增内建 workflow DSL lowering 模块与 `EnableWorkflowDsl` 注册入口
- 新增 `RunWorkflowSync` / `ResumeWorkflowSync`（或等价命名）公共 API 与结果注入约定
- `captureSnapshot` 增加 strict 序列化校验选项（默认行为不变）
- pendingJob metadata 扩展：retry/timeout/label/outputSchema 字段
- 现有 RuntimeInterpreterWorkflowResource 测试迁移到内建 lowering 路径（保留原断言语义）

## 影响范围（Impact）

- 受影响的功能规范：runtime-interpreter（新增 4 个 requirement）
- 受影响的代码：packages/runtime/lib/RuntimeInterpreter/（RuntimeState、RuntimeInterpreter、新增 WorkflowDsl 模块）、packages/runtime/__tests__/
- 下游依赖：add-workflow-host-runtime track 以本 track 的 API 为基座
