# 01 · 总览与心智模型

> 本章是 kunun 语言手册的入口。它只建立框架、给出导航，不展开任何语法细节。每个机制的精确语法、语义、陷阱都在后续专章里。
>
> **本手册使用 Kon 语法**：圆括号 `()` = knot（链/调用），方括号 `[]` = vector，花括号 `{}` = map。所有正文用中文；代码、关键字、类型名、操作符、函数名、文件路径保留英文原文。

---

## 1. kunun 是什么

kunun 是一门实验性语言，设计上同时受 **Lisp** 和 **Forth** 启发（`README.md:1`）：

- **来自 Lisp**：代码与数据共用同一种结构。一切表达式都是同一个 `knot` 数据结构，没有"语法树类型"和"数据类型"的割裂（`README.md:40-70`）。
- **来自 Forth**：求值以**操作数栈（operand stack）**为中心，函数从共享操作数栈上消费参数；因此值的流动本质是 RPN/后缀式，即使你写的是前缀或中缀表面语法（`.tmp/kunun-findings/read-evaluation-model.md` "Evaluation order: RPN at the value level"，对应 `packages/runtime/lib/RuntimeInterpreter/RuntimeInterpreter.ts:94-102`）。

它支持两种记法并存（`README.md:4`）：

- **PN（Polish notation，前缀）**：`(:+ 1 2)`
- **RPN（Reverse Polish notation，后缀）**：`(1 2 :+)`

两者求值结果相同（下面第 4 节会验证）。

kunun 不止是核心解释语言，还自带一个**持久化多智能体工作流系统**：工作流用 Kon DSL 编写（`examples/*.kon`），由 `kwf` CLI 驱动，每次 agent 调用都是一个可序列化的 checkpoint 边界，可以暂停、恢复、崩溃后从中途续跑（`README.md:112-137`，`skill/SKILL.md:8-13`）。

---

## 2. 四层模型与本手册导航

kunun 是分层的：下层不知道上层的存在，上层通过显式接口扩展下层。这条**无环依赖方向**是被包边界强制的（`README.md:96-108`，`codument/behaviors/workspace-packaging.xml:17-31`）。

```
                          dynamic workflow (ai_* DSL)        ← 第 4 层：扩展
                                   │  lowers to
                                   ▼
  kon 数据格式  ──parse──►  解释器 + 标准内置语法 (RuntimeInterpreter)  ← 第 3 层
                                   ▲
                                   │  opt-in bridge
                       ExtensibleScopedRowType 类型系统   ← 第 2 层（可选叠加）
```

下表把每一层映射到包、到对应的权威 behavior 规范、以及到本手册后续章节：

| 层 | 是什么 | 包 / 入口 | 权威规范 | 本手册章节 |
|---|---|---|---|---|
| **第 1 层 · kon 数据格式** | Kon 语法：容器（`()`=knot、`[]`=vector、`{}`=map）、分隔符、字符串、插值。代码即数据。 | `kunun-converter`（parser / formatter / SyntaxConfig，`README.md:99-110`） | `codument/behaviors/parser-syntax.xml` | [02 · 语法](./03-kon-data-format.md)、[03 · 字符串与插值](./04-strings.md) |
| **第 2 层 · ExtensibleScopedRowType 类型系统** | 可选叠加的静态类型检查：rows / classes / traits / generics / effects。**默认关闭**。 | `kunun-type-system`（实现并注册 `TypeSystemBridge`，`README.md:106`） | `codument/behaviors/runtime-type-system.xml` | [07 · 类型系统](./09-type-system.md) |
| **第 3 层 · 解释器 + 标准内置语法** | `RuntimeInterpreter`：双栈虚拟机执行 knot，加上 `var`/`fn`/`if`/`class`/`perform` 等标准内置特殊形式与 host 函数。 | `kunun-runtime`（依赖 `depa-actor`；定义 `TypeSystemBridge` 钩子但从不 import 类型系统） | `codument/behaviors/runtime-interpreter.xml`、`codument/behaviors/depa-actor-execution-kernel.xml` | [04 · 求值模型与双栈](./05-evaluation-model.md)、[05 · 内置特殊形式](./06-builtins-control-flow.md)、[06 · 对象与 effects](./07-functions-objects.md) |
| **第 4 层 · dynamic workflow 扩展** | 六个 `ai_*` 节点（`ai_workflow`/`ai_phase`/`ai_log`/`ai_agent`/`ai_parallel`/`ai_pipeline`）的 host 注册扩展，lower 成 checkpoint-aware yield；由 `kwf` 持久化驱动。 | `kunun-workflow-dsl`（lowering + `RunWorkflowSync`/`ResumeWorkflowSync`）、`kunun-workflow-host`（`kwf` CLI） | `codument/behaviors/workflow-dsl.xml`、`codument/behaviors/workflow-host-runtime.xml`、`skill/SKILL.md` | [08 · 工作流 DSL](../dynamic-workflow/02-dsl-reference.md)、[09 · kwf 运行与持久化](../dynamic-workflow/04-running-kwf.md) |

> `kunun` 这个 umbrella 包重新导出全部 API，且 **import 它会自动注册 `TypeSystemBridge`**，从而开启 typed 执行路径（`codument/behaviors/workspace-packaging.xml:52-61`）。光 import `kunun-runtime` 而不注册 bridge，则保持默认**无类型**行为不变。

**关键边界**（写代码时不要越界）：

- `kunun-runtime` 的工作流机制是**完全通用的**——没有任何 `ai_*` 语义，job 展开靠显式声明而非按名字识别（`README.md:101-103`，`codument/behaviors/runtime-interpreter.xml:483-507`）。`ai_*` 只是上层 host 注册的扩展。
- `depa-actor` 是**领域中立**的执行内核（栈/分发原语），它**绝不包含** AI / prompt / JSON-schema / workflow 概念（`codument/behaviors/depa-actor-execution-kernel.xml` `no-ai-semantics`）。所有 kunun/AI 语义都住在它之上的 kunun 各层。不要把 kunun 行为归因到 depa-actor。

---

## 3. 核心心智模型

下面四条是写正确 kunun/kon 代码必须先装进脑子的模型。每条都标注了在哪一专章里展开。

### 3.1 一切表达式都是 knot 结构（代码即数据）

受 Lisp 影响，kunun 中数据部分和表达式部分用**同一种结构**表示（`README.md:40`）。这个结构叫 `knot`——一个带若干字段（`Core`、`Param`、`Body`、`Header`、`Next` 等）的节点，节点通过 `.Next` 串成链（`README.md:46-70`）。

- 在 Kon 里，`()` 写的就是 knot；`[]` 是 vector，`{}` 是 map（`codument/behaviors/parser-syntax.xml:10-13`）。
- 一个 for 循环、一次函数调用、一个类声明，全都是 knot——它们和你当作"数据"的 `[1 2 3]`、`{a = 1}` 是同一层级的东西（`README.md:70-89`）。

**精确语法形式**（Kon）：

```kon
[1 2 3]            // vector（数据）
{a = 1 b = 2}      // map（数据；注意 = 是键值分隔符，不是赋值）
(1 2 :+)           // knot（表达式：一次 + 调用）
```

**可运行示例**（用 `RuntimeInterpreter.EvalBlockSourceSync`）：

```kon
[1 2 3]
```
求值得到 `[1,2,3]`。

```kon
{a = 1 b = 2}
```
求值得到一个 map（注意：map 字面量是无序对象，JSON 序列化的键顺序不保证等于源码顺序，本例实测输出 `{"b":2,"a":1}`；见 [04 · 求值模型](./05-evaluation-model.md) 的 "Map literals lose key order" 陷阱）。

**陷阱**：容器元素之间**只用空白分隔**，逗号 `,` 不是分隔符（见下方第 5 节和 [02 · 语法](./03-kon-data-format.md)）；并且 `=` 在 map 里是**数据语法**，不是赋值（见 [05 · 内置特殊形式](./06-builtins-control-flow.md)）。

### 3.2 双栈虚拟机：operand stack + instruction stack（基于 depa-actor）

这是**最重要的运行时不变量**：`RuntimeInterpreter` 不是树遍历解释器（tree-walker），而是把每个 knot 节点**展开（expand）**成一串扁平的 `RuntimeInstruction` 记录，压到 fiber 的 **instruction stack** 上，再由底层 `depa-actor` 内核逐条分发执行（`.tmp/kunun-findings/read-evaluation-model.md` Summary；`codument/behaviors/runtime-interpreter.xml:261-314`）。

每个 fiber 拥有两个 LIFO 栈（`packages/runtime/lib/RuntimeInterpreter/RuntimeFiber.ts:28-44`）：

- **instruction stack**：待做的工作（"接下来执行什么"）。
- **operand stack**：算出来的值（"目前手上有哪些值"），按 frame 分段。

**为什么这么设计**：只有把延续（continuation）显式化、可序列化，才能支撑（a）工作流 checkpoint 捕获/恢复，（b）effect 延续，（c）将来的 codegen（`codument/decisions/2026-06/2026-06-07-1335-runtime-instruction-stack-expansion/decision.md:10-20`）。

**直接后果**（写代码与扩展时都要记住）：逻辑短路（`and`/`or`/`or_else`）、`return`、循环、effects、workflow yield 这些需要控制求值顺序的特性，**不能实现成普通 host 函数**——它们必须压显式指令，否则会破坏短路语义和 checkpoint/resume（`.tmp/kunun-findings/read-behaviors-and-history.md` "逻辑短路不能实现为普通 host function"）。

详见 [04 · 求值模型与双栈](./05-evaluation-model.md)。

### 3.3 按元数（arity）触发的函数应用

函数**不是一看到就调用**，而是等到 operand stack 上**攒够参数**才触发（`README.md:9`）。运行时通过 lookahead 消费后续 knot 来补足缺失的参数（`.tmp/kunun-findings/read-evaluation-model.md` "Arity-driven function application"，对应 `RuntimeInterpreter.ts:1259-1426`）。

README 给出的逐步求值（`README.md:11-22`）翻成 Kon 是：一个 4 元函数被喂入两个 2 元素组，运行时依次压栈、每压一组检查一次"参数够了没"，够了才 eval。

**精确语法形式 / 语义**：callable（无论写成 `:add` 前缀还是 bare word `add`）解析后，按其 arity 从后续链节点拉取参数；攒够才发 `Ctrl_ApplyCallable`，否则只把值/闭包压栈（`RuntimeInterpreter.ts:1403-1423`）。注意这只针对已知 callable / 已绑定的名字：引用一个未定义的名字（既非 host 函数、也未在任何 env 绑定、又非注册扩展）现在会抛 `Unbound name: X`——无论它出现在链头、嵌套参数、函数体、`if`/`foreach` 分支还是顶层裸词，bare 与冒号前缀都一样报错，不再静默压栈或返回 null。

**可运行示例**：

```kon
(fn #add :|a b| :[ (a b :+) ]) (:add 3 4)
```
求值得到 `7`——`:add`（arity 2）消费了后续两个链节点 `3` 和 `4`。

**陷阱**：对于 `+`/`*` 这类**变参 host 函数**（注册 arity 为 2 但实现是 reduce-over-all-args），前缀和后缀**不等价**：`(:+ 1 2 3)` 得 `6`（前缀路径把全部 3 个参数都传进去），而 `(1 2 3 :+)` 得 `5`（后缀算子只消费声明的 arity=2，即栈顶两个 `2 3`，留下 `1`，最后帧的末值是结果）。细节见 [04 · 求值模型](./05-evaluation-model.md) 的 arity 陷阱。

### 3.4 PN 与 RPN 两种记法

同一次调用可以写成前缀、中缀、后缀三种表面形态，**第一个源操作数总是左/首参数**（`.tmp/kunun-findings/read-evaluation-model.md` "Evaluation order"，验证了非交换运算 `(10 3 :-)` 与 `(:- 10 3)` 都得 `7`）：

- 前缀（PN）：`(:+ 1 2)`
- 中缀：`(1 :+ 2)`
- 后缀（RPN）：`(1 2 :+)`

`README.md:26-36` 还提到 `;` 后缀糖——把 operand stack 顶上的函数立即应用。

**可运行示例**（全部实测通过，见下方第 4 节）：`(:+ 1 2)`、`(1 :+ 2)`、`(1 2 :+)` 都得 `3`；`(3 4 +;)` 得 `7`。

> 注意 `:+` 前缀的冒号：在 Kon 里，**函数调用**（用户 fn、host 函数、运算符、方法）无论写在前缀位还是中缀/后缀位都用 `:name` 形式。运算符函数通常写成 `:+ :- :gt :or_else :== :lt` 等。
>
> **逻辑运算**：`and`/`or` 按设计也是函数，中缀/后缀 `(a b :and)` / `(a b :or)`、bare `(and a b)` / `(or a b)`、冒号前缀 `(:and a b)` / `(:or a b)` 三种形式结果一致（如 `(:and true true)` 得 `true`、`(:or false true)` 得 `true`）。完整的内置算子/host 函数表见 [05 · 内置特殊形式](./06-builtins-control-flow.md)。

### 3.5 sentence / clause 共享操作数栈

一个 **sentence**（一条 knot 链）可以有一个或多个 **clause**，同一 sentence 内的所有 clause **共享同一个 operand frame**（`README.md:6-7`；`.tmp/kunun-findings/read-evaluation-model.md` "Chain expansion"，对应 `RuntimeInterpreter.ts:1124-1147`）。每个 clause 把结果压到同一个 frame，运算符从这个共享 frame 上消费值——这正是"值流是 RPN"的根源。

一段程序（或一个 block）的值是**最后一个 clause 的值**：block 展开会在语句之间插入 `ValStack_PopValue`，只让末值留在 frame 上（`.tmp/kunun-findings/read-evaluation-model.md` "Operand frame collapses to LAST value"，对应 `RuntimeInterpreter.ts:1113-1122`）。

**可运行示例**：

```kon
(var x 1) (var y 2) (x y :+)
```
求值得到 `3`（前两条 clause 声明变量，末条相加；整段返回末值）。

```kon
(do :[ (1 2 :+) (10 20 :+) ])
```
求值得到 `30`（block 内两条 clause，只有末条 `(10 20 :+)` 的值幸存）。

链式连写也共享同一帧：

```kon
(1 :+ 1 :+ 1)
```
求值得到 `3`。

---

## 4. 验证过的核心示例

以下示例全部用 `bun -e 'import {RuntimeInterpreter} from "kunun-runtime"; RuntimeInterpreter.EvalBlockSourceSync(SRC)'` 实测通过（Kon 语法）：

| 源码 | 结果 |
|---|---|
| `(:+ 1 2)` | `3`（PN） |
| `(1 :+ 2)` | `3`（中缀） |
| `(1 2 :+)` | `3`（RPN） |
| `(3 4 +;)` | `7`（`;` 应用糖） |
| `(fn #add :|a b| :[ (a b :+) ]) (:add 3 4)` | `7`（arity 触发） |
| `(var x 1) (var y 2) (x y :+)` | `3`（clause 共享栈，返回末值） |
| `(do :[ (1 2 :+) (10 20 :+) ])` | `30`（block 取末值） |
| `(1 :+ 1 :+ 1)` | `3`（链共享帧） |
| `[1 2 3]` | `[1,2,3]`（vector 字面量） |
| `{a = 1 b = 2}` | map（键顺序不保证；实测 `{"b":2,"a":1}`） |
| `(if (:gt 5 3) :[ 7 ] else :[ 9 ])` | `7`（`if` 返回所选分支的值） |

工作流层（第 4 层）示例，用 `kwf dry-run`（不调用任何模型，注 schema-shaped mock 结果）实测：

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
`kwf dry-run` 输出 `status: completed (ok)`、`yields: 1`、`yield: ai_agent (1 job)`，prompt 显示 `q = hi`（`\(q)` 插值在当前 env 解析），`result: ["dry-run:ask"]`。这印证了：`:input` map 的条目变成变量、`:output` vector 列出返回数组、Kon 字符串插值用 `\(expr)`。详见 [08 · 工作流 DSL](../dynamic-workflow/02-dsl-reference.md)。

> 类型层（第 2 层）需从 `kunun` umbrella 触发 bridge 注册：`import {RuntimeInterpreter} from "kunun"; RuntimeInterpreter.EvaluateTypedBlockSync(src)`。例如 `(fn #id |!String s -> String| :[ (s) ]) (:id "hi")` 先类型检查再执行，得 `"hi"`。详见 [07 · 类型系统](./09-type-system.md)。

---

## 5. Kon 容器与分隔符一句话概述

Kon 用三对括号区分三类容器（`codument/behaviors/parser-syntax.xml:2-21`）：

| 容器 | 写法 | 含义 |
|---|---|---|
| **map** | `{}` | 键值对，键值用 `=` 分隔，如 `{a = 1 b = 2}` |
| **vector** | `[]` | 有序数组，如 `[1 2 3]` |
| **knot** | `()` | 链/调用，如 `(1 2 :+)` |

字符串插值用 `\(expr)`：`"q = \(q)"` 在当前 env 解析 `q`（见第 4 节的工作流示例，详见 [03 · 字符串与插值](./04-strings.md)）。

**关键陷阱（最常踩）**：

- **容器元素之间只用空白分隔，逗号 `,` 不是分隔符**。`[1, 2]` 会被**拒绝**（实测抛 `Callable not found: <stack-callable>`，因为 `,` 是 unquote 运算符——见下一条——`,2` 被当成 unquote 在求值期失败）；正确写法是 `[1 2]`。同理 map 写 `{a = 1 b = 2}` 而非 JSON 风格 `{a: 1, b: 2}`——`:` 不是键值分隔符（Kon 用 `=`），逗号也不能用（JSON 风格的 `{a: 1, b: 2}` 实测抛 `Comma separators are not allowed in this syntax profile`）（`codument/behaviors/parser-syntax.xml:22-41`）。
- 逗号之所以不能当分隔符，是因为 `,` 在 kunun 里**被保留作 unquote 运算符**：`,expr`（unquote）、`,@`（unquote-splice）、`,%`（unquote-map）——用于模板/引用展开，而非分隔容器元素。两者别混。

Kon 容器、分隔符、字符串四形态（`"..."` / `"""` / `'...'` / `'''`）、插值与转义的完整规则见 [02 · 语法](./03-kon-data-format.md) 与 [03 · 字符串与插值](./04-strings.md)。

---

## 6. 几条会反复咬人的全局事实

这些是入口章就该知道、否则会系统性写错的事实（每条都在后续专章展开）：

- **`=` 是数据语法，不是通用赋值**。`{name = "Alice"}` 是 map 条目、`(field #age = 0)` 是默认值、metadata/config 用 `=`。通用的 `=` 赋值**不存在**；赋值（`=` / `:=`）只允许作用在可写链目标上，如 `(obj.:field = v)`、`(obj.:field := v)`、`(arr::0 := 9)`（`codument/behaviors/runtime-interpreter.xml:413-429`）。见 [05 · 内置特殊形式](./06-builtins-control-flow.md)。
- **三个看起来像、其实不同的下标 token**：`:::` = 源限定符（成员来自哪个 row/class，如 `T1:::b`）、`::` = 容器下标（索引，如 `arr::0`）、`.:` = 槽/字段/静态成员访问（如 `obj.:name`、`self.:field`）。冒号数量错一个，parse 就完全变了（`codument/behaviors/parser-syntax.xml:42-76`）。见 [02 · 语法](./03-kon-data-format.md)。
- **类型检查严格 opt-in，默认执行无类型**。`!Type` 前缀、`class`/`type`/`trait`、`@inherits`/`@merge`、`#(effect ...)` 标记只在 typed 入口下才生效；默认 `RuntimeInterpreter` 执行会忽略它们、且绝不隐式安装 typed dispatch（`codument/behaviors/runtime-type-system.xml:111-124`）。见 [07 · 类型系统](./09-type-system.md)。
- **`ai_*` 是 host 扩展，不是语言内置**；运行时**没有按名字的魔法**——per-item fan-out 来自 `jobExpansion='perArg'`，而非运行时识别 `ai_parallel` 这个名字（`codument/behaviors/runtime-interpreter.xml:483-507`）。见 [08 · 工作流 DSL](../dynamic-workflow/02-dsl-reference.md)。
- **legacy `Interpreter` / `XnlState` / `ExtensionRegistry` / `XnlOpCode` 已被移除**，只有 `RuntimeInterpreter` 存在（`codument/behaviors/runtime-interpreter.xml:453-467`）。看到旧文档引用这些符号一律按废弃处理。

---

## 7. 怎么把代码跑起来（自检手段）

写 kunun/kon 代码后，用这些 harness 自己验证（从仓库根目录跑 `bun`）：

- **核心语言 · 单表达式**：
  ```bash
  bun -e 'import {RuntimeInterpreter} from "kunun-runtime"; import {KnConverter} from "kunun-converter/KnConverter"; const n=KnConverter.Kon.Parser.Parse("(1 2 :+)"); console.log(JSON.stringify(RuntimeInterpreter.ExecSync(n)))'
  ```
- **核心语言 · 多表达式块**：`RuntimeInterpreter.EvalBlockSourceSync(source)`（Kon 语法，返回最后一个表达式的值）。
- **类型化代码块**：`RuntimeInterpreter.EvaluateTypedBlockSync(source)`（需 `import "kunun-type-system"` 或从 `"kunun"` 触发 bridge 注册）。只做类型检查可用 `TypeCheckSource` / `typeCheck` 选项。
- **动态工作流 DSL**（不调用任何模型）：
  ```bash
  bun packages/workflow-host/bin/kwf.ts validate <file.kon>   # 执行到首个 yield 或完成
  bun packages/workflow-host/bin/kwf.ts dry-run  <file.kon>   # 用 schema-shaped mock 跑完整流程
  ```

更接近真实的端到端示例见 `examples/*.kon`（`fan-out-reduce` / `routing` / `deep-research` / `adversarial-verify` / `loop-until-dry`）与 `typed-examples/*.kon`。

---

**下一章** → [02 · 语法](./03-kon-data-format.md)：容器、分隔符、下标 token、字符串四形态与插值的精确语法规则。
