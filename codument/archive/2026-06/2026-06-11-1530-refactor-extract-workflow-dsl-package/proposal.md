# 变更：拆出 kunun-workflow-dsl 独立包，runtime 去特例化

## 背景和动机 (Context And Why)

当前 ai_* workflow DSL 与语言级通用机制同住 kunun-runtime 包：虽是 opt-in 模块边界（WorkflowDsl.ts + EnableWorkflowDsl），但 (1) 不要 workflow 的 runtime 使用者也会携带 DSL 代码与导出；(2) RuntimeState 的默认 lowering 里残留 AI 命名特例——`getWorkflowPrimitiveName` 剥 `ai_` 前缀并按 parallel/pipeline 名字决定 job 展开方式，域中立层被特定命名约定渗透。用户决定：拆出 `kunun-workflow-dsl` 独立包；**底层只做通用机制，不做特例**。

## "要做"和"不做" (Goals / Non-Goals)

**目标:**
- 新包 `packages/workflow-dsl`（kunun-workflow-dsl）：迁入 WorkflowDsl 全部内容（ai_* lowering、请求捕获、派发序号、RunWorkflowSync/ResumeWorkflowSync、事件缓冲）及其测试与 .kon 资源
- **runtime 去特例化**：默认 lowering 移除 ai_ 前缀剥离与名字分支；job 展开改为显式通用机制——`registerWorkflowExtension` options 支持 `jobExpansion: 'single'（默认）| 'perArg'` 与自定义 `buildJobs(args, sourceNodeId)` 回调；runtime 内既有 mock/extension 测试改为显式声明
- runtime 新增通用 `DispatchUntilStop` 公共 API（run-until-yield/empty 循环），workflow-dsl 不再直接依赖 depa-actor
- kunun-workflow-host 与 kunun 总包改为依赖 kunun-workflow-dsl；总包 re-export 保持 DSL API 可用面不变
- 依赖方向：core ← converter ← runtime ← workflow-dsl ← workflow-host / kunun

**非目标:**
- 不改变 Kon DSL 语法与 yield/resume 语义（外部行为等价，SKILL.md 无需改语法部分）
- 不动 workflow-host 的宿主工程（仅 import 来源切换）
- 不在本 track 归档历史 track（但 spec delta 的合并顺序要求先归档 add-workflow-dsl-yield-lowering 等，见 design）

## 变更内容（What Changes）

- 新增 packages/workflow-dsl；packages/runtime 删除 WorkflowDsl.ts 及其 index 导出
- **BREAKING**（包 API）：`kunun-runtime` 不再导出 EnableWorkflowDsl/RunWorkflowSync/ResumeWorkflowSync 等 DSL API——改从 `kunun-workflow-dsl`（或 kunun 总包）导入
- **BREAKING**（默认 lowering 语义）：名字以 ai_parallel/ai_pipeline 注册且未声明 jobExpansion 的扩展，默认从按名字展开变为单 job；需显式传 `jobExpansion`/`buildJobs`
- RuntimeState：删除 getWorkflowPrimitiveName；buildPendingWorkflowJobs 改为通用展开；新增 DispatchUntilStop
- tsconfig paths、workspace、总包/host 依赖与 re-export 更新

## 影响范围（Impact）

- 受影响的功能规范：runtime-interpreter（通用 job 展开修订）、新增 workflow-dsl capability（DSL 需求迁移）
- 受影响的代码：packages/runtime、新 packages/workflow-dsl、packages/workflow-host（imports）、packages/kunun
- 上游依赖：add-kwf-mcp-and-embedded-binary（completed）
