# 变更：迁移旧解释器必要能力并准备删除旧解释器

## 背景

本项目已经迁移并重构了新的 RuntimeInterpreter，使其采用指令栈展开模型并承接 ExtensibleScopedRowType 运行时路线。旧解释器仍然保留，并且仍有一些业务上有价值的低层运行时能力尚未迁移到新解释器。

在同步类型系统之前，应先消化旧解释器中仍有价值的能力，降低双解释器并存带来的维护成本，为后续删除旧解释器代码做准备。

## 变更内容

- 迁移旧异步 host / timer / fiber 编排语法和运行时能力。
- 迁移旧 fiber scheduler opcodes 对应的调度原语。
- 迁移旧 `MakeFuncSync(reusable)` 行为。
- 迁移旧解释器中仍有价值的语法糖、小能力和兼容别名。
- 支持受限的链式对象赋值兼容：仅在 knot chain 表达式层支持 `target.:field = value` 和 `target.:field := value` 这类目标明确的赋值。
- 为每类迁移能力补充 RuntimeInterpreter 测试，覆盖脚本资源和嵌入式 API 行为。
- 在能力迁移和测试稳定后，梳理旧解释器代码删除边界。

## 不做

- 不迁移旧 table 对象系统。
- 不迁移 ExtensibleScopedRowType 类型系统。
- 不把 workflow checkpoint 语义替换成旧 async/fiber 语义，也不把旧 async/fiber 降格为 workflow-only 能力。
- 不在 map、metadata、configuration、in/out table 或其他数据语法中改变 `=` 的含义。

## 影响范围

- 受影响的规范：`runtime-interpreter`
- 受影响的代码：
  - `lib/RuntimeInterpreter/RuntimeInterpreter.ts`
  - `lib/RuntimeInterpreter/RuntimeState.ts`
  - RuntimeInterpreter 测试与脚本资源
  - 后续旧解释器清理阶段涉及 `lib/Interpreter.ts`、`lib/ExtensionRegistry.ts`、`lib/Handler/**`、`lib/KnOpCode.ts`

## 成功标准

- 新 RuntimeInterpreter 能覆盖用户确认需要迁移的旧解释器能力。
- async host / timer / fiber 行为通过 RuntimeInterpreter 测试验证。
- old scheduler opcode 语义在新运行时中有明确对应实现或兼容入口。
- `MakeFuncSync` reusable 行为有测试覆盖。
- 受限链式赋值不会影响当前 Kon/Knl 数据语法。
- 全量测试通过，并形成旧解释器删除前的剩余清单。
