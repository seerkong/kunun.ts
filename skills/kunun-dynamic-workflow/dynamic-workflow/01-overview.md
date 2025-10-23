# 动态工作流总览：可恢复的多 agent 编排

本章建立动态工作流的概念模型：它是什么、解决什么问题、它在 kunun 体系里的位置，以及它赖以工作的 durable（可持久、可恢复）执行模型。**具体的 DSL 语法（六个节点的精确写法、配置键、陷阱）留到 [02 章](./02-dsl-reference.md)**；本章只给出能让你正确建立心智模型所需的最小、已验证的语法示例。

> 语法说明（Kon）：`()` 是 knot/chain，`[]` 是 vector，`{}` 是 map。容器元素**只用空白分隔**，**逗号不是分隔符**：写 `[1 2 3]`、`{a = 1 b = 2}`，而 `[1, 2]` 会被拒绝（实测抛 `Comma separators are not allowed in this syntax profile`）。逗号在 kunun 里另有专用语义（unquote `,expr` / unquote-splice `,@` / unquote-map `,%`），正因如此它不能再兼作分隔符。字符串插值是 `\(expr)`。来源：`codument/behaviors/parser-syntax.xml:2-41,146-165`。

---

## 1. 动态工作流是什么、解决什么问题

一个**动态工作流**是一段 `.kon` 脚本，它把若干次 **agent（LLM）调用**编排成一个可恢复的过程：fan-out（一题多路并发）、pipeline（逐 item 分阶段处理）、routing（先分类再只派一个专家）、循环直到收敛、adversarial verify（多 agent 互相质疑）等。

它要解决的核心问题是：**多 agent 编排既慢又脆**。

- agent 调用是昂贵且耗时的（一次可能几十秒到几分钟），一个真实工作流往往要串/并十几次。
- 进程可能在中途崩溃、被人为 `pause`、被 `stop`，或机器重启。
- 朴素做法（一个长跑脚本，状态全在内存里）一旦中断，**已经花掉的 agent 调用全部白费**，必须从头再来。

动态工作流的答案是：**把每一次 agent 调用都变成一个 checkpoint 边界**。在派发 agent 之前，整个解释器状态被序列化落盘；agent 跑完后，结果被注入回这个已保存的状态继续执行。于是一个运行可以被暂停、恢复，或在崩溃后**从工作流中段**恢复，而**不重复已经完成的 agent 工作**。来源：`skill/SKILL.md:8-12`、`codument/behaviors/workflow-host-runtime.xml:2-9`。

这套东西通过 `kwf` 命令行/MCP 工具驱动运行。本章只在需要时提到 `kwf`；运行细节见 [04 章 host runtime](./04-running-kwf.md)。

---

## 2. 它是 host 注册的扩展（`ai_*`），不是语言内置 —— 务必记牢

这是理解整个体系最关键的一条，会直接影响你写代码的方式：

> `ai_workflow` / `ai_phase` / `ai_log` / `ai_agent` / `ai_parallel` / `ai_pipeline`（共六个，没有别的）**不是 kunun 语言的内置关键字**。它们是 host 在运行时通过 `EnableWorkflowDsl(runtime)` 注册到解释器上的**扩展**。来源：`packages/workflow-dsl/lib/WorkflowDsl.ts:281-423`、`codument/behaviors/runtime-interpreter.xml:167-203`。
>
> 注意：**没有名为 `json_schema` 的节点**。JSON Schema 不是关键字，而是以一个 map 的形式作为 `ai_agent` 的 `output_schema` 配置键的**值**传入（详见 [02 章 §5b](./02-dsl-reference.md)）。

具体含义，逐条落到你能操作的层面：

1. **它们活在独立的包里**。`ai_*` 语义全部位于 `kunun-workflow-dsl` 包（依赖 `kunun-core` 与 `kunun-runtime`）。`kunun-runtime` 本身**不含任何 `ai_*` 语义**，只提供一个领域中立的通用机制。来源：`codument/behaviors/workflow-dsl.xml:2-21`。

2. **没有任何"名字魔法"**。运行时不会因为扩展名叫 `ai_parallel` 就特殊处理它。per-item fan-out、逐 stage 这些行为，全部由 `kunun-workflow-dsl` 在注册时**显式声明的 lowering 逻辑**实现，而不是运行时识别名字。来源：`packages/workflow-dsl/lib/WorkflowDsl.ts:226-335`、`codument/behaviors/runtime-interpreter.xml:483-507`（`generic-workflow-job-expansion`、`no-name-magic`）。

3. **没注册就不存在**。如果你在一个裸 `kunun-runtime` 上（没调用 `EnableWorkflowDsl`）写 `(ai_agent ...)`，它不是关键字 —— 解释器不知道这是什么。这些节点只有在 host（`kwf` 或你自己调用 `EnableWorkflowDsl`）启用 DSL 之后才有意义。

**为什么这点重要**：它意味着 `ai_agent` 这样的形态可以拥有普通 host 函数做不到的能力 —— 控制求值、在求值中途**让出（yield）控制权并保存可恢复的续延（continuation）**。普通函数调用无法做到这一点（理由见下一节）。当你写工作流时，请把 `ai_*` 当作"会在调用边界暂停整个程序"的特殊形态来理解，而不是普通函数。

下面是一个最小、已验证可跑通的工作流，用来锚定后续讨论：

```kon
(ai_workflow #demo
  :input = {q = "hi"}
  :output = [answer]
  :[
    (ai_phase #Main
      :[
        (var answer (ai_agent #ask :{
          label = "asker"
          sys_prompt = "sys"
          user_prompt = "q = \(q)"
        }))
      ])
  ])
```

- **用途**：把一次 agent 调用包成一个完整工作流。
- **语义**：`:input` 的每个 map 条目被绑定为普通变量（这里 `q = "hi"`）；body 顺序执行；`:output` 列出的变量在结束时被求值并作为**结果数组**返回。来源：`packages/workflow-dsl/lib/WorkflowDsl.ts:337-348,290-294`。
- **验证**：`kwf dry-run`（不调用任何模型，用 schema 形状的 mock 注入）→ `status: completed (ok)`，`yields: 1`，prompt 渲染为 `q = hi`，`result: ["dry-run:ask"]`。

> 陷阱预告（[02 章](./02-dsl-reference.md)详述）：`#name` 是一个 kunun **word**，而 `-` 是减法算符。`#draft-doc` 会被解析成 `#draft` 减 `doc`，并**静默丢弃**配置块。请用 camelCase（`#draftDoc`）或下划线。来源：`packages/workflow-dsl/lib/WorkflowDsl.ts:72-77`。

---

## 3. Durable 模型：checkpoint / resume / 崩溃恢复

### 3.1 核心循环

host 以一个固定循环驱动一个 `.kon` 工作流直到完成：

```
run-until-yield  →  checkpoint 落盘  →  分派 pendingJobs  →  注入结果  →  resume  →  （回到 run-until-yield）
```

关键不变量：**每个 yield 边界的 checkpoint 先于 job 分派持久化**。因此进程在任意 job 执行期间崩溃或被停止后，能从最近一次 checkpoint 与已完成的 job 结果续跑，**不重复已经完成的工作**。来源：`codument/behaviors/workflow-host-runtime.xml:2-9`、`packages/workflow-host/lib/driver.ts:30-116`。

### 3.2 checkpoint 是什么

一个 checkpoint 是一次完整的 `RuntimeSnapshot`，在 yield 时、**agent 还没跑之前**捕获，包含：指令栈、操作数栈、所有 fiber（标明当前 fiber）、当前环境树、effect handler、循环/异常控制帧、以及待处理的 job 元数据。这个快照是 **JSON 可往返序列化**的。来源：`codument/behaviors/runtime-interpreter.xml:186-235`、`packages/runtime/lib/RuntimeInterpreter/RuntimeState.ts:104-115`。

> 为什么能做到这一点，是下面 §5 的主题：kunun 的执行模型是**指令栈展开**而非树遍历，所以续延是显式且可序列化的。

### 3.3 一个端到端、已验证的 round-trip

下面这段不依赖 `kwf`，直接用 `kunun-workflow-dsl` 的底层 API 演示 durable 模型，**已实际跑通**：

```ts
import { RuntimeInterpreter } from "kunun-runtime";
import { EnableWorkflowDsl, RunWorkflowSync, ResumeWorkflowSync } from "kunun-workflow-dsl";

const src = `
(ai_workflow #t
  :input = {topic = "caches"}
  :output = [draft]
  :[
    (ai_phase #P
      :[
        (var draft (ai_agent #draftDoc :{
          sys_prompt = "You write."
          user_prompt = "Write about \\(topic)."
        }))
      ])
  ])`;

const rt = RuntimeInterpreter.CreateRuntime();   // 注意：CreateRuntime，不是 NewRuntime
EnableWorkflowDsl(rt);

const out1 = RunWorkflowSync(rt, src);
// out1.status === "yielded"
// out1.effect.name === "ai_agent"，out1.effect.pendingJobs.length === 1
// out1.effect.pendingJobs[0].id === "ai_agent:prefix:ai_agent:draftDoc@1/job:0"

// checkpoint 是纯 JSON：可落盘、可在另一台机器、另一个进程恢复
const checkpoint = JSON.parse(JSON.stringify(out1.effect.checkpoint));

// 在一个全新的 runtime 上恢复（模拟崩溃后重启）
const rt2 = RuntimeInterpreter.CreateRuntime();
EnableWorkflowDsl(rt2);
const out2 = ResumeWorkflowSync(rt2, checkpoint, {
  [out1.effect.pendingJobs[0].id]: { status: "completed", value: { text: "LRU is fine" } },
});
// out2.status === "completed"
// out2.result === [ { text: "LRU is fine" } ]   // :output = [draft] 故结果是单元素数组
```

- **验证**：用 `bun -e '...'` 实跑，输出 `first outcome status: yielded` / `checkpoint JSON-serializable: true` / `resumed (FRESH runtime) status: completed` / `resumed result: [{"text":"LRU is fine"}]`。
- **要点 1**：注入的 job 结果**就是**那个 `ai_agent` 表达式的值 —— 所以 `(var draft (ai_agent ...))` 之后 `draft` 等于 `{text:"LRU is fine"}`。来源：`packages/workflow-dsl/lib/WorkflowDsl.ts:476`。
- **要点 2**：checkpoint 经 `JSON.parse(JSON.stringify(...))` 往返后，在一个**全新 runtime**（只调用了 `EnableWorkflowDsl`）上恢复仍然正确完成。这就是崩溃恢复与跨进程的基础。对应 `WorkflowResume.test.ts:110-126`（"resumes equivalently from a JSON-serialized checkpoint on a fresh runtime"）。
- **要点 3**：完成结果的形状取决于是否用 `ai_workflow`。`ai_workflow` 返回 `:output` 数组；裸 block 返回**最后一个操作数值**（已验证：`(var x 1) (var y 2) (x y :+)` → `3`）。来源：`packages/workflow-dsl/lib/WorkflowDsl.ts:430-432`。

### 3.4 host 如何把它做成"崩溃安全"

`kwf` 的 host driver 把上面的内存级 round-trip 落到磁盘：每个运行有一个文件化目录（`checkpoint.json`、`jobs/*.json`、`status.json`、`events.jsonl` 等，状态文件用 temp+rename 原子写入，CLI 与 worker 仅经该目录通信，无 daemon）。driver 在每个 yield **先写 `checkpoint.json` 再分派**，并跳过已经在 `jobs/` 里有结果的 job。所以：

- `pause` 在下一个 yield 边界停下，`resume` 从磁盘继续，最终结果与不暂停一致。来源：`codument/behaviors/workflow-host-runtime.xml:10-14`。
- 崩溃后对同一 `runId` 执行 `resume`，从落盘 checkpoint 续跑，第一个 yield 已完成的结果不重复执行。来源：`codument/behaviors/workflow-host-runtime.xml:5-8`、`packages/workflow-host/lib/driver.ts:48-58`。

恢复时缺结果或 job 失败的行为也是确定的（这是你设计错误处理时要依赖的）：

- **缺少某 job 的结果**：`ResumeWorkflowSync` 抛 `Missing result for workflow job: <id>`（已验证）。来源：`packages/workflow-dsl/lib/WorkflowDsl.ts:454`。
- **job 标记为 failed 且当前没有异常帧**：抛 `Workflow job failed: <id>: <message>`（已验证）。若存在 kunun 的 `try`/异常帧，则失败被路由到该帧，可被 kunun 端 catch。来源：`packages/workflow-dsl/lib/WorkflowDsl.ts:456-474`。

---

## 4. yield 边界：每次 agent 调用 = 一个 checkpoint

这是建立心智模型时最该刻进脑子的规则：

> **什么会 yield（产生 checkpoint）**：一次 agent 派发 —— 即 `ai_agent`（在非捕获位置），或 `ai_parallel` / `ai_pipeline` 的一次合并派发。
> **什么不会 yield**：`ai_workflow`、`ai_phase`、`ai_log`，以及所有普通 kunun 控制流（`var`/`set`/`if`/`foreach` …）。
> 来源：`packages/workflow-dsl/lib/WorkflowDsl.ts:355-374`、`codument/behaviors/runtime-interpreter.xml:167-203`。

把它当作粒度规则来用：**工作流被恢复的"颗粒"就是 agent 调用之间的区间**。两次相邻 agent 调用之间的所有普通 kunun 计算，在恢复时会重新跑（它们廉价、确定）；而每次 agent 调用本身是一个持久化点，其结果一旦完成就被存盘、不再重复。

各形态的 yield 计数（**dry-run 实测**，dry-run 完整跑完所有 yield 但不调模型）：

- **每个顺序的 `ai_agent` = 一次 yield**。一个含两个顺序 agent 的工作流 → `yields: 2`（已验证）。
- **`ai_parallel`：一次 yield，但一次性派发 N 个 job**（每个 input item 一个），结果按 item 顺序重组为数组。来源：`packages/workflow-dsl/lib/WorkflowDsl.ts:376-401`。
- **`ai_pipeline`：每个 stage 一次 yield**，每次每个 item 一个 job。来源：`packages/workflow-dsl/lib/WorkflowDsl.ts:296-335`。
- **`ai_phase` + `ai_log`、无 agent → `yields: 0`，直接 `completed`**（已验证）。

下面这个例子已用 `kwf dry-run` 验证为 `yields: 2`，是"每个 agent 一个 checkpoint"的最小证据：

```kon
(ai_workflow #seq
  :input = {topic = "x"}
  :output = [a b]
  :[
    (ai_phase #One :[
      (var a (ai_agent #first :{ sys_prompt = "s" user_prompt = "u \(topic)" }))
    ])
    (ai_phase #Two :[
      (ai_log #note :{ message = "got \(a)" })
      (var b (ai_agent #second :{ sys_prompt = "s" user_prompt = "u2 \(a)" }))
    ])
  ])
```

dry-run 输出：`yields: 2`，第二个 agent 的 prompt 里 `\(a)` 渲染为第一个 agent 的（mock）结果 —— 印证了"前一个 agent 的结果在下一次 yield 时已被注入，可被后续 prompt 读取"。

> 一个常见误解，先纠正：`ai_agent` **并不强制**要包在 `ai_phase` 里才会 yield —— 即使没有 `ai_phase`、甚至没有 `ai_workflow`，一个 `ai_agent` 也会 yield 一个 job。`ai_agent` 唯一**不**独立 yield 的位置是 `ai_parallel` / `ai_pipeline` 的 body 内部（那里它处于"捕获模式"，被父节点收集后合并派发）。把它包进 `ai_phase` 是为事件日志可读性而做的**约定**，不是 yield 的硬性条件。来源：`packages/workflow-dsl/lib/WorkflowDsl.ts:361-374`、行为细节见 [02 章](./02-dsl-reference.md)。

> 与 prompt 求值时机相关的一条硬约束（写代码必踩）：所有 agent 配置（`sys_prompt`/`user_prompt`/`output_schema` …）在 **lowering 时、checkpoint 之前**就被求值。因此一个 prompt **读不到同一次派发里、尚未注入的兄弟 agent 结果**。要把结果往后传，用 `ai_pipeline` 的 `value` 绑定，或拆成多个顺序的 `(var x (ai_agent ...))`（各自是独立 yield）。来源：`packages/workflow-dsl/lib/WorkflowDsl.ts:163-193`（`buildAgentRequest` 在 lowering 时即 `evaluateValue` 所有配置）。

---

## 5. 它如何 lower 到 runtime 的 effect/yield

动态工作流之所以能 checkpoint，根子在 kunun 的执行模型。这里给出概念链路，与 [05 章 求值模型](../reference/05-evaluation-model.md)的 continuation 讨论呼应。

### 5.1 指令栈展开，而非树遍历

kunun 的 `RuntimeInterpreter` 不是树遍历解释器。它通过**显式的指令栈展开**执行：一个节点的处理器把"剩余工作"作为 `RuntimeInstruction` 记录**压入 fiber 的指令栈**，而不是在 JS 调用栈上递归求值子树。复合形态（block、call、branch、loop、try-catch、object、subscript、**workflow**、effect）都变成显式指令 + 操作数栈帧。来源：`codument/behaviors/runtime-interpreter.xml:261-314`。

**为什么这是动态工作流的前提**：只有这样，续延（接下来要做什么）才是**显式的数据**，从而可被序列化。一个 checkpoint 必须包含足够的指令栈 + 操作数栈 + 环境 + fiber + 控制帧状态，使得**无需原始 JS 调用栈**即可恢复。这正是 workflow checkpoint、effect 续延、以及未来 codegen 共同依赖的不变量。来源：`codument/behaviors/runtime-interpreter.xml:281-285`、决策 `codument/decisions/2026-06/2026-06-07-1335-runtime-instruction-stack-expansion/decision.md:10-20`。

推论（对你写扩展/理解语义有用）：凡是需要控制求值顺序的特性（逻辑短路、`return`、循环、effect、workflow yield）都**不能**实现为普通 host 函数 —— 普通函数会丢失可序列化的续延与短路语义。

### 5.2 lowering 链路

一次 agent 派发的 lowering 路径如下（全部在 `kunun-workflow-dsl` 内，通过运行时**公开的通用 API** 驱动，不直接依赖底层 depa-actor）：

1. `ai_agent` 的 prefix-keyword 处理器构建一个 agent **request**（求值所有配置），然后压入一条 `WorkflowDispatch` 指令。来源：`packages/workflow-dsl/lib/WorkflowDsl.ts:361-374`。
2. `WorkflowDispatch` opcode 调用注册的 workflow 扩展 lowering，后者：用 `buildDslJobs` 把 request 展开成 pending job、`setPendingWorkflowJobs(jobs)`、`captureSnapshot()` 拿到 checkpoint，返回一个 `RuntimeWorkflowEffect`。来源：`packages/workflow-dsl/lib/WorkflowDsl.ts:242-257`、`packages/runtime/lib/RuntimeInterpreter/RuntimeInterpreter.ts:471-494`。
3. 运行时的 `DispatchUntilStop` 驱动指令栈直到遇到该 yield，以 `stopReason: 'yield_requested'` 停下，把 effect 放在结果里返回。上层（`RunWorkflowSync`）据此返回 `{ status: 'yielded', effect }`。来源：`packages/workflow-dsl/lib/WorkflowDsl.ts:425-433`、`codument/behaviors/runtime-interpreter.xml:508-517`。
4. host 完成 job 后，`ResumeWorkflowSync(runtime, checkpoint, results)` 先 `hydrateSnapshot(checkpoint)`，再把结果**压回操作数栈**（单 job 压单值，多 job 压有序数组），然后继续 `DispatchUntilStop`。来源：`packages/workflow-dsl/lib/WorkflowDsl.ts:441-480`。

所以 `RuntimeWorkflowEffect` 就是 kunun effect 机制在"工作流"这个域上的一个具体使用：派发即 yield，yield 即 checkpoint，checkpoint 即一个可恢复的显式续延。控制帧（`LoopFrame` / `ExceptionFrame` / `AbruptCompletion`）会原样跨 checkpoint 保存，所以 `foreach` 循环、`try`/catch、以及挂起的 `return`/`break` 都能在恢复后正确续跑。来源：`codument/behaviors/runtime-interpreter.xml:204-235`。

### 5.3 运行时是领域中立的

再强调一次（因为它约束你不能把 AI 语义归到错误的层）：运行时的 job 展开机制完全通用。`registerWorkflowExtension(name, lower?, options?)` 的默认行为是"单 job"（`jobExpansion: 'single'`，path 结尾 `/job:0`）；per-item fan-out 只是 `jobExpansion: 'perArg'`；更复杂的 item×stage 展开由 `options.buildJobs` 回调完全自定义。运行时**绝不**按扩展名分支。这一点有专门的通过测试佐证（`RuntimeInterpreterWorkflowGenericExpansion.test.ts`，4 pass）。来源：`packages/runtime/lib/RuntimeInterpreter/RuntimeState.ts:812-865`、`codument/behaviors/runtime-interpreter.xml:483-507`。

更底层的 depa-actor 包是一个**领域中立的栈/分派内核**，它**不含任何 AI agent、prompt、JSON-schema、workflow 概念** —— 不要把 kunun 的工作流行为描述成发生在 depa-actor 里。来源：`codument/behaviors/depa-actor-execution-kernel.xml:2-46`。

---

## 6. 与类型系统的关系：typed workflow 变体

kunun 有一个**可选（opt-in）的静态类型系统**（移植自 C# 的 ExtensibleScopedRowType）。两件事必须分清：

1. **默认的运行时执行是无类型的、不变的**。`kwf` host 跑工作流走的是无类型的 `RuntimeInterpreter` 路径 —— 它**不做类型检查**，也不会隐式安装类型化分派。来源：`codument/behaviors/runtime-type-system.xml:111-124`。
2. **类型检查是独立、opt-in 的一层**。要做检查须经类型化入口（如 `RuntimeInterpreter.TypeCheckSource`），且需要类型系统 bridge 已注册 —— 最简单的办法是 `import "kunun"`（umbrella 包，导入即自动注册 bridge）。来源：`codument/behaviors/workspace-packaging.xml:32-61`。

**typed workflow 变体**指的是：在普通工作流之上，叠加类型声明 —— 把工作流数据建模为 row 类型（`type` / `@merge`）、把 agent 契约写成带 effect 行的函数、用 `:input_type` / `:output_type` / `:effects` / `:state_type` / `:item_type` / `:break_when` / `:effect` 等**额外属性**标注工作流/阶段/循环/agent 的类型与效果边界。仓库里有两个 typed 示例：`typed-examples/typed-loop-until-dry.kon` 与 `typed-examples/typed-deep-research.kon`。

关于它们的**准确状态**（这点别写错）：

- 它们是**类型优先的设计草图**，目的在于演示如何用类型让工作流数据、agent 契约、源限定字段（`obj.:T:::field`）、effect 边界**显式化**。`typed-deep-research.kon:1-2` 自己就写明了"This file is a typed-first design sketch"。
- 它们能通过类型系统**干净地类型检查**：`RuntimeInterpreter.TypeCheckSource` 对两个文件均返回 **0 个 diagnostic**（已验证，需先 `import "kunun"` 触发 bridge 注册）。
- 它们**不能**被无类型的 `kwf` host 直接执行：把 `typed-loop-until-dry.kon` 喂给 `kwf validate` 会报错（`status: error`，已验证），因为顶层的 `type` / `#(effect decl ...)` 声明不属于 host 的工作流执行路径。

换句话说：**typed 变体与 durable 执行是正交的两层**。durable checkpoint/resume 在无类型运行时上工作；类型系统在它之上提供编译期保证，但不参与运行时 yield/resume。typed 示例展示的是"如果你想给一个工作流加上静态契约，长什么样"，而不是"工作流必须类型化才能跑"。

最小的形态对照（节选自 `typed-loop-until-dry.kon`）—— typed 变体把 `ai_workflow` 包在一个带 effect 行的类型化函数里，并给节点加类型/效果属性。下面是**节选片段**（省略的 body 里，`ai_agent`/`foreach` 各自带 `:input_type`/`:output_type`/`:effect`/`:break_when` 等标注；`SweepOutput` 与 `WorkflowAgent`/`WorkflowCheckpoint`/`WorkflowLog` 等声明也在完整文件的别处）。该节选缺少 `SweepOutput`/`WorkflowAgent` 等声明，但由于类型检查器对未声明引用宽松，单独把这段喂给 `TypeCheckSource` 仍返回 0 diagnostic（不报未定义类型）；真正用于佐证类型契约成立的，是**完整文件**：`RuntimeInterpreter.TypeCheckSource(typed-loop-until-dry.kon)` 返回 `Diagnostics.length === 0`（需先 `import "kunun"` 触发 bridge 注册）：

```kon
(type #SweepScope
  :[
    (!String field #path)
    (!String field #goal)
    ..never
  ])

#(effect row :[ WorkflowAgent WorkflowCheckpoint WorkflowLog ])
(fn #typedLoopUntilDry |!SweepScope scope -> SweepOutput|
  :[
    (ai_workflow #typedLoopUntilDry
      :input_type = SweepScope
      :output_type = SweepOutput
      :effects = [WorkflowAgent WorkflowCheckpoint WorkflowLog]
      :input = scope
      :output = [totalFindings dryRound batches]
      :[
        // ... workflow body elided ...
      ])
  ])
```

typed 语法的完整细节（`!Type` 前缀、`|in -> out|` 签名表、`@merge`、源限定 `:::`、effect 声明/handler、以及上述工作流类型属性各自的含义）属于类型系统章节，见 [09 章 类型系统](../reference/09-type-system.md)。本章只需你记住：**typed 与否，durable 执行模型不变**。

---

## 7. 本章要点回顾

- 动态工作流 = 把多 agent 编排做成**可恢复**的过程，解决"中断即全部重来"的痛点。
- `ai_*` 是 **host 注册的扩展**（`kunun-workflow-dsl` 包），**不是语言内置**；运行时**无名字魔法**，语义全在 DSL 包。
- durable 模型 = `run-until-yield → checkpoint 落盘 → 分派 → 注入 → resume`；checkpoint 是 **JSON 可序列化**的完整解释器快照，可在**全新 runtime/进程**上恢复。
- **每次 agent 调用 = 一个 yield/checkpoint 边界**；`ai_workflow`/`ai_phase`/`ai_log` 与普通控制流不 yield。
- 之所以能 checkpoint，是因为 kunun 用**指令栈展开**（非树遍历）使续延显式且可序列化 —— 与 [05 章](../reference/05-evaluation-model.md)的 continuation 同源。
- **typed workflow 变体**是 opt-in 类型层之上的设计；它能类型检查，但 durable 执行始终走无类型运行时，两层正交。

DSL 六节点的精确语法、配置键与陷阱，见 [02 章 DSL reference](./02-dsl-reference.md)。
