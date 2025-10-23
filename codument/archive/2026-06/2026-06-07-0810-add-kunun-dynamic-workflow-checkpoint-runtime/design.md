## 上下文

本 track 的核心设计选择是直接使用 Kunun safe-point checkpoint runtime 来承载 Dynamic Workflows。Kunun 作为编程语言与解释器基座，保留顺序执行、局部变量、闭包、prefix/infix 宏、effect system、异常与循环语义；Bun coding agent 作为宿主，通过注册宏或函数扩展提供 workflow 上层操作。

这条路线不同于两类替代方案：

- 不采用 replay-cache runtime：不把“从头重跑 + job cache 命中”作为主恢复机制。
- 不采用 behavior-tree tick model：不让 workflow node 自己持有运行状态并由 runtime tick，而是让解释器 continuation 持有 instruction stack、operand stack、frame 与 pending effect。

## 方案概览

1. Kunun workflow extension 层
   - 宿主注册 `ai_workflow / ai_agent / ai_parallel / ai_pipeline / ai_phase / ai_log / json_schema`。
   - 这些扩展可以是 prefix keyword、infix keyword 或函数扩展。
   - `ai_parallel` 和 `ai_pipeline` 优先使用宏/keyword 形式，以控制子表达式求值结构并保留 source node id。
   - `ai_agent` 可以以宏或函数语法暴露，但运行时必须 lower 到 checkpoint-aware effect/opcode。

2. Checkpoint-aware effect lowering
   - `ai_agent` lower 到 `Workflow_AgentDispatch`。
   - `ai_parallel` lower 到 `Workflow_ParallelBatchStart`、child dispatch、`Workflow_ParallelBatchJoin`。
   - `ai_pipeline` lower 到 item/stage path aware 的 stage frame。
   - `ai_phase` / `ai_log` / `json_schema` 产生事件或 validation effect，可作为轻量 checkpoint boundary。

3. Runtime snapshot
   - 保存 all fibers，而不只保存 current fiber。
   - 保存 current fiber id、env tree、instruction stack、operand stack、effect handler stack、pending jobs、ai_phase/ai_log state。
   - 显式保存 `LoopFrame`、`ExceptionFrame`、`AbruptCompletion`。
   - 所有 native/host resource 通过 stable handle 保存，不能序列化的 host value 在 checkpoint boundary 报错。

4. Resume 模型
   - runtime hydrate 最新 checkpoint。
   - 对 pending job 查询模拟或真实 agent runtime。
   - 对 completed job 注入 result 并恢复 continuation。
   - 对 stale/failed job 按 policy retry、cancel 或 throw。
   - deterministic `jobId` 用于关联 job store 与 continuation frame，不用于主恢复逻辑的 replay。

5. depa-actor 通用内核补强
   - `StackMachine` 增加公开 `loadSnapshot` / `replaceState` 或等价 API。
   - `dispatchInstructions` 增加 lifecycle hooks 或明确的 `yield` stop convention。
   - snapshot helper 保持泛型，不引入 Kunun 或 AI 语义。
   - `CommandDequeGroup` 可用于外围 agent runtime job 调度，不进入 Kunun interpreter 主循环。

## 影响范围与修改点（Impact）

- Kunun RuntimeInterpreter
  - workflow extension registry
  - checkpoint snapshot/hydrate codec
  - workflow effect opcodes and handlers
  - loop/exception frame management
  - mock AI runtime integration tests

- depa-actor
  - stack hydrate/replaceState
  - dispatcher hooks/yield convention
  - snapshot helper tests

## 决策摘要

- 详见 `decisions.md`
- 当前关键结论：
  - `ai_workflow / ai_agent / ai_parallel / ai_pipeline / ai_phase / ai_log / json_schema` 是宿主扩展，不是语言内建。
  - 使用 macro/keyword lowering，但 lower 结果必须是 checkpoint-aware effect/opcode。
  - 使用 Kunun safe-point checkpoint 作为主恢复模型。
  - 不采用 behavior-tree tick model。
  - depa-actor 只提供通用内核能力。

## 风险 / 权衡

- 风险：checkpoint snapshot 过大。
  - 缓解：第一版只在 workflow yield boundary 保存，不在每条 instruction 保存。
- 风险：host value 不可序列化。
  - 缓解：引入 value codec 与 HostHandle，checkpoint boundary 检测不可序列化值。
- 风险：ai_parallel/ai_pipeline 宏展开复杂。
  - 缓解：先实现最小可测模型，再扩展语法糖。
- 风险：depa-actor 与 Kunun 责任边界混淆。
  - 缓解：depa-actor 只补通用 API，不引入 AI 或 workflow 命名。

## 兼容性设计

- 新能力应 opt-in，不影响已有 `RuntimeInterpreter` tests。
- 旧 `Interpreter` 仍只保留现有 smoke 兼容路径。
- depa-actor API 新增应保持向后兼容。

## 迁移计划

1. 先补 depa-actor 通用 API 并发布/本地构建。
2. Kunun 依赖本地 file dependency 使用新 depa-actor API。
3. 添加 Kunun workflow checkpoint runtime 测试与实现。
4. 使用模拟 AI runtime 验证完整关联。

## 多阶段 Kon Workflow Parity

前一版脚本级资源只覆盖了 `(ai_agent ...)`、`(ai_parallel ...)`、`(ai_pipeline ...)` 等单个原语能 lower 到 workflow effect，但距离真实多阶段 workflow 使用方式较远。后续测试资源应迁移为 Kon 表达的多阶段 workflow 脚本：

- `fan-out-reduce`：并行生成多个 draft，再 reduce/synthesize。
- `generate-and-filter`：并行生成、去重候选、pipeline 评分过滤。
- `loop-until-dry`：多轮并行发现、跨轮状态、动态停止或 bounded loop。
- `routing`：分类、动态选择 specialist、grade 输出。
- `adversarial-verify`：候选 finding、skeptic 验证、投票/归约。
- `tournament`：多候选方案、轮次状态、并行 judge、winner。
- `deep-research`：Plan/Search/Extract/Vote/Report 多阶段研究。
- `agent-daily-digest`：Discover/Extract/Synthesize/Verify/Report 端到端 digest。

这些 Kon 资源第一版用于验证“Kunun interpreter + workflow extension + mock AI runtime”能共同执行多阶段 workflow 结构。测试中的 mock AI runtime 可以同步完成 job，但必须通过 workflow extension 生成 checkpoint-aware effect，并记录 pending job metadata、ai_phase/ai_log/json_schema events 与 dispatch 顺序。这样测试目标从“单个原语 smoke”提升到“业务脚本结构可运行”。

本阶段不要求完全复刻 JavaScript 运行时语义，例如 JS closure、真实 async Promise、真实文件扫描、真实 LLM adapter、budget。Kon 表达应优先覆盖语言级编排结构：变量、条件、循环、阶段、ai_parallel barrier、ai_pipeline stage、nested ai_agent dispatch、checkpoint metadata。之前过于简单的 workflow resource 可以逐步删除，保留 opcode 级测试作为底层 dispatch/yield 覆盖。

### 语言内 DSL 资源表示约定

Workflow 示例资源应优先使用 Kunun/Kon 自身的 knot 结构，而不是把 TypeScript API 逐字翻译成函数调用。顶层使用 `(ai_workflow #name ...)` 表示一个可由宿主 workflow keyword/macro 处理的语言节点；`:input`、`:output` 是 workflow 的内置 named section；业务阶段必须放在 workflow body 中，以 `(ai_phase #Discover :[ ... ])`、`(ai_phase #Extract :[ ... ])` 等节点表达。`Discover`、`Extract`、`Synthesize` 等名称是用户可生成的阶段名，不与 `:input`、`:output` 这些内置 section 放在同一级。

`ai_agent`、`ai_parallel`、`ai_pipeline`、`stage`、`ai_log` 也应保持为 Kon 语言节点：名称用 `#nodeName`，结构化配置放在 `:{...}`，子步骤放在 `:[...]`。宿主侧 runtime/macro 在 lowering 时读取 raw `sourceNode` 的 `Name`、`Conf`、`Body`、`Sections`，而不是依赖把 DSL 节点先求值成普通 JS 位置参数。

`ai_agent` 节点配置必须区分系统提示与用户提示：使用 `sys_prompt` 和 `user_prompt`，不再使用单一 `prompt` 字段。`sys_prompt` 表达节点角色、边界和输出约束，`user_prompt` 表达当前节点的具体任务输入。提示词应优先使用 Kunun 解释型字符串和多行字符串插值，例如 `"\(name)"` 或三引号字符串中的 `\((finding.:title))`，而不是数组拼接或 TypeScript 模板字符串迁移痕迹。

输出结构声明使用 `output_schema`，不使用泛化的 `schema` 字段。可复用 JSON schema 应在 workflow 节点上方用命名定义表达，例如 `(var VERDICT_OUTPUT_SCHEMA {...})`，`ai_agent` 节点中通过 `output_schema = VERDICT_OUTPUT_SCHEMA` 引用。

`ai_parallel` 和 `ai_pipeline` 的 `input` 配置是一个 Kunun 表达式，求值后作为 fan-out 或 pipeline 的数据源。资源 DSL 应显式声明绑定名：`item` 表示原始输入元素，`index` 表示元素下标，`value` 表示 pipeline 当前 stage 输入值。子 `ai_agent` 或 `stage` body 通过普通 Kunun 变量引用和字符串插值使用这些绑定，例如 `user_prompt = """ ... \((finding.:detail)) ... """`。

## 待解决问题

- 是否还需要在 `output_schema` 引用之外额外提供独立 `json_schema` registry/macro。
- `ai_phase` / `ai_log` 是否每次都写 checkpoint，还是仅写 events。
- `ai_parallel` 第一版是否支持 nested parallel 与 pipeline 内 parallel。
