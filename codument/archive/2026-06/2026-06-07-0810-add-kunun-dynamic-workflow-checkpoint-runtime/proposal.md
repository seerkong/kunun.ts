# 变更：添加 Kunun Dynamic Workflow Safe-Point Checkpoint Runtime

## 背景和动机 (Context And Why)

Dynamic workflow 系统可以把 agent 编排从主上下文迁移到可执行 workflow 脚本中。当前项目已经有基于 `depa-actor` 的 `RuntimeInterpreter`，并具备双栈、fiber、continuation、effect system、prefix/infix keyword expander 的基础。相比用 JS 作为 workflow DSL 或用 XML/行为树保存节点状态，Kunun 更适合直接把 workflow 操作 lower 到解释器 continuation，并在 yield 边界 checkpoint。

本变更希望让 Bun coding agent 可以基于 Kunun 注册 `ai_workflow / ai_agent / ai_parallel / ai_pipeline / ai_phase / ai_log / json_schema` 等扩展函数或宏，实现 dynamic workflow 编排；Kunun runtime 则在这些 yield 边界保存可恢复状态。

## “要做”和“不做” (Goals / Non-Goals)

**目标:**
- 在 Kunun runtime 中支持 workflow extension macro/function registry，复用并扩展现有 prefix/infix keyword expander 方向。
- 将 `ai_agent / ai_parallel / ai_pipeline / ai_phase / ai_log / json_schema` 映射为 checkpoint-aware effect/opcode，而不是普通 host function。
- 支持 safe-point checkpoint snapshot/hydrate，覆盖 instruction stack、operand stack、env/call/loop/exception/effect frame、fiber state 与 pending jobs。
- 支持 `LoopFrame`、`ExceptionFrame`、`AbruptCompletion`，让 loop 和 `try-catch-finally` 可以从 checkpoint 恢复。
- 在测试中构建模拟 AI runtime，验证 macro/function extension、ai_agent dispatch、ai_parallel/ai_pipeline、job store、checkpoint、resume 能完整关联运行。
- 在 `depa-actor` 中补充通用执行内核能力，如 stack hydrate/replaceState、dispatcher hooks/yield convention、snapshot helper；保持领域无关。

**非目标:**
- 不把 `ai_agent / ai_parallel / ai_pipeline` 做成 Kunun 语言内建原语。
- 不采用 behavior-tree tick model 作为 Kunun workflow 执行语义。
- 不把 replay-cache runtime 作为主恢复模型；job cache 只作为 checkpoint 恢复的辅助。
- 不在 `depa-actor` 中加入 AI agent 或 Dynamic Workflow 领域语义。
- 不实现真实 LLM adapter；测试使用模拟 AI runtime。
- 不引入 budget 能力。

## 变更内容（What Changes）

- 扩展 `RuntimeInterpreter` 的 keyword/macro/function extension API，让宿主可以注册 checkpoint-aware workflow extension。
- 增加 workflow op/effect：ai_agent dispatch、ai_parallel batch、ai_pipeline stage、ai_phase/ai_log/json_schema validation，对外 DSL 节点使用 `ai_` 前缀。
- 增加 runtime snapshot/hydrate 数据结构和 codec。
- 增加 loop/exception/abrupt completion checkpoint frame。
- 增加 job store 与 checkpoint store 的测试用内存实现。
- 增加模拟 AI runtime 测试，覆盖 ai_agent、ai_parallel、ai_pipeline、loop resume、try-catch resume、failure/retry 或 stale job 处理。
- 在 `depa-actor` 中补充通用 stack hydrate、dispatcher lifecycle/yield hook、snapshot helper。

## 影响范围（Impact）

- 受影响的功能规范：`runtime-interpreter`、`depa-actor-execution-kernel`
- 受影响的模块：
  - `lib/RuntimeInterpreter/*`
  - `__tests__/Case/RuntimeInterpreter*.test.ts`
  - `__tests__/Resource/RuntimeInterpreter/*`
  - `/Users/kongweixian/infra-dev/depa-actor/src/execution/*`
  - `/Users/kongweixian/infra-dev/depa-actor/src/runtime/*`
