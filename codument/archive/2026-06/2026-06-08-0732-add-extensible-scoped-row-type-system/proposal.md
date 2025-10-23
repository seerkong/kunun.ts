# 变更：迁移 ExtensibleScopedRowType 类型系统

## 背景

当前项目已经同步了 ExtensibleScopedRowType 的 Kon parser 语法与主要运行时能力，并删除旧解释器管线。下一阶段需要把 ExtensibleScopedRowType 中尚未迁移的类型系统引入本项目，为 row type、class/trait、generic、typed effect system 和后续类型驱动运行时能力打基础。

## 变更内容

- 新增 `runtime-type-system` capability，记录类型系统迁移范围和验收要求。
- 审计 ExtensibleScopedRowType 的类型系统文档、代码和测试，形成 TypeScript 迁移矩阵。
- 在当前 parser AST 基础上实现类型模型、类型环境、符号绑定、来源限定名解析和类型检查入口。
- 支持 row type、source-qualified member、class/trait member、generic/type param、typed effect/handler 的静态检查。
- 为 RuntimeInterpreter 增加可选 type-check 前置集成，默认解释执行仍保持 untyped。

## 不做

- 不重新设计 Kon/Knl/Kjson parser 语法。
- 不改变 `:::`、`::`、`.:` 的既有 parser 语义。
- 不把类型检查变成 RuntimeInterpreter 默认执行的强制步骤。
- 不重新引入旧 Interpreter/XnlState/ExtensionRegistry 管线。
- 不迁移与类型系统无关的旧 table 对象系统。

## 影响范围

- 受影响规范：`runtime-type-system`、`runtime-interpreter`。
- 受影响代码：类型系统新增模块、parser AST 到 type AST lowering、RuntimeInterpreter 可选 type-check hook、测试资源和测试用例。
- 受影响测试：新增类型系统单元测试、parser-to-type lowering 测试、typed effect 测试、RuntimeInterpreter 默认 untyped 行为回归测试。
