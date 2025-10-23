# 变更：删除旧解释器实现

## 背景

`migrate-legacy-interpreter-capabilities` 已将需要保留的旧解释器能力迁移到 `RuntimeInterpreter`，并形成删除准备清单。旧 `Interpreter` / `XnlState` / `ExtensionRegistry` 管线继续留在项目中会造成维护分叉和 API 误用。

## 变更内容

- **BREAKING** 删除旧解释器公开导出和实现文件。
- 删除旧 handler、state management、opcode registry 管线。
- 删除旧解释器 smoke 测试。
- 保留新 `RuntimeInterpreter`、parser、formatter、model 和 converter 能力。
- 保留旧 table model 数据结构文件，除非编译确认其只被旧解释器引用且不属于当前公共模型。

## 不做

- 不删除 `RuntimeInterpreter`。
- 不迁移旧 table 对象系统。
- 不同步类型系统。
- 不重构 parser/formatter。

## 影响范围

- 受影响规范：`runtime-interpreter`
- 受影响代码：`lib/index.ts`、旧 `lib/Interpreter.ts`、`lib/KnState.ts`、`lib/KnOpCode.ts`、`lib/ExtensionRegistry.ts`、`lib/Handler/**`、`lib/StateManagement/**`、旧解释器测试。
