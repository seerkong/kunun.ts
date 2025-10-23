# 第 08 章 宿主标准库函数目录（Host Stdlib）

本章面向直接编写 kunun/Kon 代码的读者，目录化列出 runtime 默认注册的全部 **host
函数**（host functions），并解释它们如何被注册和调用（bridge 边界）。所有条目均以
live 注册表为准，并已逐条在 runtime 上跑通验证。

> **容器语法（Kon）**：圆括号 `()` = knot（调用/序列），方括号 `[]` = vector，花括号
> `{}` = map。容器元素之间**只用空白分隔**，逗号 `,` 不是分隔符——runtime 解析器把 `,`
> 当 unquote 处理，写 `[1, 2]` 会失败（裸顶层 `[1, 2]` 在 `EvalBlockSourceSync` 下抛
> `Callable not found: <stack-callable>`，在 var 绑定或 `kwf` 下抛
> `null is not an object (evaluating 'this.AsPairKey(firstNode).Value')`）。本章所有示例都用空白分隔。
> （另注：`Comma separators are not allowed in this syntax profile` 这条文案只出现在 kunun 包的
> V1 syntax profile（`KnParserV1`），不属于本章所有示例走的 runtime 执行路径。）
>
> **函数调用一律加 `:` 前缀**：调用 host 函数、运算符、方法时无论前缀位还是中缀位都用
> `:`——前缀 `(:Concat "a" "b")`、`(:+ 1 2)`，中缀 `("a" "b" :Concat)`、`(1 2 :+)`。
> 关键字/宏（`var`/`set`/`if`/`fn`/`ai_*` 等）、keyword-arg 标记（`:input=`）、字段访问
> （`obj.:field`）、源限定（`Row:::member`）不是函数调用，**不加** `:`。

---

## 0. 一句话总览

- runtime 启动时由 `RuntimeInterpreter.RegisterDefault` 注册 **31 个** host 函数，
  覆盖算术、比较、逻辑、字符串/类型转换、IO、数组长度、宿主对象方法桥接等
  （`packages/runtime/lib/RuntimeInterpreter/RuntimeInterpreter.ts:671-721`）。
- host 函数是普通的 JS 函数，按**名字**注册到一张独立的表里，在 callable 位置
  解析时**优先于环境变量**被命中（见第 1 节）。
- 裸 `kunun-runtime` 求值器和 `kwf` 工作流宿主走的是同一套
  `CreateRuntime() → RegisterDefault`，所以这份目录在两处完全一致。

> **重要：不要把 `HostSupport/*.ts` 当作标准库。**
> `packages/runtime/lib/HostSupport/{HostFunctions,MathFunctions,StringFunctions,IOFunctions}.ts`
> 是 **dead code**——它们用旧机制（`KnHostFunction` + `Env.Define`），
> `HostFunctions.Import` 没有任何调用者，当前解释器从不导入它们
> （`packages/runtime/lib/HostSupport/HostFunctions.ts:8-34`）。它们与 live 行为
> 不一致：旧文件注册了 `>` `<` `Gt` `Ge` `Lt` `Le`，而 live 注册表里**没有** `>` `<`；
> 旧 `Writeln` 返回 `str.length`，live `Writeln` 返回 `null`。**以本章为准，不要照搬那些文件。**

---

## 1. 注册与调用机制（bridge 边界）

### 用途

理解一个名字（如 `+`、`Concat`、`Writeln`）是如何从 Kon 源码里被解析成一个可
调用的宿主实现的，以及它和用户自己用 `var`/`fn` 定义的绑定之间的优先级。

### 精确机制

1. **注册（live 路径）。** `RuntimeInterpreter.CreateRuntime()` 调用
   `RegisterDefault(runtime)`，后者对每个内建逐个调用
   `runtime.registerHostFunction(name, fn, arity)`
   （`RuntimeInterpreter.ts:38-42`、`671-721`）。
   `registerHostFunction` 把 JS 函数存进 `hostFunctions[name]`，把声明的元数（arity）
   存进 `hostFunctionArities[name]`；arity 省略时默认取 `fn.length`，但每个默认条目都
   显式传了 arity（`RuntimeState.ts:875-878`）。

2. **名字解析（边界所在）。** 当一个 `Word` 节点出现在 callable 位置时，runtime
   **先查 host 函数表，再查环境**：见 Word 节点展开器
   （`RuntimeInterpreter.ts:728-733`）以及 `ResolveCallable`/`GetCallableArity`
   （`RuntimeInterpreter.ts:2190-2232`）。因此 host 函数处在一个独立命名空间，会
   **遮蔽（shadow）同名的用户 `var`/`fn` 绑定**。

3. **调用。** host 函数就是普通 JS 函数，通过 `callHostFunction(name, args)` →
   `fn(...args)` 同步内联调用（`RuntimeState.ts:892-898`）。它们**不**压入运行时栈帧。

4. **按 arity 取参。** 在 chain 里遇到一个 host 函数 Word 时，求值器按其声明的
   `arity` 做前看（lookahead）正好取这么多个参数
   （`RuntimeInterpreter.ts:2108-2126`）。这是下面"变长函数陷阱"的根源。

### bridge API（供嵌入方使用，了解即可）

`runtime.hasHostFunction(name)` / `getHostFunction(name)` /
`getHostFunctionArity(name)` / `callHostFunction(name, args)`
（`RuntimeState.ts:880-898`）。

### 示例（验证：`(:+ x 10)` 在工作流宿主里同样命中 host `+`）

```kon
(ai_workflow #demo
  :input = {x = 1}
  :output = [y]
  :[
    (var y (:+ x 10))
  ])
```

用 `kwf dry-run` 跑通，`result: [11]` —— 证明工作流宿主与裸 runtime 共用同一套
host 函数注册。

### 陷阱

- **host 函数遮蔽用户绑定。** 不要给自己的 `fn`/`var` 起和内建同名的名字（如
  `Concat`、`+`），否则在调用位置永远命中 host 函数，你的绑定被忽略
  （`RuntimeInterpreter.ts:728-733`、`2190-2196`）。

---

## 2. Math / 算术运算符

四个算术运算符，声明 arity 均为 2。`+` 和 `*` 的实现是变长 reduce（带初值），但
**只有在前缀运算符位置（所有实参都在 Params 里）才真正变长**——见本节末陷阱。

| kunun 名 | arity | 实现 | 语义 |
|---|---|---|---|
| `+` | 2（变长 reduce，初值 0） | `args.reduce((s,x)=>s+x, 0)` | 求和 / JS `+`（字符串则拼接） |
| `-` | 2 | `left - right` | 减法 |
| `*` | 2（变长 reduce，初值 1） | `args.reduce((p,x)=>p*x, 1)` | 乘积 |
| `/` | 2 | `left / right` | **浮点**除法（不取整：`(/ 10 4)` = 2.5） |

来源：`RuntimeInterpreter.ts:671-674`。

### 语义要点

- `/` 是浮点除法，没有整除/向下取整。
- `+` 在两个操作数都是字符串时是字符串拼接（JS `+` 语义），但跨字符串拼接更推荐
  用 `Concat`（见第 5 节）。

### 示例（全部已验证）

```kon
(:- 10 3)        // => 7
(:* 4 5)         // => 20
(:/ 10 4)        // => 2.5
(:+ 1 (:+ 2 3))  // => 6
```

中缀形式也可用：

```kon
(1 2 :+)         // => 3
```

变长（仅前缀运算符位置成立）：

```kon
(:+ 1 2 3)       // => 6
(:* 2 3 4)       // => 24
```

### 陷阱：变长只在前缀运算符/Params 位置成立

`(:+ 1 2 3)` 解析为"前缀运算符调用"，全部实参都进 Params，变长实现看到 `[1,2,3]`
得 6。算术符号 `+`/`*`/`-`/`/` 因为是运算符位置，所以 `(:+ 1 2 3)` 安全。`Concat`
同样是变长实现，bare 与 colon 前缀的多实参都正确拼接全部——见第 5 节 `Concat` 说明。

---

## 3. 比较运算符

| kunun 名 | arity | 语义 |
|---|---|---|
| `==` | 2 | 严格 `===`（数字、字符串都适用） |
| `>=` | 2 | `left >= right` |
| `<=` | 2 | `left <= right` |
| `gt` | 2 | `left > right`（**词形式**，严格大于） |
| `lt` | 2 | `left < right`（**词形式**，严格小于） |

来源：`RuntimeInterpreter.ts:675-677`、`694-695`。

### 示例（全部已验证）

```kon
(:== 2 2)        // => true
(:== "a" "a")    // => true
(:gt 5 2)        // => true
(:lt 2 5)        // => true
(:>= 3 3)        // => true
(:<= 2 3)        // => true
```

真实 `.kon` 里同样如此，例如 `examples/routing.kon:28` 用
`(:== (classification.:category) "frontend")`（注意 `classification.:category` 是字段
访问，不是函数调用，所以 `.:category` 不加 `:` 前缀）；已验证 `(:== 1 1)` => `true`。

### 陷阱：`<` / `>` 不是比较运算符，而是语法定界符

live 注册表里**不存在** `>` 和 `<` 这两个 host 函数，它们也**不是**比较运算符。`<` / `>`
是另有语法含义的定界符——用于有序 map（`$<…>`、`:<…>`）和泛型（`Name<…>`）。

- `(:gt 5 2)` => `true`、`(:lt 2 5)` => `true`——严格大小比较一律用具名 host 函数。
- 裸 `<`（不构成上述容器/泛型语法时）抛 `Invalid token`，因为 `<` 是语法定界符不是运算符。

可操作规则：**严格大于/小于一律用具名 host 函数，调用写 `(:gt a b)` / `(:lt a b)`**，闭区间用
`(:>= a b)` / `(:<= a b)`；要做相等判断用 `(:== a b)`。

---

## 4. 逻辑运算符

| kunun 名 | arity | 语义 |
|---|---|---|
| `and` | 2 | `IsTruthy(left) && IsTruthy(right)` → boolean |
| `or` | 2 | `IsTruthy(left) \|\| IsTruthy(right)` → boolean |
| `or_else` | 2 | `IsTruthy(left) ? left : right`（返回**值**，不是 boolean） |

来源：`RuntimeInterpreter.ts:678-680`。

### 调用形式：infix / bare 前缀 / colon 前缀三种形式结果一致

逻辑运算按设计也是函数，可写 `(:and a b)`。三种调用形式（infix、bare 前缀、colon 前缀）
结果一致，都正确。实测：

- **infix `(a b :and)` / `(a b :or)`：正确。** `(true false :and)` => `false`、`(true true :or)` => `true`（均已实测）。
- **bare 前缀 `(and a b)` / `(or a b)`：正确。** `(and true false)` => `false`、`(and true true)` => `true`、`(or false true)` => `true`（均已实测）。
- **colon 前缀 `(:and a b)` / `(:or a b)`：正确。** `(:and true true)` => `true`、`(:or false true)` => `true`（均已实测）。

可操作规则：**三种形式可任选，结果一致；推荐与全文一致用 colon 前缀 `(:and a b)`。** 详见 [./06-builtins-control-flow.md](./06-builtins-control-flow.md) 第 12 节（该章从 RPN/infix 角度记录同一行为）。

### 真值规则（`IsTruthy`，`RuntimeInterpreter.ts:3124-3129`）

一个值**只有**在它是 `false`、`null`、`undefined`、或 Unknown/Undefined 类型节点
时才为 falsy。**其它一切都为 truthy——包括 `0` 和空字符串 `""`。** 这与 JS / 多数
语言不同。

### 短路（**条件性**，别当普适保证）

短路**不是** `(a and b)` 的普适性质，而是取决于右操作数**怎么写**。**短路只发生在
infix 形式、或 bare 前缀的裸 lookahead 右操作数**；**bare 前缀 + 括号右操作数会被 eager 求值，不短路。**
底层 `EvaluateLogicalOperator`（`RuntimeInterpreter.ts:2008-2041`）有两条分支：

- **eager 分支**（`2016-2021`，`values.length >= 2`）：当**两个操作数都已作为链值先行求值**
  时走这里——**不短路**。最典型的就是**把括号子表达式当右操作数**，如
  `(and a (expensive))` / `(or a (sideEffect))`：括号里的表达式会被**提前 eager 求值**，
  无论左值真假。
- **延迟分支**（`2023-2040`，`HasDeferredRightOperand` 为真）：只有当右操作数是**延迟求值的裸
  lookahead 操作数**（如 `(false and console "X")` 里的 `console "X"`，或 infix `(false :and (set t 1))`
  的右侧）时才短路——`or`/`or_else` 在左值 truthy 时短路，`and` 在左值 falsy 时短路。

**实测对照**（左值已注定结果但右侧仍被执行 = 没短路）：

- infix `(false :and (set t 1))`：RHS **不执行**（`t` 保持 `0`，infix → 短路）。
- infix `(true :or (set t 1))`：RHS **不执行**（`t` 保持 `0`，同上）。
- bare 前缀 `(and false (set t 1))`：RHS **仍被执行**（`t` 变成 `1`，括号子表达式 → eager，**不**短路）。
- bare 前缀 `(or true (set t 1))`：RHS **仍被执行**（`t` 变成 `1`，同上）。
- bare 前缀 `(false and console "X")`：RHS `console` **不执行**（裸 lookahead 操作数 → 短路）。
- bare 前缀 `(true or console "Y")`：RHS `console` **不执行**（同上）。

> **警告：** **不能**用 `(and p (use p))` / `(or p (fallback))` 这种**括号守卫**模式来防御副作用或
> 异常——括号子表达式必定被 eager 求值。已验证 `(and false (set t 1))` 仍会把 `t` 改成 `1`、
> `(false and (:HostCall arr "nope" 1))` 仍会**抛错**（若真短路应直接返回 `false` 而不触碰 RHS）。
> 要真正短路，右操作数必须是**裸 lookahead 形式**——bare 前缀写 `(false and console "X")`，或用 infix
> `(false :and (set t 1))`。

### 示例（全部已验证）

infix（注意这里两个操作数都是字面量，**不涉及**短路，只是语法变体）：

```kon
(true false :and)   // => false
(true true :or)     // => true
(false true :or)    // => true
(0 99 :or_else)     // => 0      0 在 IsTruthy 下为真，故返回左值 0
(7 99 :or_else)     // => 7
(0 2 :and)          // => true   0 与 2 都为真
(null 5 :or)        // => true
```

bare 前缀（**正确**）：

```kon
(and true false)   // => false
(and true true)    // => true
(or false true)    // => true
(true and false)   // => false
(false or true)    // => true
```

colon 前缀（**正确**——结果与 infix/bare 一致）：

```kon
(:and true true)   // => true
(:or false true)   // => true
```

### 陷阱：两套互相冲突的"真"

语言条件（`if`、`and`、`or`、`or_else`）用 `IsTruthy`——`0` 和 `""` 都为**真**。
而第 5 节的 `ToBoolean` host 函数用 JS `Boolean()`——`0`/`""`/`null` 都为**假**。
所以 `(0 99 :or_else)` => `0` 但 `(:ToBoolean 0)` => `false`。**别假设两者一致。**

---

## 5. String / 类型转换函数

| kunun 名 | arity | 实现 | 语义 |
|---|---|---|---|
| `Concat` | 2（实现变长 `args.join('')`） | 把所有实参当字符串拼接 | 拼接（注意变长陷阱） |
| `Length` | 1 | `String(value).length` | 字符串长度（先强转为字符串） |
| `ToUpper` | 1 | `String(value).toUpperCase()` | 转大写 |
| `ToLower` | 1 | `String(value).toLowerCase()` | 转小写 |
| `Trim` | 1 | `String(value).trim()` | 去首尾空白 |
| `ToString` | 1 | `String(value)` | 字符串化 |
| `ToInt` | 1 | `Number.parseInt(String(value), 10)` | 解析十进制整数；非数字返回 `NaN`，**无校验** |
| `ToFloat` | 1 | `Number.parseFloat(String(value))` | 解析浮点；失败返回 `NaN` |
| `ToBoolean` | 1 | `Boolean(value)` | **JS 真值**（`""`→false、`0`→false，与 `IsTruthy` 不同！） |
| `append` | 2 | target 有 `.push` 则 `target.push(value)`（返回新长度、原地修改）；否则 `String(target)+String(value)` | 数组 push / 字符串追加二选一 |

来源：`RuntimeInterpreter.ts:704-712`（转换族）、`688-693`（`append`）。

### 示例（全部已验证）

```kon
(:Concat "a" "b")            // => "ab"
(:Length "hello")            // => 5
(:ToUpper "abc")             // => "ABC"
(:ToLower "ABC")             // => "abc"
(:Trim "  x  ")              // => "x"
(:ToString 42)               // => "42"
(:ToInt "42")                // => 42
(:ToFloat "3.14")            // => 3.14
(:ToBoolean "")              // => false
(:ToBoolean 0)               // => false
(:append "ab" "cd")          // => "abcd"
```

### 说明：`Concat` 是变长函数，bare 与 colon 前缀都拼接全部实参

`Concat` 的实现是变长 `args.join('')`，把**所有**实参当字符串拼接。bare 形式与 colon
前缀结果一致，三个及以上实参都正确拼接全部：

```kon
(Concat "a" "b" "c")            // => "abc"  （bare 形式拼接全部）
(:Concat "a" "b" "c")           // => "abc"  （colon 前缀拼接全部）
(:Concat (:Concat "a" "b") "c") // => "abc"  （嵌套也对）
```

（已验证 bare `(Concat "a" "b" "c")` 与 colon 前缀 `(:Concat "a" "b" "c")` 及嵌套均 => `"abc"`。）

### 陷阱 2：`ToInt`/`ToFloat` 解析失败返回 `NaN`

`(:ToInt "abc")` 运行时值是 `NaN`（已验证 `Number.isNaN` 为真），**不是错误也不是 0**。
注意：把它 `JSON.stringify` 时会显示成 `null`（JSON 没有 NaN），但运行时值是 NaN。
不要把 `ToInt` 当作带校验的解析器。

### 陷阱 3：`append` 对数组返回的是"新长度"而非数组

`(:append target value)`：若 target 是数组（有 `.push`），它会**原地修改数组并返回新
长度（number）**，不是返回数组本身。空数组 `append` 一个元素后返回 `1`，数组变成
`[7]`（已验证 `ret=1, arr=[7]`）。期望拿回数组的作者会被这个返回值绊到。

---

## 6. IO 函数

所有 IO 都经由可插拔的 `RuntimeIoHost` 路由（`RuntimeState.ts:915-921`）。**默认
`ioHost` 是空对象 `{}`**（`RuntimeState.ts:194`），所以在裸 `EvalBlockSourceSync`
里 write/readLine 都是静默 no-op，除非嵌入方调用 `runtime.setIoHost({...})`。
`kwf` 工作流宿主和测试都会安装一个 ioHost。

| kunun 名 | arity | 实现 | 返回 |
|---|---|---|---|
| `Writeln` | 1 | `ioHost.writeLine?.(String(value))` | `null` |
| `WriteLine` | 1 | `ioHost.writeLine?.(String(value))` | `null` |
| `Write` | 1 | `ioHost.write?.(String(value))`（不换行） | `null` |
| `console` | 1 | `ioHost.writeLine?.(String(value))` 后**返回该值** | 输入值（pass-through） |
| `ReadLine` | 0 | `ioHost.readLine?.() ?? ''` | 读到的行（或 `''`） |

来源：`RuntimeInterpreter.ts:684-721`。

### 别名说明

- `Writeln` 与 `WriteLine` 是**别名**，都调用 `writeLine`。
- `Write` 不换行。
- `console` 是唯一一个**返回其参数**的 IO 函数（适合内联在数据流里）。

### 示例（已用 stub ioHost 验证）

安装如下 ioHost 后（伪示意，由嵌入方提供）：write 记 `W:`、writeLine 记 `WL:`、
readLine 返回 `"stub-line"`：

```kon
(:Writeln "hi")     // 返回 null，输出 "WL:hi"
(:WriteLine "hi")   // 返回 null，输出 "WL:hi"（与 Writeln 等价）
(:Write "yo")       // 返回 null，输出 "W:yo"（无换行）
(:console "z")      // 返回 "z"，同时输出 "WL:z"
(:ReadLine)         // 返回 "stub-line"
```

验证结果依次为：`Writeln`/`WriteLine`/`Write` 返回 `null` 并产生上述输出；
`console` 返回 `"z"`；`ReadLine` 返回 `"stub-line"`。

### 陷阱：默认 IO 是静默的

默认 `ioHost` 为空，`Writeln`/`WriteLine`/`Write`/`console`/`ReadLine` 全部退化为
no-op（返回 `null`/`''`），**输出不会出现**。已验证：默认 `(:Writeln "nope")` 返回
`null` 且无任何输出。需要可见输出时嵌入方必须 `setIoHost({...})`。

### 陷阱：要让值继续流动用 `console`，不要用 `Writeln`

`Writeln`/`WriteLine`/`Write` 都返回 `null`。只有 `console` 把参数透传回来。

---

## 7. 通用：数组长度、宿主对象方法桥、定时器

| kunun 名 | arity | 实现 | 语义 |
|---|---|---|---|
| `ArrayLength` | 1 | `value?.length ?? 0` | 数组/字符串长度，null 安全（无 length 则 0） |
| `HostCall` | 3 | `runtime.callHostObjectMethod(target, String(method), [arg])` | 在宿主 JS 对象上调用**单参**方法，返回方法结果 |
| `HostApply` | 3 | `runtime.applyHostObjectMethod(target, String(method), args)` | 用**实参数组**调用方法 |
| `clear_interval` | 1 | `timerHost.clearInterval?.(handle)` | 清除 interval 句柄，返回 `null` |

来源：`RuntimeInterpreter.ts:681-683`、`700-703`。
`callHostObjectMethod` 做 `target[name].apply(target, args)`，方法不是函数时抛
`Host method not found: <name>`，target 为 null 时抛 `Cannot call method ... on null target`
（`RuntimeState.ts:900-913`）。

### `ArrayLength` 示例（已验证）

```kon
([1 2 3] :ArrayLength)   // => 3   （vector 字面量用中缀）
(:ArrayLength "abc")     // => 3
```

> 注意：colon **前缀**直接喂 vector 字面量时取参有问题——`(:ArrayLength [1 2 3])` 实测得
> `0`（字面量没被当作那唯一一个实参）。所以 vector 字面量当实参时用**中缀** `([1 2 3] :ArrayLength)`，
> 或先 `(var xs [1 2 3])` 再 `(:ArrayLength xs)`（均 => `3`，已验证）。字符串等非容器实参的前缀
> `(:ArrayLength "abc")` 正常。

### `HostCall` / `HostApply`：两种调用写法

需要一个由嵌入方 `runtime.define('t', <某个 JS 数组>)` 注入的宿主对象 `t`。

**(1) 前缀函数形式：**

```kon
(:HostCall t "push" 1)          // 在空数组上：返回 1，t 变成 [1]
(:HostApply t "push" [2 3])     // 在空数组上：push 2 和 3，返回新长度 2，t 变成 [2 3]
```

**(2) 后缀 call-type 标记形式**（尾部 `:HostCall` / `:HostApply`）：

```kon
(t "push" 9 :HostCall)         // 返回 1，t 变成 [9]
(t "push" [10 11] :HostApply)  // 返回新长度 2，t 变成 [10 11]
```

两种形式均已验证，行为对齐 `packages/runtime/__tests__/Case/RuntimeInterpreterHostBridge.test.ts:15-31`。

> 注意 `.push(2,3)` 返回的是**操作后数组的新长度**。在空数组上 push 两个元素，
> 长度是 2，所以 `HostApply ... [2 3]` 返回 `2`（不是 3）。返回值取决于数组操作后
> 的长度。

错误路径（已验证）：

```kon
// (:HostCall t "nope" 1)   -> 抛 "Host method not found: nope"
```

### 定时器

`set_timeout` / `set_interval` 是**前缀关键字（special form）**，不是 host 函数；
而 `clear_interval` **是** host 函数。`(:clear_interval h)` 通过可插拔的 `timerHost`
（默认是真实的 `setTimeout`/`setInterval`）清除句柄并返回 `null`
（`RuntimeInterpreter.ts:700-703`）。

---

## 8. 与 host 函数相邻的边界：属性 / 下标 / 内建方法

下面这些**不是** host 函数（不在 host 函数表里），但属于作者会跨越的同一道宿主对象
边界，列在此处以便区分。

### 8.1 属性与下标访问（针对 `runtime.define` 注入的宿主 JS 对象/数组）

- `(obj.:key)` 读属性；`(set obj.:key value)` 写属性。
- `(arr.:length)` 读数组 length；`(arr::index)` 下标取值。

读操作 null 安全（返回 `null`），写操作对 null target 抛错
（`RuntimeState.ts:931-986`）。已验证（注入 `model = {text:"abc"}`、`items = [1,2,3]`）：

```kon
(model.:text)            // => "abc"
(set model.:text "def")  // => "def"（并改写 model.text）
(items.:length)          // => 3
(items::1)               // => 2
```

行为对齐 `packages/runtime/__tests__/Case/RuntimeInterpreterHostProperty.test.ts:6-21`。

### 8.2 内建实例方法（Array / Map，**实例调用语法**，非 host 函数）

runtime 另注册了一批内建**方法**，用实例/点调用语法作用在数组和 map 上
（`RuntimeState.ts:1150-1169`），经 `callBuiltinMethod` 分发
（`RuntimeState.ts:965-972`），方法名首字母会被规范化为大写
（`RuntimeInterpreter.ts:2330-2335`，即 `.count` 解析到 `Count`）。

- **数组方法：** `Count`、`Length`、`Get`、`Push`、`Pop`、`Unshift`、`Shift`、`Top`、`IsEmpty`。
- **Map/对象方法：** `Count`、`Get`、`ContainsKey`、`Keys`、`Values`、`IsEmpty`、`Remove`、`Clear`。

类型分派（`getBuiltinTypeName`，`RuntimeState.ts:1137-1148`）：数组 → `'Array'`；
`Map` 实例与普通对象 → `'Map'`。

> **关键区别：** 这些是**实例方法**，必须在实例调用位置使用，**不能**当作裸前缀
> host 调用。**bare 前缀** `(Count arr)` 会**报错**——因为 host 函数表里没有 `Count`，它也
> 不是任何 env 绑定，于是被当作**未绑定名**抛 `Unbound name: Count`（参见第 9 节「未绑定名报错」）。
> colon 前缀 `(:Count [1 2 3])` 同样会抛 `Callable not found: Count`。两种写法都不是正确的实例
> 方法调用方式，但都会**报错暴露**问题——拼错的方法名不会被静默吞掉。

---

## 9. 全局陷阱速查（务必牢记）

- **`HostSupport/*.ts` 是 dead code**，不要照搬其 API；以 live 注册表（本章）为准
  （`RuntimeInterpreter.ts:671-721` vs `HostSupport/HostFunctions.ts:8-34`）。
- **函数调用一律加 `:`**：host 函数/运算符/方法在前缀位 `(:Concat ...)`、中缀位
  `(... :Concat)` 都用 `:`；关键字/宏/keyword-arg 标记/字段访问/源限定不加。
- **容器分隔只用空白**：`[1 2 3]`、`{a = 1}`，逗号 `,` 不是分隔符。runtime 解析器把 `,`
  当 unquote 处理（`,expr` / `,@` / `,%`），所以 `[1, 2]` 会失败——裸顶层 `[1, 2]` 在
  `EvalBlockSourceSync` 下抛 `Callable not found: <stack-callable>`，在 var 绑定或 `kwf` 下抛
  `null is not an object (evaluating 'this.AsPairKey(firstNode).Value')`。
  （`Comma separators are not allowed in this syntax profile` 这条文案仅来自 kunun 包的 V1
  syntax profile（`KnParserV1`），不属于本章 runtime 执行路径。）
- **`<` / `>` 不是比较运算符**，只有 `gt` / `lt` / `>=` / `<=` / `==`。`<` / `>` 是有序 map
  （`$<…>`、`:<…>`）和泛型（`Name<…>`）的语法定界符，裸 `<` 抛 `Invalid token`；
  严格大小比较写 `(:gt a b)` / `(:lt a b)`，相等写 `(:== a b)`。
- **逻辑运算 infix / bare 前缀 / colon 前缀三种形式结果一致**：`(:and true true)` => `true`、
  `(:or false true)` => `true`，与 `(true true :and)` / `(and true true)` 一致。
  短路只在 infix 或 bare 前缀裸 lookahead RHS 发生，bare 前缀 + 括号 RHS 会 eager 求值。
  详见 [./06-builtins-control-flow.md](./06-builtins-control-flow.md) 第 12 节。
- **变长在前缀运算符/Params 位置成立，`Concat` 是变长函数**：`(:+ 1 2 3)` => 6；
  `(:Concat "a" "b" "c")` => `"abc"`，bare `(Concat "a" "b" "c")` 同样 => `"abc"`（拼接全部）。
- **未绑定名会报错。** 引用未定义的名字（非 host fn、未在任何 env 绑定、非注册扩展）抛
  `Unbound name: X`，链头、嵌套参数、函数体、`if`/`foreach` 分支、顶层裸词皆然，不再静默
  返回 `null` 或末操作数。
- **两套真值不一致**：条件/逻辑用 `IsTruthy`（`0`、`""` 为真），`ToBoolean` 用 JS
  `Boolean()`（`0`、`""` 为假）。
- **IO 默认静默**：不 `setIoHost` 就没有输出。
- **`Writeln`/`WriteLine`/`Write` 返回 `null`**；要透传值用 `console`。
- **host 函数遮蔽用户绑定**：别给 `var`/`fn` 起内建同名。
- **`append` 对数组返回新长度**（number），不是数组本身。
- **`ToInt`/`ToFloat` 失败返回 `NaN`**（JSON 序列化显示为 `null`）。

---

## 引用出处

- live host 函数注册表（31 个）：`packages/runtime/lib/RuntimeInterpreter/RuntimeInterpreter.ts:671-721`
- `CreateRuntime` 调用 `RegisterDefault`：`packages/runtime/lib/RuntimeInterpreter/RuntimeInterpreter.ts:38-42`
- `registerHostFunction` / `callHostFunction` 等 bridge API：`packages/runtime/lib/RuntimeInterpreter/RuntimeState.ts:875-898`
- Word callable 解析先查 host 函数表：`packages/runtime/lib/RuntimeInterpreter/RuntimeInterpreter.ts:728-733`、`2190-2232`
- `IsTruthy` 语义：`packages/runtime/lib/RuntimeInterpreter/RuntimeInterpreter.ts:3124-3129`
- 按 arity 前看取参（变长差异根源）：`packages/runtime/lib/RuntimeInterpreter/RuntimeInterpreter.ts:2108-2126`
- 默认 ioHost 为空对象：`packages/runtime/lib/RuntimeInterpreter/RuntimeState.ts:194`
- `callHostObjectMethod`：`packages/runtime/lib/RuntimeInterpreter/RuntimeState.ts:900-913`
- 后缀 `:HostCall` / `:HostApply` 与前缀形式：`packages/runtime/__tests__/Case/RuntimeInterpreterHostBridge.test.ts:15-31`
- 属性/下标宿主访问：`packages/runtime/__tests__/Case/RuntimeInterpreterHostProperty.test.ts:6-21`
- 内建 Array/Map 方法注册：`packages/runtime/lib/RuntimeInterpreter/RuntimeState.ts:1150-1169`
- dead code（旧机制，勿用）：`packages/runtime/lib/HostSupport/HostFunctions.ts:8-34`
