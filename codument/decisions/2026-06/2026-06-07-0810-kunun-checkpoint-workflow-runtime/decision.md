# Decision: kunun-checkpoint-workflow-runtime

Decision URI: decision://kunun-checkpoint-workflow-runtime
Source: archive://2026-06-07-0810-add-kunun-dynamic-workflow-checkpoint-runtime

# Decision: Kunun checkpoint workflow runtime

Durable: yes

## Context

Dynamic workflow 能力可以用 JS DSL + replay-cache，也可以用 XML/行为树节点状态，还可以用 Kunun 解释器 continuation。当前项目希望发挥 Kunun 语言和 runtime 的优势，而不是复刻 JS 进程内存模型。

## Decision

Kunun Dynamic Workflow 第一版采用 yield 边界 checkpoint runtime：

- `ai_workflow / ai_agent / ai_parallel / ai_pipeline / ai_phase / ai_log / json_schema` 由 Bun coding agent 注册为 Kunun 宏或函数扩展。
- 扩展语法 lower 到 checkpoint-aware effect/opcode。
- Kunun runtime 在 yield 边界保存 instruction stack、operand stack、env/call/loop/exception/effect frame。
- deterministic `jobId` 用于关联 job store 与 continuation frame，不作为主恢复机制。
- 不采用 behavior-tree tick model。
- depa-actor 只补通用内核能力，不内置 AI 或 Dynamic Workflow 语义。

## Consequences

- Kunun runtime 需要更完整的 snapshot/hydrate、LoopFrame、ExceptionFrame、AbruptCompletion、ValueCodec。
- 测试必须通过模拟 AI runtime 验证完整 end-to-end 关联。
- depa-actor API 增强需要保持领域无关和向后兼容。
