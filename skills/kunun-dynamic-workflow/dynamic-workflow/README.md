# Dynamic Workflow 指南

本目录讲**如何基于 kunun 语言编写 dynamic workflow**——即用 `ai_*` 节点把多次 agent（LLM）调用编排成一个**可暂停、可恢复、崩溃可续跑**的 `.kon` 脚本，并用 `kwf` 命令行/MCP 驱动运行。

它独立于[语言参考手册](../reference/)：语言手册讲 kunun 这门语言**本身**（语法、求值、类型）；本目录讲在这门语言**之上**怎么写工作流。读者默认是另一个 AI，目标是据此正确产出可被 `kwf` 执行的 `kunun`/`kon` 代码。

> **语法说明**：本目录的代码一律是 **Kon** —— `()` 是 knot/chain，`[]` 是 vector，`{}` 是 map，map 条目用 `=` 分隔。**容器元素之间只用空白分隔，逗号不是分隔符**：写 `{a = 1 b = 2}`、`[1 2]`，带逗号会被拒（实测 `[1, 2]` 抛 `Comma separators are not allowed in this syntax profile`）；逗号在 kunun 里保留作 unquote（`,expr` / `,@` / `,%`），与分隔无关。字符串插值是 `\(expr)`。**函数调用（用户 fn、host 函数、运算符、方法）一律加 `:` 前缀**：前缀位 `(:+ 1 2)`、`(:Concat "a" "b")`，中缀位 `(1 2 :+)`；而 `ai_*` 节点、`var`/`set`/`if`/`fn`/`perform` 等关键字、以及 `:input=` 这类 keyword-arg 标记、`obj.:field` 字段访问、`Row:::member` 源限定都**不加** `:`。`ai_*` 配置块同理：`:input = {...}` 是 map，`:output = [...]` 是 vector，`:[ ... ]` 是 body vector。

---

## 与语言本体的关系：它是第 4 层，建立在解释器之上

kunun 是**分层**的，下层不知道上层存在，上层通过显式接口扩展下层。dynamic workflow 是最顶上的第 4 层（来源：`skill/reference/01-overview-mental-model.md:27-48`）：

| 层 | 是什么 | 包 |
|----|--------|-----|
| **第 4 层 · dynamic workflow（本目录）** | 六个 `ai_*` 节点的 **host 注册扩展**，lower 成 checkpoint-aware 的 yield；由 `kwf` 持久化驱动 | `kunun-workflow-dsl`、`kunun-workflow-host`（`kwf` CLI） |
| **第 3 层 · 解释器 + 标准内置语法** | `RuntimeInterpreter`：双栈虚拟机执行 knot，提供 `var`/`fn`/`if`/`foreach`/`perform` 等内置形式与 host 函数 | `kunun-runtime` |
| **第 2 层 · 类型系统（可选叠加）** | `ExtensibleScopedRowType` 静态类型检查，**默认关闭** | `kunun-type-system` |
| **第 1 层 · kon 数据格式** | Kon 语法（`()` knot / `[]` vector / `{}` map）。代码即数据 | `kunun-converter` |

要记牢的三条核心事实，它们直接决定你怎么写代码：

1. **`ai_*` 不是语言内置关键字，而是 host 在运行时注册的扩展。** 六个节点（`ai_workflow` / `ai_phase` / `ai_log` / `ai_agent` / `ai_parallel` / `ai_pipeline`，没有别的）由 `EnableWorkflowDsl(runtime)` 注册到第 3 层的解释器上。在裸 `kunun-runtime`（未启用 DSL）上写 `(ai_agent ...)` 不是关键字，解释器不认识。来源：`packages/workflow-dsl/lib/WorkflowDsl.ts:281-423`。
2. **运行时无"名字魔法"。** per-item fan-out、逐 stage 等行为由 DSL 包在注册时**显式声明的 lowering 逻辑**实现，运行时绝不按扩展名分支。来源：`codument/behaviors/runtime-interpreter.xml:483-507`。
3. **能 checkpoint 的根子在第 3 层的执行模型。** kunun 用**指令栈展开**（而非树遍历）执行，所以续延（continuation）是显式且 JSON 可序列化的数据——这正是工作流能在每次 agent 调用边界落盘、并在全新进程上恢复的前提。详见语言手册 [reference · 05 求值模型](../reference/05-evaluation-model.md)。

---

## 阅读顺序

按编号顺序读。00 是生成内核速查（最小语法 + 陷阱 + 端到端示例），01 建立心智模型，02 是查得到精确语法的参考，03 给可复用的范式与避坑，04 讲怎么真正跑起来。

0. **[00 · 工作流生成速查表](./00-cheatsheet.md)** — correct-by-construction 的最小内核：6 个节点 + 全部配置键 + 必避陷阱 + 一个实跑通过的端到端示例。它是 `kwf agent` 注入的**生成内核**；想最快上手时先扫这一章。
1. **[01 · 动态工作流总览](./01-overview.md)** — 动态工作流是什么、解决什么问题、它在 kunun 体系里的位置，以及 durable（可持久、可恢复）执行模型：checkpoint / resume / 崩溃恢复、yield 边界、它如何 lower 到 runtime 的 effect，以及与类型系统正交的 typed workflow 变体。**先读这一章**建立正确心智模型。
2. **[02 · 工作流 DSL 参考](./02-dsl-reference.md)** — 六个节点的**精确语法形式**与配置键逐个详解：`ai_workflow` / `ai_phase` / `ai_log` / `ai_agent` / `ai_parallel` / `ai_pipeline`，外加 `output_schema`（JSON Schema 作为 map 值，不是节点）、yield/checkpoint 语义总表、prompt 插值与多行字符串。**写代码时当字典查。**
3. **[03 · 工作流编写范式与陷阱](./03-authoring-patterns.md)** — 五个可直接套用的范式（fan-out/reduce、routing、pipeline、loop-until-dry、adversarial-verify）、最佳实践，以及七个必踩陷阱（`#name` 含连字符被解析成减法、prompt 在 checkpoint 前求值、嵌套 fan-out 抛错等）。
4. **[04 · 用 kwf 运行](./04-running-kwf.md)** — `kwf` 的 CLI 与 MCP 接口、退出码、`validate` vs `dry-run`（不调模型的安全检查）、`args` / `:input` 如何把输入喂进工作流、host 配置与 adapter，以及 `kwf agent` 从需求到执行的四阶段向导。

> **检索入口**：这些章节连同[语言参考手册](../reference/)都嵌入了 `kwf` 二进制，可直接检索而不必翻文件——`kwf docs list` 列全部章节，`kwf docs show <相对路径>` 读一章，`kwf docs search <关键词>` 跨章节按行命中（MCP 侧对应 `kwf_list_docs` / `kwf_get_doc` / `kwf_search_docs`）。

---

## 上手最小路径

只想尽快产出一个能跑的工作流时，按这个顺序操作：

1. 读 [01](./01-overview.md) §1–§4 建立 durable 心智模型（每次 agent 调用 = 一个 checkpoint）。
2. 从 [03 范式](./03-authoring-patterns.md) 挑一个最接近你需求的骨架，照抄并改 prompt。
3. 用 [02 DSL 参考](./02-dsl-reference.md) 核对每个配置键的精确写法（尤其 `output_schema` 的 map 形式、`#name` 不能含连字符）。
4. 按 [04](./04-running-kwf.md) 用 `kwf validate` / `kwf dry-run` 自测（**不花任何 agent 调用**），通过后再 `kwf run`。

> **所有代码示例都已对抗式验证过**：能跑通的标注了验证方式（多数用 `kwf dry-run`，它跑完全部 yield 但不调模型，用 schema 形状的 mock 注入结果）。拿到任何示例后，写代码前都应先用 `kwf validate` / `kwf dry-run` 复跑一遍再依赖它。

---

## 与语言参考手册的交叉链接

本目录刻意只覆盖工作流编排层。涉及 kunun 语言本身的语义，请回到[语言参考手册 `../reference/`](../reference/)，特别是：

- **[reference · 04 字符串](../reference/04-strings.md)** — `\(expr)` 插值、原始串、三引号多行串的全部硬性缩进规则与报错。**所有 prompt 都是字符串**，写 `sys_prompt` / `user_prompt` 时这是权威依据（常见坑：插值非字符串值会渲染成 `[object Object]`）。
- **[reference · 05 求值模型](../reference/05-evaluation-model.md)** — 双栈、fiber、continuation 与函数应用。解释**为什么 prompt 在 checkpoint 之前就被求值**、为什么 `foreach` / `try` 里能暂停恢复——这些是工作流 durable 行为的底层来源。
- **[reference · 06 内置与控制流](../reference/06-builtins-control-flow.md)** — `var` / `set` / `if` / `foreach` 等普通形式，以及前缀（`(:+ 1 2)`）/ 后缀（`(1 2 :+)`）算符。工作流 body 里的非 agent 计算都用它们。
- **[reference · 09 类型系统](../reference/09-type-system.md)** — `!Type` 前缀、`|in -> out|` 签名、`@merge`、effect 声明等。仅当你走 typed workflow 设计草图（`typed-examples/*.kon`）时需要；**默认无类型运行时不读它**。

---

## 配套示例文件

本目录的范式都有可运行的源文件，写代码时优先对照它们以保持写法一致：

- **`examples/*.kon`**（无类型，可被 `kwf` 直接执行）：`fan-out-reduce.kon`、`routing.kon`、`loop-until-dry.kon`、`adversarial-verify.kon`、`deep-research.kon`。用 `kwf examples show <name>` 查看。
- **`typed-examples/*.kon`**（类型优先的**设计草图**）：`typed-loop-until-dry.kon`、`typed-deep-research.kon`。它们能干净地类型检查（`RuntimeInterpreter.TypeCheckSource` 返回 0 diagnostic），但**不能**被无类型的 `kwf` host 直接执行——详见 [01 §6](./01-overview.md)。
