# 工作流编写范式与陷阱

本章面向要用 kunun **Kon DSL** 编写、用 `kwf` 跑的多 agent 工作流。Kon 语法固定如下：圆括号 `()` 是 knot，方括号 `[]` 是 vector，花括号 `{}` 是 map。容器元素（vector / map / 参数表等）**只用空白分隔**，**逗号不是分隔符**——写 `[1 2 3]`、`{a = 1 b = 2}`，而 `[1, 2]` 这类带逗号的容器会被拒绝、解析/求值报错（具体错误信息随解析路径而异，例如核心求值器实测抛 `Callable not found: <stack-callable>`）；逗号在 kunun 里另有专用语义（unquote `,expr` / unquote-splice `,@` / unquote-map `,%`），正因如此它不能再兼作分隔符。字符串插值是 `\(expr)`。本章所有代码示例均已用下面两条命令实测通过（不调用任何模型）：

```bash
bun packages/workflow-host/bin/kwf.ts validate <file.kon> --json --show-prompts
bun packages/workflow-host/bin/kwf.ts dry-run  <file.kon> --json --show-prompts
```

`validate` 跑到**第一个 yield 或完成**为止；`dry-run` 反复 yield/resume，并为每个 job 注入 **schema 形状的 mock** 结果，所以下游字段访问能继续工作（`validation.ts:185-263`）。

阅读本章前请先建立一个核心心智模型：**每一次 agent 派发都是一个 checkpoint 边界**。`ai_agent`（在 capture 模式外）、以及 `ai_parallel`/`ai_pipeline` 的一次整体派发,都会 yield 一个携带完整解释器快照的 effect；host 跑完 job 后用 `ResumeWorkflowSync` 注入结果继续(`WorkflowDsl.ts:425-433,441-480`)。一切 prompt 与配置在 yield **之前**就被求值。这条规则衍生出本章绝大多数最佳实践与陷阱。

---

## 一、常见范式

下面五个范式各给一个**最小可 dry-run** 的范例，并讲清适用场景。完整、生产级的版本见仓库 `examples/` 目录。

### 1. fan-out / reduce（扇出后归并）

**适用场景**：对一组**互相独立**的输入并行跑同一类 agent，再把所有结果交给一个 agent 归并。典型如：多角度起草、并行打分、批量翻译后汇总。

**机制**：`ai_parallel` 对 `input` 列表的每个元素在 **capture 模式**下跑一次 body，把 body 产出的 agent 请求收集起来，在**一次 yield** 里派发成「每元素一个 job」，resume 时按元素顺序重新拼成**数组**(`WorkflowDsl.ts:376-401`)。归并步骤是一个普通 `ai_agent`，它读取上一阶段的数组变量。

```kon
(ai_workflow #fanOut
  :input = {question = "How to cache hot keys?"}
  :output = [drafts]
  :[
    (ai_phase #Draft
      :[
        (var approaches ["LRU" "cost-aware" "adaptive-ttl"])
        (var drafts (ai_parallel #draftApproaches
          :{
            input = approaches
            item = approach
            index = i
          }
          :[
            (ai_agent #draftOne :{
              label = "draft-\(i)"
              sys_prompt = "You are a systems design writer."
              user_prompt =
              """
              Question: \(question)
              Angle: \(approach)
              """
            })
          ]))
      ])
  ])
```

*实测*（`kwf dry-run`）：`status=completed`，1 个 yield，`jobCount=3`，结果 `[["dry-run:draftOne","dry-run:draftOne","dry-run:draftOne"]]`。三个角度各派发一个 job，结果按序拼成数组。

完整的「扇出 + 归并」见 `examples/fan-out-reduce.kon`：在 `#Synthesize` 阶段再用一个 `ai_agent #synthesize` 读取 `drafts` 数组做归并。

**适用边界**：`input` 必须是数组；非数组会被当成空 `[]`（不报错，但不派发任何 job）。空数组 → 不 yield、不产生 job、`drafts` 直接是 `[]`。

### 2. routing（分类后只派一条分支）

**适用场景**：先用一个 agent 分类/判路，再根据结果只调用匹配的那个专家 agent。典型如：工单分流、意图识别后走不同 handler。

**机制**：分类 agent 必须声明 `output_schema`（下游要按 `(classification.:category)` 读字段，见最佳实践二）。`(if cond :[...] else :[...])` 是普通 kunun 控制流；**只有命中的那条分支里的 `ai_agent` 会 yield**，另一条分支根本不执行（`WorkflowResource.test.ts:104-111`）。

```kon
(ai_workflow #routing
  :input = {request = "The button layout breaks on mobile"}
  :output = [classification answer]
  :[
    (ai_phase #Classify
      :[
        (var classification (ai_agent #classifyRequest :{
          label = "classifier"
          sys_prompt = "You are a triage classifier."
          user_prompt = "Classify into one of: frontend, backend, general.\n\nRequest: \(request)"
          output_schema = {
            type = "object"
            properties = { category = {type = "string"} }
            required = ["category"]
          }
        }))
      ])
    (ai_phase #Answer
      :[
        (var answer "")
        (if (:== (classification.:category) "frontend")
          :[
            (set answer (ai_agent #frontendSpecialist :{
              label = "frontend"
              sys_prompt = "You are a frontend specialist."
              user_prompt = "Solve this frontend request: \(request)"
            }))
          ]
          else :[
            (set answer (ai_agent #generalSpecialist :{
              label = "general"
              sys_prompt = "You are a generalist engineer."
              user_prompt = "Solve this request: \(request)"
            }))
          ])
      ])
  ])
```

*实测*（`kwf dry-run`）：`status=completed`，2 个 yield，派发的 job 名为 `['classifyRequest']` 然后 `['generalSpecialist']`。dry-run 下 `category` 被 mock 成字符串 `"dry-run:classifyRequest.category"`（不等于 `"frontend"`），所以走了 `else` 分支——**正好一条分支被派发**。完整版即 `examples/routing.kon`。

### 3. pipeline（每元素分阶段串行处理）

**适用场景**：对一组元素，每个都要经过**多个有序阶段**，且**后一阶段要读前一阶段的结果**。典型如：大纲 → 成文 → 校对；规范化 → 抽取 → 评审。

**机制**：`ai_pipeline` 的 body 是一串 `(stage #名字 :[...])`。运行时**一个阶段一个 yield**：stage 0 的 `value` 绑定原始元素，stage N>0 的 `value` 绑定该元素在 stage N-1 的结果。每个阶段对每个元素派一个 job（`WorkflowDsl.ts:296-335,403-422`）。`value` 是把上一阶段结果传给下一阶段 prompt 的**唯一**手段（因为 prompt 在 checkpoint 前求值，见最佳实践三）。

```kon
(ai_workflow #pipeline
  :input = {topic = "rate limiting"}
  :output = [results]
  :[
    (ai_phase #Process
      :[
        (var sections ["intro" "body" "conclusion"])
        (var results (ai_pipeline #writeSections
          :{
            input = sections
            item = section
            value = prev
            index = i
          }
          :[
            (stage #Outline :[
              (ai_agent #outline :{
                label = "outline-\(i)"
                sys_prompt = "You outline a section."
                user_prompt = "Outline the \(section) section about \(topic)."
              })
            ])
            (stage #Write :[
              (ai_agent #write :{
                label = "write-\(i)"
                sys_prompt = "You write prose from an outline."
                user_prompt =
                """
                Section: \(section)
                Outline: \(prev)
                """
              })
            ])
          ]))
      ])
  ])
```

*实测*（`kwf dry-run --show-prompts`）：`status=completed`，2 个 yield（每阶段一个），每个 yield `jobCount=3`。stage `Write` 的首个 prompt 为 `'You write prose from an outline.\n\nSection: intro\nOutline: dry-run:outline'`——`prev` 确实绑定了上一阶段 `#outline` 的结果。`examples/deep-research.kon` 的 `#Vote` 阶段是更复杂的三段式 pipeline（SkepticA → SkepticB → Vote）。

### 4. loop-until-dry（重复到某轮无新增）

**适用场景**：不知道要跑几轮，需要根据 agent 返回的某个计数/标志决定是否继续。典型如：反复扫描直到某轮 0 发现、迭代精炼到收敛。

**机制**：用 `(foreach round in [...] :[ ... ])` 包住一个 `ai_agent`；该 agent 在**每次到达它的迭代里 yield 一次**。循环/异常控制帧能跨 checkpoint/resume 存活（`RuntimeInterpreterDynamicWorkflowMock.test.ts:232-267`）。用 `(:break)` 提前结束。计数字段必须来自 `output_schema`。

```kon
(ai_workflow #loopUntilDry
  :input = {scope = "packages/runtime"}
  :output = [totalFindings dryRound]
  :[
    (ai_phase #Sweep
      :[
        (var totalFindings 0)
        (var dryRound -1)
        (foreach round in [0 1 2 3] :[
          (var batch (ai_agent #findIssues :{
            label = "finder-round-\(round)"
            sys_prompt = "You are a meticulous bug finder."
            user_prompt = "Inspect \(scope). This is round \(round)."
            output_schema = {
              type = "object"
              properties = {
                findings = {type = "array"}
                count = {type = "number"}
              }
              required = ["findings" "count"]
            }
          }))
          (if (:== (batch.:count) 0)
            :[
              (set dryRound round)
              (:break)
            ]
            else :[
              (set totalFindings (totalFindings (batch.:count) :+))
            ])
        ])
        (ai_log #swept :{ message = "total \(totalFindings), dry at round \(dryRound)" })
      ])
  ])
```

*实测*（`kwf dry-run`）：`status=completed`，结果 `[0, 0]`。

> **dry-run 陷阱（重要）**：dry-run 把数字字段 mock 成 `0`，所以 `(:== (batch.:count) 0)` 第一轮就成立，立即 `(:break)`——只 yield **一次**（不是 4 次），`dryRound=0`。这说明 **dry-run 验证的是接线与插值，不是真实的分支宽度/循环轮数**。真实运行时轮数取决于真实 agent 返回。完整版即 `examples/loop-until-dry.kon`。

注意里面的算术写法：`(totalFindings (batch.:count) :+)` 是「前置操作数、后置操作符」的 knot 形式，等价于 `totalFindings + batch.count`；`(survivorCount 1 :+)` 即 `survivorCount + 1`（`loop-until-dry.kon:34`、`adversarial-verify.kon:59`）。

### 5. adversarial-verify（找断言 → 并行挑战 → 留存活者）

**适用场景**：先让一个 agent 产出一组断言，再对每条断言并行派对抗式审查 agent，最后过滤出「存活」的断言。典型如：事实核查、claim 验证、对抗式评审。

**机制**：`#Find` 用带 `output_schema` 的 agent 产出 `claims` 数组；`#Challenge` 用 `ai_parallel` 对每条断言并行挑战，每个挑战 agent 也带 `output_schema`（返回 `verdict`）；`#Filter` 用普通 `foreach` + `if` 统计存活数。

```kon
(ai_workflow #adversarialVerify
  :input = {topic = "token bucket rate limiting"}
  :output = [claims verdicts survivorCount]
  :[
    (ai_phase #Find
      :[
        (var found (ai_agent #findClaims :{
          label = "finder"
          sys_prompt = "You are a precise researcher."
          user_prompt = "List factual claims about: \(topic)"
          output_schema = {
            type = "object"
            properties = { claims = {type = "array"} }
            required = ["claims"]
          }
        }))
        (var claims (found.:claims))
      ])
    (ai_phase #Challenge
      :[
        (var verdicts (ai_parallel #challengeClaims
          :{
            input = claims
            item = claim
            index = i
          }
          :[
            (ai_agent #challenger :{
              label = "skeptic-\(i)"
              sys_prompt = "You are an adversarial reviewer."
              user_prompt = "Challenge this claim: \(claim)"
              output_schema = {
                type = "object"
                properties = { verdict = {type = "string"} }
                required = ["verdict"]
              }
            })
          ]))
      ])
    (ai_phase #Filter
      :[
        (var survivorCount 0)
        (foreach verdict in verdicts :[
          (if (:== (verdict.:verdict) "survives") :[
            (set survivorCount (survivorCount 1 :+))
          ])
        ])
        (ai_log #filtered :{ message = "survivors: \(survivorCount)" })
      ])
  ])
```

*实测*（`kwf validate`）：`ok=true`，第一个 yield 是 `ai_agent` `findClaims`（`hasOutputSchema=true`）。这就是 `examples/adversarial-verify.kon`。

> **dry-run 陷阱（务必看完）**：dry-run 下 `claims` 是由 `output_schema` mock 出来的数组，默认 `minItems=1`，即**只有 1 个元素**。于是 `#Challenge` 的 fan-out 只产生 **1 个 job**。而 `ai_parallel` 只有 1 个元素时，resume 推回的是**单个值而非数组**（`WorkflowDsl.ts:476`：`jobs.length === 1 ? values[0] : values`）。所以 dry-run 里 `verdicts` 是一个对象 `{"verdict":...}`，而**真实运行**多条断言时 `verdicts` 是数组。
>
> 这个单元素收窄会一路传到 `:output`：`adversarial-verify.kon` 在 dry-run 下**正常跑完**（实测 `status=completed`、~1s 返回，并不挂死），但 `resultPreview` 是 `{"verdict":"dry-run:challenger.verdict"}` 而非预期的 `[claims, verdicts, survivorCount]` 三元组——根因就是上面那条**单元素 `ai_parallel` resume 推回单值**（`WorkflowDsl.ts:476`），而**不是** `#Filter` 里的 foreach 出问题。在 `kwf` 工作流运行路径（`ExecBlockWithRuntimeSync`）下，即便 `verdicts` 退化成单个 map 对象，`(foreach verdict in verdicts ...)` 仍会跑完、dry-run 走完整条流水线，不会因此阻塞。这是 **dry-run mock 的产物，不是工作流写法的错**。真实运行（claims ≥ 2 条）时 `verdicts` 是数组、`:output` 正常返回三元组。要在 dry-run 里完整验证多元素过滤逻辑，把 `output_schema` 里数组的 `minItems` 调到 **≥ 2**。
>
> （独立提醒，**与 dry-run 无关**：`foreach` 只能迭代数组。对**纯 JS map 对象 / 数字**等非数组，**triage D13 已修复**——现抛有界诊断 `foreach expects an array to iterate, got <type>`（此前 `IterForEachLoop` 取 `items.length` 为 `undefined`、`index >= undefined` 恒假 → 无限循环挂死，`RuntimeInterpreter.ts` IterForEachLoop）。要遍历 map，先把它的 entries 放进 vector。）

---

## 二、最佳实践

### 实践 1：每个 ai_parallel / 每个 stage 的 body 里**只放一个** ai_agent

`ai_parallel` 的 body 和 `(stage ...)` 的 body 都在 **capture 模式**下运行——只有 body 里**最后一个表达式**的值会被当作要派发的请求收集（`WorkflowDsl.ts:259-269`）。如果你放了两个 `ai_agent`，**只有后一个会被派发，前一个被静默丢弃**。

```kon
// 反例：两个 agent 在同一个 capture body 里
(var r (ai_parallel #fan :{ input=["a"] item=it index=i } :[
  (ai_agent #first  :{ sys_prompt="s1" user_prompt="u1 \(it)" })
  (ai_agent #second :{ sys_prompt="s2" user_prompt="u2 \(it)" })
]))
```

*实测*（`kwf validate --json --show-prompts`）：`jobCount=1`，派发的 job 名为 `['second']`，prompt 是 `'s2\n\nu2 a'`——`first` 被静默丢弃。**正确做法**：每个 capture body 一个 agent；其它计算用普通 kunun 代码在 fan-out **之前或之后**做（`SKILL.md:198-199`）。

### 实践 2：被字段访问的结果**必须**声明 output_schema

凡是后续要用 `(x.:field)` 读字段的 agent 结果，都要在该 agent 上声明 `output_schema`（一个 JSON Schema）。运行时会把回复解析成 JSON 并按 schema 校验，失败会带纠错反馈重试（`bridge.ts:69-132`）；dry-run 时则据 schema 生成形状匹配的 mock，让下游 `(x.:field)` 读取继续工作（`validation.ts` `mockValueFromSchema`）。终端步骤（结果只当纯文本用）不需要 schema。

支持的 schema 关键字：`type`（`object`/`array`/`string`/`number`/`boolean`）、`properties`、`required`、`items`、`minItems`、`enum`——运行时回复校验 `validateAgainstSchema`（`schema.ts:63-106`）对这些都有处理。注意 `type = "integer"` 不在该函数的校验分支里，运行时**按未知类型静默放行**（不校验、不报错）；它只被 dry-run 的 mock 层 `mockValueFromSchema` 识别（`validation.ts:151-173`，与 `number` 共用 `case` → mock 成 `0`），所以 dry-run 下 `integer` 字段可用，但真实运行不对其做类型校验。要在运行时强制整数类型校验，请用 `number` 或加 `enum`。

```kon
(var classification (ai_agent #classifyRequest :{
  sys_prompt = "You are a triage classifier."
  user_prompt = "Classify: \(request)"
  output_schema = {
    type = "object"
    properties = { category = {type = "string"} }
    required = ["category"]
  }
}))
// 下游才能安全地读 (classification.:category)
```

不声明 schema 就字段访问，dry-run 会拿到一个 `dry-run:<label>` 字符串而非对象，`(x.:field)` 读不出预期结构；真实运行则依赖回复恰好是合法 JSON，脆弱且无重试保护。

### 实践 3：prompt 在 checkpoint **之前**求值，不能依赖尚未注入的 agent 结果

`sys_prompt` / `user_prompt` / `output_schema` 等所有配置，在 lowering 阶段、即 yield checkpoint **之前**就被 `evaluateValue` 求值（`WorkflowDsl.ts:92-111,163-193`）。因此一个 prompt **读不到**同一次派发里另一个 agent 还没返回的结果。

要把结果向前传递，只有两条合法路径：
- **顺序 `var`**：`(var a (ai_agent ...))` 然后下一句 `(var b (ai_agent #x :{ user_prompt = "based on \(a)" }))`——这是两次独立 yield，`b` 的 prompt 求值时 `a` 已被注入。
- **pipeline `value` 绑定**：跨 stage 传递，见范式三。

```kon
// 正确：两次 yield，draft 在 review 的 prompt 求值前已注入
(var draft (ai_agent #write :{ sys_prompt="s" user_prompt="Write about \(topic)" }))
(var review (ai_agent #review :{ sys_prompt="s" user_prompt="Review:\n\(draft)" }))
```

参见 `SKILL.md:202-204`。

### 实践 4：用 validate / dry-run 兜底

每写完一个 `.kon`，先 `kwf validate --json` 确认每个 job 的 `name` 与 `promptPreview` 符合预期（这能立刻暴露下面「连字符」陷阱），再 `kwf dry-run` 跑完整条流水线确认接线与插值。两者都不调用模型，免费且安全。

---

## 三、必须显式提醒的陷阱

### 陷阱 1：`#name` 含连字符会被解析成减法，并**静默丢弃配置**

这是最高价值的作者陷阱。`#name` 后面是一个 kunun **word**，而 `-` 是**减法操作符**。所以 `#draft-doc` 被解析成 `#draft` 减去 word `doc`（`WorkflowDsl.ts:72-77`）。

```kon
// 反例
(ai_agent #draft-doc :{ sys_prompt="You write." user_prompt="Write about \(topic)." })
```

*实测*（`kwf validate --json --show-prompts`）：agent 名字变成 **`draft`**（`sourceNodeId: prefix:ai_agent:draft@1`），而且整个 `:{...}` 配置块被**静默吞掉**——job **没有任何 prompt**（`promptPreview` 为 `None`）。工作流仍然 `validate ok` 并派发一个 job，是个**静默失败**。

**正确做法**：用 **camelCase**（`#draftDoc`）或下划线（`#draft_doc`）。

```kon
(ai_agent #draftDoc :{ sys_prompt="You write." user_prompt="Write about \(topic)." })
```

*实测*：名字保持 `draftDoc`，prompt 正常为 `'You write.\n\nWrite about x.'`。仓库里的约定是 agent 名用 camelCase（`#draftOne`、`#searchAngle`、`#voteClaims`），phase/stage 名用 PascalCase（`#Plan`、`#SkepticA`）。**写完务必 `kwf validate --json` 核对每个 job 的 `name` 与 `promptPreview`。**

### 陷阱 2：`ai_agent` 在 `ai_phase` 外**也**会 yield——真正的规则是「不在 capture body 里」

注意：`kwf agent` 用的 scaffold prompt 写着「`ai_agent` 必须包在 `(ai_phase ...)` 里才能产生 yield」（`agent-workflows.ts:17`），这是**风格/可观测性约定，不是硬性运行时规则**。

*实测*（`kwf validate`）：一个 `ai_agent` 直接放在 `ai_workflow` body 里（没有 `ai_phase`）照样 yield 一个 job。`ai_agent` **唯一不独立 yield** 的场合是它处在 `ai_parallel`/`ai_pipeline` 的 body 里（capture 模式，见实践 1）。

**结论**：把 agent 包进 `ai_phase` 是为了事件日志/dry-run 可读性的推荐约定，本章所有范式都遵循它；但它不是 yield 的必要条件。`ai_phase` 本身不创建作用域、不 yield、不 checkpoint，只是给事件日志打标签（`WorkflowDsl.ts:350-353`）。

### 陷阱 3：三引号字符串的缩进规则

多行 prompt 用三引号 `"""`。三条规则（`agent-workflows.ts:11-17`）：

1. 开头的 `"""` **必须独占一行**（`user_prompt =` 在上一行，`"""` 单独在下一行）。
2. 内容行的缩进**至少要和结尾的 `"""` 一样深**。
3. 那个**公共缩进会被剥掉**，相对多出的缩进保留。

```kon
user_prompt =
"""
Line one about \(topic).
  Indented line two.
Line three.
"""
```

*实测*（`kwf validate --show-prompts`）：值为 `'Line one about x.\n  Indented line two.\nLine three.'`——公共缩进被剥掉，`Indented line two.` 多出的 2 个空格被保留。

字符串字面量与插值（`\(expr)`、`[object Object]` 等）的完整规则见 [reference/04-strings.md](../reference/04-strings.md)。这里只提两个工作流里最常踩的插值坑：

- **字段访问插值要套自己的括号**：`\((obj.:field))` 渲染出值；裸写 `\(obj.:field)` 渲染成字面量 `[object Object]`。*实测*：`\((obj.:a))` → `1`，`\(obj.:a)` → `[object Object]`。这就是 `deep-research.kon` 写 `\((angle.:question))`（双括号）的原因。普通变量直接 `\(topic)` 即可。
- **整个对象/map 插值也是 `[object Object]`**：`\(obj)` 会渲染成 `[object Object]`，数组则渲染成逗号拼接的元素串。要在 prompt 里放结构化数据，请逐个读出标量字段。

### 陷阱 4：`--args` 不会覆盖 `:input` 的字面默认值

host 把 `--args`（或 MCP 的 `args`）放进一个**单独的全局变量 `args`**，**不会**合并进 `:input`（`validation.ts:77`、`driver.ts:22`）。

```kon
// 反例：期望被 --args 覆盖，实际不会
(ai_workflow #t :input={topic = "default"} :output=[topic] :[ ... ])
```

*实测*（`kwf dry-run --args '{"topic":"OVERRIDE"}'`）：结果 `["default"]`——`--args` **没有**覆盖默认值。

**正确做法**：在 `:input` 里显式引用 `args`：

```kon
(ai_workflow #t :input={topic = (args.:topic)} :output=[topic] :[ ... ])
```

*实测*（同样的 `--args '{"topic":"OVERRIDE"}'`）：结果 `["OVERRIDE"]`。

### 陷阱 5：嵌套 `ai_parallel` / `ai_pipeline` 会抛错

在一个 `ai_parallel`/`ai_pipeline` 的 capture body 里再放 `ai_parallel`/`ai_pipeline`，会抛 `Nested ai_parallel/ai_pipeline request capture is not supported`（`WorkflowDsl.ts:150-161`）。

*实测*（`kwf validate`）：`ok=false`、`status=error`，诊断信息正是 `Nested ai_parallel/ai_pipeline request capture is not supported`。

**没有嵌套 fan-out**。需要「每元素再扇出」时，请拆成多个顺序的 phase，或先把数据拍平成一维列表再做单层 fan-out。

### 陷阱 6（衍生）：dry-run 的扇出宽度与循环轮数来自 schema mock，不是真实数据

如范式四、五所述：dry-run 下数组按 `output_schema` 的 `minItems`（默认 1）mock，数字 mock 成 0。所以

- fan-out over 一个 mock 数组 → 只产生 **1 个 job**（不是真实的 N 个），且单元素 fan-out 的结果是**单值而非数组**；
- 计数/条件驱动的循环会**提前短路**（`count` mock=0 → 立刻 `(:break)`）。

dry-run 验证的是**接线、插值、schema 形状**，不是真实分支宽度。要在 dry-run 里覆盖多元素路径，临时调大相关数组 schema 的 `minItems`。

### 陷阱 7：`model` 在 adapter 没有 model flag 时被静默忽略

在 `ai_agent` 上设了 `model`，但解析到的 adapter 配置里没有 `flags.model` 映射时，model **既不报错也不传递**——只记录一个 `option_unmapped` 事件（`bridge.ts:83-85`）。要保证 adapter 配了 `flags: { "model": ["--model"] }`。这只影响真实 `run`，validate/dry-run 不调用 adapter。

---

## 速查表

| 节点 | 形式 | 是否 yield |
|------|------|-----------|
| `ai_workflow` | `(ai_workflow #n :input={...} :output=[...] :[...])` | 否（容器） |
| `ai_phase` | `(ai_phase #N :[...])` | 否（仅打标签） |
| `ai_log` | `(ai_log #n :{ message = "..." })` | 否（求值并返回 message 字符串） |
| `ai_agent` | `(ai_agent #n :{ ... })` | 是——除非在 capture body 内 |
| `ai_parallel` | `(ai_parallel #n :{ input=.. item=.. index=.. } :[...])` | 是（一次 yield，每元素一个 job，结果按序成数组） |
| `ai_pipeline` | `(ai_pipeline #n :{ input=.. item=.. value=.. index=.. } :[(stage #s :[...]) ...])` | 是（每阶段一次 yield，`value` 绑上一阶段结果） |

`ai_agent` 全部配置键（`WorkflowDsl.ts:163-193`）：`label`、`sys_prompt`、`user_prompt`、`output_schema`、`retry`、`timeout`、`adapter`、`model`。**未识别的键被静默忽略。**

配置块归属（容易搞混）：`ai_workflow` 用 `:input = {...}` / `:output = [...]`（带 `=` 的命名 conf / section）加 body `:[...]`；`ai_agent`/`ai_log`/`ai_parallel`/`ai_pipeline` 用单一 `:{ ... }` conf 块放键，parallel/pipeline 再加 body `:[...]`。
