# 设计：拆出 kunun-workflow-dsl 与 runtime 去特例化

## 上下文
- 用户决策：底层只做通用机制，不做特例。现状见 analysis/findings.md。

## 方案概览
1. **runtime 通用化（P1）**
   - RuntimeWorkflowExtensionOptions 增：`jobExpansion?: 'single' | 'perArg'`（默认 single）、`buildJobs?: (args, sourceNodeId, extensionName) => RuntimePendingWorkflowJob[]`
   - defaultWorkflowExtensionLowering：按注册时 options 选择展开；删除 getWorkflowPrimitiveName 与 parallel/pipeline 名字分支
   - 新增 `RuntimeInterpreter.DispatchUntilStop(runtime, maxInstructions?)`：封装 dispatchInstructions 循环，返回 { stopReason, effects }；error/missing_handler 抛异常
   - runtime 既有测试改显式：ai_parallel→{jobExpansion:'perArg'}；ai_pipeline mock 的 item×stage 路径改 buildJobs 回调复刻（其语义本就是宿主自定义）
2. **拆包（P2）**
   - packages/workflow-dsl（kunun-workflow-dsl，deps: kunun-core+kunun-runtime）：lib/WorkflowDsl.ts + index；导入改包名；dslWorkflowLowering 不变（自定义 lowering 不受默认展开影响）；执行循环改 DispatchUntilStop
   - runtime 删除 WorkflowDsl.ts 与 index 导出（BREAKING，仓库内消费方同步切换）
   - workflow-host：driver/cli 等 import 改自 kunun-workflow-dsl；package.json 增依赖
   - kunun 总包：增依赖并 `export * from 'kunun-workflow-dsl'`（外部可用面不变）
   - tsconfig paths 增 kunun-workflow-dsl 与 kunun-workflow-dsl/*
   - 测试迁移：RuntimeInterpreterWorkflowDslLowering/WorkflowResume/WorkflowResource + Resource/Workflow → packages/workflow-dsl/__tests__；CheckpointStrict/Continuation/Checkpoint/Mock/Extension 留 runtime（通用机制）
3. **收敛（P3）**：全量 + build:bin + CompiledBinary + 文档（attractors 包边界、README 布局表）

## 影响范围与修改点（Impact）
- packages/runtime（去特例化+删模块）、新 packages/workflow-dsl、packages/workflow-host（imports）、packages/kunun（re-export）、根 tsconfig

## 决策摘要
- 见 decisions.md（1-4 全部 confirmed）

## 风险 / 权衡
- mock 测试断言的 job path（item:i / item:i:stage）必须在显式声明下逐字保持 → buildJobs 回调精确复刻
- 总包 re-export 名冲突（workflow-dsl 与 runtime 无同名导出，已知无冲突）
- CompiledBinary 重新打包路径变化 → 冒烟测试覆盖

## 待解决问题
- 无
