# 设计：Workflow DSL 与 yield/checkpoint 运行时合龙

## 上下文

- 现状两条线（见 `analysis/findings.md`）：
  - **yield 线**（真）：`registerWorkflowExtension(name, lower?)` → 表达式被 lower 为 `WorkflowDispatch` 指令 → handler 构造 `RuntimeWorkflowEffect{ name, args, pendingJobs, checkpoint }` 并 `yield_requested`。job ID/path 生成已支持 ai_agent 单 job、ai_parallel 按 item 展开、ai_pipeline 按 item×stage 展开。测试：RuntimeInterpreterDynamicWorkflowMock / RuntimeInterpreterWorkflowExtension。
  - **DSL 线**（桩）：RuntimeInterpreterWorkflowResource.test.ts 用 `registerPrefixKeyword` 手工注册 ai_* 关键字做内联 mock 执行，验证了 DSL 语法形态（named sections、input/item/index 绑定、prompt 插值），但完全不经过 effect/yield/checkpoint。
- 本 track 把 DSL 线接到 yield 线上，并固化宿主消费循环 API。下游 add-workflow-host-runtime 直接依赖本 track 的 API。

## 方案概览

1. **内建 DSL lowering 模块**（packages/runtime/lib/RuntimeInterpreter/WorkflowDsl.ts）
   - `EnableWorkflowDsl(runtime)`：【实现回写】采用 b)+a) 组合——六个 DSL 节点经 **prefix keyword expander** 处理（可访问 knot 的 Name/Conf/NamedConf/Body/Sections 结构），其中 ai_agent/ai_parallel/ai_pipeline 生成 `WorkflowDispatch` 指令；同时为这三个名字注册**定制 workflow extension lowering**（dslWorkflowLowering），在 dispatch 时构造带富 metadata 的 pendingJobs（label/retry/timeout/outputSchema/item/itemIndex/stageName/stageIndex）并 captureSnapshot
   - 【实现回写】**请求捕获模式**：ai_parallel/ai_pipeline 对每个 item 在局部绑定环境下同步执行 body，期间 ai_agent expander 处于 capture 态——产出 `WorkflowAgentRequest` 对象而非 dispatch；body 中非 agent 语句在请求构建期执行（body 即请求构建闭包）；嵌套 parallel/pipeline 捕获不支持（明确报错）
   - 各节点语义（与 .kon 资源测试一致）：
     - `ai_agent`：求值 sys_prompt/user_prompt（含插值）→ 单 job；retry/timeout/label/output_schema 求值后入 metadata
     - `ai_parallel`：求值 input 集合 → 按元素展开 N 个 job，metadata 记 itemIndex 与 item 绑定值；resume 时按 itemIndex 聚合
     - `ai_pipeline`：【实现回写】确定为**每 stage 一次 yield**——经自定义指令 `WorkflowDsl_PipelineStage`（memo 含 stages AST/items/绑定名/stageIndex，可序列化入 checkpoint）逐段推进，stage N+1 的请求在 stage N 结果注入后用 value 绑定构建；与 mock 测试中直接指令形态的一次性 item×stage 展开并存（两者 sourceNodeId 不同，互不冲突）
     - `ai_phase` / `ai_log`：内联记录到 runtime 事件缓冲（不 yield），供宿主在 effect 间读取；ai_log 的消息求值后入缓冲
     - `ai_workflow`：建立 workflow 作用域（input/output sections 绑定），整体顺序执行
2. **执行循环 API**（【实现回写】最终为 WorkflowDsl.ts 模块函数，从 kunun-runtime 导出，而非 RuntimeInterpreter 静态方法——避免继续膨胀 3000 行的 RuntimeInterpreter.ts）
   - `RunWorkflowSync(runtime, source) → { status: 'yielded', effect } | { status: 'completed', result }`
   - `ResumeWorkflowSync(runtime, checkpoint, results: { [jobId]: { status: 'completed'|'failed', value?|error? } }) → 同上`
   - 约定：注入即更新 checkpoint 内 pendingJobs 状态；全部 job 完成才推进（部分注入返回仍 yielded 的同 effect 视实现复杂度决定，默认要求全量注入）
   - failed 注入：在 workflow 内表现为该节点抛出可被语言级 try/catch 捕获的错误
3. **strict 序列化校验**
   - `captureSnapshot({ strict: true })` 或独立 `assertSnapshotSerializable(snapshot)`：深度遍历，检出函数/类实例/循环引用，错误信息含路径（如 `fibers[0].operandItems[2]`）
4. **测试迁移**
   - WorkflowResource 测试改用 EnableWorkflowDsl + mock 宿主循环（complete job→resume），保留原断言（结构、插值、绑定）；原 prefix-keyword 桩删除

## 影响范围与修改点（Impact）

- 新增：packages/runtime/lib/RuntimeInterpreter/WorkflowDsl.ts
- 修改：RuntimeState.ts（job metadata 扩展、事件缓冲、strict 校验）、RuntimeInterpreter.ts（RunWorkflowSync/ResumeWorkflowSync、WorkflowDispatch handler 增强）、runtime index 导出
- 测试：新增 WorkflowDslLowering、WorkflowResume、CheckpointStrict 测试；改造 RuntimeInterpreterWorkflowResource.test.ts

## 决策摘要

- 详见 `decisions.md`。已确认：纯 Kon DSL（不做 JS 方言）；runtime 不执行 retry/timeout 语义（透传宿主）；ai_phase/ai_log 不 yield。

## 风险 / 权衡

- ai_pipeline 逐 stage yield 与现有一次性 item×stage job 展开可能冲突 → 实现期以测试语义为准择一，回写设计与 spec
- DSL 参数求值时机：必须在 checkpoint 捕获前完成（求值结果入 job args/metadata），否则 resume 后重复求值 → lowering 设计确保先求值后 dispatch
- 现有 mock/extension 测试不得回归 → 全量测试为安全网

## 实现期补充决策（回写）

- ai_workflow output section 返回值形态：对 `:output = [a b c]` 中每个节点求值后的**数组**（与原测试桩语义一致）
- failed job 注入语义：无异常控制帧时 ResumeWorkflowSync 在宿主侧抛含 jobId 与错误消息的 Error；存在异常帧时设置 pendingAbruptCompletion(throw, targetFrameId) 交由帧机制处理（与既有 mock 测试同机制）；"语言级 try/catch 捕获"依赖 kunun 源码层异常语法接通控制帧，留待后续 track
- 序列化边界加固：发现并修复 GetWordName 依赖类方法 GetFullNameStr 导致 JSON 往返后 Word 名退化为 [object Object] 的缺陷，增加纯数据字段回退；这是 strict 校验之外的实际边界修复
- DSL 事件缓冲：WeakMap<RuntimeState, events> 存于模块，不入 snapshot（观测信号，宿主在 yield 间读取）

## 待解决问题

- 无
