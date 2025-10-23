# 变更：将 kunun.ts 拆解为 bun workspaces 多包项目

## 背景和动机 (Context And Why)

kunun.ts 目前是单包项目，`lib/` 下的 Model、Converter、RuntimeInterpreter、TypeSystem 等模块边界靠目录约定维持，模块间已出现 RuntimeInterpreter ↔ TypeSystem 循环依赖。随着类型系统迁移（add-extensible-scoped-row-type-system）完成、后续修改即将展开，需要把模块边界提升为包边界，让依赖方向被工具强制约束；同时现有 mocha + ts-node + vite 工具链层次多、速度慢，统一迁移到 bun 可简化开发循环。`tsconfig.json` 中已预置 `packages/*/lib` 的 include，本变更将该意图落地。

## "要做"和"不做" (Goals / Non-Goals)

**目标:**
- 拆分为 5 个 workspace 包：`kunun-core`、`kunun-converter`、`kunun-runtime`、`kunun-type-system`、总包 `kunun`
- 用 TypeSystemBridge 依赖注入解开 RuntimeInterpreter → TypeSystem 的静态依赖，使包依赖图无环
- 工具链全面迁到 bun：bun workspaces、bun test、bun build（ESM+CJS）、tsc --noEmit 类型检查
- 测试按归属移入各子包，保持全部 234 个用例通过
- 总包导出面与原 `lib/index.ts` 完全一致（包名变更见 BREAKING 标注）

**非目标:**
- 不改变任何语言行为：parser 语法、runtime 默认 untyped 语义、类型检查 opt-in 机制不变
- 不反转 TypeSystem → RuntimeInterpreter 的 interpreter-backed type computation 设计（既定长期决策）
- 不拆解 Model/Util/Algo/StateManagement 之间的互相依赖（保留为单一 core 包）
- 不发布子包到 npm registry（仅 workspace 内部使用，发布策略另行决策）
- 不升级 TypeScript 版本或收紧编译严格度

## 变更内容（What Changes）

- 新增 `packages/` 目录，`lib/` 源码按模块归属迁移到 5 个子包；根 `lib/` 删除
- 根 `package.json` 改为 workspace 根；各子包新增 `package.json`（`workspace:*` 互相引用）；`depa-actor` 依赖移到 runtime 包
- runtime 包新增 `TypeSystemBridge` 接口与注册 API；`RuntimeInterpreter.ts` 移除对 TypeSystem 的 import，改走 bridge；type-system 包实现并导出注册函数；总包导入时自动注册
- `__tests__/Case/` 测试文件按归属移入各子包 `__tests__/`
- **BREAKING**（包名）：总包由 `@symtable/kunun` 改名为 `kunun`，消费方需更新依赖名与导入语句中的包名（导出符号集合不变）
- **BREAKING**（构建产物）：dist 不再提供 UMD 格式，改为 ESM + CJS（bun build 不支持 UMD）
- **BREAKING**（仓库工具链）：移除 vite、mocha、ts-node、rimraf、`.mocharc.yml`、`vite.config.ts`、`build/`；scripts 改为 bun 命令
- 更新 `codument/attractors/project.md` 记录技术栈变更；更新 README 的开发指引

## 影响范围（Impact）

- 受影响的功能规范：新增 `workspace-packaging` capability（本 track spec delta）；`runtime-interpreter` 的 opt-in 类型检查入口实现方式改变（行为不变）
- 受影响的代码：`lib/` 全部文件路径迁移；`RuntimeInterpreter.ts` 类型检查接入点重构；全部测试文件路径迁移
- 受影响的工作流：开发命令从 npm/yarn + mocha 改为 bun；VSCode launch.json 调试配置需要随后调整（不在本 track 强制范围）
