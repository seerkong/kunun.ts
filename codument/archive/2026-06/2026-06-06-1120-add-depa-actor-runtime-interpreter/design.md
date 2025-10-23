## 上下文

本 track 是 parser 同步后的解释器主线。目标不是继续在旧 `XnlState` 上补丁式修复，而是新增一套基于 `depa-actor@0.2.0` execution primitives 的 runtime interpreter。依赖通过 `file:/Users/kongweixian/infra-dev/depa-actor` 本地路径解析，便于开发中同步补齐 depa-actor 能力而不频繁改 semver。旧解释器保留，方便回归对照和逐步迁移。

ExtensibleScopedRowType 的 Kon.Interpreter 目标结构包括：
- runtime-owned extension registry
- env tree / runtime state
- fiber manager / current fiber
- instruction stack + operand stack
- instruction history
- sync/async block evaluation
- typed runtime context extension point

depa-actor 提供的可复用底座包括：
- `createInstructionStack`
- `createOperandStack`
- `createStackMachine`
- `dispatchInstructions`

## 方案概览

1. 新增 runtime interpreter 模块
  - 建议目录：`lib/RuntimeInterpreter/`
  - 入口类或对象：`RuntimeInterpreter` / `KonRuntimeInterpreter`
  - 保留旧 `Interpreter`，新入口独立导出。

2. 运行时状态模型
  - `KonRuntimeState`：持有 env tree、fiber manager 或 fiber map、handler registry、instruction history、optional typed context。
  - `KonRuntimeFiber`：持有 fiber id、parent id、current env id、status、instruction stack、operand stack。
  - instruction/operand stacks 使用 depa-actor primitives。
  - 本项目解释器 runtime 的主循环只基于 instruction stack、operand stack 和 dispatch。

3. 指令与分派
  - 新 instruction shape 使用 depa-actor `KernelInstruction` 兼容结构：`opcode` + `memo` + env/comment metadata。
  - handler registry 由 runtime 实例持有，支持注册 opcode handler、prefix keyword expander、infix keyword expander。
  - dispatch loop 使用 `dispatchInstructions` 或在其上封装 fiber-aware loop。
  - handler 语义属于 kunun runtime，不沉入 depa-actor。

4. 迁移 ExtensibleScopedRowType runtime baseline
  - 第一阶段移植 entry point、block/node execution、value stack/env handler、host function integration、property/subscript/object basics。
  - 对比 ExtensibleScopedRowType tests，先挑选 BasicInterpreter、SimpleExpression、HostFunction、Object、ChainExpression 中最小可迁移集合。
  - 类型系统只预留 context/prototype resolver，不实现 binder/checker。

5. 兼容与验证
  - 旧 `Interpreter.Eval*` 不改默认行为。
  - 新解释器 tests 使用新入口。
  - 回归测试需要同时运行 parser tests 和 legacy interpreter tests，确认新增路径不会扩大 parser 同步后的问题。

## 影响范围与修改点（Impact）

- `package.json`：新增 `depa-actor` 本地路径依赖，指向 `/Users/kongweixian/infra-dev/depa-actor`，解析版本来自该包自身 `package.json`。
- `lib/RuntimeInterpreter/`：新增 runtime state、fiber、instruction、registry、engine、entry point、handlers。
- `lib/index.ts`：导出新解释器 API。
- `__tests__/Case/RuntimeInterpreter.test.ts`：新增新解释器测试。
- `__tests__/Resource/`：可新增最小 runtime 迁移脚本资源。

## 决策摘要

- 不创建 `decisions.md`：当前用户已确认 track id 和方向，关键边界足够明确。
- 当前关键结论：
  - 新解释器使用本地路径依赖 `file:/Users/kongweixian/infra-dev/depa-actor` 解析到的 `depa-actor@0.2.0` 作为内核底座。
  - 本 track 以 ExtensibleScopedRowType runtime 能力迁移为主。
  - 本 track 不实现完整类型系统，不删除旧解释器。

## 风险 / 权衡

- 风险：直接移植全部旧/外部 runtime 范围过大。
  - 缓解：先建立 runtime skeleton 和最小行为基线，再分批迁移 handler。
- 风险：depa-actor 本地路径依赖只适合当前开发机环境。
  - 缓解：本 track 明确这是开发期依赖策略；发布或跨机协作时另行切回 semver 或 workspace 协议。
- 风险：parser AST 与 ExtensibleScopedRowType AST 不完全一致。
  - 缓解：新 runtime 以本项目 parser/model 为输入，迁移外部 runtime 机制而不是逐字复制 AST 类型。
- 风险：旧解释器特色丢失。
  - 缓解：旧解释器保留；新解释器 tests 先覆盖 ExtensibleScopedRowType runtime baseline，再逐步补旧特色。

## 兼容性设计

- 新解释器 opt-in 导出，不改变旧 `Interpreter` 默认路径。
- 旧 `ExtensionRegistry` 保留；新 runtime registry 独立。
- 旧 `XnlState` 保留；新 runtime state 独立。
- 如果后续需要切换默认解释器，应另开 track。

## 迁移计划

1. 添加 depa-actor file path dependency validation。
2. 编写新解释器 skeleton 的 failing tests。
3. 实现 runtime state、fiber、registry、engine。
4. 移植基础 handlers。
5. 添加 ExtensibleScopedRowType runtime parity tests。
6. 运行 parser、legacy interpreter、新 runtime interpreter 全量测试。

## 待解决问题

- 新解释器公开名称最终确定为 `RuntimeInterpreter` 还是 `KonRuntimeInterpreter`。
- 第一批 ExtensibleScopedRowType tests 的精确清单在实现阶段根据 AST 差异确定。
- 是否需要 async entry point 第一阶段同步完成，还是先完成 sync baseline。
