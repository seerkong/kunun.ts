## 上下文

旧 `Interpreter` 测试在 parser 语法同步后已经不再适合作为主要运行时真相源。新 `RuntimeInterpreter` 已覆盖 ExtensibleScopedRowType 风格的非类型系统运行时能力，并通过 61 个 runtime 测试。

本 track 的核心不是复制旧测试，而是将旧测试的业务价值迁移到新 runtime，并移除重复旧断言。

## 方案概览

1. 建立旧测试归并边界
  - 将旧测试分为重复删除、迁移到新 runtime、暂不迁移三类。
  - 重复删除类不再保留完整旧断言。
  - 暂不迁移类记录为 future work，不进入本 track 实现。

2. 迁移语言行为测试
  - 迁移 control-flow：`if`、`cond`、`foreach`、`for`、break、continue。
  - 迁移 logical/infix macro：`and`、`or`、`or_else`、混合表达式。
  - 迁移函数变体：多参数、currying、variadic，前提是当前语法支持或可以通过明确 runtime API 表达。
  - 迁移 runtime session 复用：同一 runtime 上多次执行 source。

3. 迁移对象和 host 行为
  - 扩展对象脚本测试，覆盖默认字段和完整 class/property/method 组合。
  - 覆盖 host object property access 的当前语义。

4. 设计并迁移 JS 交互
  - 新增 `RuntimeInterpreterHostInterop` 类测试，覆盖 host object bridge。
  - 用新 runtime API 取代旧 `js_call`、`js_apply` 语义价值。
  - 不要求照搬旧语法；优先明确、可维护的 host adapter 接口。

5. 设计并迁移 embedding API
  - 新增脚本函数导出为 JS callable 的 API。
  - 用测试覆盖参数绑定、闭包可见性、返回值、错误传播边界。

6. 收缩旧解释器测试
  - 只保留 minimal `Interpreter` API smoke suite。
  - 删除或改写重复旧断言，避免旧实现继续作为行为规范。

## 影响范围与修改点（Impact）

- `lib/RuntimeInterpreter/RuntimeInterpreter.ts`
- `lib/RuntimeInterpreter/RuntimeState.ts`
- `lib/RuntimeInterpreter/RuntimeObject.ts`
- `__tests__/Case/RuntimeInterpreter*.test.ts`
- `__tests__/Resource/RuntimeInterpreter/`
- `__tests__/Case/Interpreter.test.ts`
- `__tests__/Case/HostFunc.test.ts`
- `__tests__/Case/Interop.test.ts`
- `__tests__/Case/InfixMacro.test.ts`

## 决策摘要

- 详见 `decisions.md`。
- 当前关键结论：
  - 本 track 迁移测试并补齐必要 runtime 能力。
  - 删除重复旧断言。
  - 保留最小 legacy `Interpreter` smoke suite。
  - JS imperative bridge 和脚本函数导出为 JS callable 进入本 track。
  - event queue、async host interop、self-update syntax 排除。
  - 手动提交，最终阶段 gap-loop 校验。

## 风险 / 权衡

- 风险：删除旧断言可能掩盖仍有价值的旧语义。
  - 缓解：先补新 runtime 测试，再删除旧重复断言。
- 风险：JS bridge 如果照搬旧语法，会把旧实现细节带入新 runtime。
  - 缓解：先定义新 runtime host interop API，再迁移测试语义。
- 风险：control-flow source syntax 可能尚未稳定。
  - 缓解：任务中先确认 parser AST shape，再迁移测试。

## 兼容性设计

- 旧 `Interpreter` 不再承担完整行为回归。
- 仍保留 minimal smoke suite，确保旧 API 入口没有被意外删除。
- 新业务能力通过 `RuntimeInterpreter` 暴露。

## 迁移计划

1. 先新增新 runtime 测试，明确红色阶段。
2. 补齐运行时能力。
3. 通过新 runtime 测试后，删除或收缩对应旧测试。
4. 最后运行 runtime、新旧 smoke、parser 回归测试。

## 待解决问题

- 无待用户确认问题。若实现中发现当前 Kon 语法无法表达某个旧测试点，应追加到 `decisions.md`。
