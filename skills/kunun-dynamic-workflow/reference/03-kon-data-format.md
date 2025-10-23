# kon 数据格式：容器、knot 结构与节点类型

本章描述 kunun 的统一数据格式 **Kon**：四类容器、knot（节点链）的完整结构，以及每个 `Kn*` 模型节点对应的表面语法与运行期值。读者是负责编写 kunun/kon 代码的 agent；本章的每个代码示例都已用解析器/运行期 harness 实跑验证（见各小节标注的引用）。

> **Kon 容器固定映射：** `()` = knot，`[]` = vector，`{}` = map，`<>` = ordered map。容器内元素 **只用空白分隔**（逗号不是分隔符，见下文）。map 键值用 `=`。

## 0. 单一解析器 + SyntaxConfig

kunun 只有一个解析器类 `KnParserV1`，由一个 `SyntaxConfig` 对象驱动（`packages/converter/lib/KnParserV1.ts:23-28`）。Kon 的入口通过 `KnConverter.Kon.{Parser,Formater}` 暴露（`packages/converter/lib/KnConverter.ts:7-21`）。

- 解析：`KnConverter.Kon.Parser.Parse(source)` → 返回一个模型节点。
- 格式化（回写）：`KnConverter.Kon.Formater.Stringify(node, multiline)`，第二参 `false` = 单行。

> 注意：源码 `SyntaxConfig.ts` 里另有一个 `const SyntaxConfig` 旧对象（用 legacy token 枚举），它 **不被 V1 解析器使用**，其中诸如 `%`=KnotAttr、`{}`=modifier 的映射是 dead code，不要据此编写代码（`packages/converter/lib/KnParserV1.ts` 使用的是 `interface SyntaxConfig`，由 Kon 的 SyntaxConfig 类实现）。

---

## 1. Kon 的容器映射与分隔符规则

四类容器，括号角色固定（`packages/converter/lib/KonSyntaxConfig.ts:43-61`）：

| 容器 | Kon 语法 |
|---|---|
| knot（节点链 / 调用结构） | `( )` |
| vector（有序列表） | `[ ]` |
| unordered map（无序映射） | `{ }` |
| ordered map（有序映射） | `< >` |

### 分隔符与键值标记规则

- **容器项分隔：只用空白。** vector / map / 参数表等容器的元素之间只用空白分隔。**逗号 `,` 不是分隔符**——写在容器里会被解析器拒绝（见下）。
- **map 键值标记：`=`**（如 `{a = 1 b = 2}`）。`=` 两侧空白自由。
- **可选的对分隔符：`;`**（pairs separator，`packages/converter/lib/KonSyntaxConfig.ts:34`）。一般不需要，空白即可。

> **逗号 `,` 被保留作 unquote 运算符，不能当分隔符。** 这正是容器内不能用逗号分隔的原因：`,expr`（unquote）、`,@`（unquote-splice）、`,%`（unquote-map）都以逗号起头，是 reader 宏（见 §6），不是项分隔。

**已验证示例**（`packages/converter/__tests__/Case/KonParserSyntax.test.ts:16-48`，并实跑确认）：

```text
KnConverter.Kon.Parser.Parse("[1 2 3]")       // => [1, 2, 3]      ([] 是 vector)
KnConverter.Kon.Parser.Parse("{a = 1 b = 2}") // => map {a:1, b:2} ({} 是 map，= 作键值标记)
```

逗号在 Kon 容器内被拒绝（已验证抛错）：

```text
KnConverter.Kon.Parser.Parse("[1, 2]")
// 抛错: "Comma separators are not allowed in this syntax profile"
```

逗号拒绝逻辑见 `packages/converter/lib/KnParserV1.ts:634-636,668-670`。

---

## 2. 三类字面量的 Kon 写法

### 2.1 vector（向量 / 有序列表）

- **用途**：有序的值列表。运行期表示就是原生 JS 数组（`packages/core/lib/Util/KnNodeHelper.ts:10` `Array.isArray → Vector`，没有专门的 `KnVector` 类）。
- **精确语法**（Kon）：`[ item item ... ]`，项之间仅用空白分隔。每个项是一个完整的值（可嵌套）。
- **语义**：求值后每个项被逐一求值，得到 JS 数组。
- **可运行示例**：

```kon
[1 2 3]
```
求值结果 `[1, 2, 3]`。嵌套与表达式项：
```kon
[1 [2 3] (1 + 2)]
```
求值结果 `[1, [2, 3], 3]`。

- **常见错误**：写 `[1, 2]` 用逗号分隔会抛错（逗号在 Kon 里是 unquote 运算符，不是分隔符）；元素之间只用空白。

### 2.2 unordered map（无序映射）

- **用途**：键 → 值 的无序映射。运行期表示是一个 **没有 `_Type` 字段的普通 JS 对象**（`packages/core/lib/Model/KnUnorderedMap.ts:3-21`；`GetType` 把任何无 `_Type` 的普通对象判为 `UnorderedMap`，`packages/core/lib/Util/KnNodeHelper.ts:24`）。
- **精确语法**（Kon）：`{ key = value key = value ... }`，键值用 `=`，对之间仅用空白分隔。键取自 word 的 `.Value` 字符串。
- **语义**：求值后逐对求值成运行期 map。
- **可运行示例**：

```kon
{a = 1 b = 2}
```
求值结果 `{a: 1, b: 2}`（运行期 map；JSON 序列化键顺序不保证，因为它是无序 map）。值可嵌套：
```kon
{a = 1 b = [2 3]}
```
求值结果 `{a: 1, b: [2, 3]}`。

- **常见错误**：`=` 两侧空白自由（`{a =1}`、`{a = 1}` 都行）；值可省略（`{a}` 是键 `a` 值为 `nil`（JS `null`，`GetType=Nil`）的 map，**不是** `undefined`，见 §5.9）；对之间只用空白分隔，写逗号会抛错。

### 2.3 knot（节点链 / 调用结构）

- **用途**：kunun 的核心“句子”，编码所有调用 / 表达式 / 声明。
- **精确语法**（Kon）：`( ... )`。内部是一条 **从左到右用 `Next` 链接的 `KnKnot` 段链**；每段最多一个 `Core` 加可选的调用类型 / 参数 / 元数据等（`packages/core/lib/Model/KnKnot.ts:113-121` `MakeByNodes`）。
- **语义**：见 §3、§4。运算符 / 调用标记把段连成实际应用。
- **可运行示例**：

```kon
(1 + 2)
```
求值结果 `3`。前缀调用形式：
```kon
(:+ 1 2)
```
求值结果 `3`。

- **常见错误（关键）**：**没有调用标记的 knot 只是 core 序列，不是应用**。`(f 1 2 g 3)` 解析为 5 段链（Core 依次为 `f`,`1`,`2`,`g`,`3`），不是 “f 应用于 1 2 再 g 应用于 3”。要得到带分组参数的真实调用，必须用调用标记（前缀 `` ` ``、中缀 `:`、后缀 `,`、实例 `~`、运算符）或嵌套 knot `(f (g 1) 2)`。（已验证：`(f 1 2 g 3)` 链 cores = `["f",1,2,"g",3]`。）

### 2.4 ordered map（有序映射，附带）

- **用途**：插入序保留的键值映射，可带每键类型注解。运行期是 `KnOrderedMap`（`Value: Map`、`TypeMap: Map`，`packages/core/lib/Model/KnOrderedMap.ts:3-23`）。
- **精确语法**：`< >`，但 **顶层裸 `<a = 1>` 不是 ordered map**——`<` 会被词法当成 word。只能通过 `$` 语法宏前缀 `$<...>`，或 knot 的 `:<...>`（Prop）/ `:tag = <...>`（NamedProp）槽位到达。每键类型用 `~Type` 放在键前。
- **可运行示例**（解析层）：

```kon
$<a = 1 b = 2>
```
得到一个 `KnOrderedMap`，键序为 `[a, b]`。带类型：
```kon
$<~Int a = 1>
```
得到 `Value{a:1}`、`TypeMap{a:[Int]}`。

- **陷阱**：`KnConverter.Kon.Parser.Parse("<a = 1>")` 返回 `KnWord("<")`，**不是** ordered map。ordered map 的 JSON 序列化会把键显示为空（`Value:{}`），但底层 `Map` 实际持有键，回写正常。到达 ordered map 的 `$<...>` 语法宏入口见 §2.5。

### 2.5 `$` 语法宏前缀：到达 ordered map / table / unordered map 的路由入口

某些字面量（ordered map、table=KnTuple）在 **顶层裸写时无法直接到达**——`<` 会被词法当成 word（见 §2.4 陷阱），表行结构也没有顶层裸语法。`$` 是统一的 **语法宏前缀**（`SyntaxMarcroPrefix = TokenType.Dollar`，`packages/converter/lib/KonSyntaxConfig.ts:19-20`），它根据 **紧跟其后的容器起始 token** 把内容路由到不同的容器构造器（`packages/converter/lib/KnParserV1.ts:93-116`）。这是到达 §2.4 ordered map 与 §5.3 KnTuple 的主要入口。

四种形式（Kon，全部已实测：`KnConverter.Kon.Parser.Parse` 解析 + `RuntimeInterpreter.ExecSync` 求值）：

| 形式 | 路由 | 产物（ctor / `_Type`） | ExecSync 求值结果 |
|---|---|---|---|
| `${ ... }` | 重新当 `{}` 容器解析 | `KnUnorderedMap`（无 `_Type`） | unordered map |
| `$[ ... ]` | 重新当 `[]` 容器解析 | 原生 JS `Array`（无 `_Type`，§2.1 vector） | vector（JS 数组） |
| `$( ... )` | table 容器 → `new KnTuple` | `KnTuple`（`_Type="Tuple"`，§5.3） | KnTuple（行 tuple） |
| `$< ... >` | ordered map 容器 → `KnOrderedMap.MakeByPairs` | `KnOrderedMap`（`_Type="OrderedMap"`，§2.4） | KnOrderedMap |

> **注意（与直觉不符，以实测为准）**：`${...}` 产生的是 **unordered map**（§2.2），**不是** vector；vector 用 `$[...]`。`$(...)` 因为 Kon 的 `()` 是 knot 起始 token，被路由到 **table 构造器**，产物是 `KnTuple` 而非 knot。

**可运行示例与实测产物**：

`${...}` —— unordered map（内容必须是 `key = value` 对，与 §2.2 一致）：
```kon
${a = 1 b = 2}
```
`ExecSync` → `KnUnorderedMap`，JSON `{a:1, b:2}`（无序，键序不保证）。值可嵌套：`${a = 1 b = [2 3]}` → `{a:1, b:[2,3]}`。
陷阱：`${1 2 3}`（无 `=`）**抛错** `"null is not an object (evaluating 'this.AsPairKey(firstNode).Value')"`——`{}` 路由要求键值对。要裸值序列用 `$[...]`。

`$[...]` —— vector（等价于直接写 `[...]`，§2.1）：
```kon
$[1 2 3]
```
`ExecSync` → 原生数组 `[1, 2, 3]`。

`$(...)` —— table（行 tuple，§5.3）：
```kon
$(a = 1 b = 2)
```
`ExecSync` → `KnTuple`，`RawValue = [["a",[],1],["b",[],2]]`（每行 `[tag, typeNodes, value]`）。无键的裸值：`$(1 2 3)` → `RawValue = [[null,[],1],[null,[],2],[null,[],3]]`。
陷阱：`$(...)` 的逐行 `~Type` 标注不如 `$<...>` 干净——`~Int` 会被解析成额外的 `~` / `Int` word 行，不要在 table 形式里写 `~Type`；要带类型用 `$<~Type k = v>`（见下）。

`$<...>` —— ordered map（插入序保留，§2.4）：
```kon
$<a = 1 b = 2>
```
`ExecSync` → `KnOrderedMap`，底层 `Value` Map 键序 `[a, b]`、值 `{a:1, b:2}`。每键类型注解用 `~Type` 放在键前：
```kon
$<~Int a = 1 b = 2>
```
→ `Value{a:1, b:2}`、`TypeMap{a:[Int], b:[]}`（已实测）。
陷阱：`KnOrderedMap` 的 JSON 序列化把 `Value` 显示为空 `{}`（底层是 `Map`，`JSON.stringify` 不展开），但键实际持有，回写与下标访问正常（见 §2.4）。

**运行期入口的重要约束**：顶层裸 `$` 形式只有走 **单表达式** 路径 `ExecSync(KnConverter.Kon.Parser.Parse(SRC))` 才可靠。多表达式块入口 `RuntimeInterpreter.EvalBlockSourceSync(SRC)` 对顶层裸 `${...}` / `$[...]` / `$(...)` 会抛 `"End of stream"`（块解析器在顶层 `$` 宏处提前耗尽 token）；对顶层裸 `$<...>`（未闭合容器）会抛有界的 `"Unclosed container"` 诊断。两类都应避免：在块里要用这些值，先用 `(var ...)` 绑定再引用即可正常（已实测）：
```kon
(var m ${a = 1 b = 2})
(m::"a")
```
作为块求值 → `1`。同理 `(var xs $[10 20 30])` 后 `(xs::1)` → `20`。下标访问语义见 §4、§7；求值模型见 [./05-evaluation-model.md](./05-evaluation-model.md)。

> `$` 与其它前缀宏（`` ` `` quasiquote、`,` unquote、`%` symbol/quote 宏）是 **并列的顶层 reader 宏**，但 `$` 路由到 **容器字面量**，不产生 `KnQuoteWrapper`；后者见 §6。控制流 / 内建对这些容器的消费见 [./06-builtins-control-flow.md](./06-builtins-control-flow.md)，宿主标准库对 ordered map / table 的操作见 [./08-host-stdlib.md](./08-host-stdlib.md)。

---

## 3. knot 段（KnKnot）的完整字段

> **重要：字段名以源码为准。** `KnKnot` 的真实字段集见 `packages/core/lib/Model/KnKnot.ts:19-78`。不存在 `Annotations` / `Flags` / `TypeVars` / `DoApply` / `GenericParam` / `ContextParam` / `Definition` / `Refinements` / `Header` 这些字段——若别处文档提到它们，那是过时命名。真实字段如下。

`KnKnot._Type = "Knot"`（`packages/core/lib/Model/KnKnot.ts:48`）。一个 knot 是一条段链，每段是一个 `KnKnot`，通过 `Next` 指向下一段。当当前段无法再接纳某个语法角色时，解析器用 `AcceptCore / AcceptParam / AcceptCallType / ...` 判定并开启新段（`packages/core/lib/Model/KnKnot.ts:162-184`）。

| 字段 | 类型 | 含义 | 触发它的 Kon 表面语法 |
|---|---|---|---|
| `Core` | any | 段的头部值 | 裸值 `(foo)`；或调用形式的目标；运算符 / 下标 / 赋值时 Core 持有运算符 word 或索引值 |
| `Next` | KnKnot | 链上的下一段 | 段满后自动开启 |
| `CallType` | KnotCallType | 段的调用种类（见 §4），裸 core 段为 null | `` ` `` / `:` / `~` / `,` / 运算符 / `=` / `::` / `.:` |
| `Name` | KnWord | knot 名 | `#ident`（其后 **不接** `=`）：`(func #abc)` → Name=abc；可带 `:::` 源限定与 `.` 命名空间 |
| `Metadata` | Map | 元数据键值 | `#key = value`：`(func #version = 2)` |
| `Params` | KnTuple | 调用的位置参数（扁平 tuple），由 `;` / `)` / 其它角色 token 终止 | 调用 core 之后收集：`(obj :method 1 2)` → `Next.Params=[1,2]` |
| `Attr` | object | 属性标志 / 键值 | `@name`（→ true）或 `@name = value`：`(node @flag)`、`(node @n = 2)` |
| `NamedAttr` | object | 声明字段；解析器无对应表面形式 | （未由解析器填充） |
| `Conf` | KnUnorderedMap | 匿名配置（无序 map） | `:{...}`：`(fn :{timeout = 1})` |
| `NamedConf` | object | 具名配置（按标签分桶的无序 map） | `:tag = {...}`：`(p :props = {a = 1})` |
| `Prop` | KnOrderedMap | 匿名属性（有序 map） | `:<...>`：`(fn :<a = 1>)` |
| `NamedProp` | object | 具名属性（按标签分桶的有序 map） | `:tag = <...>`：`(p :props = <a = 1>)` |
| `Body` | any[] | 匿名块体 | `:[...]`：`(fn :[ (x) ])` → Body=[knot x] |
| `Sections` | object | 具名段（按标签分桶的数组） | `:tag = [...]`：`(p :branch = [1])` → Sections{branch:[1]} |
| `Slots` | object | 具名 knot 槽位 | `:tag = (...)`（值本身是 knot）：`(p :slot = (value))` |
| `NamedSlot` | object | 声明字段；具名 knot 值实际进 `Slots` | （`Slots` 才是被填充的那个） |
| `InOutTable` | KnTuple | 输入/输出签名表 | `|in... -> out...|` 或 `:|...|`：`(f |a -> b|)` |
| `GenericParams` | KnTuple | knot 上的泛型参数 | 紧跟在 core 位置的裸 `<T U>`：`(fn <T U>)` |
| `GenericTypes` | KnTuple | 泛型类型表 | `` `{...} ``（quasiquote 包住的 `{}` map 容器） |
| `UnboundTypes` | any[] | 未绑定类型 | `` `(...) ``：`` (fn `(T U)) `` |
| `ResultTypes` | KnTuple | 结果类型 | `,(...)`（Kon）：`(fn ,(String))` |
| `PreModifiers` | KnModifierGroup | 前置修饰组：`!` 类型修饰、`#(...)` 注解 knot | `!String (field #value)`；`#(effect row) (method #read)` |
| `PostModifiers` | KnModifierGroup | 后置修饰组（实际多出现在 KnWord 上，经 `^`，见陷阱） | 罕见于 knot |
| `Block` / `NamedBlock` | any[] / object | 接口声明但 **不被 V1 解析器填充**（块角色实际进 `Body` / `Sections`） | 视为闲置，编写时勿用 |

**`:` 特殊前缀按 “后随节点的类型” 选桶**（`packages/converter/lib/KnParserV1.ts:1011-1037`）。这是高频陷阱：

| `:name = <suffix>` 的 suffix 类型 | 进入的桶 |
|---|---|
| ordered map `<...>` | `NamedProp` |
| unordered map `{...}`（Kon） | `NamedConf` |
| knot `(...)`（Kon） | `Slots` |
| vector `[...]`（Kon） | `Sections` |

所以 `(p :props = {a=1})`（→ NamedConf）与 `(p :props = <a=1>)`（→ NamedProp）尽管键名相同，去向不同。匿名形式按容器 token 直接选：`:{...}`→Conf，`:<...>`→Prop，`:[...]`→Body，`:|...|`→InOutTable。

**已验证：完整 knot 单行回写一字不差**（`packages/converter/__tests__/Case/KonParserSyntax.test.ts:72-75`）：

```kon
(fn #map <T U> |List<T> Fn<T U> -> List<U>| :{timeout = 1} @pure :[ (operands |result|) ] :branch = [1] :slot = (value))
```
此例覆盖：`Name`(map) + `GenericParams`(`<T U>`) + `InOutTable`(`|...|`) + `Conf`(`:{}`) + `Attr`(`@pure`) + `Body`(`:[...]`) + `Sections`(`:branch=[]`) + `Slots`(`:slot=()`)。

**陷阱**：被拒绝的后缀字段类型注解 `(field #value : String)` 会在 binder 降级前 **抛错**（`(type #Box :[ (field #value : String) ])` 抛错，`packages/converter/__tests__/Case/KonParserSyntax.test.ts:106-108`）。类型应写成 `|String|` 形式：`(field #value |String|)`。

---

## 4. KnotCallType：段上的 8 种调用种类

`enum KnotCallType`（`packages/core/lib/Model/KnKnot.ts:8-17`）。每种由特定表面语法在某一段上设置（Kon，全部已验证）：

| CallType | 表面语法 | 示例 → 结果 |
|---|---|---|
| `PrefixCall`（波兰式 / 前缀） | `` `core args `` | `(`f 1 2)` → 段 Core=f，Params=[1,2] |
| `InfixCall`（中缀） | `:method args`（其后接非容器、非 `=`） | `(obj :method 1 2)` → `Next` 段 Core=method，Params=[1,2] |
| `InstanceCall`（实例） | `~method args` | `(obj ~method args)` → `Next.CallType=InstanceCall` |
| `PostfixCall`（逆波兰 / 后缀） | `,core args`，或 `%(...)` 括号后缀标记 | `(1 2 ,sum 3 4)`；`%(effect handle #consoleHandler)` → 顶段 PostfixCall |
| `Subscript`（容器下标） | `::index` | `(a::1)`，链式 `(a::1::"a")` |
| `StaticIndex`（槽位/静态成员） | `.:name` | `(a.:b)`，链式 `(a.:b.:c)` |
| `Operator`（运算符） | 二元运算符 token | `(1 + 2)` → `Next.CallType=Operator`，Core=`+`，Params=[2] |
| `Assignment`（赋值） | `=` 或 `:=` | `(x = 5)` 与 `(x := 5)` 都 → `Next.CallType=Assignment`，Core=5（右值） |

运算符集合（`Operator` token，`packages/converter/lib/Lexer/Lexer.ts:151`）：`+ ++ += - -- -> -= * *= / /= >= <= ==`。**注意：裸 `<` 与 `>` 不是比较运算符**——它们是 `<>` 有序 map（`$<...>`、`:<...>`）与泛型（`Name<...>`）的定界符。裸 `<` 作中缀会抛 `"Invalid token"`；`>` 虽能词法/回写，但运行期无对应绑定，`(3 > 2)` 抛 `"Unbound name: >"`。**大小比较应改用具名 host 函数 `:lt` / `:gt`**（如 `(3 5 :lt)`→`true`、`(:gt 5 3)`→`true`）；等值比较用 `:==`（如 `(:== a b)`），`<= >=` 这类运算符形式也可用。

**陷阱**：
- `<` 与 `>` **不是比较运算符**——`<` 是 `<>` 有序 map / 泛型的起始定界符，裸 `(2 < 3)` 抛 `"Invalid token"`；`>` 虽能词法/回写，但运行期无对应绑定，`(3 > 2)` 抛 `"Unbound name: >"`。**大小比较用具名 host 函数 `:lt` / `:gt`**（如 `(3 5 :lt)`→`true`、`(:gt 5 3)`→`true`），等值用 `:==`（如 `(:== 2 2)`→`true`）。运算符形式的 `<=`、`>=`、`==` 也可用（`(2 <= 3)`/`(3 >= 2)`/`(2 == 2)` 求值正常）。
- **逻辑运算 `and` / `or` 三种形式结果一致**：中缀 `:` 形式 `(true true :and)`→`true`、`(false true :or)`→`true`；前缀 `:` 形式 `(:and true true)`→`true`、`(:or false true)`→`true`；bare 形式 `(and a b)` / `(or a b)` 也可用。任选其一即可。
- `=` 与 `:=` 解析 **完全相同**，都成 `Assignment`，且 `(x := 5)` 回写为 `(x =5)`——数据模型层没有 “声明 vs 重赋值” 之分（`packages/converter/lib/KnParserV1.ts:786-805`）。
- `;`（KnotCallParamEnd）只用于 **终止当前调用的参数列表**，让链上下一个调用干净起始。`(`f 1 2; `g 3)` 与 `(`f 1 2 `g 3)` 结果相同（下一个 `` ` `` 也终止参数）；对裸 core `;` 是 no-op（`packages/converter/lib/KonSyntaxConfig.ts:160-166`）。

**可运行示例**（运行期求值）：

```kon
(1 + 2)
```
→ `3`。

```kon
(:+ 1 2)
```
→ `3`（前缀调用 `+`）。

下标访问（运行期，需先有容器）：
```kon
(var xs [10 20 30])
(xs::0)
```
作为一个块求值得到 `10`（`(var ...)` 声明，最后一个表达式是返回值）。map 键下标：
```kon
(var m {a = 1 b = 2})
(m::"a")
```
→ `1`。

---

## 5. 每个 Kn* 节点类型：表面语法与运行期值

`_Type` 判别值来自 `KnNodeType`（`packages/core/lib/Model/KnNodeType.ts`）。`KnNodeHelper.GetType` 是唯一的运行期类型来源（`packages/core/lib/Util/KnNodeHelper.ts:10-47`）：数组→`Vector`，number/bigint→`Number`，string→`String`，boolean→`Boolean`，`null`→`Nil`，有 `_Type` 用其值，否则普通对象→`UnorderedMap`。

> **没有专门的 primitive 类。** 数字、字符串、布尔、数组、无 `_Type` 的对象都用原生 JS 值表示；只有下面带 `_Type` 的才有 `Kn*` 类。

### 5.1 KnWord（`_Type="Word"`）与 KnQualifiedIdentifier 基类

- **用途**：标识符 / 变量引用 / 运算符名。继承抽象类 `KnQualifiedIdentifier`（字段 `Value:string`、`Qualifiers:string[]`，`packages/core/lib/Model/KnQualifiedIdentifier.ts:2-10`）。字段还有 `PreModifiers`、`PostModifiers`、`GenericArgs?`、`SourceQualifier?`（`packages/core/lib/Model/KnWord.ts:5-38`）。
- **表面语法 → 结果**：
  - 裸 `foo` → `Word{Value:"foo", Qualifiers:[]}`。
  - 点路径 `a.b.c` → `Word{Qualifiers:["a","b"], Value:"c"}`（命名空间路径，**不是** 一个标识符）。
  - 泛型 `List<T>` → `Word{Value:"List", GenericArgs:[Word(T)]}`。
  - 类型前缀 `!String value` → `Word{Value:"value", PreModifiers.Identifiers:[Word(String)]}`。
  - 源限定 `T1:::b` → `SourceQualifier="T1", Value="b"`。
- **运行期值**：word 是变量引用，求值时在环境里查找（不是字面量；`IsEvaluated` 对 Word 返回 false）。
- **陷阱**：运算符 `+ - * /` 也词法成 Word（`[+ - *]` 是三个 Word 的 vector）。标识符正则是 `[_a-zA-Z][_a-zA-Z0-9]*[?]?`（`packages/converter/lib/Lexer/Lexer.ts:150`）：必须字母/下划线起始，可带单个尾部 `?`（`isReady?` 是一个标识符），**不含连字符或点**（`my-name` 里 `-` 是独立运算符；`a.b` 是路径）。

### 5.2 KnSymbol（`_Type="Symbol"`）

- **用途**：被引用的原子符号（不作变量查找的内化名字）。
- **表面语法**：`%name`（`%` 后紧跟标识符且 **不** 接 `,`）。
- **示例**：`%sym` → `KnSymbol{Value:"sym"}`（已验证）。
- **陷阱**：`%` 重载——`%name`→Symbol；`%name,inner`→`KnQuoteWrapper`；`%(...)`→PostfixCall knot（见 §6）。

### 5.3 KnTuple（`_Type="Tuple"`）

- **用途**：多值 / 类型化表行结构。字段 `RawValue: KnTupleRow[] | any[]`，`KnTupleRow = [tag, typeNodes, value]`（`packages/core/lib/Model/KnTuple.ts:3-29`）。两种形态：行 tuple（每元素是长度 3 的数组）或扁平值数组。
- **表面语法**：`$(...)` 表字面量产生行 tuple（语法宏入口见 §2.5）；knot 的 `GenericTypes` / `GenericParams` / `ResultTypes` / `InOutTable` / `Params` 内部也是 tuple（`Params` 是扁平 tuple）。
- **示例**：`$(a = 1 b = 2)` → 行 `[["a",[],1],["b",[],2]]`；无键 `$(1 2 3)` → `[[null,[],1],[null,[],2],[null,[],3]]`（已验证）。

### 5.4 KnOrderedMap（`_Type="OrderedMap"`）

见 §2.4。`Value: Map<string,any>`（插入序）+ `TypeMap: Map<string,any[]>`（每键类型）。仅经 `$<...>` 语法宏（§2.5）或 knot `:<...>` / `:tag=<...>` 槽位到达。

### 5.5 KnTable + TableMeta（类型 / 实例的运行期结构）

- `KnTable`（`_Type="Table"`）：`Metadata: TableMeta`、`Fields: any[]`（`packages/core/lib/Model/KnTable.ts:4-14`）。
- `TableMeta`（`_Type="TableMetadata"`）：`Kind`、`FieldMap`、`PropertyMap`、`MethodMap`（`packages/core/lib/Model/TableMeta.ts:8-32`）。配套元数据类：`FieldStorageMeta`、`FieldPropMeta`、`CalcPropMeta`。
- **关键**：这些 **不由单个括号直接产生**。它们是类型系统 / 运行期对 knot 声明的降级结果。你用 knot 形式声明类型，由类型系统降级成 `KnTable`：
```kon
(type #Box :[ (field #value |String|) ])
```
（类型化代码的求值见 [类型系统章](./09-type-system.md)。）

### 5.6 quote 系列：KnQuoteWrapper / KnActionWrapper（见 §6）

所有 quote/quasiquote/unquote 节点都是 `KnQuoteWrapper` 实例（继承抽象 `KnWrapper`，字段 `Kind:KnWord`、`Inner:any`、`_Type`，`packages/core/lib/Model/KnWrapper.ts:4-14`）。详见 §6。

> 陷阱：源码里另有 `KnQuasiquote` / `KnUnquote` / `KnUnquoteSplicing` / `KnCloseQuote` / `KnUkn` 等类，它们引用过时的 `KnType.ts` 常量映射，**是 dead code**，不被解析器产生（grep `packages/converter/lib` 无任何构造）。其中 `KnUnquote` 虽仍从 `Model/index.ts` 导出（`Model/index.ts:22`），但无人构造、只引用过时常量；`KnQuasiquote` / `KnUnquoteSplicing` / `KnCloseQuote` / `KnUkn` 则连导出都没有。不要把它们当作语言节点类型。活的 quote 节点统一是 `KnQuoteWrapper`。

### 5.7 KnSubscript / KnProperty（声明类，但解析器不直接产生）

- `KnSubscript`（`_Type="Subscript"`）、`KnProperty`（`_Type="Property"`）是模型类，供运行期 / 其它层使用。
- **在 `KnParserV1` 里，下标 `::` 与静态索引 `.:` 产生的是带 `CallType=Subscript/StaticIndex` 的 knot 段，而不是独立的 `KnSubscript`/`KnProperty` 对象**（`(a::1)` 得到一条 knot 链）。编写访问的方式就是 knot 的 `::` / `.:` 语法（见 §4、§7）。

### 5.8 字符串节点

- **plain string**：无插值的双引号 `"..."` → **原生 JS 字符串**，无 `_Type`（`_Type="String"` 始终用原生 string 表示，没有专门类）。
- **KnRawString**（`_Type="RawString"`，字段 `Value:string`）：单引号 `'...'`，无转义、无插值。`'no\nescape'` → `Value` 为字面 10 字符 `no\nescape`（反斜杠+n 两个字符，**不是** 换行）。`'\(1)'` 内的插值样式保持字面（4 字符）。已验证。
- **KnInterpolatedString**（`_Type="InterpolatedString"`，字段 `Parts`）：含至少一处插值的双引号 / 三引号字符串。插值定界符是 `\(expr)`。`"hi \(name)"` → `Parts:[{kind:"text",value:"hi "},{kind:"expr",value:Word(name)}]`（已验证）。运行期对 expr 段求值后拼接：块 `(var name "world")` 后 `"hi \(name)"` → `"hi world"`。
- **三引号**（`"""` 解释型 / `'''` 原始型）：**仅多行**。开定界符 `"""` 必须独占一行，内容从下一行起，闭定界符必须与开定界符 **同列对齐** 且独占一行；该缩进列会从每个内容行剥除（`packages/converter/lib/KnParserV1.ts:315-367`）。内联 `"""x"""` 抛错。
  - 已验证示例（注意入口差异）：col-0 变体（开/闭都在第 0 列）源文本四行 `"""` / `line1` / `line2` / `"""` → 单表达式路径 `ExecSync(KnConverter.Kon.Parser.Parse(SRC))` 与块入口 `EvalBlockSourceSync` 都求值得 `"line1\nline2"`。缩进 2 列的同款（开/闭/内容均缩进 2 列）→ **仅经单表达式路径** `ExecSync(KnConverter.Kon.Parser.Parse(SRC))` 验证得剥除缩进后的 `"hello\nworld"`；**经 `EvalBlockSourceSync` 块入口则抛错** `"Triple-quoted string closing delimiter must align with opening delimiter"`——块解析器的 token 列号追踪与单表达式不同，缩进对齐校验在块入口失败。要在块里写缩进的三引号字符串，先用单表达式路径或把开/闭定界符放到第 0 列。

### 5.9 哨兵 / nullary 节点：KnUndefined / KnUnknown / Nil

- `KnUndefined`（`_Type="Undefined"`，单例 `KnUndefined.Shared`）：`undefined` 关键字。
- `KnUnknown`（`_Type="Unknown"`，单例 `KnUnknown.Shared`）：`ukn` 关键字、`null` 关键字（词法把 `null`→Unknown），以及空 / 纯空白输入。
- `nil`：`nil` 关键字 → `KnKnot.Nil`，即字面 JS `null`（`GetType(null)=Nil`）。
- **陷阱**：`null` **不** 等于 nil。已验证：`null`→`{_Type:"Unknown"}`，`undefined`→`{_Type:"Undefined"}`，`ukn`→`{_Type:"Unknown"}`，`nil`→原生 `null`，`true`→`true`，`42`→`42`。

### 5.10 函数值节点（运行期值，非解析器直接输出）

`KnCompositeFunctionBase` 为共享基类（`packages/core/lib/Model/KnCompositeFunctionBase.ts:4-37`）。子类：`KnLambdaFunction`（`_Type="Lambda"`）、`KnMethodFunc`（`_Type="MethodFunc"`）、`KnPropertyFunc`（`_Type="PropertyFunc"`）、`KnHostFunction`（`_Type="HostSyncFunc"`，原生绑定）。这些是求值声明 / 宿主绑定的结果，不是直接表面语法。变长参数：首参 `...` → 左变长，尾参 `...` → 右变长。

### 5.11 辅助：KnModifierGroup / KnOperandStack

- `KnModifierGroup`：挂在 Word / Knot 的 `PreModifiers` / `PostModifiers` 上。字段 `Identifiers:KnWord[]`（裸 `!Foo` 类型标签）、`NamedValues`（`!key,value`）、`Knots:KnKnot[]`（`#(...)` 注解 knot）、以及各一个 `UnorderedMap`/`OrderedMap`/`Vector`（`packages/core/lib/Model/KnModifierGroup.ts:9-17`）。
- `KnOperandStack`（`_Type="OperandStack"`）：运行期操作数栈值，无表面语法。

---

## 6. quote / quasiquote / unquote / unquote-splice / unquote-map / row-spread

顶层前缀 reader 宏（`packages/converter/lib/KnParserV1.ts:54-63, 489-497`）。全部产生 `KnQuoteWrapper`，按形式设 `_Type`（已验证全部回写）：

| 语法 | `_Type` | 说明 | 回写示例 |
|---|---|---|---|
| `` `x `` | `QuasiQuote` | quasiquote（反引号）；`Kind=Word("BackQuote")` | `` `(a b) `` → `` `(a b) `` |
| `,x` | `Unquote` | unquote（逗号） | `,x` → `,x` |
| `,@items` | `UnquoteSplice` | unquote-splice（单 token `,@`） | `,@items` → `,@items` |
| `,%pairs` | `UnquoteMap` | unquote-map（单 token `,%`） | `,%pairs` → `,%pairs` |
| `..Row` | `RowSpread` | row-spread（`..`，`DotDot`）；`Inner=Word("Row")` | `..Row` → `..Row` |
| `%name,inner` | `QuoteMarcro` | `%` quote 宏应用于值；`Kind=Word(name)` | `%foo,bar` |

引用：`packages/converter/__tests__/Case/KonParserSyntax.test.ts:77-90`（quasiquote / unquote / splice / map / row-spread 全部回写）。

**已验证示例**（解析层回写）：

```kon
`(a b)
,x
,@items
,%pairs
..Row
```
依次回写为 `` `(a b) ``、`,x`、`,@items`、`,%pairs`、`..Row`。

`row-spread` 在 typed-examples 里常见（见 `typed-examples/typed-loop-until-dry.kon` 的 `..never`），用于类型行展开。

**陷阱**：
- `,@` / `,%` 是 **单 token** 词法；`, @`（带空格）是 `,` 再 `@`，含义不同。
- `%` 在 V1 里是 symbol / quote 宏前缀，**不是** 修饰符定界符。
- `@name,inner`（带逗号）→ `KnActionWrapper`，但它 **不** 覆写 `_Type`，所以 `_Type` 仍是默认的 `QuoteMarcro`（用 `instanceof` 区分，别用 `_Type`）。`@name`（无逗号）单独出现会抛 NotImplementedException；而在 knot **内部** `@name` 是设 `Attr`（见 §3）。

---

## 7. `::` 容器下标、`:::` 源限定、`.:` 槽位访问三者的区分

三个看似相似的操作符，语义截然不同（基线见 `codument/behaviors/parser-syntax.xml:67-76`）：

| 操作符 | 名称 | 作用对象 | 产物 | 含义 |
|---|---|---|---|---|
| `::` | Subscript（容器下标） | knot 段 | `CallType=Subscript` 段，Core=索引值 | 按索引/键取容器元素，索引可为数字或字符串 |
| `.:` | StaticIndex（槽位/静态访问） | knot 段 | `CallType=StaticIndex` 段，Core=成员 word | 取静态成员 / 字段槽位 |
| `:::` | 源限定（source qualifier） | **word 本身**（不是 knot 操作） | word 的 `SourceQualifier` | 标明成员来自哪个源类型（消歧多源继承的同名成员） |

注意 `:::` 作用在 word 上，`::` 与 `.:` 作用在 knot 段上。三者可组合。

**可运行 / 已验证示例**：

下标链与静态链回写（`packages/converter/__tests__/Case/KonParserSyntax.test.ts:51-54`）：
```kon
(a::1::"a")
(a.:b.:c)
```
分别回写为 `(a::1::"a")`、`(a.:b.:c)`。

源限定在 knot 名上（`packages/converter/__tests__/Case/KonParserSyntax.test.ts:57-70`）：
```kon
(method #com.example.ClassA:::b |-> String|)
```
解析后 `Name.SourceQualifier="com.example.ClassA"`、`Name.Value="b"`，回写一字不差。在表达式里取源限定字段（见 `typed-examples/typed-loop-until-dry.kon:117`）：`(finding.:FindingIdentity:::title)` —— `.:` 取槽位 `title`，`:::` 限定其来自 `FindingIdentity`。

三者混用一条链（`packages/converter/__tests__/Case/KonParserSyntax.test.ts:128-134`）：
```kon
(value ~as Box<T>.:value::"inner")
```
解析为链：`InstanceCall(as)` → `StaticIndex(value)` → `Subscript("inner")`（已验证 `Next.CallType` 依次为 InstanceCall=2、StaticIndex=5、Subscript=4）。

运行期下标（容器索引）：
```kon
(var xs [10 20 30])
(xs::1)
```
作为块求值得到 `20`。

> 三个操作符的完整求值语义（含静态成员解析、源限定的多源消歧规则）见 [类型系统章](./09-type-system.md) 与 [求值章](./05-evaluation-model.md)。

---

## 8. 编写检查清单（给下游 agent）

- Kon 容器：`()`=knot、`[]`=vector、`{}`=map、`<>`=ordered map。
- 容器内 **只用空白分隔**，不要写逗号——逗号在 Kon 里是 unquote 运算符（`,expr` / `,@` / `,%`），不是分隔符。map 键值用 `=`。
- **函数调用一律加 `:` 前缀**（用户 fn / host 函数 / 运算符 / 方法）：前缀位 `(:+ 1 2)`、`(:Concat "a" "b")`；中缀位 `(obj :f 1 2)`、`(1 2 :+)`。**不要** 写裸序列 `(f 1 2)` 期望它是应用（裸序列只是 core 序列）。
- 逻辑运算的三种形式结果一致：中缀 `(a b :and)` / `(a b :or)`、前缀 `(:and a b)` / `(:or a b)`、bare `(and a b)` / `(or a b)`，任选其一。
- 类型注解用 `|Type|`（如 `(field #value |String|)`），不要写 `: Type`（会抛错）。
- 字符串多行用对齐的 `"""`；单行字面（不转义）用 `'...'`；插值用 `"... \(expr) ..."`。
- ordered map 必须经 `$<...>` 或 knot 槽位；裸 `<...>` 不是 ordered map。
- `null` ≠ `nil`：`null`/`ukn`→Unknown，`nil`→真正的 null。
- `^` 后缀修饰符必须紧跟一个值；若结尾悬空（如 `a^` 到 EOF）会抛有界诊断 `"Modifier UpArrow at 1:2 must be followed by a value"`（`packages/converter/lib/KnParserV1.ts:255-293`），写时给它补上后随值即可。
- 大小比较用具名 host 函数 `:lt` / `:gt`（如 `(3 5 :lt)`、`(:gt 5 3)`），等值用 `:==`；`<=`、`>=`、`==` 运算符形式也可用。`<` / `>` 不是比较运算符（`<` 是有序 map / 泛型定界符，裸 `<` 抛 `Invalid token`；`(3 > 2)` 抛 `Unbound name: >`），不要用它们比较。
