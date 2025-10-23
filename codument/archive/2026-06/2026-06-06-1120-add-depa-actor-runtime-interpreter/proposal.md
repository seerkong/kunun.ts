# 变更：新增基于 depa-actor 的运行时解释器

## 背景和动机 (Context And Why)

本项目刚完成 Kon parser 语法同步，但解释器仍是旧的 `XnlState`/静态 `ExtensionRegistry`/本地 `StackMachine` 实现。此前验证说明 parser 改造后解释器侧存在风险，需要一个新的解释器主线承接后续运行时演进。

同时，`/Users/kongweixian/lang/ExtensibleScopedRowType` 中的 Kon.Interpreter 已形成更清晰的运行时结构：runtime-owned registry、双栈 VM、fiber-aware loop、execution history、typed runtime context extension point。`depa-actor@0.2.0` 通过本地路径依赖 `file:/Users/kongweixian/infra-dev/depa-actor` 接入，并提供可复用的 execution kernel primitives，适合作为新解释器内核的内核。

## “要做”和“不做” (Goals / Non-Goals)

**目标:**
- 新增一套 opt-in 的解释器 runtime，不直接替换旧 `Interpreter`。
- 使用本地路径依赖 `file:/Users/kongweixian/infra-dev/depa-actor` 解析到的 `depa-actor@0.2.0` stack/frame 和 dispatch primitives。
- 优先移植 ExtensibleScopedRowType Kon.Interpreter 的运行时能力和架构边界。
- 建立 runtime-owned handler registry、fiber state、instruction history、env access、host function/object/property/subscript 等基础能力。
- 为后续移植 ExtensibleScopedRowType 类型系统预留 typed runtime context 扩展点。
- 用测试区分 parser 问题和解释器 runtime 问题。

**非目标:**
- 本 track 不修改 parser 语法。
- 本 track 不实现完整类型系统、type binder 或 type checker。
- 本 track 不一次性删除旧解释器。
- 本 track 不要求旧解释器所有特色一次性迁移完成。
- 本 track 不向 depa-actor 写入语言或 AI 专用语义。

## 变更内容（What Changes）

- 新增 runtime-interpreter 能力规范。
- 新增基于 depa-actor primitives 的解释器 runtime 模块。
- 新增 runtime state、fiber state、instruction model、handler registry、entry point、dispatch loop。
- 迁移 ExtensibleScopedRowType Kon.Interpreter 的基础运行时能力作为第一阶段目标。
- 增加测试覆盖基本表达式/块执行、环境、host function、对象属性/下标、fiber loop、执行历史和 legacy path 不变。
- **BREAKING**：无计划破坏旧解释器 API；新解释器应为 opt-in。

## 影响范围（Impact）

- 受影响的功能规范：`runtime-interpreter`
- 受影响的代码：
  - `package.json`：添加 `depa-actor` 本地路径依赖，指向 `/Users/kongweixian/infra-dev/depa-actor`。
  - `lib/RuntimeInterpreter/` 或等价新目录：新增 runtime implementation。
  - `lib/index.ts`：导出新解释器入口。
  - `__tests__/Case/`：新增 runtime interpreter tests。
  - 旧解释器相关文件只允许做适配性导出或测试保护，不作为主要改造对象。
