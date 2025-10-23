# 02 · 工作流 DSL 参考：节点与配置键

> 本章逐节点穷举动态工作流 DSL（`ai_*` 扩展）的精确语法、全部配置键、语义与可运行示例。读者目标是据此正确编写 `.kon` 工作流。
>
> **语法是 Kon**：圆括号 `()` = knot，方括号 `[]` = vector，花括号 `{}` = map；容器元素之间**只用空白分隔**（逗号不是分隔符，`,` 被保留作 unquote 运算符）。正文用中文；代码、关键字、类型名、操作符、函数名、路径保留英文原文。
>
> 本章所有代码示例均已用 `bun /Users/kongweixian/lang/kunun.ts/packages/workflow-host/bin/kwf.ts dry-run`（或 `validate`）实际跑通，且 `dry-run`/`validate` 都**不调用任何模型**。

---

## 0. 全局心智模型（先读这一节）

DSL 是注册在 kunun 运行时上的一层薄扩展，由 `EnableWorkflowDsl(runtime)` 装载（`packages/workflow-dsl/lib/WorkflowDsl.ts:281-423`）。它只引入 **6 个 prefix 关键字**：

`ai_workflow`、`ai_phase`、`ai_log`、`ai_agent`、`ai_parallel`、`ai_pipeline`（`WorkflowDsl.ts:337-422`）。

外加一个**仅在 `ai_pipeline` 内部使用的 `stage` 形式**。没有别的关键字——尤其**没有 `json_schema` 节点**（已用 `grep` 确认整个 workflow-dsl/workflow-host/examples 中无此关键字）；JSON Schema 是作为 `output_schema` 配置键的**值**（一个 map）传入的，见 [§5b json_schema](#5b-json_schema约定不是节点是-output_schema-的值)。

关键执行模型，记住三点：

1. **每个 agent 调用降级成一次 `WorkflowDispatch` 指令，该指令 yield 一个 checkpoint**。checkpoint 是一份 JSON-可序列化的运行时快照，host 跑完 agent 后回灌结果再 resume（`WorkflowDsl.ts:361-374,441-480`）。
2. **所有 prompt 和配置值在 lowering 时（即 checkpoint 之前）就被 eagerly 求值**（`evaluateValue`，`WorkflowDsl.ts:92-111,163-193`）。因此一个 prompt **读不到同一次 dispatch 里尚未注入的兄弟 agent 结果**。要把结果往后传，用 `ai_pipeline` 的 `value` 绑定，或拆成顺序的 `(var x (ai_agent ...))`（各自一次 yield）。
3. **哪些节点会 yield/checkpoint**：只有 `ai_agent`（在非捕获模式下）和 `ai_parallel`/`ai_pipeline-stage` 的合并 dispatch 会 yield。`ai_workflow`/`ai_phase`/`ai_log` 以及所有普通控制流（`if`/`foreach`/`var`/`set`）**都不 yield**（`WorkflowDsl.ts:337-359`，已用 dry-run `yields=0` 验证 `ai_log`/`ai_phase`）。

### 配置键所在的"槽位"——不同节点放在不同位置（高频错误来源）

| 节点 | 配置槽位 | 形式 |
|---|---|---|
| `ai_workflow` | named-conf（`:key = value`）+ section（`:output = [...]`）+ body `:[...]` | `:input = {...}` `:output = [...]` `:[ ... ]` |
| `ai_phase` | 仅 body `:[...]` | `:[ ... ]` |
| `ai_log` | 单个 `:{ ... }` Conf 块 | `:{ message = ... }` |
| `ai_agent` | 单个 `:{ ... }` Conf 块 | `:{ sys_prompt=... user_prompt=... ... }` |
| `ai_parallel` | `:{ ... }` Conf 块 + body `:[...]` | `:{ input=... item=... }` `:[ ... ]` |
| `ai_pipeline` | `:{ ... }` Conf 块 + body `:[ (stage ...) ... ]` | `:{ input=... }` `:[ (stage #s :[...]) ]` |

`ai_workflow` 用 named-conf/section（带 `=`），其余节点把键放在 `:{ ... }` Conf 块里——把这两种搞混（例如对 `ai_workflow` 写 `:{ input=... }`）不会正确绑定。依据：`ai_workflow` 读 `knot.NamedConf.input` / `knot.Sections.output`（`WorkflowDsl.ts:339,346`），其余节点读 `knot.Conf`（`WorkflowDsl.ts:164,356,377,404`）。

---

## 1. `ai_workflow` — 顶层作用域

### 用途
工作流的最外层容器：声明输入变量、列出输出、包裹整段工作流体。

### 精确语法
```
(ai_workflow #name
  :input = {k1 = v1 k2 = v2 ...}
  :output = [var1 var2 ...]
  :[ body... ])
```

### 语义（`WorkflowDsl.ts:337-348`）
1. `:input = {...}` 从 `knot.NamedConf.input` 读取，整体 `evaluateValue` 求值，然后**每个键都通过 `rt.define(key, value)` 绑定成一个普通运行时变量**。即 `:input = {topic = "x"}` 让 body 里可以直接用 `topic`。
2. body（`knot.Body`）通过 `RunBlock` 顺序执行。
3. body 结束后，`WorkflowDsl_Output` 指令**对 `:output = [...]` 里列出的每个节点求值，并把这些值组成一个数组**压栈作为工作流结果（`WorkflowDsl.ts:290-294,346`）。

**结果形状：`:output` 永远产出一个数组**，即使只列一个变量也会被包成单元素数组（`[var]` → `[value]`）。

### 可运行示例
```kon
(ai_workflow #t
  :input = {topic = "default" extra = "e"}
  :output = [topic extra computed]
  :[
    (ai_phase #P :[ (var computed "c-\(topic)") ])
  ])
```
*验证：* `kwf dry-run` → `result ["default","e","c-default"]`。

单变量被包成数组：
```kon
(ai_workflow #t :input = {a = 1} :output = [a] :[ ])
```
*验证：* `kwf dry-run` → `result [1]`（空 body 也照常完成并返回 `:output` 数组）。

### 陷阱
- **`--args` 不会覆盖 `:input` 的字面默认值。** host 把 `--args`（或 MCP 的 `args`）放进一个**独立的全局变量 `args`**（`validation.ts:77`，`driver.ts:22`），并**不**合并进 `:input`。要用运行时入参，必须在 `:input` 里显式引用 `args`：

  ```kon
  (ai_workflow #t :input = {question = (args.:q)} :output = [question] :[ ])
  ```
  *验证：* `kwf dry-run --args '{"q":"hello"}'` → `result ["hello"]`。
  反例 *验证：* `(ai_workflow #t :input={topic="default"} :output=[topic] :[ ])` 配 `--args '{"topic":"OVERRIDE"}'` → 仍是 `result ["default"]`。

- `ai_workflow` **不是必需的**。一个裸 `ai_agent` 不包在任何 `ai_workflow` 里也能 yield（见 [§3 陷阱](#陷阱-1)）。不用 `ai_workflow` 时，工作流结果是最后一个操作数栈值，不保证是数组（`WorkflowDsl.ts:430-432`）。

---

## 2. `ai_phase` — 可观测性标记（不创建作用域、不 yield）

### 用途
给一段工作流体打一个命名标签，写进事件日志、便于 dry-run/日志阅读。

### 精确语法
```
(ai_phase #Name :[ body... ])
```

### 语义（`WorkflowDsl.ts:350-353`）
记录一个 `{type:'phase', phase:Name}` DSL 事件，然后**内联执行 body**（`RunBlock`）。它**不创建新作用域**、**不 yield**、**自身不 checkpoint**。纯粹是事件日志里的命名分组。

### 可运行示例
```kon
(ai_workflow #t :input = {n = 1} :output = [m] :[
  (ai_phase #P :[ (var m (ai_log #note :{ message = "counter is \(n)" })) ])
])
```
*验证：* `kwf dry-run` → `yields 0`、`result ["counter is 1"]`（phase + log 都不产生 yield）。

### 陷阱
- **`ai_agent` 并不要求被包在 `ai_phase` 里才会 yield。** 实测：`ai_agent` 直接放在 `ai_workflow` body（无 phase）、甚至放在没有 `ai_workflow` 的顶层，都各 yield 一次。"agent 必须包在 phase 内"是 scaffold 提示词的**风格约定**（`agent-workflows.ts:17`），不是硬性运行时规则。真正不 yield 的唯一场景是处于 `ai_parallel`/`ai_pipeline` 的捕获 body 内（见 [§6](#6-yield--checkpoint-语义总表)）。约定上仍建议用 `ai_phase` 分组以获得清晰的事件日志，但它对 yield 没有影响。

---

## 3. `ai_agent` — 单次 agent 调用 → 一次 checkpointed job

### 用途
描述一次 agent 调用。在非捕获模式下，它降级成一次 `WorkflowDispatch` 并 yield 一个 checkpoint；注入的 job 结果成为该 `ai_agent` 表达式的**值**。

### 精确语法
```
(ai_agent #name :{ <config keys> })
```
`name` 来自 `#name` 这个 word。

### 全部配置键（`WorkflowDsl.ts:163-193`，`buildAgentRequest`）
仅识别以下 8 个键，**未知键被静默忽略**：

| 键 | 类型/含义 | 去向 |
|---|---|---|
| `label` | 任意（通常 string）；job 的人类可读标签，用于日志/dry-run 摘要 | metadata + request |
| `sys_prompt` | string；系统提示 | request（拼到 prompt 第一段） |
| `user_prompt` | string；用户提示 | request（拼到 prompt 第二段，用 `\n\n` 连接） |
| `output_schema` | map；JSON Schema 对象，见 [§5b](#5b-json_schema约定不是节点是-output_schema-的值) | metadata + request |
| `retry` | number；进程级重试次数 | metadata + request |
| `timeout` | number；超时（秒），默认 1800 | metadata + request |
| `adapter` | string；指定 host adapter（如 `claude`/`codex`/`gemini`） | request（**仅在 request，不在 metadata**） |
| `model` | string；模型名 | request（**仅在 request，不在 metadata**） |

所有键都在 lowering 时用 `evaluateValue` 求值。

### 语义（`WorkflowDsl.ts:361-374`）
- **非捕获模式**：记录 dispatch 事件，发出 `WorkflowDispatch`，`name:'ai_agent'`，`sourceNodeId: prefix:ai_agent:<name>@<seq>`。**yield 一个含恰好一个 pending job 的效果**，job id 形如 `ai_agent:<sourceNodeId>/job:0`（`WorkflowDsl.ts:231-233`）。
- **捕获模式**（位于 `ai_parallel`/`ai_pipeline` body 内）：**不 yield**，把 request 对象压栈交给父节点收集（`WorkflowDsl.ts:363-365`）。
- resume 时注入的 job 结果成为该 `ai_agent` 表达式的值，因此 `(var draft (ai_agent ...))` 让 `draft` 等于该结果（`WorkflowDsl.ts:476`）。

### 可运行示例（全部 8 个键透传）
```kon
(ai_agent #classify :{
  label = "my-label"
  sys_prompt = "S"
  user_prompt = "U"
  adapter = "codex"
  model = "gpt-x"
  retry = 3
  timeout = 600
  output_schema = { type = "object" properties = { category = {type = "string"} } required = ["category"] }
})
```
*验证：* `kwf validate --json` → 单 job：`name=classify`、`label=my-label`、`adapter=codex`、`model=gpt-x`、`retry=3`、`timeout=600`、`hasOutputSchema=true`、`promptPreview="S\n\nU"`。

工作流内的典型用法（结果绑定给变量，供后续节点读）：
```kon
(ai_workflow #t :input = {topic = "x"} :output = [draft] :[
  (ai_phase #P :[
    (var draft (ai_agent #draftDoc :{
      sys_prompt = "You write."
      user_prompt = "Write about \(topic)."
    }))
  ])
])
```
*验证：* `kwf dry-run` → 1 yield，job `draftDoc`，`promptPreview="You write.\n\nWrite about x."`，`result ["dry-run:draftDoc"]`。

### 陷阱

- **`#name` 中的连字符 `-` 被解析成减法，并静默丢弃配置。** `#name` 是一个 kunun word，`-` 是减法运算符。所以 `#draft-doc` 解析成 `#draft` 减 word `doc`：agent 被命名为 `draft`，且整个 `:{...}` 配置块被**静默吞掉**（job 没有任何 prompt）。它仍然 `validate ok` 并 dispatch 一个 job——这是**静默失败**。

  ```kon
  (ai_agent #draft-doc :{ sys_prompt="You write." user_prompt="Write about \(topic)." })
  ```
  *验证：* `kwf validate --json` → `sourceNodeId prefix:ai_agent:draft@1`，job `name=draft`，**无 promptPreview**（配置被丢弃）。

  **安全命名：** 用 camelCase（`#draftDoc`）或下划线（`#draft_doc`）。examples 中 agent 名一律 camelCase（`#draftDoc`/`#searchAngle`/`#voteClaims`），phase/stage 名用 PascalCase（`#Plan`/`#SkepticA`）。

- **`adapter`/`model` 不在 job metadata 里，只在 request（`job.args[0]`）里。** host bridge 从 request 读 `adapter`/`model`，从 metadata-或-request 读 `timeout`/`retry`/`outputSchema`（`WorkflowDsl.ts:195-207`，`bridge.ts`）。运行时（非本章覆盖的 host 行为）：若 job 设了 `model` 但解析出的 adapter 没有 `flags.model` 映射，model **不会被传**，只记一个 `option_unmapped` 事件，不报错（`bridge.ts:83-85`）。

- <a id="陷阱-1"></a>**裸 `ai_agent` 也会 yield。** 没有 `ai_workflow`、没有 `ai_phase` 时，`(ai_agent #solo :{ sys_prompt="s" user_prompt="u" })` 仍 yield，`jobCount=1`（已 `kwf validate` 验证 `status yielded`）。

---

## 4. `ai_parallel` — fan-out（每个输入项一个 job）

### 用途
对一个数组 fan-out：每个元素跑一次（同一份 body 模板），所有项在**一次 yield** 里一起 dispatch。

### 精确语法
```
(ai_parallel #name
  :{ input = <list-expr> item = <bindName> index = <bindName> }
  :[ body... ])
```

### 配置键（`WorkflowDsl.ts:376-401`）
| 键 | 含义 | 默认 |
|---|---|---|
| `input` | 求值后**必须是数组**；非数组当作空数组 `[]` | 必填 |
| `item` | 每项的绑定名（body 内引用当前元素） | `item` |
| `index` | 当前下标的绑定名 | `index` |

### 语义
对每个 item，运行时 dive 一个本地环境绑定 `{[itemName]:item, [indexName]:index}`，并在**捕获模式**下运行 body（`captureStageRequests`，`WorkflowDsl.ts:388-394`）。捕获到的 request 被附加 `{item, itemIndex}`。所有 request 在**一次 `WorkflowDispatch`/yield**（`name:'ai_parallel'`）里下发，每项一个 pending job，path 为 `<sourceNodeId>/item:<idx>`。resume 时结果**按 item 下标顺序重组为数组**（`WorkflowDsl.ts:476`，多 job 时压数组）。

### 可运行示例
```kon
(ai_parallel #fan :{ input = ["a" "b"] } :[
  (ai_agent #g :{ sys_prompt = "s" user_prompt = "item=\(item) index=\(index)" })
])
```
*验证：* `kwf validate --json --show-prompts` → 两个 job，prompt 分别 `"s\n\nitem=a index=0"`、`"s\n\nitem=b index=1"`（确认 `item`/`index` 默认绑定名生效）。

带结果重组的工作流形态（参 `examples/fan-out-reduce.kon:8-26`）：
```kon
(ai_workflow #t :input = {q = "x"} :output = [drafts] :[
  (ai_phase #Draft :[
    (var approaches ["LRU-first" "cost-aware" "adaptive-ttl"])
    (var drafts (ai_parallel #draftApproaches
      :{ input = approaches item = approach index = i }
      :[
        (ai_agent #draftOne :{
          label = "draft-\(i)"
          sys_prompt = "You are a systems design writer."
          user_prompt = "Draft for \(q) using angle \(approach)."
        })
      ]))
  ])
])
```
*验证：* `kwf dry-run` → 1 yield、3 个 job，`result [["dry-run:draftOne","dry-run:draftOne","dry-run:draftOne"]]`（结果是有序数组，再被 `:output` 包一层）。

### 陷阱

- **body 必须恰好包含一个 `ai_agent`——只有最后一个表达式会被 dispatch。** 捕获返回 body 最后一个表达式的值（`ExecBlockWithRuntimeSync` 返回最后值，`WorkflowDsl.ts:259-269`）。若 body 里有两个 `ai_agent`，**只有第二个被捕获并 dispatch，第一个被静默丢弃**：
  ```kon
  (var xs ["a"])
  (ai_parallel #fan :{ input = xs item = x } :[
    (ai_agent #first :{ sys_prompt = "s1" user_prompt = "u1 \(x)" })
    (ai_agent #second :{ sys_prompt = "s2" user_prompt = "u2 \(x)" })
  ])
  ```
  *验证：* `kwf validate --json` → `jobCount 1`，只有 `second`（prompt `"s2\n\nu2 a"`），`first` 被丢弃。需要的其它计算请用普通 kunun 在 body 之前/之后做。

- **空数组 input → 不 yield、无 job、压 `[]`。**
  ```kon
  (ai_workflow #t :input = {xs = []} :output = [r] :[
    (var r (ai_parallel #fan :{ input = xs item = x } :[ (ai_agent #g :{ sys_prompt="s" user_prompt="u \(x)" }) ]))
  ])
  ```
  *验证：* `kwf dry-run` → `yields 0`、`result [[]]`。

- **不允许嵌套。** 在捕获 body 内再放 `ai_parallel`/`ai_pipeline` 会抛 `Nested ai_parallel/ai_pipeline request capture is not supported`（`WorkflowDsl.ts:150-161`）。需要二级 fan-out 时请拍平或拆成顺序 phase。
  *验证：* 嵌套 → `kwf validate` `status error`，diagnostic 即上述消息。

- **dry-run 下的 fan-out 宽度来自 schema mock，不是真实数据。** 当 `input` 是上游 agent 结果的字段（如 `(plan.:angles)`），dry-run 会用 `output_schema` 的 mock 数组（`minItems` 默认 1）来 fan-out，于是只产生 1 个 job（真实运行才是 N 个）。`deep-research` 的 `searchAngles` 在 dry-run 下只 1 个 job（mock `angles` 只 1 个元素）即此原因。dry-run 验证的是接线和插值，不是真实分支宽度。

---

## 5. `ai_pipeline` + `stage` — 逐项多阶段处理

### 用途
对每个输入项跑一串顺序阶段；后一阶段能读到前一阶段对同一项的结果。**每个阶段一次 yield**，阶段内每项一个 job。

### 精确语法
```
(ai_pipeline #name
  :{ input = <list-expr> item = <b> value = <b> index = <b> }
  :[
    (stage #stage1 :[ body... ])
    (stage #stage2 :[ body... ])
    ...
  ])
```
`stage` 仅在 `ai_pipeline` body 内合法；每个 `stage` body 须含一个 `ai_agent`（捕获规则同 `ai_parallel`）。

### 配置键（`WorkflowDsl.ts:403-422`）
| 键 | 含义 | 默认 |
|---|---|---|
| `input` | 数组；非数组 → 空 | 必填 |
| `item` | 当前项的绑定名（始终是原始输入项） | `item` |
| `value` | **前一阶段结果**的绑定名（见下） | `value` |
| `index` | 当前项下标的绑定名 | `index` |

### 语义（`WorkflowDsl.ts:296-335`，`PIPELINE_STAGE_OPCODE` handler）
**每个阶段一次 yield。** 对 stage 0，`value` 绑定**原始输入项**；对 stage N>0，`value` 绑定**该项在 stage N-1 的结果**。每阶段对每项发一个 job（`name:'ai_pipeline'`），path 含阶段名（`/stage:<stageName>`），metadata 含 `{item, itemIndex, stageName, stageIndex}`。下发完一个阶段后排下一个 `PIPELINE_STAGE_OPCODE`；全部阶段做完（或 items 为空）压最终的逐项结果数组。

### 可运行示例
```kon
(ai_pipeline #proc :{ input = ["d1" "d2"] item = doc value = val index = i } :[
  (stage #norm  :[ (ai_agent #n :{ label = "n-\(i)" sys_prompt = "s" user_prompt = "N \(doc) prev=\(val)" }) ])
  (stage #write :[ (ai_agent #w :{ label = "w-\(i)" sys_prompt = "s" user_prompt = "W prev=\(val)" }) ])
])
```
*验证：* `kwf dry-run --show-prompts` →
- yield 0（`stage:norm`）：`n-0 => "s\n\nN d1 prev=d1"`、`n-1 => "s\n\nN d2 prev=d2"`（stage 0 的 `val` = 原始项）。
- yield 1（`stage:write`）：`w-0 => "s\n\nW prev=dry-run:n"`、`w-1 => "s\n\nW prev=dry-run:n"`（stage 1 的 `val` = 上一阶段结果）。
- `result ["dry-run:w","dry-run:w"]`。

### 陷阱
- **`value` 是在 lowering 时把前一阶段结果接进下一阶段 prompt 的唯一手段**（prompt 在 checkpoint 之前求值）。最佳实践（`SKILL.md`）：prompt 不能依赖尚未注入的 agent 结果——要么用 pipeline 的 `value`，要么用顺序的 `(var x (ai_agent ...))`。
- 同 `ai_parallel`：每个 `stage` body 只能有一个 `ai_agent`（只有最后一个表达式被捕获）；不允许嵌套 `ai_parallel`/`ai_pipeline`。

---

## 5b. `json_schema`（约定：不是节点，是 `output_schema` 的值）

**没有名为 `json_schema` 的 DSL 节点。** JSON Schema 以一个 **map** 的形式作为 `ai_agent` 的 `output_schema` 配置键的值传入。支持的构造（`packages/workflow-host/lib/schema.ts:63-106`；dry-run 的 mock 由 `validation.ts:144-177` 生成）：

| 构造 | 说明 | dry-run mock 值 |
|---|---|---|
| `type = "object"` + `properties = {...}` + `required = [...]` | 对象 | 递归各属性 |
| `type = "array"` + `items = {...}` + `minItems = N` | 数组 | `max(1, minItems)` 个元素 |
| `type = "string"` | 字符串 | `"dry-run:<label>"` |
| `type = "number"` / `"integer"` | 数 | `0` |
| `type = "boolean"` | 布尔 | `false` |
| `enum = [...]` | 枚举（任意 type） | 取第一个枚举值 |

dry-run 下，agent 结果被替换为符合 schema 形状的 mock，使下游 `(x.:field)` 字段读取仍能跑通。

### 可运行示例
```kon
(ai_workflow #t :input = {x = 1} :output = [r] :[
  (ai_phase #P :[
    (var r (ai_agent #s :{ sys_prompt = "s" user_prompt = "u"
      output_schema = {
        type = "object"
        properties = {
          category = { type = "string" enum = ["a" "b"] }
          score    = { type = "number" }
          ok       = { type = "boolean" }
          tags     = { type = "array" minItems = 2 items = { type = "string" } }
        }
        required = ["category"]
      }
    }))
  ])
])
```
*验证：* `kwf dry-run` → `result [{"category":"a","score":0,"ok":false,"tags":["dry-run:s.tags[0]","dry-run:s.tags[1]"]}]`（enum 取首值、number→0、boolean→false、array minItems=2→2 元素）。

可把 schema 抽成变量复用（参 `examples/deep-research.kon:1-7,26`）：
```kon
(var SCHEMA { type = "object" properties = { angles = {type = "array"} } required = ["angles"] })
(ai_agent #planResearch :{ sys_prompt = "s" user_prompt = "u" output_schema = SCHEMA })
```

---

## 6. yield / checkpoint 语义总表

| 节点/形式 | 是否 yield checkpoint | 备注 |
|---|---|---|
| `ai_agent`（非捕获） | **是**，1 个 job | 结果注入成该表达式的值 |
| `ai_agent`（捕获 body 内） | 否 | 压 request 给父节点收集 |
| `ai_parallel` | **是**，每项 1 个 job，合并成 1 次 yield | 空输入则不 yield |
| `ai_pipeline` | **是**，每阶段 1 次 yield，阶段内每项 1 个 job | 空输入则不 yield |
| `ai_workflow` / `ai_phase` / `ai_log` | 否 | 仅记录事件、内联执行 |
| `if` / `foreach` / `var` / `set` 等普通控制流 | 否 | 仅其中真正执行到的 `ai_agent` 才 yield |

依据：`WorkflowDsl.ts:337-422`；yield 由 `WorkflowDispatch` 指令产生（`RuntimeInterpreter.ts:471-494`）。checkpoint 是 JSON-可序列化的 `RuntimeSnapshot`，在 jobs 运行**之前**捕获（`WorkflowDsl.ts:246`）。resume 行为（`ResumeWorkflowSync`，`WorkflowDsl.ts:441-480`）：单 job 压单值、多 job 压有序数组；缺结果抛 `Missing result for workflow job: <id>`；失败结果路由到 kunun 异常帧或抛 `Workflow job failed: ...`。

### 与 `if` / `foreach` 的配合（普通控制流，非 `ai_*` 扩展）
- `(if cond :[ then ] else :[ else ])`：只有匹配分支里的 `ai_agent` 会 yield，另一分支根本不执行。
  *验证：* `kwf dry-run examples/routing.kon`（`routing.kon:28-43`）→ yield 0 `classifyRequest`、yield 1 `generalSpecialist`（分类 mock 非 frontend，故走 else 分支，只有 general 被 dispatch）。
- `(foreach x in list :[ body ])` + `(:break)`：循环里的 `ai_agent` 每次到达就 yield 一次（`loop-until-dry.kon:9-36`）。
  *验证（dry-run 短路）：* `kwf dry-run examples/loop-until-dry.kon` → `yields 1`、`result [0,0]`。因为 mock `count`=0 触发首轮 `(:break)`——计数/条件驱动的循环在 dry-run 下会短路（数值 schema mock 恒为 0）。

---

## 7. prompt 插值与多行字符串

### 插值标记 `\(expr)`
在 kunun 字符串内用 `\(expr)` 插入求值结果。普通变量直接 `\(topic)` 即可。

### 关键陷阱：字段访问需要再套一层括号
`\(...)` 内部若是字段访问调用，必须再用一对括号包住：`\((obj.:field))` 渲染出值，而**裸 `\(obj.:field)` 渲染成 `[object Object]`**。
```kon
(var obj {a = 1 b = 2})
(ai_agent #w :{ sys_prompt = "s" user_prompt = "paren \((obj.:a)) bare \(obj.:a)" })
```
*验证：* `kwf validate --json --show-prompts` → prompt `"s\n\nparen 1 bare [object Object]"`。这就是 `deep-research.kon:49` 用 `\((angle.:question))`（双括号）的原因。

整对象插值同样渲染成 `[object Object]`（map），数组渲染成逗号拼接的元素串——这是 JS `String()` 强制转换的预期行为，不是 bug。要在 prompt 里放结构化数据，请逐字段读取标量。

### 多行三引号字符串 `"""`
规则（`agent-workflows.ts:11-17`）：开头的 `"""` 必须**独占一行**；内容行的缩进至少与结尾 `"""` 对齐；公共缩进会被剥除。约定布局是 `user_prompt =` 一行、`"""` 在下一行：
```kon
(var topic "caches")
(ai_agent #w :{
  sys_prompt = "You write."
  user_prompt =
  """
  Write about the topic.

  Topic: \(topic)
  """
})
```
*验证：* `kwf validate --json --show-prompts` → prompt `"You write.\n\nWrite about the topic.\n\nTopic: caches"`。

---

## 8. 常用普通 kunun 形式速查（围绕 agent 编排）

这些是核心语言内置，不是 `ai_*` 扩展，但工作流里高频使用：

| 形式 | 用途 | 验证 |
|---|---|---|
| `(var name expr)` / `(set name expr)` | 声明 / 重新赋值 | — |
| `(obj.:field)` | 字段访问（`.:` 操作符） | `(var o {a=7}) (o.:a)` → `7` |
| `(arr::index)` | 数组按下标取值（`::` 操作符） | `(var arr [10 20 30]) (var i 1) (arr::i)` → `20`（用于 `deep-research.kon:80`） |
| `(:== a b)` | 相等比较 | — |
| `(x 1 :+)` | 后缀算术（RPN）：x 加 1 | `(var x 5) (x 1 :+)` → `6`（`adversarial-verify.kon:59`） |

上述四个表达式均用 `RuntimeInterpreter.EvalBlockSourceSync` 实跑验证。

> kunun 同时支持前缀（PN）和后缀（RPN）：`(:+ 1 2)` 与 `(1 2 :+)` 等价。examples 里累加惯用后缀形式 `(total (batch.:count) :+)`。核心语言语法细节见 [语言参考 · 内置与控制流](../reference/06-builtins-control-flow.md)。

---

## 9. 类型化工作流注解（`:input_type` / `:output_type` / `:effects` / `:effect` / `:state_type`）

`typed-examples/typed-loop-until-dry.kon` 展示了带类型注解的工作流写法，例如：
```kon
(ai_workflow #typedLoopUntilDry
  :input_type = SweepScope
  :output_type = SweepOutput
  :effects = [WorkflowAgent WorkflowCheckpoint WorkflowLog]
  :input = scope
  :output = [totalFindings dryRound batches]
  :[ ... ])
```
以及 `ai_agent` 上的 `:input_type` / `:output_type` / `:effect = WorkflowAgent.findIssues`，`ai_phase` 上的 `:state_type`，`foreach` 上的 `:item_type` / `:state_type` / `:break_when`。

**这些注解属于类型系统 / typed-block 语言层，不属于本章的运行时 `ai_*` DSL。** 两个已验证的事实：

1. **`kwf` 引擎完全忽略这些类型注解键。** 它们被当作额外的 named-conf 属性解析掉、不影响行为。
   *验证：* 给一个 `ai_workflow` 加上 `:input_type = SweepScope :output_type = SweepOutput :effects = [WorkflowAgent]`，配合普通 `:input = {topic="x"}` `:output = [topic]`，`kwf dry-run` → `result ["x"]`，与不加注解时一致。`grep` 确认 `input_type`/`output_type`/`state_type`/`effects`/`effect`/`break_when`/`item_type` 在整个 `packages/workflow-dsl` 与 `packages/workflow-host` 源码中**不被任何代码读取**。

2. **完整的类型化示例文件不能直接喂给 `kwf dry-run`。** 它依赖 `(type #...)` / `(fn #... |sig|)` / `(perform #...)` / `#(effect decl ...)` 等类型系统声明，untyped 的 `kwf` 引擎跑不动。
   *验证：* `kwf dry-run typed-examples/typed-loop-until-dry.kon` → `status error`。
   而通过类型系统层 `RuntimeInterpreter.TypeCheckSource(src)`（需 `import "kunun-type-system"`）对同一文件类型检查 → **0 diagnostics**（干净通过）。

**结论给作者：** 若你的目标是写一个能被 `kwf run/dry-run/validate` 执行的动态工作流，**用本章 §1-§8 的无类型形式**（`:input = {...}` map、`output_schema` map）。类型注解只在你走类型系统/typed-block 路径（`TypeCheckSource` / `EvaluateTypedBlockSync`）时才有意义，且那条路径用的是 `perform`/effect 而非 `kwf` 的 checkpoint dispatch。类型系统语义见 [语言参考 · 总览与心智模型](../reference/01-overview-mental-model.md)。

---

## 10. 验证手段（写完务必自测）

所有节点都可在不调用模型的前提下验证：

```bash
# 解析 + 执行到首个 yield/完成，输出每个 job 的 name/label/adapter/model/retry/timeout/schema/prompt 摘要
bun /Users/kongweixian/lang/kunun.ts/packages/workflow-host/bin/kwf.ts validate /dev/stdin --json --show-prompts <<'KON'
... 你的工作流 ...
KON

# 反复 yield/resume，注入 schema 形状的 mock 结果，跑到完成，输出每次 yield 与最终 resultPreview
bun /Users/kongweixian/lang/kunun.ts/packages/workflow-host/bin/kwf.ts dry-run /dev/stdin --json --show-prompts <<'KON'
... 你的工作流 ...
KON
```

`validate` 在首个 yield 或完成时停（`validation.ts:185-213`）；`dry-run` 循环 resume 注入 mock（`validation.ts:215-263`），`--max-yields` 默认 64。退出码：0 成功，1 校验/dry-run/运行失败，2 参数错误。

**自查清单（每条都已在本章对应小节验证）：**
- 每个 `ai_agent` 的 job 都显示了**预期的 `name`** 和一个 **`promptPreview`**（否则可能踩了 `#name` 连字符陷阱）。
- `ai_parallel`/`ai_pipeline` 的 `jobCount` 与你的输入项数一致（dry-run 下注意 fan-out 宽度来自 schema mock）。
- prompt 里没有残留的字面 `\(` 或意外的 `[object Object]`（字段访问用 `\((obj.:field))`）。
- 最终 `resultPreview` 是 `:output` 列表对应的数组形状（注意：当 `foreach` 迭代的是跨 checkpoint 注入的 mock 数组时，dry-run 的 `resultPreview` 可能塌成最后一个 agent 值——这是已知的 dry-run 摘要 quirk，不影响真实运行；`examples/adversarial-verify.kon` 即此情况：dry-run `resultPreview` 显示 `{"verdict":...}` 而非完整 `:output` 数组）。
