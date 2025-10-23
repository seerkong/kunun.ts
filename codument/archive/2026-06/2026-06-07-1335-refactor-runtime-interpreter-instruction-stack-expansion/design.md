## 上下文
新解释器已经完成 RuntimeInterpreter 基线、legacy 测试迁移、workflow checkpoint runtime 等工作。但其执行形态仍是 tree-walk 混合 instruction runtime：instruction handler 中直接调用求值函数完成子树执行。为了支持可靠 continuation、checkpoint resume，以及后续消化旧解释器能力，需要把新解释器改为显式指令栈展开机制。

## 方案概览
1. 引入 RuntimeInstruction expansion 层
  - 新增或整理 node expander、knot expander、keyword expander、infix expander。
  - expander 的职责是向当前 fiber instruction stack push 后续步骤。
  - handler 的职责是执行一个小步，或把当前 AST 节点展开为小步。
  - 实现必须同时参考两条已有展开路线：
    - 本项目旧解释器：`lib/Interpreter.ts`、`lib/Handler/Node/NodeHandler.ts`、`lib/Handler/*`。
    - ExtensibleScopedRowType：`src/Kon.Interpreter/KonInterpreterEngine.cs`、`Handlers/Node/NodeHandler.cs`、`Handlers/Call/ChainExprHandler.cs`、`Handlers/Node/ForeachHandler.cs`、`Handlers/Node/TryHandlePerformHandler.cs`。
  - 其中 ExtensibleScopedRowType 的 `Node_RunNode -> ExpandNode`、`KnChainNode -> PushFrame + Node_IterEvalChainNode + PopFrameAndPushTopVal`、`Node_IterEvalChainNode -> 当前节点小步展开 + Next 重新入栈` 是本 track 的主要迁移参考。

2. 分阶段移除 compound AST 的直接递归求值
  - 第一阶段锁定当前 `EvaluateNode`、`EvaluateChain` 等直接求值路径。
  - 先迁移 block、word lookup、vector、map、knot call、host call、lambda call。
  - 再迁移 branch、loop、try-catch、return、break、continue、throw、perform。
  - 最后迁移 object/property/subscript 和 workflow safe-point 相关 continuation。

3. 让 continuation 可序列化
  - 循环状态用 instruction memo 和 frame state 表达，而不是依赖 JS 局部变量。
  - try-catch-finally 状态用 control frame 和 pending abrupt completion 表达。
  - workflow yield 前后的恢复点必须是 instruction stack 中的显式后续指令。

4. 保持兼容边界
  - RuntimeInterpreter 的公开入口保持不变。
  - parser 产物保持不变。
  - 旧解释器继续存在，作为用户 review 删除前的兼容路径和行为参考。

## 影响范围与修改点（Impact）
- `lib/RuntimeInterpreter/Instruction.ts`：扩展 opcode 和 instruction memo 类型。
- `lib/RuntimeInterpreter/RuntimeInterpreter.ts`：将直接求值 handler 改为展开和小步 dispatch。
- `lib/RuntimeInterpreter/RuntimeState.ts`、`RuntimeFiber.ts`：补充可 snapshot 的 control frame 和 continuation state。
- `__tests__/Case/RuntimeInterpreter*.test.ts` 与 `__tests__/Resource/RuntimeInterpreter/`：补充执行模型和回归测试。

## 决策摘要
- 详见 `codument/tracks/refactor-runtime-interpreter-instruction-stack-expansion/decisions/runtime-instruction-stack-expansion.md`
- 当前关键结论：新解释器要采用旧解释器同类的 instruction stack expansion 路线，但不能依赖旧解释器状态模型；depa-actor 继续作为通用 execution kernel。

## 风险 / 权衡
- 风险：一次性迁移所有语义容易引入行为回归。
  缓解措施：按语义类别迁移，并保持现有 RuntimeInterpreter 测试作为回归基线。
- 风险：过早删除 `EvaluateNode` 会让迁移难以分段。
  缓解措施：先保留兼容包装，但新增测试保证 compound form 的运行路径不再依赖递归求值。
- 风险：checkpoint 测试只覆盖 workflow happy path，无法证明循环和异常恢复。
  缓解措施：新增循环中 yield、try body 中 yield、finally pending completion 的脚本级测试。

## 兼容性设计
- RuntimeInterpreter public API 保持不变。
- 旧 Interpreter public API 保持不变。
- 不修改 parser、formatter、Kon/Knl/Kjson syntax config。

## 迁移计划
1. 建立执行模型回归测试。
2. 引入 expansion registry 和最小指令展开框架。
3. 迁移普通表达式和调用。
4. 迁移控制流、异常、effect。
5. 迁移对象和 workflow continuation。
6. 运行 RuntimeInterpreter 全量测试，并记录旧解释器删除前仍需 review 的能力。

## 待解决问题
- `EvaluateNode` 最终是删除、私有化为 literal helper，还是保留为测试辅助。
- 旧解释器的哪些 prefix/infix expander 行为需要完全等价迁移。
- ExtensibleScopedRowType 中 try/perform、class、property/subscript 的展开细节哪些应直接对齐，哪些应因本项目 runtime object 模型不同而适配。
