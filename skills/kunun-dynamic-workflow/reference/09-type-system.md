# 第 9 章 类型系统（一）：行类型、类、trait、泛型

本章讲解 kunun 的**可选静态类型系统**（`kunun-type-system` 包，移植自 ExtensibleScopedRowType）的声明面与检查面：结构化行类型（row）、类（class）、trait、泛型、行合并与源限定访问、projection（`~as`），以及 `method` / `op` / `fn` 的栈式 `|in -> out|` 签名。效果（effect / perform / handler）的**类型语法**在本章签名小节一并给出，但其完整语义留到[第 10 章 效果系统](./10-effects-and-typed-execution.md)。

> 关键前提：类型系统是**完全 opt-in** 的。默认 `RuntimeInterpreter` 执行（`EvalBlockSourceSync` / `ExecSync` 等）是 untyped 的，会**完全忽略** `!Type` 前缀、`class` / `type` / `trait` 声明、`@inherits` / `@merge`、`#(effect ...)` 标记等——它们对运行不产生任何影响。只有显式走类型入口才会触发检查。源码：`codument/behaviors/runtime-type-system.xml:111-124`（`runtime-integration`），`typed-dispatch-not-implicit`（同文件 `:220-224`）。

语法用 **Kon**：`()` = knot（链/调用/声明），`[]` = vector（数组字面量），`{}` = map（映射字面量）。容器元素之间只用空白分隔（逗号 `,` 不是分隔符，会被拒绝）。前置的链 / knot / `:[ ... ]` 块 / 参数表概念见 [第 5 章 表达式与求值模型](./05-evaluation-model.md)；运行期 untyped 的 `class` / `fn` 写法见 [第 7 章 函数与对象](./07-functions-objects.md)。

---

## 9.0 三个类型入口（如何验证本章每个示例）

类型系统的能力按"只检查"和"检查并执行"分两档。三个公开入口（均在导入 `kunun-type-system` 或 `kunun` 后可用，导入即注册 bridge——源码 `packages/type-system/lib/index.ts:15-16`）：

| 入口 | 做什么 | 失败时 |
|---|---|---|
| `RuntimeInterpreter.TypeCheckSource(src)` | 只做静态检查，返回 `{ Diagnostics, Success }`，**不执行** | 返回 diagnostics 列表（不抛） |
| `RuntimeInterpreter.EvalBlockSourceSync(src, { typeCheck: true })` | 先检查再用 untyped 运行期执行 | 检查失败抛 `RuntimeTypeCheckError`，**不执行脚本体** |
| `RuntimeInterpreter.EvaluateTypedBlockSync(src)` | 检查 + 绑定 + 用 typed runtime context 执行（`~new` / `.:` 读写 / `~method` / `~as`） | 检查失败抛 `RuntimeTypeCheckError`（源码 `RuntimeInterpreter.ts:756-760`） |

底层检查器是 `KonTypeChecker.CheckSource`（源码 `packages/type-system/lib/KonTypeChecker.ts:63`），绑定器是 `KonTypeBinder.BindSource`（`packages/type-system/lib/KonTypeBinder.ts:95`）。

**验证用 harness**（本章所有示例均已实跑通过）：

```sh
# 只做类型检查、打印诊断码
bun -e 'import {RuntimeInterpreter} from "kunun-runtime"; import "kunun-type-system";
const r = RuntimeInterpreter.TypeCheckSource(SRC);
console.log(JSON.stringify(r.Diagnostics.map(d=>d.Code)))'

# 检查 + typed 运行期执行（返回最后一个表达式的值）
bun -e 'import {RuntimeInterpreter} from "kunun-runtime"; import "kunun-type-system";
console.log(JSON.stringify(RuntimeInterpreter.EvaluateTypedBlockSync(SRC)))'
```

> 重要：上述命令必须在 **repo 内**（workspace 根或子目录）运行，否则 `kunun-runtime` / `kunun-type-system` 解析不到。`SRC` 替换为字符串，或先写临时文件再 `readFileSync`。

诊断码两族：**KTB###** 由 binder 产生（声明/绑定阶段，如未知 merge 目标、泛型 arity），**KTC###** 由 checker 产生（表达式检查阶段，如缺失成员、歧义、返回栈不匹配、访问越权）。本章在每个陷阱处给出对应码。

---

## 9.1 ExtensibleScopedRowType：行类型是什么

**用途**：行类型（row type）是类型系统的基础原语。一个 row 是一组**无序的成员**（member）集合，成员可以是字段（field）或方法/操作（method/op）。class、trait、泛型、effect 全部建立在 row 之上。

核心三个性质：

1. **结构化子类型（structural subtyping）**：`A` 是 `B` 的子类型 ⇔ `A` 拥有 `B` 要求的全部成员（名字相同且成员类型兼容）。不看名字、不看继承声明，只看成员形状。源码 `packages/type-system/lib/TypeSystem.ts:177-193`（`isSubtypeDirect`）。
2. **每个成员带 origin（来源）**：成员记录它"来自哪个 row/class"。合并多个 row 后，同名成员靠 origin 区分身份（见 9.5 源限定访问）。源码 `RowMember.Origin`（`packages/type-system/lib/Types.ts:179`）。
3. **open / closed 行**：默认 row 是 **open** 的——它允许子类型额外携带未声明的成员。用 `..never` 把 row **闭合（closed）**，闭合 row 要求成员形状**精确相等**。源码 `KonTypeBinder.ts:158-161`（读到 `..never` 把 `isOpen` 置 false），`TypeSystem.ts:192`（`targetRows.IsOpen || remaining.length === 0`）。

**open 行（默认）允许子类型多带成员**：

```kon
(type #Readable
  :[
    (method #read |-> String|)
  ])

(fn #use |!Readable r -> String|
  :[
    (r ~read)
  ])
```
`TypeCheckSource` 诊断为空（通过）。任何拥有 `read` 方法的值都满足 `Readable`，哪怕它还有别的成员。

**closed 行（`..never`）要求精确形状**：闭合 row 的"额外成员"会破坏精确相等。`..never` 必须**单独成行**出现在 body 里（它是行尾闭合标记）。下面是一个闭合 record，常用于工作流数据契约（取自 `typed-examples/typed-loop-until-dry.kon:7-12`）：

```kon
(type #SweepScope
  :[
    (!String field #path)
    (!String field #goal)
    ..never
  ])

(fn #readPath |!SweepScope s -> String|
  :[
    (s.:path)
  ])
```
诊断为空。`..never` 出现在所有成员之后，把这个 row 闭合成一个精确的二字段 record。

**陷阱**：
- `..never` 只是闭合标记，**不是**一个成员；它通过 `TryReadSpreadName(...) === 'never'` 被识别（`KonTypeBinder.ts:481-483`）。写成 `(field #x ..never)` 之类是错的。
- 未知类型名（拼错的 row 名）**不会**报错——binder 默默生成一个 `TypeReferenceSymbol` 占位（`KonTypeBinder.ts:367`），后续可能产生间接的 KTC 诊断或根本静默通过。务必拼对类型名。

---

## 9.2 声明行类型：`(type #Name <G> :[ ... ])`

**用途**：声明一个具名 row 类型。

**精确语法形式**：

```
(type #Name :[ MEMBER... ])                  // 普通行
(type #Name <T R> :[ MEMBER... ])            // 带泛型参数
(type #Name @merge = [A B])                  // 合并行（见 9.5），通常无 body
```

- 顶层声明必须是 knot；核心关键字必须是 `type`（否则 binder 报 `KTB002`，源码 `KonTypeBinder.ts:139`）。
- 名字是 `#Name`（hash-word）。缺名报 `KTB010`（`KonTypeBinder.ts:571`）。
- body 是块 `:[ ... ]`，每个 body item 必须是 knot，否则报 `KTB040`。binder 只识别 `field`、`method`、`op` 三种成员关键字；其它关键字的 item 被**静默忽略**（`BindMember` 的 `default` 分支返回 null，`KonTypeBinder.ts:282-283`）。
- 泛型参数写在名字后的尖括号 `<T R>` 里（见 9.4）。

**语义**：注册一个 `RowTypeSymbol`（或带泛型时 `GenericRowTypeSymbol`）到 type registry，供后续引用。

**可运行示例**（多字段 record，验证字段可被源限定读取——见 9.5）：

```kon
(type #Point
  :[
    (!Int field #x)
    (!Int field #y)
    ..never
  ])

(fn #getX |!Point p -> Int|
  :[
    (p.:x)
  ])
```
`TypeCheckSource` 诊断为空。

**陷阱**：body item 不是 knot（例如裸字面量 `1`）会报 `KTB040` 且该 item 被丢弃；这是 binder 测试里 `Broken` 例子的行为（`KonTypeBinder.test.ts:162-181`）。不要在 type body 里放裸值。

---

## 9.3 字段与方法成员

### 9.3.1 字段：`!Type` 前缀

**用途**：声明一个数据成员。

**精确语法形式**：

```
(!Type field #name)            // 带类型的字段，!Type 是【前缀】
(field #name = value)          // 带默认值、无显式类型的字段
(!Type field #name = value)    // 既有类型又有默认值
```

- 类型注解是 `!Type` **前缀**，放在 `field` 关键字之前。它被解析进该 knot 的 `PreModifiers.Identifiers[0]`，binder 用 `firstTypePrefix(...)` 读取（源码 `KonTypeBinder.ts:307`、`firstTypePrefix` 在 `:611-613`）。
- 字段名是 `#name`。

**语义**：`(!Int field #x)` 注册一个名为 `x`、类型为 `int` 的字段成员。

**postfix 类型注解不支持**——这是必须记住的负向行为（spec `postfix-field-type-annotation`，`runtime-type-system.xml:254-258`）：

- `(field #x !Int)` —— **解析失败**（`!Int` 作为后缀裸出现导致 `End of stream` 解析异常）。
- `(field #x Int)` —— 能解析，但 binder **不会**把字段类型登记为 `Int`；尾随的 `Int` 被当成别的东西，字段类型变成一个无意义的占位引用类型（不是 `int`）。即"SHALL NOT silently register a misleading field"的反面——它确实不会把它当成 `Int`。

所以**类型注解只能用前缀 `!Type`**。

**默认值字段**：`(field #count = 10)` 不带 `!Type` 前缀时，binder 把字段类型登记为一个回退占位类型（不是干净的 `int`），运行期则 hydrate 默认值 `10`（spec `field-default-metadata`，`runtime-type-system.xml:215-219`）。如果你既想要类型又想要默认值，写 `(!Int field #count = 10)`——此时字段类型**干净地**是 `int`，且默认值保留。

可验证（binder 直接观察字段类型）：`(!Int field #count = 10)` → 字段类型名为 `int`；`(field #count = 10)` → 字段类型是回退占位。

**运行期默认 hydration 示例**（用 `EvaluateTypedBlockSync`）：

```kon
(class #Cfg :[
  (field #count = 10)
])
(var c (Cfg ~new))
(c.:count)
```
执行结果：`10`。无构造器、无显式赋值，`~new` 后 `.:count` 读出 hydrate 的默认值。

### 9.3.2 方法 / 操作：`method` 与 `op`

**用途**：声明一个带签名的可调用成员。`op` 是 `method` 的同义词（源码 `KonTypeBinder.ts:277-279`，两者走同一分支）；惯例上 effect row 里的成员用 `op`，普通 class/trait 里用 `method`。

**精确语法形式**：

```
(method #name |IN -> OUT|)             // 仅签名（trait / 抽象方法 / row 成员）
(method #name |IN -> OUT| :[ BODY ])   // class 里带实现体
(op #name |IN -> OUT|)                 // effect 操作
```

- 必须带成员名 `#name` 和 `|in -> out|` 签名表，否则报 `KTB042`（`KonTypeBinder.ts:291`）。
- 签名表的精确写法见 9.8。

**语义**：注册一个方法成员，其类型是一个 `FunctionTypeSymbol`。

**字段当作零参 getter**：一个 `(!String field #name)` 字段在结构子类型里可以满足一个 `(method #name |-> String|)` 的要求（字段被视为零参 getter）。源码 `TypeSystem.ts:200-206`（`MemberTypesAreCompatible` 的 field-as-getter 分支）。这意味着一个带 `name` 字段的 record 是任何只要求 `name` getter 的 row 的子类型。

---

## 9.4 泛型：声明 `<T>`、use-site `Box<Int>`、行参数 `..Q`、arity 校验

### 9.4.1 声明泛型参数

**精确语法形式**：泛型参数写在 `#Name` 之后的尖括号里，多个用空白分隔（不能用逗号，逗号会被拒绝）：

```
(type #Box <T> :[ (!T field #value) ])
(class #Pair <A B> :[ (!A field #first) (!B field #second) ])
(type #AgentResult <TOutput> :[ (!String field #label) (!TOutput field #value) ..never ])
```

参数名在 body 里直接当类型用（`!T field #value` 里的 `T`）。源码：`CreateTypeParameters`（`KonTypeBinder.ts:450-462`）从 `GenericParams` 读取；body 内裸词 `T` 在 `BindTypeNode` 里优先解析为 active 类型参数（`KonTypeBinder.ts:330-332`）。

### 9.4.2 use-site：`Box<Int>` 替换

**精确语法形式**：在引用处把类型实参写进尖括号：`Box<Int>`、`Seq<String>`、`AgentRequest<SweepRound IssueBatch>`（多实参空格分隔）。

```kon
(class #Box <T>
  :[
    (!T field #value)
  ])

(fn #main |!Box<Int> box -> Int|
  :[
    (box.:value)
  ])
```
诊断为空。`Box<Int>` 把 `T` 替换为 `int`，`box.:value` 的类型变成 `int`，与返回 `Int` 匹配。源码：use-site 尖括号产生 `KnWord.GenericArgs`，binder 在 `BindTypeNode` 里 `Instantiate`（`KonTypeBinder.ts:338-362`）。

### 9.4.3 行参数 `..Q`（row tail）

**用途**：泛型参数本身是一个 **row 尾**，实例化时把整个 row 的成员"展开拼接"进来。

**精确语法形式**：参数名前缀 `..`，作为 body 的**末尾成员行**出现：

```kon
(type #Tail
  :[
    (method #c |-> Bool|)
  ])

(type #ReadablePlus <R>
  :[
    (method #read |-> String|)
    ..R
  ])

(fn #ok |-> Unit|
  :[])
```
诊断为空。`..R` 把 `R` 标记为 row 参数（`IsRowParameter = true`，源码 `KonTypeBinder.ts:454-461`：仅当某参数名以 `..Name` 形式出现在同一 body 里才算 row 参数）。实例化 `ReadablePlus<Closable>` 时，`Closable` 的成员被拼接进结果 row（源码 `GenericRowTypeSymbol.Instantiate` 的 spread 分支，`Types.ts:357-375`）。

`..Q` 既可展开泛型行参数，也可展开一个 effect（`TryBindSpreadMember`，`KonTypeBinder.ts:464-479`）；都不匹配则报 `KTB061`。

### 9.4.4 arity 校验

use-site 的实参个数必须与声明的参数个数一致：

```kon
(class #Pair <A B>
  :[
    (!A field #first)
    (!B field #second)
  ])

(fn #f |!Pair<Int> p -> Int|
  :[
    (p.:first)
  ])
```
诊断**非空**（含 `KTB101`）：`Pair` 需要 2 个类型实参，只给了 1 个。源码 `KTB101`（`KonTypeBinder.ts:348` / `GenericTypeSymbol.ValidateTypeArguments`，`Types.ts:324-328`）。非泛型类型却给了实参则报 `KTB100`（`KonTypeBinder.ts:354,364`）。

### 9.4.5 泛型函数

泛型函数把 `<T>` 写在 `#name` 与签名表之间，可**推断**或**显式**给实参：

```kon
(fn #identity <T> |!T value -> T|
  :[
    value
  ])

(fn #main |!String input -> String|
  :[
    (input :identity)
  ])
```
诊断为空：`identity` 从输入栈 `String` 推断 `T = String`，输出 `String`，与 `main` 返回匹配。（中缀位调用用 `:identity` 前缀。）源码 `InstantiateGenericFunction` 的推断分支（`KonTypeChecker.ts:700-712`）。

显式实参 + 不匹配 → 报错：

```kon
(fn #identity <T> |!T value -> T|
  :[
    value
  ])

(fn #main |!String input -> Int|
  :[
    (input :identity<Int>)
  ])
```
诊断**非空**（`KTC041`）：`identity<Int>` 把 `T` 钉成 `Int`，但输入是 `String`，输入栈不匹配。注意：泛型不一致时**绝不**静默回退到 untyped 成功（spec `generic-function-mismatch`），而是出诊断。

---

## 9.5 行合并 `@merge = [A B]` 与源限定访问 `value.:Row:::member`

**用途**：把多个 row 的成员**拼接**成一个新 row，并保留每个成员的 origin，从而在出现同名成员时可以用源限定来消歧。

**精确语法形式**：

```
(type #T3 @merge = [T1 T2])     // T3 = T1 的成员 ++ T2 的成员（外加 body 里额外声明的成员）
```

`@merge` 是 knot 属性（attribute），值是一个 vector。合并目标若未定义则报 `KTB021`（`KonTypeBinder.ts:197`）。源码 `BindMergedRowType`（`KonTypeBinder.ts:190-209`）：拼接所有目标 row 的 `Members`（保留各自 `Origin`），再接上本 body 声明的成员。

**源限定访问 `.:Row:::member`**：当合并后存在多个同名成员时，用 `:::` 源限定符指明要哪个 origin 的成员。注意三种 subscript 的区别（见 [第 2 章 词法](./02-lexical-tokens.md)）：

- `.:name` —— slot/字段访问（StaticIndex）。
- `.:Row:::name` —— slot 访问 + `:::` 源限定（`:::` 是**唯一**的类型系统源限定符）。
- `::` —— 容器下标（runtime），与类型系统无关。

**合并 + 源限定（通过）**：

```kon
(type #T1
  :[
    (!String field #b)
  ])

(type #T2
  :[
    (!Int field #b)
  ])

(type #T3
  @merge = [T1 T2])

(fn #pick |!T3 v -> String|
  :[
    (v.:T1:::b)
  ])
```
诊断为空：`v.:T1:::b` 明确取 origin 为 `T1` 的 `b`（类型 `String`），与返回匹配。

**不限定 → 歧义诊断（不会任选）**：

```kon
(type #T1
  :[
    (!String field #b)
  ])

(type #T2
  :[
    (!Int field #b)
  ])

(type #T3
  @merge = [T1 T2])

(fn #pick |!T3 v -> String|
  :[
    (v.:b)
  ])
```
诊断**非空**（`KTC030`）：`b` 在 `T1`、`T2` 两个 origin 上都存在，未限定访问报歧义，而非任选一个。源码 `KTC030`（`KonTypeChecker.ts:507-510`）；spec `ambiguous-member-diagnostic`（`runtime-type-system.xml:40-45`）。

> 注意：歧义只在 **row** 上报（`!(type instanceof ClassTypeSymbol)`）。在 **class** 上同名成员按 MRO 取第一个，不报歧义。

**真实用例**（取自 `typed-examples/typed-loop-until-dry.kon:46-47,114-122`）：`IssueFinding` 由三个 finding 子 row 合并，`FindingIdentity` 与 `FindingDiagnosis` 都有 `title`，所以函数用源限定区分：

```kon
(type #FindingIdentity
  :[
    (!String field #key)
    (!String field #title)
    ..never
  ])

(type #FindingDiagnosis
  :[
    (!String field #title)
    (!String field #detail)
    ..never
  ])

(type #IssueFinding
  @merge = [FindingIdentity FindingDiagnosis])

(fn #identityTitle |!IssueFinding f -> String|
  :[
    (f.:FindingIdentity:::title)
  ])
```
诊断为空。

---

## 9.6 class 与 trait

**用途**：`class` 是带继承、方法实现、访问控制的名义类型；`trait` 是只声明契约的类型（移植自 C# 的接口/trait 概念）。两者都建立在 row 之上，并参与名义 + 结构混合的子类型。

**精确语法形式**：

```
(class #Name @inherits = [Base...] :[ MEMBER... ])
(class #Name @implements = [Trait...] :[ MEMBER... ])
(trait #Name :[ MEMBER... ])
```

- `class` 与 `trait` 都是顶层关键字（`KonTypeBinder.ts:132-137`）；`trait` 即 `isTrait = true`。
- `@inherits = [A B]`：继承基类（real base）。`@implements = [Trait]`：实现 trait。两者都收进 bases（源码 `BindClassDeclaration`，`KonTypeBinder.ts:228`）。一个 base 若本身是 trait，即使写在 `@inherits` 里也会进 trait 集合。
- 成员关键字：除 `field` / `method` / `op` 外，class 还支持 `new`（构造器）和 `prop`（属性）——这两个有**体**但被 binder 当作普通 row 成员或忽略，由 checker 校验其体（见 9.6.3）。

### 9.6.1 继承、C3 MRO、结构子类型

**继承 + 投影到基类（通过）**：

```kon
(class #A
  :[
    (!String field #name)
    (method #label |-> String|)
  ])

(class #B
  @inherits = [A]
  :[
    (!String field #title)
    (method #label |-> String|)
  ])

(fn #readBaseName |!B item -> String|
  :[
    ((item ~as A).:name)
  ])
```
诊断为空（取自 `CheckerValid.kon:1-12,37-40`）。`B` 继承 `A`，`(item ~as A)` 投影到 `A` 视图后读 `name`。

**C3 linearization（MRO）**：多继承的方法解析顺序用 C3 线性化（不是朴素深度优先），无法得到一致顺序时报错。源码 `computeC3Linearization`（`Types.ts:527-566`）；spec `c3-linearization`（`runtime-type-system.xml:62-66`）。经典菱形例子（用 `TypeSystem` 直接 API 可观察，对应 `TypeSystemCore.test.ts:179-198`）：

```
DefineClass K1 inherits [C A B]
DefineClass K2 inherits [B D E]
DefineClass K3 inherits [A D]
DefineClass Z  inherits [K1 K3 K2]
=> Z.MethodResolutionOrder = [Z K1 C K3 A K2 B D E object]
```

### 9.6.2 成员限定符 `@qualifier` / `@mode`：virtual / override / final / inherit

**用途**：控制成员在继承链上的覆盖语义。

**精确语法形式**：在成员 knot 上加属性 `@qualifier = X` 或其别名 `@mode = X`（两者等价，源码 `readQualifier` 读 `Attr.qualifier ?? Attr.mode`，`KonTypeBinder.ts:651-665`）：

```
(method #v @qualifier = virtual |-> Int|)
(method #v @mode = override |-> Int|)
(method #v @qualifier = final |-> Int|)
(method #v @qualifier = inherit |-> String|)
```

四个值的语义（源码 `Types.ts:591-637` `buildRowsForClass`；spec `member-qualifier-rules`，`runtime-type-system.xml:67-71`）：

- `virtual`：声明一个待覆盖的虚成员；未被覆盖前在视图里被"剪掉"（pruning）。
- `override`：覆盖基类的虚/实成员；若没有可覆盖的基实现，row 物化时**抛异常**（"Override specified without base implementation"）。
- `final`：禁止被覆盖。子类再 `override` 它会在 row 物化时**抛异常** `Cannot override final member '...'`（`Types.ts:617-618`）。
- `inherit`：自身不提供实现，转发到基类实现（运行期 forwarding，见 9.7）。

**重要——final/override 违规是"抛异常"，不是"返回诊断"**：这些规则在 **row 物化**（访问 `ClassType.Rows`）时强制执行，会 `throw Error`，而不是产生 KTB/KTC 诊断。`CheckSource` 只在需要解析某个 class 成员（例如其方法体引用了 `self.:x`）时才触发物化。因此：

```kon
(class #Base
  :[
    (method #value @qualifier = final |-> Int|)
  ])
(class #Derived
  @inherits = [Base]
  :[
    (method #value @qualifier = override |-> Int|)
    (method #use |-> Int| :[ (self.:value) ])
  ])
```
`TypeCheckSource` 在检查 `Derived.use` 体时触发 `Derived.Rows` 物化，**抛出** `Cannot override final member 'value' in Derived.`（不是返回诊断列表）。若 `Derived` 没有任何引用自身成员的方法体，则可能根本不触发物化、错误不暴露——所以不要依赖"它一定会被静态捕获"，写代码时自己保证不违反 final。

### 9.6.3 访问修饰符 `@visibility` / `@access`：public / protected / private / internal

**用途**：限制成员的外部可见性。

**精确语法形式**：成员属性 `@visibility = X` 或别名 `@access = X`（等价，源码 `readAccess` 读 `Attr.visibility ?? Attr.access`，`KonTypeBinder.ts:667-669`）：

```
(!String field #secret @visibility = private)
(method #peek @access = protected |-> String| :[ ... ])
```

值：`public`（默认）/ `protected` / `private` / `internal`（`internal` 与 `protect` 也被接受为别名，`KonTypeBinder.ts:675-687`）。

**静态强制**：外部代码访问非 public 成员被拒（`KTC080`，`KonTypeChecker.ts:513-516`；spec `access-modifier-static-boundary`）。class 体内部用 `self` 访问自身私有成员是允许的。

```kon
(class #SecretBox
  :[
    (!String field #secret @visibility = private)
    (method #peek @visibility = private |-> String| :[
      (self.:secret)
    ])
    (method #publicPeek |-> String| :[
      (self ~peek)
    ])
  ])

(fn #readSecret |!SecretBox box -> String|
  :[
    (box.:secret)
  ])
```
诊断**非空**：`readSecret` 在 class 外部读 `box.:secret`（private）报 `KTC080`。而 class 内部 `self.:secret`、`self ~peek` 都合法（对应 `TypeSystemChecker.test.ts:260-286`）。

---

## 9.7 projection：`~as`（限制视图）、`~name`（方法调用）、`~new`（构造）

这三个都是 `~`（InstanceCall）形式的接收者调用，作用在一个值上：

### 9.7.1 `~as`：投影到目标视图

**用途**：把一个值"看作"某个基类 / trait / 源 row，**限制**后续成员访问只能用目标视图暴露的成员。

**精确语法形式**：`(value ~as TargetType)`，其结果可继续 `.:field` / `~method`：

```
((value ~as TraitOrBase) ~someMethod)
((value ~as SourceRow).:someField)
```

**语义**：projection 必须**有效**——目标必须是源的基类、实现的 trait、或（对 row）一个结构超类/源 row，否则报 `KTC020`（`KonTypeChecker.ts:469-476`；`TypeProjection.IsValidProjection`，`Types.ts:503-524`）。投影后访问目标视图外的成员报 `KTC010`。

**trait 投影 + 视图限制（拒绝越界字段）**：

```kon
(trait #Named
  :[
    (method #title |!Any self -> String|)
  ])

(class #Article
  @implements = [Named]
  :[
    (!String field #draftOnly)
    (method #title |!Any self -> String|)
  ])

(fn #f |!Article a -> String|
  :[
    ((a ~as Named).:draftOnly)
  ])
```
诊断**非空**（`KTC010`）：投影到 `Named` 后只能看到 `title`，看不到 `draftOnly`。spec `trait-projection-view`（`runtime-type-system.xml:72-76`）。

**无效投影报错**：把 `Person` 投影到无关的 `Address` 报 `KTC020`（`CheckerInvalid.kon:29-32`）。

**合并行投影限制视图**：把合并 row 投影到它的某个源 row，则只能访问该源 row 的成员：

```kon
(type #T1 :[ (method #b |-> String|) ])
(type #T2 :[ (method #c |-> Int|) ])
(type #T3 @merge = [T1 T2])

(fn #main |!T3 value -> Int|
  :[
    ((value ~as T1) ~c)
  ])
```
诊断**非空**（`KTC010`）：投影到 `T1` 后调用只属于 `T2` 的 `c` 被拒（对应 `TypeSystemChecker.test.ts:306-329`）。把 `~c` 换成 `~b`、返回改 `String` 则通过。

### 9.7.2 `~name`：方法/属性接收者调用

**精确语法形式**：`(value ~method args...)`。源码 `CheckReceiverCall`（`KonTypeChecker.ts:422-434`），成员类型须是 `FunctionTypeSymbol`，输出为该方法的输出栈。

### 9.7.3 `~new`：构造实例

**精确语法形式**：`(ClassName ~new args...)`。`args` 按位置传给 class 的 `(new |...| :[ ... ])` 构造器。

**运行期 typed 块完整示例**（用 `EvaluateTypedBlockSync`，串联 `~new` / `set self.:` / `.:field` / `~method` / `~as`）：

```kon
(class #A :[
  (!String field #name)
  (new |!String n| :[ (set self.:name n) ])
])
(class #B @inherits = [A] :[
  (!String field #title)
  (new |!String n !String t| :[
    (set self.:name n)
    (set self.:title t)
  ])
])
(var b (B ~new "n1" "t1"))
((b ~as A).:name)
```
执行结果：`"n1"`。`~new` 构造 `B`，`~as A` 投影后读基类字段 `name`。

**运行期方法与 inherit 转发**：

```kon
(class #Base :[
  (method #greet |-> String| :[ "hello from base" ])
])
(class #Derived @inherits = [Base] :[
  (method #greet @qualifier = inherit |-> String|)
])
(var d (Derived ~new))
(d ~greet)
```
执行结果：`"hello from base"`。`Derived.greet` 标 `inherit`、无体，运行期转发到 `Base.greet`（spec `inherit-method-forwarding`，`runtime-type-system.xml:148-152`）。

**运行期限制（务必注意）**：在 `EvaluateTypedBlockSync` 这条 typed runtime 路径上——
- `~method`（接收者方法调用）与 `.:field`（字段读写）**可用**。
- **`prop` 属性 getter/setter 不通过 typed runtime bridge 暴露**：`prop #label` 体会被**类型检查**（见下），但运行期用 `(g.:label)` 或 `(g ~label)` 都会抛 `Field/Member 'label' ... ` 错误。若你要在 typed runtime 里取计算值，用普通 `method` 而非 `prop`。
- 写进 typed 字段的值不能是数组/不受支持的结构化值（`WriteKonField` 拒绝 Arrays，spec `unsupported-kon-structured-value`）。

### 9.7.4 class 方法 / 构造器 / 属性的体检查

checker 会用 typed `self` 校验 `method` / `new` / `prop` 的体（`KonTypeChecker.ts:127-228`；spec `class-method-body-checking`）：

```kon
(class #Counter :[
  (!Int field #count)
  (new |!Int initial| :[
    (set self.:count initial)
  ])
  (method #get |-> Int| :[
    (self.:count)
  ])
  (prop #data
    get :[ (self.:count) ]
    set |!Int value| :[ (set self.:count value) ])
])
```
诊断为空（对应 `TypeSystemChecker.test.ts:215-229`）。注意：`prop` 的 `get` / `set` 段紧跟在 `(prop #data ...)` 之后，`set` 段带自己的参数表 `|!Int value|`。这里 `prop` 通过**类型检查**——但如上所述，它在 `EvaluateTypedBlockSync` 运行期不可调用。

---

## 9.8 签名：`|in -> out|` 栈式签名

**用途**：`fn` / `method` / `op` 的类型签名。kunun 的签名是**栈式的**：输入是一个类型栈，输出也是一个类型栈（可多值）。

**精确语法形式**：

```
|IN... -> OUT...|
```

- `->` 左边是输入栈，右边是输出栈，用空白分隔多项（不能用逗号，逗号会被拒绝）。
- **输入项**：`!Type name`——`!Type` 前缀给类型，`name` 是参数名（裸词）。例如 `|!String text -> Unit|`、`|!Box<Int> box -> Int|`、`|String Int -> Bool|`（也可只写类型不写名）。
- **输出项**：裸类型名，可多个：`|-> String Int|` 表示返回两个值的栈。
- 空输入：`|-> Out|`。空输出 `|In ->|` 或 `|->|`：输出栈被登记为 `[Never]`（源码 `BindFunctionSignature`，`KonTypeBinder.ts:316-318`）。
- `fn` 缺签名表报 `KTB080`（`KonTypeBinder.ts:244`）。

**`fn` 声明形式**：

```
(fn #name |IN -> OUT| :[ BODY ])
(fn #name <T> |IN -> OUT| :[ BODY ])    // 泛型函数
```

**栈语义（关键）**：函数体的**最后一个表达式**的输出栈必须与签名输出栈兼容，否则报 `KTC040`。多输出函数的输出栈会被**完整保留**并供后续调用消费——这就是"栈式组合"（spec `stack-shaped-call-composition`）：

```kon
(fn #makePair |-> String Int|
  :[])

(fn #consumePair |String Int -> Bool|
  :[])

(fn #composed |-> Bool|
  :[
    (makePair :consumePair)
  ])
```
诊断为空：`makePair` 产出 `[String Int]` 栈，正好喂给 `consumePair` 的输入栈 `[String Int]`，结果 `Bool`（中缀位调用用 `:consumePair` 前缀）。若两边栈顺序不一致（如 `consumePair` 改成 `|Int String -> Bool|`）则报 `KTC041`（输入栈不匹配）。

**类型别名**：以下成对别名等价（源码 `TryResolvePrimitiveAlias`，`KonTypeBinder.ts:373-395`；checker 同表 `KonTypeChecker.ts:601-623`）：

| 写法 | 解析为 |
|---|---|
| `Int` / `int` | int |
| `String` / `str` | str |
| `Bool` / `bool` | bool |
| `Any` / `any` | any |
| `Unit` / `unit` / `Never` / `never` | never |

所以 `(fn #f |!int x -> Int| :[ x ])` 与 `|!Int x -> int|` 等价（均通过检查）。`Unit` 返回常用于"只为副作用"的效果型函数（`-> Unit`，等价于 `-> never`）。

**注意 `Any` 不是 top/bottom 类型**：`Any` 在 `areTypesCompatibleDirect` 里只与 `Any` 同名匹配（`TypeSystem.ts:215`）——它**不**自动兼容 `Int` 等。例外是赋值/构造体返回处的 `allowAnyActual`（实际值为 `Any` 时放行，`KonTypeChecker.ts:629-631`）。因此一个无类型默认字段（回退为占位/`Any`）读进一个 `-> Int` 的 `fn` 返回位**会** `KTC040`；要么给字段加 `!Int`，要么把返回类型写成与实际一致。

### 9.8.1 effect 签名语法（细节见第 10 章）

effect 的**类型声明语法**在本章内：用 hash-paren 前置标记声明 effect、effect row、handler，紧跟其后的声明生效（源码 `ReadEffectPrefixes`，`KonTypeBinder.ts:397-426`）：

```kon
#(effect decl #Console)
(type #Console :[ (op #print |!String text -> Unit|) ])   // 上一行 #(effect decl #Console) 声明 effect 名；本行给出它的操作签名

#(effect row :[ Console ])
(fn #main |-> Unit| :[ (perform #Console.print |"ready"|) ])   // 上一行 #(effect row ...) 给【紧跟的本 fn】标注它产生的 effect 行
```

> 注意：行注释 `//` 不要写在 `#(effect ...)` 前置标记那一行上（该 hash-paren 前置标记与行内注释 token 的组合会让类型入口解析失败）；把说明放到它紧跟的普通声明行（如上）或单独的 prose 里。

`perform` 按 effect 的 `op` 签名校验参数栈与残余 effect：

```kon
#(effect decl #Console)
(type #Console
  :[
    (op #print |!String text -> Unit|)
  ])

#(effect row :[ Console ])
(fn #main |-> Unit|
  :[
    (perform #Console.print |"ready"|)
  ])
```
诊断为空。若实参类型不符（`(perform #Console.print |1|)`）报 `KTC071`；若函数没声明 `#(effect row :[ Console ])` 却 perform 了 Console 操作，则残余 effect 未处理报 `KTC050`。`perform` 的 `#Effect.op` 形式与 effect 标记、handler（`#(effect handler ...)` / 后缀 `%(effect handle #h)`）的完整语义见 [第 10 章 效果系统](./10-effects-and-typed-execution.md)。

---

## 9.9 本章诊断码速查

| 码 | 阶段 | 含义 |
|---|---|---|
| KTB002 | binder | 顶层不是 `type`/`fn`/`class`/`trait` |
| KTB010 | binder | 声明缺名字 `#Name` |
| KTB021 | binder | `@merge` 目标未定义 |
| KTB040 | binder | type body item 不是 knot（被丢弃） |
| KTB042 | binder | method/op 缺成员名或签名表 |
| KTB061 | binder | `..Q` 既非泛型行参数也非 effect |
| KTB080 | binder | `fn` 缺 `|in -> out|` 签名表 |
| KTB100 / KTB101 | binder | 非泛型却传实参 / 泛型 arity 或 row 参数约束不符 |
| KTC010 | checker | 目标类型未暴露该 slot（含投影视图外访问） |
| KTC020 | checker | 无效 projection 目标 |
| KTC030 | checker | row 上同名成员歧义（未源限定） |
| KTC040 | checker | 函数体返回栈与签名输出栈不兼容 |
| KTC041 | checker | 调用/赋值输入栈不匹配 |
| KTC050 | checker | 函数残余 effect 未在声明的 effect row 内 |
| KTC070 / KTC071 | checker | 泛型/perform 操作签名不符 |
| KTC080 | checker | 访问越权（private/protected/internal） |

final/override 违规**不在此表**——它在 row 物化时**抛异常**（见 9.6.2）。

---

## 9.10 常见错误总览

- **以为类型默认生效**：默认运行期完全 untyped，必须用 9.0 的三个入口之一才会检查/带类型执行。
- **字段类型写成 postfix**：只有 `(!Type field #name)` 前缀有效；`(field #name Type)` 不报错但**不会**把类型登记为 `Type`，`(field #name !Type)` 直接解析失败。
- **混淆三种 subscript**：`.:` = slot，`.:Row:::m` = slot + 源限定，`::` = 容器下标（与类型无关）。源限定符只有 `:::` 一种。
- **合并行同名成员不限定**：必报 `KTC030`，用 `.:Origin:::member` 消歧。
- **依赖 `prop` 在 typed runtime 可调用**：`prop` 只被类型检查；`EvaluateTypedBlockSync` 运行期不暴露属性 getter/setter，要计算就用 `method`。
- **把 `Any` 当 top 类型**：`Any` 不自动兼容具体类型；无类型默认字段读进具体返回类型会 `KTC040`。给字段加 `!Type`。
- **`..never` 当成员写**：它是行尾闭合标记，单独成行；不能 `(field #x ..never)`。
- **拼错类型名静默通过**：未知类型名生成占位引用、不报错。务必拼对。
- **指望 final/override 一定被静态捕获**：它在 row 物化时抛异常，未触发物化时不暴露——自己保证不违反。
