# Decision: runtime-instruction-stack-expansion

Decision URI: decision://runtime-instruction-stack-expansion
Source: archive://2026-06-07-1335-refactor-runtime-interpreter-instruction-stack-expansion

# RuntimeInterpreter Instruction Stack Expansion

Durable / 长期项目决策候选。

## 决策
新 RuntimeInterpreter 的长期执行模型应为 instruction stack expansion：AST 节点和特殊 form 被展开成 RuntimeInstruction，由 depa-actor 提供的 instruction stack、operand stack、frame 和 dispatch 原语驱动执行。

## 理由
- 这种路线可以把 continuation 显式保存在 runtime state 中，支持 checkpoint capture 和 hydrate resume。
- 这种路线与旧解释器的成熟经验一致，但可以避免继承旧 `XnlState` 和全局 `ExtensionRegistry` 的耦合。
- 这种路线为后续迁移类型系统、删除旧解释器、增强 workflow safe-point 提供更稳定的执行基座。

## 边界
- depa-actor 只提供通用执行内核原语，不承载 Kunun 语言语义。
- Kunun RuntimeInterpreter 自己定义 opcode、expander、handler 和 runtime object semantics。
- parser 语法不属于本决策范围。
