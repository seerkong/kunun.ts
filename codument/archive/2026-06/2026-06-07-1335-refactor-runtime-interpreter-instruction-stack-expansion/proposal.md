# 变更：RuntimeInterpreter 改为指令栈展开机制

## 背景和动机 (Context And Why)
当前新解释器已经迁移到 depa-actor 双栈基座，但执行方案仍是混合路线：入口和部分 opcode 走 instruction stack，大量语言语义仍由 `EvaluateNode`、`EvaluateChain` 等函数递归遍历 AST。这个形态能跑通功能，但 continuation 隐藏在 JS 调用栈中，不利于 workflow safe-point checkpoint、循环恢复、try-catch 恢复，也不利于后续消化旧解释器能力。

旧解释器的主要路线是节点 handler 展开指令，主循环执行 instruction stack。新解释器需要吸收这种机制，但继续使用当前 RuntimeInterpreter、RuntimeState 和 depa-actor execution kernel。

## “要做”和“不做” (Goals / Non-Goals)
**目标:**
- 将新解释器的复合语义改为 AST 节点展开 RuntimeInstruction，主循环逐条执行 instruction stack。
- 让 block、函数调用、条件、循环、try-catch、对象、属性、subscript、effect 和 workflow safe-point 的后续执行位置显式存在于 runtime state 中。
- 保持 RuntimeInterpreter 公共 API 和现有测试行为。
- 为后续删除旧解释器、迁移类型系统、完善 checkpoint continuation 奠定执行模型基础。

**非目标:**
- 不修改 parser 语法。
- 不在本 track 中迁移类型系统。
- 不在本 track 中删除旧解释器代码。
- 不把旧解释器的 `XnlState`、旧 `ExtensionRegistry` 或旧 handler 全量搬进新解释器。

## 变更内容（What Changes）
- 新增 RuntimeInterpreter 的 instruction expansion 层，负责把 AST 节点和特殊 form lowering 为 RuntimeInstruction。
- 调整 `RuntimeOpCode.RunNode`、`RunBlock`、控制流和调用相关 handler，使其展开指令，而不是直接递归求值整个子树。
- 扩展必要 opcode 和 frame memo，用于表达调用、分支、循环、try-catch、finally、对象构建、属性访问、subscript、workflow dispatch 的 continuation。
- 补充测试，覆盖深层表达式不依赖 JS 递归求值、checkpoint 在循环和 try-catch 中恢复，以及现有 RuntimeInterpreter 资源脚本继续通过。

## 影响范围（Impact）
- 受影响的功能规范：`runtime-interpreter`
- 受影响的代码：`lib/RuntimeInterpreter/*`、RuntimeInterpreter 相关测试和资源脚本
- 参考代码：旧解释器 `lib/Interpreter.ts` 和 `lib/Handler/*` 的指令展开思路
