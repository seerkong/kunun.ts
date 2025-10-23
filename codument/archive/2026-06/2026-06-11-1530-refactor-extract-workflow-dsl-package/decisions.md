# Decisions

### 1. 【P0】拆包与去特例化
- 用户答复：拆出 kunun-workflow-dsl 独立包；底层只做通用机制，不做特例（2026-06-11，用户原话）
- 最终决策：WorkflowDsl 整体迁出为独立包；RuntimeState 默认 lowering 移除 ai_ 名字魔法，job 展开改显式声明（jobExpansion: 'single'|'perArg' + buildJobs 回调）
- 状态：confirmed

### 2. 【P1】workflow-dsl 的依赖面
- 选项：A) 依赖 kunun-core + kunun-runtime，经 runtime 新增的通用 DispatchUntilStop 驱动循环（不直接依赖 depa-actor） B) 直接依赖 depa-actor
- 当前建议：A —— 调度原语集中在 runtime，一层封装一个职责
- 最终决策：A
- 状态：confirmed

### 3. 【P1】runtime 不再导出 DSL API 的兼容面
- 最终决策：接受 BREAKING；kunun 总包补 re-export（export * from 'kunun-workflow-dsl'），workflow-host 改 import 来源。仓库内消费方全部同步修改。
- 状态：confirmed

### 4. 【P2】spec delta 合并顺序
- 背景：add-workflow-dsl-yield-lowering 等已完成 track 尚未归档，其 delta（runtime-interpreter 下的 DSL requirement）未入 registry。
- 最终决策：本 track delta 对 spec://workflow-dsl 用 upsert 全量写入 DSL 需求、对 spec://runtime-interpreter 下的 4 个 DSL requirement 用 delete、并 upsert 修订 generic job expansion；**归档顺序要求：先归档 add-workflow-dsl-yield-lowering（及其余已完成 track），再归档本 track**。
- 状态：confirmed
