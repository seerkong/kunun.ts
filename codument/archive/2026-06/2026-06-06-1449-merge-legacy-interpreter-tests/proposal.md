# 变更：合并旧解释器测试到新 RuntimeInterpreter 基座

## 背景和动机 (Context And Why)

本项目已经完成 Kon parser 语法同步和基于 depa-actor 双栈基座的新 `RuntimeInterpreter` 迁移。旧 `Interpreter` 测试集中有一部分测试点已经被新 runtime parity 测试覆盖，继续保留会让旧语法和旧实现细节成为事实标准。

同时，旧测试里仍有一些有价值行为尚未迁移到新 runtime，例如 control-flow source tests、logical/infix macro、运行时 session 复用、JS imperative bridge，以及脚本函数导出为 JS callable。这些能力应该迁移到当前 Kon 语法和 `RuntimeInterpreter` 基座上。

## “要做”和“不做” (Goals / Non-Goals)

**目标:**
- 删除或收缩已经被 `RuntimeInterpreter` 覆盖的旧解释器重复断言。
- 保留一组极小 legacy `Interpreter` API smoke tests。
- 用当前 Kon 语法和 `RuntimeInterpreter` 迁移仍有语言价值的旧测试点。
- 为 JS imperative bridge 设计并实现新 runtime 等价能力，覆盖旧 `js_call`、`js_apply` 的业务价值。
- 为脚本函数导出为 JS callable 设计并实现新 runtime embedding API，覆盖旧 `MakeFuncSync` 的业务价值。
- 保持新解释器仍基于 instruction stack 和 operand stack，不引入 command deque。

**非目标:**
- 不迁移 event queue 的 timer/scheduler 语义。
- 不迁移旧 `await_host_fn ... catch` async host interop 语义。
- 不迁移 self-update operators。
- 不重新引入完整旧 KNL 语法作为主要测试表面。
- 不迁移类型系统、typed effect row、typed contextual dispatch。

## 变更内容（What Changes）

- 新增 `RuntimeInterpreter` control-flow、logical expression、session、host interop、embedding API 测试。
- 根据测试需要补齐 `RuntimeInterpreter` 的当前 Kon source lowering 和 runtime handler。
- 删除或隔离旧 `Interpreter` 重复测试，只保留最小 legacy smoke suite。
- 新增或调整测试资源目录，使旧测试价值以当前 Kon 语法表达。
- 明确不处理 event queue、async host interop、self-update syntax。

## 影响范围（Impact）

- 受影响的功能规范：`runtime-interpreter`
- 受影响的代码：
  - `lib/RuntimeInterpreter/`
  - `__tests__/Case/RuntimeInterpreter*.test.ts`
  - `__tests__/Resource/RuntimeInterpreter/`
  - `__tests__/Case/Interpreter.test.ts`
  - `__tests__/Case/HostFunc.test.ts`
  - `__tests__/Case/Interop.test.ts`
  - `__tests__/Case/InfixMacro.test.ts`
