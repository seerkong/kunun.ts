# 内置形式：绑定、控制流与运算符

本章逐一记录 kunun 核心语言（Kon surface syntax）里的内置形式：变量绑定、控制流、运算符、字段/下标访问、链式赋值，以及一批 legacy 语法糖。读者目标是据此正确编写 kon 代码，因此每个形式都给出**精确语法 + 语义 + 可运行示例 + 陷阱**，并标注它用 **PN**（前缀，prefix notation）还是 **RPN**（后缀/中缀，reverse polish / infix）。

> 语法固定为 **Kon**：圆括号 `( )` = knot（链），方括号 `[ ]` = vector（数组字面量），花括号 `{ }` = map（映射字面量）。容器（vector / map / 参数表）的元素之间**只用空白分隔**——逗号 `,` 不是分隔符，写 `[1, 2]` 会抛 `Comma separators are not allowed in this syntax profile`。逗号被保留作 unquote 运算符（`,expr` / `,@` unquote-splice / `,%` unquote-map），这正是它不能当分隔符的原因，详见 [./03-kon-data-format.md](./03-kon-data-format.md) §6。
>
> **调用约定（贯穿全章）**：调用一个**函数**（用户定义 `fn`、host 函数、运算符、方法）时，无论前缀位还是中缀位都给它加 `:` 前缀——前缀 `(:+ 1 2)`、中缀 `(1 2 :+)`。而**关键字/宏**（`var`/`set`/`if`/`else`/`cond`/`for`/`foreach`/`in`/`do`/`while`/`fn`/`func`/`main` 等）不加 `:`。`:break`/`:continue`/`:return` 保留 `:`。注意：keyword-arg 标记（`:{ ` / `:[ ` / `:|...|`）、字段访问 `obj.:field`、下标 `arr::i`、符号 `#name` 都不是函数调用，绝不能误加 `:`。逻辑运算符是特例，见第 12 节。

## 0. 基础模型：chain、knot、PN 与 RPN

一个 `( ... )` 是一条 **chain**，由空白分隔的若干 **knot** 组成。运行时把值压入操作数栈，chain 的值是**最后一个**求值结果。`RuntimeInterpreter.ts:1937,3206`

**定序由 `:`-前缀的词的位置决定**（这是判断 PN 还是 RPN 的唯一依据）：

- **PN（前缀）**：操作符/函数名在最前，`(:+ 1 2)` / `(:addTwo 3)`。
- **RPN（中缀/后缀）**：操作符/函数名在最后，`(1 2 :+)` / `(5 :addTwo)`。
- **链式 RPN**：`(1 :+ 1 :+ 1)` => `3`（已验证，对应 `Source/ChainFrameTop.kon`）。

**block（语句块）** 写作 `:[ ... ]`，语句以空白/换行分隔，块的值 = 最后一个表达式。空块 `:[]` 求值为 `null`。`RuntimeInterpreter.ts:1113`

```
(do :[ (var x 1) (x 2 :+) ])   // => 3
(do :[])                       // => null
```

### `;` —— 参数列表终止符兼 apply 糖

分号 `;` 在 chain 里有**双重角色**：

1. **终止当前调用的参数列表**（`KnotCallParamEndToken`，`KonSyntaxConfig.ts:160`）——告诉解析器“这个调用的参数到此为止”，后续 knot 不再被卷进这次调用的参数。
2. **apply 糖**——把头词解析成一个 `Operator` knot（`KnKnot.ts:15`），运行时遇到它会把操作数栈顶的值取出、**立即应用**该函数（走 `ApplyCallable`，`RuntimeInterpreter.ts:1976-1977`），其效果等同于把这个词当运算符作用在前面已压栈的操作数上。

因此末尾带 `;` 的形式与“裸头词放最后”行为一致——两者解析出的 CallType 都是 `Operator`（已实测：`(3 4 +;)` 与 `(3 4 +)` 的尾 knot CallType 相同，求值结果也相同）：

```
(3 4 +;)        // => 7（结构性 ; 终止参数列表并把 + 立即应用到栈上的 3、4）
(3 4 +)         // => 7（同一行为，裸头词在最后）
(3 4 :+)        // => 7（带冒号的 infix 写法，等价结果）
```

> 从求值模型角度看：chain 把值依次压入操作数栈，`+;` 这种 `Operator` knot 弹出栈上操作数、应用函数、把结果压回——栈顶即 chain 的值。栈/帧的底层机制见 [./05-evaluation-model.md](./05-evaluation-model.md)。

> 验证手段（下文示例均用此 harness 跑通）：
> ```
> cd packages/runtime && bun -e 'import {RuntimeInterpreter} from "kunun-runtime"; console.log(JSON.stringify(RuntimeInterpreter.EvalBlockSourceSync(SRC)))'
> ```
> `EvalBlockSourceSync` 接收一段 Kon 源码（多表达式），返回最后一个表达式的值。

参见 [05 链与求值模型](05-evaluation-model.md)了解 chain/knot/帧的底层细节。

---

## 1. var — 声明局部绑定（PN）

**用途**：在当前局部环境声明并初始化一个变量。

**精确语法**：`(var NAME VALUE)`。`NAME` 是裸词（不带 `#`、不带 `:`），`VALUE` 是任意表达式。

**语义**：先求值 `VALUE`，再用 `runtime.define` 在**当前局部环境**声明 `NAME`，返回 `VALUE`。`RuntimeInterpreter.ts:1534,2870`

**示例**（已验证）：
```
(var x 7)                      // => 7（声明并返回值）
(var a [1 2 3])                // 绑定数组字面量
(var o {name = "Alice"})       // 绑定 map 字面量
```

**陷阱**：`var` 是声明；同名再 `var` 是重新声明，要修改已有变量用 `set`（见下）。`var` 返回所赋的值——当它是块的最后一个表达式时，这个值就是块的值。

---

## 2. set — 赋值到变量 / 字段 / 下标（PN）

**用途**：给**已存在**的位置（变量、对象字段、数组下标）赋值。

**精确语法**：`(set PLACE... VALUE)`——中间节点描述位置，最后一个节点是新值，返回新值。`RuntimeInterpreter.ts:1544,2878`

**形式**：
- 变量：`(set x 9)`（走 setVar，要求 `x` 已存在）。
- 对象字段：`(set obj.:name "Bob")`。
- 嵌套字段链：`(set p.:addr.:city "Shanghai")`。
- 数组下标：`(set arr::i v)`（下标位置也由 place chain 处理）。

**示例**（已验证）：
```
(var x 7) (set x 9) x                                     // => 9
(var o {name = "Alice"}) (set o.:name "Bob") (o.:name)    // => "Bob"
(var p {addr = {city = "X"}}) (set p.:addr.:city "Shanghai") (p.:addr.:city)  // => "Shanghai"
```

**陷阱**：`set` 走的是赋值（setVar），不是声明。对一个从未 `var` 过的变量用 `set`，语义上是赋值而非声明——先用 `var` 声明更安全。

---

## 3. if / else — 条件分支（PN，关键字 `else` 必需）

**用途**：单/双分支条件。

**精确语法**：`(if COND :[ THEN ] else :[ ELSE ])`。`else` 子句可选，由**字面关键字 `else`** 识别（它必须是紧跟在 then-block 之后的那个 knot）。`RuntimeInterpreter.ts:1674`

**语义**：求值 `COND`，按 truthiness（见第 11 节）选 then 或 else block。无 `else` 且条件为假时返回 `null`。

**示例**（已验证）：
```
(if (:gt 2 1) :[ 99 ])              // => 99
(if (:gt 1 2) :[ 1 ])              // => null（无 else，条件假）
(if (:gt 1 2) :[ 1 ] else :[ 2 ]) // => 2
```

资源文件 `ControlFlow/IfElse.kon`（`RuntimeInterpreterControlFlow.test.ts:14` 验证）：
```
(if (:gt 5 3) :[
  (set true_branch_visited true)
] else :[
  (set true_branch_visited false)
])
```

**陷阱**：
- 条件常用比较运算符；比较一律用具名 host 函数 `==`/`gt`/`lt`/`>=`/`<=`（见第 11 节）。`<`/`>` **不是比较运算符**——它们是有序 map（`$<…>`、`:<…>`）和泛型（`Name<…>`）的定界符，裸用 `<` 会抛 `Invalid token`。
- `else` 是位置关键字，不能换成别的词。

> 没有独立的 `else if`。多分支用 `cond`（下节）。

---

## 4. cond — 多分支条件（PN，关键字 `else` 兜底）

**用途**：多路条件，等价于 if/else-if 链。

**精确语法**：`(cond COND1 :[ BODY1 ] COND2 :[ BODY2 ] ... else :[ FALLBACK ])`。按顺序扫描，第一个 truthy 条件的 body 即为值；`else` 是兜底。`RuntimeInterpreter.ts:1694,2445`

**语义**：无任何条件命中且无 `else` 时返回 `null`。

**示例**（已验证，对应 `ControlFlow/Cond.kon`，`RuntimeInterpreterControlFlow.test.ts:17` => `3`）：
```
(cond (:gt 1 2) :[ 1 ] (:gt 3 2) :[ 2 ] else :[ 3 ])   // => 2（第二个条件命中）
(cond (:gt 1 2) :[ 1 ] (:gt 1 3) :[ 2 ])              // => null（无命中、无 else）
```

> 注：`Cond.kon` 第一段是 `(:gt 1 2)` 假、`(:gt 3 2)` 真 => `2`；第二段两个条件都假 => 走 `else` => `3`。该测试取**最后一个表达式**的值，故整体 `EvalBlockSourceSync` => `3`。

---

## 5. for — C 风格循环（PN，init/condition/step）

**用途**：带初始化、条件、步进的计数循环。

**精确语法**：`(for :{VAR = INIT} (CONDITION) (STEP) :[ BODY ])`
- `:{i = 0}` 是挂在 knot 上的 **init Conf**（配置 map，可写多个初始化）。`RuntimeInterpreter.ts:1747,2480`
- 第二个节点 = 循环条件；第三个节点的 Core = 步进、Body = 循环体。`RuntimeInterpreter.ts:1743`

**语义**：循环跑在自己名为 `for` 的局部环境里。支持 `(:break)` / `(:continue)`。

**示例 A —— 累加**（已验证）：
```
(var s 0)
(for :{i = 0} (i 3 :lt) (:++ i) :[ (:+= s i) ])
s                              // => 3（0+1+2）
```

**示例 B —— break/continue**（已验证，对应 `ControlFlow/ForBreakContinue.kon`，`RuntimeInterpreterControlFlow.test.ts:29` => `[1, 3]`）：
```
(var a [1 2 3])
(var breakResult 0)
(for :{i = 0} (i (:ArrayLength a) :lt) (:++ i) :[
  (var x (a::i))
  (if (:== x 2) :[
    (:break)
  ])
  (set breakResult x)
])
(var continueResult 0)
(for :{i = 0} (i (:ArrayLength a) :lt) (:++ i) :[
  (var x (a::i))
  (if (:== x 2) :[
    (:continue)
  ])
  (set continueResult x)
])
[breakResult continueResult]   // => [1, 3]
```
解释：break 段在 `x == 2` 时跳出，`breakResult` 停在 `1`；continue 段在 `x == 2` 时跳过赋值，`continueResult` 最终被 `3` 覆盖。

**陷阱**：
- init 用 `:{ }`（config map），条件和步进各自是一个 `( )` knot，循环体是 `:[ ]`——四者位置固定。
- 条件里别用 `<`：它不是比较符（是有序 map / 泛型的定界符，裸用抛 `Invalid token`），比较请用 `:lt`/`:gt`/`:==`。

---

## 6. foreach ... in — 遍历数组（PN，关键字 `in` 必需）

**用途**：逐项遍历一个数组。

**精确语法**：`(foreach ITEM in ITEMS :[ BODY ])`。`ITEM` 是裸词（循环变量），**字面关键字 `in`** 必须出现在 item 与集合之间。`RuntimeInterpreter.ts:1720`

**语义**：循环变量每轮重新绑定（不存在则 define，否则 setVar）。空数组时 body 不执行。支持 `(:break)` / `(:continue)`。返回最后一轮 body 的值（空数组返回 `null`）。

**示例 A —— 累加**（已验证，对应 `ControlFlow/Foreach.kon`，`RuntimeInterpreterControlFlow.test.ts:21` => `9`）：
```
(var a [1 2 3])
(var b 0)
(foreach x in a :[ (set b x) ])      // b 最终 = 3
(var c 0)
(foreach x in [1 2 3] :[ (set c (c x :+)) ])  // c = 6
(b c :+)                             // => 9
```

**示例 B —— 空数组**（已验证）：
```
(var c 0)
(foreach x in [] :[ (set c 99) ])
c                                    // => 0（body 从未执行）
```

**示例 C —— break/continue**（已验证，对应 `ControlFlow/ForeachBreakContinue.kon`，`RuntimeInterpreterControlFlow.test.ts:25` => `[1, 3]`）：
```
(var a [1 2 3])
(var out [])
(foreach x in a :[
  (if (:== x 2) :[ (:continue) ])
  (out x :append)
])
out                                  // => [1, 3]
```

**陷阱**：`in` 是位置关键字，不能省略也不能替换。集合既可是变量也可是字面量 `[ ... ]`。

---

## 7. do / main — 执行块或单个形式（PN）

**用途**：把一段块（或单个 form）作为一个表达式求值；`main` 是 `do` 的别名。

**精确语法**：
- `(do :[ ... ])`——执行 body block。
- `(do FORM)`——执行紧跟的单个 form（无 block）。
- `(main :[ ... ])`——与 `do` 完全等价。`RuntimeInterpreter.ts:1188`

**语义**：返回 block / form 的最后一个值。

**示例**（已验证）：
```
(do :[ (var x 1) (x 2 :+) ])   // => 3
(do (1 2 :+))                  // => 3（单 form，无 block）
(main :[ (var x 1) (x 4 :+) ]) // => 5
(do :[])                       // => null（空块）
```

> `main` 是 legacy 前缀别名，新代码用 `do` 即可；二者行为完全一致。

---

## 8. break / continue / return — 突变控制（PN）

**用途**：跳出/跳过循环、从函数提前返回。

**精确语法**：作为前缀特殊形式调用——`(:break)` / `(:continue)` / `(:return VALUE)`（裸词 `(break)` 等亦可）。`RuntimeInterpreter.ts:1239`

**语义**：
- `break` / `continue`：恢复**循环**捕获的对应 continuation，无返回值。只能在 `for` / `foreach` 内使用。
- `return VALUE`：从**最近的 fn** 返回 `VALUE`；`(:return)` 无参返回 `null`。`RuntimeInterpreter.ts:1478`

**示例**（已验证）：
```
(fn #early :|| :[ (:return 1) 2 ]) (:early)   // => 1（return 后的 2 不执行）
```

**陷阱**（均已验证，会抛错）：
- `(:break)` 在循环外 => `break continuation not found`。
- `(:continue)` 在循环外 => `continue continuation not found`。
- `(:return 5)` 在函数外（顶层）=> `return continuation not found`。

这些形式必须有对应的封闭上下文（for/foreach 提供 break/continue，fn 提供 return）。

---

## 9. while —— 不是内置形式（重要陷阱）

**kunun 没有 `while` 循环。** `while` 不在形式分发表里（`RuntimeInterpreter.ts:1172-1255` 的 switch 不含它）。

写 `(while COND :[ BODY ])` **不会循环**：`while` 解析成一个未定义/无效的头词，循环体最多被当作值求值一次，循环变量永远不更新。

**示例**（已验证）：
```
(var i 0) (while (i 3 :lt) :[ (:++ i) ]) i   // => 0（i 从未变化）
```

**要迭代，用 `for` 或 `foreach`**（第 5、6 节）。

---

## 10. 算术运算符：`+` `-` `*` `/`（PN 和 RPN 都行；多参仅 `+`/`*`）

注册为 host 函数，arity 均为 2。`RuntimeInterpreter.ts:671-674`

| 运算符 | arity | PN 多参行为 | 示例（已验证） |
|--------|-------|-------------|----------------|
| `+` | 2（reduce-sum） | 前缀可接 >2 个参数 | `(:+ 1 2)` => `3`；`(:+ 1 2 3 4)` => `10` |
| `*` | 2（reduce-product） | 前缀可接 >2 个参数 | `(:* 2 3 4)` => `24` |
| `-` | 2（严格二元） | 多余参数被**静默丢弃** | `(:- 10 3)` => `7`；`(:- 10 3 2)` => `7` |
| `/` | 2（严格二元） | 多余参数被**静默丢弃** | `(:/ 20 4)` => `5`；`(:/ 100 5 2)` => `20` |

**RPN（中缀）形式**全部可用，二元：
```
(1 2 :+)         // => 3
(1 :+ 1 :+ 1)    // => 3（链式中缀）
(10 3 :-)        // => 7
```

**陷阱**：只有 `+` 和 `*` 真正接受多于 2 个参数（host fn 用 rest+reduce，前缀链会把后续 knot 都拉进来）。`-` 和 `/` 是严格二元，第 3 个及以后的参数被**无声丢弃**，不报错——`(:- 10 3 2)` 得 `7` 而非 `5`，`(:/ 100 5 2)` 得 `20` 而非 `10`。

---

## 11. 比较运算符：`==` `gt` `lt` `>=` `<=`（PN 和 RPN 都行）

注册为 host 函数。`RuntimeInterpreter.ts:675-695`

| 运算符 | 含义 | PN 示例 | RPN 示例 |
|--------|------|---------|----------|
| `==` | 严格相等（`===`） | `(:== 2 2)` => `true` | `(2 2 :==)` => `true` |
| `gt` | 大于（`>`） | `(:gt 5 3)` => `true` | `(5 3 :gt)` => `true` |
| `lt` | 小于（`<`） | `(:lt 3 5)` => `true` | `(3 5 :lt)` => `true` |
| `>=` | 大于等于 | `(:>= 5 5)` => `true` | `(5 5 :>=)` => `true` |
| `<=` | 小于等于 | `(:<= 4 5)` => `true` | `(4 5 :<=)` => `true` |

**关键陷阱**：
- 比较运算符名**恰好**是 `==`、`gt`、`lt`、`>=`、`<=`。**没有** `!=`、`eq`。
- `(:eq 1 1)` 抛 `Callable not found: eq`（已验证）。
- **`<` 和 `>` 不是比较运算符**：它们是有序 map（`$<…>`、`:<…>`）和泛型（`Name<…>`）的定界符。裸用 `<` 会抛 `Invalid token`，绝不能拿它做小于/大于比较——比较一律用 `lt` / `gt`。本章所有比较示例都用 `:lt` / `:gt` / `:==`，从不用裸 `<` / `>`。

### Truthiness（条件真值，重要陷阱）

`IsTruthy`（`RuntimeInterpreter.ts:3124`）规定：**只有** `false`、`null`/`undefined`、以及类型为 Unknown/Undefined 的 Kon 节点是 falsy。**其它一切都是 truthy，包括 `0` 和 `""`、`[]`、`{}`。**

**示例**（已验证）：
```
(if 0 :[ 1 ] else :[ 2 ])      // => 1（0 是 truthy！）
(if "" :[ 1 ] else :[ 2 ])     // => 1（空串是 truthy）
(if null :[ 1 ] else :[ 2 ])   // => 2（null 字面量是 falsy）
```

这与 JS/多数语言不同。判断数值零要用显式比较 `(:== x 0)`，不能依赖 `0` 的真值。字面量 `null` 解析为一个 Unknown 节点（不是 JS 的 `null`），它在条件中是 falsy。

---

## 12. 逻辑运算符：`and` / `or` / `or_else`（infix / bare / colon 前缀三种形式结果一致）

三个逻辑运算符。`RuntimeInterpreter.ts:2004-2079`

**逻辑运算符按设计也是函数**，可以像别的函数一样写 `:` 前缀 `(:and a b)`，也可写 infix `(a b :and)` 或 bare 前缀 `(and a b)`——**三种形式结果一致**：

- **infix `(a b :and)` / `(a b :or)`：**（已验证）
  - `(true false :and)` => `false`、`(true true :or)` => `true`。
- **colon 前缀 `(:and a b)` / `(:or a b)`：**（已验证）
  - `(:and true true)` => `true`、`(:or false true)` => `true`。
- **bare 前缀 `(and a b)` / `(or a b)`：**（已验证）
  - `(and true false)` => `false`、`(or false true)` => `true`。

这与 [./08-host-stdlib.md](./08-host-stdlib.md) §4 一致（该章从 host 函数角度记录同一组 `and`/`or`/`or_else`，用的就是 bare 前缀 `(and a b)`）。

**推荐用法是中缀/RPN（也是 `Logical/LogicalOperators.kon` 测试覆盖的形式）**（已验证，`RuntimeInterpreterLogical.test.ts:13`）：
```
(true false :and)              // => false
(true true :and)               // => true
(false true :or)               // => true
(false false :or)              // => false
(null "fallback" :or_else)     // => "fallback"
("value" "fallback" :or_else)  // => "value"
```

`or_else`：左操作数 truthy 则返回左，否则返回右。`RuntimeInterpreter.ts:2078`。注意 truthiness 规则——`0` 是 truthy：
```
(0 "fb" :or_else)              // => 0（0 truthy，返回左）
(false "fb" :or_else)          // => "fb"
```

### 短路：取决于形态，不是普适保证

短路**不是** `and`/`or` 的普适性质，而是取决于右操作数**怎么写**：

- **infix `(left right :and)` / `(:or)`：短路。** 左值注定结果时**不求值** RHS（已验证，对应 `Logical/ShortCircuit.kon`，`RuntimeInterpreterLogical.test.ts:24`）。
- **bare 前缀 + 括号右操作数（如 `(false and (set t 1))`）：不短路，RHS 被 eager 求值。** 括号子表达式作为链值先行求值，无论左值真假——`(false and (:console "B"))` 里的 `(:console "B")` 会照常执行。

实测对照：
```
// infix —— RHS 不执行（touched 未被改动）
(var touched 0)
(false :and (set touched 1))           // and 左为 false，右侧短路不执行
(true :or (set touched 2))             // or 左为 true，右侧短路不执行
touched                                // => 0

// bare 前缀 + 括号 RHS —— RHS 被 eager 求值（touched 被改动），但结果仍正确
(var t 0)
(false and (set t 1))                  // => false（结果对），但 (set t 1) 已执行
t                                      // => 1
```

> 推论：**不能**用 bare 前缀 + 括号 `(and p (:use p))` / `(or p (:fallback))` 来防御副作用——括号子表达式必定被 eager 求值。要真正短路，用 infix `(p (:use p) :and)`。08-host-stdlib.md §4 还记录了第三种形态（bare 前缀 + 裸 lookahead 操作数也会短路），见 [./08-host-stdlib.md](./08-host-stdlib.md)。

> 算术、比较、逻辑运算符的前缀（含带冒号）与中缀形式结果都一致；逻辑运算符的短路与否只取决于右操作数的形态（见上），与带不带冒号无关。

**没有 `not`**：`(:not true)` 抛 `Callable not found: not`（已验证）。要取反请用比较运算符表达（如把 `(:gt a b)` 改成 `(:<= a b)`），或与 `false` 做 `==`。

---

## 13. 字段访问：`obj.:field`（StaticIndex）

**用途**：读/写对象或 map 的命名字段。

**精确语法**：`obj.:field` 是一个 StaticIndex knot。`RuntimeInterpreter.ts:1378`

**读**（在 chain 里直接求值）：
```
(var o {name = "Alice"}) (o.:name)   // => "Alice"
```

**写有两种方式**（均已验证）：
```
// (a) 用 set（PN）
(var o {name = "Alice"}) (set o.:name "Bob") (o.:name)    // => "Bob"
// (b) 用链式赋值糖 = （RPN，见第 15 节）
(var o {name = "Alice"}) (o.:name = "Bob") (o.:name)      // => "Bob"
```

> 通过 `class` 的 `prop` 声明的属性 getter/setter 也通过同样的 `.:` 语法触发（查 `get_NAME`/`set_NAME`）。`RuntimeInterpreter.ts:2785`。class 细节见 [07 函数与对象](07-functions-objects.md)。

---

## 14. 下标与长度：`arr::i` / `arr.:i` / `arr.:length`

**用途**：按数字索引访问数组元素、取长度。

**两种下标写法都可用**（已验证）：
```
(var a [10 20 30]) (a::1)    // => 20（双冒号下标，KnotCallType.Subscript）
(var a [10 20 30]) (a.:1)    // => 20（.: 接数字也作下标——与字段访问的语法重叠）
```
`RuntimeInterpreter.ts:1389`

**长度**（已验证，两种都行）：
```
(var a [1 2 3]) (a.:length)      // => 3（属性读）
(var a [1 2 3]) (:ArrayLength a) // => 3（host 函数，PN）
```

**陷阱**：`.:` 接数字时是下标、接名字时是字段，二者语法形式相同——读数组元素用 `::` 更清晰、意图明确。下标赋值用 `:=`（见下节），与字段赋值的 `=` 不同。

---

## 15. 链式赋值与自更新运算符（RPN / 特殊形式）

这一组是 legacy 语法糖，但**仍是当前语言行为**（被 `RuntimeInterpreterLegacyCompatibility.test.ts:14` 覆盖，对应 `Legacy/ChainAssignmentAndSugar.kon`）。

### 两个赋值运算符（注意区分）

| 运算符 | 用途 | 形式 | 示例（已验证） |
|--------|------|------|----------------|
| `=` | 字段/map key 赋值 | RPN：`(place.:field = value)` | `(o.:name = "Bob")` |
| `:=` | 数组下标赋值 | RPN：`(arr::i := value)` | `(arr::0 := 9)` |

`RuntimeInterpreter.ts:1378-1398`

```
(var o {name = "Alice"}) (o.:name = "Bob") (o.:name)   // => "Bob"
(var a [1 2]) (a::0 := 9) (a::0)                        // => 9
```

> 陷阱：用错运算符会 mis-parse。字段/map 用 `=`，下标用 `:=`。
> 另注：map 字面量 `{k = v}` 里的 `=` 是**数据语法**（key-value），与链式赋值的 `=` 是两回事——`RuntimeInterpreterLegacyCompatibility.test.ts:111` 专门覆盖这一点。

### 自更新运算符 `+= -= *= /=`（PN，特殊形式）

形式 `(OP var amount)`，去糖为 `(var = (var OP amount))`，返回更新后的值。`RuntimeInterpreter.ts:1586`

```
(var count 1) (:+= count 4) count   // => 5
(var c 10) (:-= c 3) c              // => 7
(var c 5) (:*= c 4) c               // => 20
(var c 20) (:/= c 4) c              // => 5
```

### 自增/自减 `++ --`（PN，特殊形式，返回新值）

```
(var c 5) (:++ c)   // => 6（返回自增后的值）
(var c 5) (:-- c)   // => 4
```
`RuntimeInterpreter.ts:2508`。`++`/`--`/自更新运算符（PN 特殊形式 `(:++ var)`/`(:-- var)`）返回**更新后的值**——当它们是块末表达式时这个值即块的值。注意只有 PN 形式生效；中缀形态（如 `(c :++)`、`(c 4 :+=)`）当前不会改动变量。

### 综合示例（改自资源文件 `ChainAssignmentAndSugar.kon`，已验证 => `["Bob", 9, 4]`）

```
(var obj {name = "Alice"})
(obj.:name = "Bob")
(var arr [1 2])
(arr::0 := 9)
(var count 1)
(:+= count 4)
(:-- count)
[(obj.:name) (arr::0) count]      // => ["Bob", 9, 4]
```

---

## 16. Legacy 语法糖：`func` / `main` 前缀，中缀 `def_to` / `set_to` / `save_operands`

这些是兼容老代码的别名/中缀糖，仍可用，但新代码优先用对应的现代形式。

### 前缀别名

| Legacy | 等价现代形式 | 说明 |
|--------|--------------|------|
| `func` | `fn` | 命名函数定义，完全等价。`RuntimeInterpreter.ts:1182` |
| `main` | `do` | 执行块/单 form，完全等价。`RuntimeInterpreter.ts:1188` |

```
(func #addTwo :|value| :[ (value 2 :+) ]) (:addTwo 3)   // => 5（func == fn）
(func #addTwo :|value| :[ (value 2 :+) ]) (5 :addTwo)   // => 7（中缀调用）
(main :[ (var x 1) (x 4 :+) ])                          // => 5（main == do）
```

> `fn`/`func` 与函数定义的完整语义见 [07 函数与对象](07-functions-objects.md)。参数表 `:|a b|` 与 `|a b|` 两种写法等价。

### 中缀赋值糖：`def_to` / `set_to`（RPN）

形式 `(VALUE :OP NAME)`，返回 `VALUE`。`RuntimeInterpreter.ts:1287,1499`

| 运算符 | 语义 | 等价 |
|--------|------|------|
| `def_to` | **声明**局部变量 `NAME` 并赋 `VALUE` | 类似 `(var NAME VALUE)` |
| `set_to` | **赋值**给已存在的 `NAME` | 类似 `(set NAME VALUE)` |

```
(5 :def_to x) x              // => 5（def_to 声明局部）
(var y 0) (9 :set_to y) y    // => 9（set_to 赋值已存在变量）
```

### 中缀 `save_operands`（RPN）

`(a b :save_operands)` 把当前帧的操作数收集成一个数组。`RuntimeInterpreter.ts:1291`

```
(1 2 :save_operands)   // => [1, 2]
```

> 这是底层/legacy 工具，日常构造数组优先用字面量 `[1 2]`。

---

## 17. PN / RPN 速查表

| 形式 | 记法 | 备注 |
|------|------|------|
| `var` `set` | PN | `(var x v)` / `(set place v)` |
| `if` `cond` | PN | 条件、关键字 `else` 在前缀位置 |
| `for` `foreach` | PN | 关键字 `in`（foreach）必需 |
| `do` `main` | PN | 块/单 form |
| `break` `continue` `return` | PN | `(:break)` 等 |
| `+ - * /` | **PN 和 RPN 都行** | `(:+ 1 2)` / `(1 2 :+)`；多参仅 `+`/`*`；`-`/`/` 丢弃多余参数 |
| `== gt lt >= <=` | **PN 和 RPN 都行** | `(:== a b)` / `(a b :==)`；无 `!= eq`；`< >` 不是比较符（是有序 map / 泛型定界符，裸用抛 `Invalid token`） |
| `and or or_else` | **infix / bare / colon 前缀结果一致** | `(a b :and)` / `(and a b)` / `(:and a b)` 等价；无 `not` |
| `obj.:field`（读） | —（索引语法） | StaticIndex |
| `arr::i` / `arr.:i`（读） | —（下标语法） | Subscript |
| `=`（字段/map 赋值） | RPN | `(place.:f = v)`（赋值标记，不加 `:`） |
| `:=`（下标赋值） | RPN | `(arr::i := v)`（赋值标记，不加 `:`） |
| `+= -= *= /=` | PN | `(:+= var amount)`，返回新值 |
| `++ --` | PN | `(:++ var)`，返回新值 |
| `def_to` `set_to` `save_operands` | RPN | legacy 中缀糖 |
| `func` `main` | PN | legacy 前缀别名（= `fn` / `do`） |

---

## 18. 陷阱总清单

1. **逻辑运算符三种形式结果一致**：infix `(true false :and)` => `false`、`(true true :or)` => `true`；bare 前缀 `(and true false)` => `false`、`(or false true)` => `true`；colon 前缀 `(:and true true)` => `true`、`(:or false true)` => `true`——三者等价。短路只在 infix（及 bare 前缀 + 裸操作数）发生；bare 前缀 + 括号 RHS（如 `(false and (:console "B"))`）会 eager 求值 RHS。算术/比较运算符同样前缀中缀都对。
2. **没有 `!= not eq`；`< >` 不是比较运算符**：比较只有 `== gt lt >= <=`。`(:eq 1 1)`/`(:not true)` 抛 `Callable not found`。`<` 和 `>` 是有序 map（`$<…>`、`:<…>`）和泛型（`Name<…>`）的定界符，裸用 `<` 抛 `Invalid token`，绝不能拿来做大小比较——用 `gt`/`lt`。
3. **`while` 不存在且静默无效**：`(while cond :[body])` 不迭代，求值为条件值，循环变量不更新。用 `for`/`foreach`。
4. **`0` 和 `""` 是 truthy**：仅 `false`/`null`/Unknown 节点为 falsy。`(0 "fb" :or_else)` => `0`。判断数值零要 `(:== x 0)`。
5. **`-` 和 `/` 严格二元，多余参数静默丢弃**：`(:- 10 3 2)` => `7`，`(:/ 100 5 2)` => `20`，不报错。只有 `+`/`*` 真正多参。
6. **必需的位置关键字 `else` / `in`**：`if`/`cond` 靠字面 `else` 识别兜底；`foreach` 必须有 `in`。它们不是普通词，不能省略或替换。
7. **break/continue/return 需要封闭上下文**：循环外 `(:break)`/`(:continue)`、函数外 `(:return v)` 都抛 `... continuation not found`。
8. **两个赋值运算符 `=`（字段/map）vs `:=`（下标）**：`(o.:f = v)` 对字段，`(a::i := v)` 对下标。map 字面量 `{k = v}` 里的 `=` 是数据语法，与链式赋值无关。
9. **`null` 字面量是 Unknown 节点，不是 JS null**：它在条件中 falsy，但与 JS `null` 不严格相等，`(:== x null)` 行为可能不如预期。
10. **`var`/`set` 返回所赋值；`++`/`--`/自更新返回更新后的值**：当它们是块末表达式时，这个值就是块的值。

---

## 引用出处

- 形式分发 switch（var/set/fn/func/do/main/if/cond/foreach/for/`++`/`--`/`+=`/`-=`/`*=`/`/=`/break/continue/return）：`packages/runtime/lib/RuntimeInterpreter/RuntimeInterpreter.ts:1172-1255`
- `do`/`main` 别名：`RuntimeInterpreter.ts:1188-1195`
- 算术 host fn（`+`/`*` reduce，`-`/`/` 二元）：`RuntimeInterpreter.ts:671-674`
- 比较 host fn（`gt`/`lt`/`==`/`>=`/`<=`；无 `<`/`>`/`!=`/`not`/`eq`）：`RuntimeInterpreter.ts:675-695`
- 逻辑运算符 `and`/`or`/`or_else`（`or_else` 左 truthy 取左）：`RuntimeInterpreter.ts:2004-2079`
- IsTruthy（仅 `false`/null/Unknown 为 falsy）：`RuntimeInterpreter.ts:3124-3129`
- `if` 靠字面 `else` 识别：`RuntimeInterpreter.ts:1674-1692`
- `foreach` 要求 `in`：`RuntimeInterpreter.ts:1720-1739`
- `for` 用 `:{i=0}` init、条件、步进+体：`RuntimeInterpreter.ts:1741-1766`
- break/continue/return 恢复捕获的 continuation：`RuntimeInterpreter.ts:1239-1253,1478-1489`
- `var`/`def_to`/`set_to`：`RuntimeInterpreter.ts:1287-1294,1499,1534-1542,2870-2876`
- `save_operands`：`RuntimeInterpreter.ts:1291-1294`
- `set` 赋值变量/字段/下标：`RuntimeInterpreter.ts:1544-1579,2878-2910`
- 自更新 `++ -- += -= *= /=`：`RuntimeInterpreter.ts:1586-1626,2508`
- `func`/`fn` 别名：`RuntimeInterpreter.ts:1182-1187`
- `obj.:field`（StaticIndex）、`arr::i`/`arr.:i`（Subscript）、`=` Assignment、`:=` 下标赋值：`RuntimeInterpreter.ts:1378-1398`
- 属性 get/set 路由到 `get_NAME`/`set_NAME`：`RuntimeInterpreter.ts:2785-2854`
- 控制流资源文件：`packages/runtime/__tests__/Resource/RuntimeInterpreter/ControlFlow/{IfElse,Cond,Foreach,ForeachBreakContinue,ForBreakContinue}.kon`
- 逻辑资源文件：`packages/runtime/__tests__/Resource/RuntimeInterpreter/Logical/{LogicalOperators,ShortCircuit}.kon`
- 链式赋值/自更新资源文件：`packages/runtime/__tests__/Resource/RuntimeInterpreter/Legacy/ChainAssignmentAndSugar.kon`
- 测试用例：`packages/runtime/__tests__/Case/RuntimeInterpreter{ControlFlow,Logical,SourceLowering,LegacyCompatibility}.test.ts`（全部通过）
