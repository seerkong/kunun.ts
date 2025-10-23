# 设计：删除旧解释器

## 目标

项目运行时入口收敛到 `lib/RuntimeInterpreter`。删除旧解释器后，包级导出不再暴露 `Interpreter`、`XnlState`、`ExtensionRegistry`、`XnlOpCode`、旧 handler 和旧 state management 类型。

## 删除范围

- 旧 public API：
  - `Interpreter`
  - `ExtensionRegistry`
  - `XnlState`
  - `XnlOpCode`
  - `RunResult`
- 旧执行管线：
  - `lib/Handler/**`
  - `lib/StateManagement/**`
- 旧解释器测试：
  - `__tests__/Case/Interpreter.test.ts`
  - `RuntimeInterpreter` 中只验证旧解释器路径可用的断言

## 保留范围

- `lib/RuntimeInterpreter/**`
- parser/formatter/converter
- `lib/Model/**`
- RuntimeInterpreter legacy compatibility tests，这些测试验证旧能力已迁移到新解释器，而不是旧解释器本身。

## 风险与防护

- 包 API 破坏：这是有意的 BREAKING change，使用方应迁移到 `RuntimeInterpreter`。
- 旧 model 误删风险：先只删除直接属于旧执行管线的文件，编译暴露剩余引用后再处理。
- 测试覆盖风险：删除后必须运行 `npm run compile`、RuntimeInterpreter 测试和全量测试。
