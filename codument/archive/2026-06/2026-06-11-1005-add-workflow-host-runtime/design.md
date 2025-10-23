# 设计：kunun-workflow-host 宿主运行时

## 上下文

- 前置：`add-workflow-dsl-yield-lowering` 提供 RunWorkflowSync/ResumeWorkflowSync 与 DSL→effect lowering（本 track 启动前必须完成）。
- 宿主工程设计要点：适配器/run store/调度/schema bridge；核心特性是基于 kunun checkpoint 的 durable execution。

## 方案概览

1. **包结构** packages/workflow-host（kunun-workflow-host，依赖 kunun-runtime——只消费 workflow API，不需要总包）
   - `lib/driver.ts`：核心循环。`executeRun(runDir)`：装载 .kon 源 → RunWorkflowSync → 落盘 checkpoint → scheduler 并发分派 jobs → bridge 执行 → 全量结果 → ResumeWorkflowSync → 循环；每步写 events.jsonl 与 status.json
   - `lib/adapters/`：config.ts（JSON 配置加载/合并）、builtin.ts（claude/codex/gemini 模板）、placeholders.ts、runner.ts（spawn 子进程 + timeout）
   - `lib/bridge.ts`：单 job 执行 = 适配器调用 + output_schema 提取/校验/纠错重试（json 提取三层候选）+ retry/timeout metadata 消费；请求中存在但适配器无原生映射的调用选项（如无 flags.model 的 model）发 option_unmapped 事件而非静默丢弃
   - `lib/store.ts`：RunStore（run 目录创建/原子写/读取），目录布局见 spec
   - `lib/scheduler.ts`：异步信号量 + maxAgents + budget 钩子（spent() 先返回 0）
   - `lib/control.ts`：control.json 轮询（pause/resume/stop），driver 在每次分派前检查
   - `lib/cli.ts` + bin：`kwf run <file.kon> [--args json] [--wait]`、status/logs/result/pause/resume/stop
2. **durable 语义**：checkpoint.json 在分派前写入；job 完成结果增量写入 jobs/ 子目录（或 events 重放）；crash 后 `kwf resume <runId>` 读 checkpoint + 已完成 job 结果，跳过已完成项只补跑未完成 job，再 ResumeWorkflowSync
3. **测试策略**：mock 适配器（脚本回显/产 JSON 的本地可执行）端到端；kill -9 worker 后续跑用例验证 durable；调度器并发上限用计数探针

## 影响范围与修改点（Impact）

- 新增 packages/workflow-host 全部；根 tsconfig paths 与 workspace 注册
- 不修改既有包行为

## 决策摘要

- 集成形态=独立 CLI + skill，库 API 顺带导出（用户已确认）
- CLI 命名暂定 `kwf`（实现期可在 decisions.md 调整）

## 风险 / 权衡

- 子进程 agent 的真实行为不可测 → 测试全部走 mock 适配器，真实适配器配置由 Track C 验证
- checkpoint 体积随 env 增长 → 先不优化，记录观测点
- bun 子进程/信号语义与 node 差异 → runner 用 Bun.spawn/child_process 二选一，实现期定并回写

## 待解决问题

- runId 生成与 workflow 命名 slug 规则
- failed job 注入后 workflow 内 try/catch 与宿主 retry 的边界（与 Track A 的 failed 语义对齐）
