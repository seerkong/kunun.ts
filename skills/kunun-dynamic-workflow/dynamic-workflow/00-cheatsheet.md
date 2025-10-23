# 00 · 工作流生成速查表（correct-by-construction）

> 写 `.kon` 动态工作流的最小内核：6 个节点 + 全部配置键 + 必避陷阱 + 一个实跑通过的端到端示例。语法是 **Kon**：`()` knot，`[]` vector，`{}` map；容器元素**只用空白分隔**（逗号是 unquote，不是分隔符）。字符串插值 `\(expr)`。行注释用 `//`（**不是** `;`）。写完务必跑 `kwf validate` / `kwf dry-run` 自测（不调模型）。

## 6 个节点 + stage

| 节点 | 形式 | yield |
|------|------|-------|
| `ai_workflow` | `(ai_workflow #n :input = {k = v} :output = [a b] :[ ... ])` | 否（容器） |
| `ai_phase` | `(ai_phase #N :[ ... ])` | 否（仅打标签，不建作用域） |
| `ai_log` | `(ai_log #n :{ message = "..." })` | 否（返回 message 字符串） |
| `ai_agent` | `(ai_agent #n :{ <配置键> })` | **是**——除非在 capture body 内 |
| `ai_parallel` | `(ai_parallel #n :{ input = .. item = .. index = .. } :[ ... ])` | **是**（一次 yield，每项一个 job，结果按序成数组） |
| `ai_pipeline` | `(ai_pipeline #n :{ input = .. item = .. value = .. index = .. } :[ (stage #s :[ ... ]) ... ])` | **是**（每阶段一次 yield，`value` 绑上一阶段结果） |

`stage` 只在 `ai_pipeline` body 内合法。

## 配置键归属（搞混就不绑定）

- **`ai_workflow`**：用带 `=` 的 `:input = {...}`（map，每个键变成 body 内的变量）和 `:output = [...]`（vector）加 body `:[...]`。
- **其余节点**：把键放进单一 `:{ ... }` conf 块。`ai_parallel`/`ai_pipeline` 再加 body `:[...]`。

`ai_agent` 全部 8 个配置键（其它键被**静默忽略**）：

| 键 | 含义 |
|----|------|
| `label` | job 的人类可读标签（日志/dry-run 摘要） |
| `sys_prompt` | 系统提示（prompt 第一段） |
| `user_prompt` | 用户提示（第二段，`\n\n` 连接） |
| `output_schema` | JSON Schema map，见下 |
| `retry` | 进程级重试次数 |
| `timeout` | 超时秒数（默认 1800） |
| `adapter` | host adapter 名（`claude`/`codex`/...） |
| `model` | 模型名 |

`ai_parallel`/`ai_pipeline` 绑定键：`input`（求值后**必须是数组**，非数组当 `[]`）、`item`（当前项，默认 `item`）、`index`（下标，默认 `index`）；`ai_pipeline` 额外有 `value`（**上一阶段结果**；stage 0 时为原始项，默认 `value`）。

## :input / :output 机制

- `:input = {topic = "x"}` 让 body 内可直接用 `topic`。
- `:output = [a b]` 在 body 跑完后求值列出的每个变量，**永远产出一个数组**——`[a]` → `[value]`（单变量也包成单元素数组）。
- `--args`（CLI/MCP）**不**合并进 `:input`，而是放进独立全局变量 `args`。要用运行时入参，须显式引用：`:input = {q = (args.:q)}`。

## output_schema（不是节点，是 map 值）

需要被 `(x.:field)` 字段访问的 agent 结果**必须**声明 `output_schema`，否则 dry-run 拿到字符串、真实运行无重试保护。支持键：`type`（`object`/`array`/`string`/`number`/`boolean`）、`properties`、`required`、`items`、`minItems`、`enum`。dry-run 据此 mock：string→`"dry-run:<label>"`、number→`0`、boolean→`false`、enum→首值、array→`max(1,minItems)` 项。

```kon
output_schema = {
  type = "object"
  properties = { category = {type = "string" enum = ["a" "b"]} }
  required = ["category"]
}
```

## 必避陷阱

- **`#name` 含连字符 `-` 被当减法，且静默吞掉整个 `:{...}` 配置**：`#draft-doc` → 名字变 `draft`、无 prompt。用 **camelCase**（agent：`#draftOne`）或下划线；phase/stage 用 PascalCase（`#Classify`）。
- **`ai_agent` 须在 `ai_phase` 内 yield**：这是 scaffold 风格约定（非硬性规则，但所有范式都遵循）；真正不 yield 的唯一场景是处于 `ai_parallel`/`ai_pipeline` 的 capture body 内。务必把 agent 包进 phase 以得到清晰事件日志。
- **三引号 `"""`**：开/闭定界符须各自**独占一行**、对齐同列；内容行缩进**不得小于定界符列**，公共缩进被剥除。`user_prompt =` 在一行，`"""` 在下一行。
- **prompt 在 checkpoint 前求值**：读不到同一次派发里尚未注入的兄弟 agent 结果。向后传结果只有两条路：顺序 `(var x (ai_agent ...))`（各一次 yield）或 pipeline 的 `value`。
- **字段访问插值要套自己的括号**：`\((obj.:field))` 渲染出值；裸 `\(obj.:field)` 渲染成 `[object Object]`。整对象/数组插值同样是 `[object Object]`——逐字段读标量。
- **每个 capture body（`ai_parallel` 项 / 每个 `stage`）只能有一个 `ai_agent`**：只有最后一个表达式被派发，其余静默丢弃。不允许嵌套 `ai_parallel`/`ai_pipeline`（抛错）。
- **dry-run 的扇出宽度/循环轮数来自 schema mock**（数组默认 `minItems=1`，数字 mock=0），不是真实数据；它验证的是接线与插值。
- **名字与键的硬规则**：引用未绑定名字抛 `Unbound name`（变量先用 `:input`/`(var ..)` 绑定，typo 不再静默）；比较用 `:lt`/`:gt`/`:==`（别写裸 `<`/`>`，那是有序 map/泛型定界符）；map 与 `output_schema` 的键只用裸 word 或 `"字符串"`、**不要数字/表达式键**（`{1 = v}` 被拒）；`foreach` 只迭代 vector（对 map 报错）。

## 端到端示例（routing：分类 → 分支修复 → 汇总），已 `kwf dry-run` 通过

<!-- RUNNABLE:start -->
```kon
(ai_workflow #triageAndFix
  :input = {report = (args.:report)}        // --args 经 args 注入；无则为 null
  :output = [classification fix summary]     // 永远返回数组
  :[
    (ai_phase #Classify :[
      (var classification (ai_agent #classifyReport :{
        label = "classifier"
        sys_prompt = "You are a triage classifier."
        user_prompt = "Classify into frontend/backend/general.\n\nReport: \(report)"
        output_schema = {                      // 下游要读 .:category，故必须声明
          type = "object"
          properties = { category = {type = "string" enum = ["frontend" "backend" "general"]} }
          required = ["category"]
        }
      }))
    ])
    (ai_phase #Fix :[
      (var fix "")
      (if (:== (classification.:category) "frontend")   // 只有命中分支的 agent yield
        :[
          (set fix (ai_agent #frontendFix :{
            label = "frontend"
            sys_prompt = "You are a frontend specialist."
            user_prompt = "Propose a fix for: \(report)"
            timeout = 600
            retry = 2
          }))
        ]
        else :[
          (set fix (ai_agent #generalFix :{
            label = "general"
            sys_prompt = "You are a generalist engineer."
            user_prompt = "Propose a fix for: \(report)"
          }))
        ])
    ])
    (ai_phase #Report :[
      (var summary (ai_agent #writeSummary :{    // 顺序 var：fix 已注入，prompt 读得到
        label = "summarizer"
        sys_prompt = "You write concise summaries."
        user_prompt =
        """
        Category: \((classification.:category))
        Proposed fix: \(fix)
        """
      }))
      (ai_log #done :{ message = "summary ready for \((classification.:category))" })
    ])
  ])
```
<!-- RUNNABLE:end -->

> fan-out 骨架：把上面的分支换成 `(var drafts (ai_parallel #draftAngles :{ input = angles item = angle index = i } :[ (ai_agent #draftOne :{ label = "draft-\(i)" sys_prompt = "..." user_prompt = "... \(angle)" }) ]))`，结果按序成数组。

## 自测

```bash
bun /Users/kongweixian/lang/kunun.ts/packages/workflow-host/bin/kwf.ts dry-run /dev/stdin --json --show-prompts <<'KON'
... 你的工作流 ...
KON
```

核对：每个 job 有预期 `name` 与非空 `promptPreview`（否则踩了连字符陷阱）；`jobCount` 合理；prompt 无残留 `\(` 或 `[object Object]`；最终 `resultPreview` 是 `:output` 列表的数组形状。
