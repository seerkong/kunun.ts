# 第 7 章 函数与对象

本章讲解 kunun 运行期（untyped）的函数与对象语法：lambda、具名函数、元数变体与多参应用、对象脚本（`class` 里的 `method` / `prop` / `field` / `new`），以及 host 对象桥接（`HostCall` / `HostApply` 及 legacy 别名 `js_call` / `js_apply`）与 host property 访问。

本章只记录**运行期 untyped** 写法。带类型签名的函数（如 `(fn #f |!Int x -> Int| :[ ... ])`）属于类型系统章，本章只在相关处给出指引链接 —— 见 [第 8 章 类型系统](./09-type-system.md)。

本章用 **Kon** 语法书写：`()` = knot（链/调用），`[]` = vector（数组字面量），`{}` = map（映射字面量）。容器元素之间**只用空白分隔**，逗号 `,` 不是分隔符（写 `[1, 2]` 会因逗号被当作 unquote 运算符而解析失败，Kon profile 不接受逗号作分隔，空白分隔即可）；`,` 在 kunun 里被保留作 unquote 运算符（`,expr` / `,@` / `,%`），与分隔无关。

前置概念（链 / knot / PN-RPN / `:[ ... ]` 块 / 参数表 `:|...|`）见 [第 5 章 表达式与求值模型](./05-evaluation-model.md)。host 函数标准库清单见 [第 6 章 内建与标准库](./08-host-stdlib.md)。

> 本章所有代码示例均已用 `RuntimeInterpreter.EvalBlockSourceSync` / `EvalBlockSourceWithRuntimeSync`（Kon）实际跑通；多数对应 `packages/runtime/__tests__/Case/RuntimeInterpreter{FunctionScript,FunctionVariants,ObjectScript,HostProperty,HostBridge}.test.ts` 中的 passing test。

---

## 7.1 lambda（匿名函数）

**用途**：定义一个无名的可调用值，存进变量或直接作为参数传递（高阶函数）。

**精确语法形式**：

```
(fn PARAMTABLE :[ BODY ])
```

- 不带 `#name`，即为匿名 lambda。
- `PARAMTABLE` 两种等价写法：`:|a b|` 或 `|a b|`（带不带前导 `:` 都行）。空参数表：`:||` 或 `||`。
- `BODY` 是块 `:[ ... ]`，值为最后一个表达式；可用 `(:return v)` 提前返回。
- 参数名只是裸词，**不加 `#`**（`#` 只用于函数/类/字段/方法/属性的 NAME）。

源码出处：`fn`/`func` 走 `EvaluateFunctionDefinition`，缺少 Name 时产生匿名 lambda —— `packages/runtime/lib/RuntimeInterpreter/RuntimeInterpreter.ts:2421`。

**语义**：求值 `(fn ...)` 得到一个 lambda 值。它对定义处的环境形成**闭包**（见 7.6）。把它绑定到变量后，通过 `(:f arg ...)` 前缀调用，或 arity-1 时用 `(arg :f)` 中缀调用（见 7.4）—— 无论前缀位还是中缀位，调用都带 `:`。

**可运行示例**：

```kon
(var f (fn || :[ 42 ]))
(:f)
```
求值结果：`42`。

```kon
(var g (fn |x| :[ (x 1 :+) ]))
(:g 5)
```
求值结果：`6`。

```kon
(var h (fn :|x y| :[ (x y :+) ]))
(:h 3 4)
```
求值结果：`7`（`:|...|` 与 `|...|` 等价）。

**常见错误 / 陷阱**：

- lambda 必须先绑定到变量（或作为参数传入）才能调用；`(fn |x| :[...])` 本身只是一个值，光写它不会被调用。
- 按约定参数名用**裸词**、不加 `#`（`#` 仅用于函数/类/字段/方法/属性的 NAME）。`(fn |#x| ...)` 虽然运行期不报错（`#x` 被静默接受、行为不明确），但应避免；写成 `(fn |x| ...)`。

---

## 7.2 具名函数 `fn` / `func`

**用途**：定义一个有名字的函数，既绑定到当前环境，又可被前缀 / 中缀调用。

**精确语法形式**：

```
(fn #NAME PARAMTABLE :[ BODY ])
```

- `fn` 与 `func` 完全等价（`packages/runtime/lib/RuntimeInterpreter/RuntimeInterpreter.ts:1182`）。
- 名字用 `#` 前缀：`#addTwo`。
- 其余（参数表、块、return）与 lambda 相同。

**语义**：定义时把 NAME 绑定到环境，**同时返回该 lambda 值**（`EvaluateFunctionDefinition`，`RuntimeInterpreter.ts:2421`）。之后可：
- 前缀调用：`(:NAME args)` 或 `(NAME args)`；
- 中缀调用：`(arg :NAME)`（见 7.4）。

**可运行示例**（对应 `Function/FunctionCall.kon`，`RuntimeInterpreterFunctionScript.test.ts:13`，结果 7）：

```kon
(fn #addTwo :|value| :[
  (value 2 :+)
])
(:addTwo 3)
(5 :addTwo)
```
块的值是最后一个表达式 `(5 :addTwo)` = `7`；其中 `(:addTwo 3)` = `5`，`(5 :addTwo)` = `7`。

提前返回（对应 `Function/Return.kon`，`RuntimeInterpreterFunctionScript.test.ts:19`，结果 1）：

```kon
(fn #early :|| :[
  (:return 1)
  2
])
(:early)
```
求值结果：`1`（`(:return 1)` 直接返回，后面的 `2` 不执行）。

**常见错误 / 陷阱**：

- NAME 必须带 `#`：`(fn addTwo ...)` 不会被识别为具名定义。
- **不要用 host 函数同名命名你的函数**。调用位置上 host 函数表优先于环境查找，会**屏蔽**你的同名定义（`RuntimeInterpreter.ts:728`）。例如下面这段里，用户定义的 `Concat` 在调用时被内建 `Concat` 屏蔽：

  ```kon
  (fn #Concat :|a b| :[ 999 ])
  (:Concat "x" "y")
  ```
  求值结果：`"xy"`（内建 `Concat` 胜出，**不是** `999`）。避免用 `+ - * / Concat Length ToUpper ToInt and or` 等内建名（清单见 [第 6 章](./08-host-stdlib.md)）。

---

## 7.3 元数变体与多参应用

**用途**：定义并调用 0、1、2、多参函数；理解链如何根据 arity 拉取实参。

**精确语法形式 / 语义**：

- 函数 arity 来自参数表的参数个数（lambda 取 `params.length`）。
- **前缀调用** `(:NAME a b c ...)` 或 `(NAME a b c ...)`：链按 arity 向后拉取**恰好** arity 个实参（`GetCallableArity` / 链求值 lookahead，`RuntimeInterpreter.ts:2212`、`2108`）。
- **中缀调用**：把实参放在 `:NAME` 之前 —— arity-1 写 `(a :NAME)`，arity-2 写 `(a b :NAME)`，arity-4 写 `(a b c d :NAME)`。

**可运行示例**：

零参（两种空参数表都可）：
```kon
(fn #const42 || :[ 42 ])
(:const42)
```
求值结果：`42`。`:||` 同样可用。

二参，前缀与中缀两种调用都行：
```kon
(fn #add :|a b| :[ (a b :+) ])
(:add 3 4)
```
求值结果：`7`。中缀 `(3 4 :add)` 同样得 `7`。

四参多参应用（对应 `Function/MultiArgFunction.kon`，`RuntimeInterpreterFunctionVariants.test.ts:13`，结果 10）：
```kon
(fn #add4 :|a b c d| :[
  ((a b :+) (c d :+) :+)
])
(1 2 3 4 :add4)
```
中缀 `(1 2 3 4 :add4)` = `10`；前缀 `(:add4 1 2 3 4)` 同样得 `10`。

**常见错误 / 陷阱**：

- **拼错名字：冒号前缀会抛错，裸词是静默 no-op**。两者走不同的求值路径，行为相反：
  - **冒号前缀** `(:addd 1 2)` 解析为 PrefixCall，对未解析名字会**抛错** `Callable not found: addd`（`RuntimeInterpreter.ts:2187` / `2242`）—— typo 会被立刻发现。
  - **裸词** `(addd 1 2)`（不带冒号）没有 CallType，落到链求值的 push 分支被**静默丢弃**（`RuntimeInterpreter.ts:2146`），整条链返回最后一个链值 `2`，掩盖了 typo。所以**优先用冒号前缀** `(:NAME ...)` 调用，让拼写错误显式报错。
- **少给参数不会报错、也不是 no-op —— 函数会真的被调用，缺失实参按 `undefined` 处理**。例如 `(:add4 1 2 3)`（少一个）实测返回 `6`（缺失的 `d` 当 `undefined` 参与算术 → `(1+2)+(3+0)`），`(:add4 1 2)` = `3`，`(:add4)` = `0`。务必对齐 arity，别指望少参数会被链拦下。
- 这与 host 函数 `+`/`*` 的 reduce 变长**不同**：`(:+ 1 2 3 4)` 因 `+` 在前缀操作符位用 reduce 实现而得 `10`，但**用户 fn 没有变长语义**，参数个数必须等于 arity。变长行为细节见 [第 6 章](./08-host-stdlib.md)。

---

## 7.4 调用形式：前缀 / 中缀 与高阶函数

**用途**：把函数当值传递、组合调用。

**精确语法形式**：

- 前缀：`(:fnName arg...)`（调用一律带 `:`）。
- 中缀（RPN）：`(arg :fnName)`（arity-1），`(a b :fnName)`（arity-2），依此类推。
- 高阶：函数是普通值，可作实参传入，在函数体内用 `(:f x)` 调用（`f` 是持有 lambda 的形参，调用同样带 `:`）。

**语义**：具名函数定义返回 lambda 值，因此可直接把它（或匿名 lambda）作为实参传给另一个函数。

**可运行示例**：

传一个具名函数的 lambda：
```kon
(fn #apply :|f x| :[ (:f x) ])
(fn #inc :|n| :[ (n 1 :+) ])
(:apply inc 41)
```
求值结果：`42`。

直接传匿名 lambda：
```kon
(fn #apply :|f x| :[ (:f x) ])
(:apply (fn |n| :[ (n 10 :*) ]) 4)
```
求值结果：`40`。

**常见错误 / 陷阱**：

- 中缀调用要求实参在 `:fnName` **左侧**且数量正好等于 arity；少写会让缺失实参按 `undefined` 进入函数（不报错也不是 no-op，详见 7.3 的 arity 陷阱），多写则会让链拉取错位。

---

## 7.5 对象脚本：`class` 与 `method` / `prop` / `field` / `new`

**用途**：定义对象类型（带字段、构造器、方法、计算属性），实例化并访问。

**精确语法形式**：

```
(class #ClassName :[
  (field #name)              // 无默认值字段
  (field #age = 0)           // 带默认值字段（= 写在 metadata 里）
  (new |p1 p2 ...| :[ ... ]) // 构造器，self 自动绑定
  (method #m |params| :[ ... ])   // 方法，self 自动绑定
  (prop #p get :[ ... ] set |v| :[ ... ])  // 计算属性，get/set 可选其一或都有
])
```

要点（`EvaluateClassDefinition`，`RuntimeInterpreter.ts:2575`）：

- `field` / `new` / `method` / `prop` **只在 `class` body 内部被识别**为成员；它们不是独立的顶层形式。
- 字段默认值用 `(field #age = 0)`，`= 0` 解析进该 knot 的 metadata（`AddClassField`，`RuntimeInterpreter.ts:2659`）。
- **构造器自动按字段声明顺序，把构造器的位置实参赋给字段**（`BuildConstructorBody`，`RuntimeInterpreter.ts:2637`）：第 i 个声明的 field 收到第 i 个构造器实参。`new` body 内可再做额外赋值/逻辑；body 结束后自动返回 `self`。
- `method` 的参数表里 `|-> RetType|` 是返回类型标注（属类型系统范畴，运行期忽略，见 [第 8 章](./09-type-system.md)）；`self` 在方法体内自动可用。
- `prop` 用字面关键字 `get` / `set` 标记子句；`set` 的参数表给入参命名（默认名 `value`），见 `ParseClassProperty`（`RuntimeInterpreter.ts:2677`），setter 实际绑定为 `set_NAME` lambda（`RuntimeInterpreter.ts:2627`）。

实例化与访问：

- 实例化：`(ClassName ~new args...)`（`~new` 调用构造器）。
- 字段 / 属性读：`(obj.:field)` / `(obj.:propName)`（属性读触发 `get_NAME`）。
- 字段 / 属性写：`(set obj.:field value)` / `(set obj.:propName value)`（属性写触发 `set_NAME`）。
- 方法调用：`(obj ~method args...)`。

**可运行示例**：

最简类 + 实例化（对应 `Object/SimpleClass.kon`，`RuntimeInterpreterObjectScript.test.ts:13`，结果是一个 `RuntimeObject`）：
```kon
(class #Empty :[ (new || :[]) ])
(var obj (Empty ~new))
obj
```

字段赋值（对应 `Object/AssignField.kon`，`RuntimeInterpreterObjectScript.test.ts:19`，结果 `"Bob"`）：
```kon
(class #Person
  :[
    (field #name)
    (new |personName| :[ (set self.:name personName) ])
  ])
(var person (Person ~new "Alice"))
(set person.:name "Bob")
(person.:name)
```

方法 + 计算属性（对应 `Object/MethodAndProperty.kon`，`RuntimeInterpreterObjectScript.test.ts:25`，结果 `"Alice"`）：
```kon
(class #Greeter
  :[
    (field #name)
    (new |greetName| :[ (set self.:name greetName) ])
    (method #greet |-> String| :[ (self.:name) ])
    (prop #label get :[ (self ~greet) ])
  ])
(var greeter (Greeter ~new "Alice"))
(greeter.:label)
```
读 `(greeter.:label)` 触发 `get_label`，其 body 调用方法 `(self ~greet)`，返回 `"Alice"`。

默认字段 + 完整类（对应 `Object/DefaultAndCompleteClass.kon`，`RuntimeInterpreterObjectScript.test.ts:31`，结果 `["John Doe", 30, 0]`）：
```kon
(class #Person
  :[
    (field #firstName)
    (field #lastName)
    (field #age = 0)
    (field #score = 0)
    (new |personAge personFirstName personLastName| :[
      (set self.:firstName personFirstName)
      (set self.:lastName personLastName)
      (set self.:age personAge)
    ])
    (method #getFullName |-> String| :[
      ((self.:firstName) " " :Concat (self.:lastName) :Concat)
    ])
    (prop #fullName
      get :[ (self ~getFullName) ]
    )
  ])
(var person (Person ~new 30 "John" "Doe"))
[(person.:fullName) (person.:age) (person.:score)]
```
`score` 从未在构造器里赋值，保留默认 `0`。

带参数的方法调用：
```kon
(class #Calc :[
  (new || :[])
  (method #add |a b| :[ (a b :+) ])
])
(var c (Calc ~new))
(c ~add 3 4)
```
求值结果：`7`。

可读可写属性（getter + setter，setter 入参自定义名）：
```kon
(class #Temp :[
  (field #c = 0)
  (new || :[])
  (prop #celsius get :[ (self.:c) ] set |deg| :[ (set self.:c deg) ])
])
(var t (Temp ~new))
(set t.:celsius 25)
(t.:celsius)
```
求值结果：`25`（`(set t.:celsius 25)` 触发 `set_celsius`，body 把 `deg` 写进字段 `c`）。

方法内调用另一个方法（`self ~method`）：
```kon
(class #Acc :[
  (field #total = 0)
  (new || :[])
  (method #add |n| :[ (set self.:total ((self.:total) n :+)) ])
  (method #addTwice |n| :[ (self ~add n) (self ~add n) (self.:total) ])
])
(var acc (Acc ~new))
(acc ~addTwice 5)
```
求值结果：`10`。

嵌套字段链赋值（对应 `RuntimeInterpreterObjectScript.test.ts:37`，结果 `"Shanghai"`）：
```kon
(class #Address :[ (field #city) (new |city| :[ (set self.:city city) ]) ])
(class #Person :[ (field #address) (new |address| :[ (set self.:address address) ]) ])
(var address (Address ~new "Suzhou"))
(var person (Person ~new address))
(set person.:address.:city "Shanghai")
(person.:address.:city)
```

**常见错误 / 陷阱**：

- **实例化用 `~new`，不是 `(Class args)`**。`~new` 是 InstanceCall，会跑构造器；直接 `(Person "Alice")` 不会构造对象。
- **字段访问是 `.:field`（前缀点冒号）**，不是 `.field`。方法调用是 `~method`（波浪号），不要混用。
- **字段默认值用 `=`**：`(field #age = 0)`；写成 `(field #age 0)` 不会被当默认值。
- 构造器**按字段声明顺序自动赋值位置实参**。如果字段声明顺序与你期望的实参顺序不一致，会赋错字段。需要精确控制时，在 `new` body 内显式 `(set self.:x ...)`（如 `DefaultAndCompleteClass` 的构造器所示）。
- `prop` 的 `get` / `set` 是字面关键字，位置敏感；setter 必须带参数表 `set |v| :[...]` 给入参命名。
- 方法体里访问对象自身字段要走 `self`：`(self.:name)`，不能直接写裸字段名。

---

## 7.6 闭包与跨求值复用

**用途**：函数捕获定义环境中的变量；在同一 runtime 内跨多次求值共享变量与函数。

**语义**：函数对定义处环境形成闭包（`RuntimeInterpreter.ts:2421`）。用 `RuntimeInterpreter.CreateRuntime()` 创建的 runtime 跨 `EvalBlockSourceWithRuntimeSync` 调用保留绑定。

**可运行示例**（对应 `RuntimeInterpreterFunctionVariants.test.ts:17`）：

```kon
(var base 5)
(fn #addBase :|value| :[
  (base value :+)
])
(3 :addBase)
```
在同一 runtime 内按上述顺序求值，`(3 :addBase)` = `8`（`addBase` 捕获了外层 `base`）。

handler 风格 —— 把宿主注入的 `resume` 当首个实参（对应 `Function/HandlerCallReady.kon`，`RuntimeInterpreterFunctionScript.test.ts:25`，结果 13；`resume` 由宿主 `runtime.define('resume', v => v + 10)` 注入）：

```kon
(fn #AddHandler :|resume val1 val2| :[
  (:resume (val1 val2 :+))
])
(:AddHandler resume 1 2)
```
`(val1 val2 :+)` = `3`，`(:resume 3)` = `13`。

**常见错误 / 陷阱**：

- 单次 `EvalBlockSourceSync(source)` 内的所有表达式共享同一个 runtime；但**不同的** `EvalBlockSourceSync` 调用各自新建 runtime，绑定不会跨调用保留。要复用须显式 `CreateRuntime()` + `EvalBlockSourceWithRuntimeSync`。

---

## 7.7 host 对象桥接：`HostCall` / `HostApply`（及 legacy `js_call` / `js_apply`）

**用途**：在 kunun 脚本里调用宿主（TypeScript/JS）对象上的方法 —— 宿主对象通过 `runtime.define('name', jsObject)` 注入。

**精确语法形式**：

`HostCall`（逐个传参，arity 3：target、methodName、单个 arg）：
- 前缀：`(:HostCall target "method" arg)`
- 后缀（call-type 标记）：`(target "method" arg :HostCall)`

`HostApply`（传一个参数数组，arity 3：target、methodName、argsArray）：
- 前缀：`(:HostApply target "method" [a b])`
- 后缀：`(target "method" [a b] :HostApply)`

legacy 别名（前缀关键字形式，等价于上面）：
- `(js_call target "method" arg...)`
- `(js_apply target "method" [a b])`

源码出处：`HostCall`/`HostApply` 是注册的 host 函数（`RuntimeInterpreter.ts:682-683`）；`js_call`/`js_apply` 是 dispatch switch 里的关键字形式，展开为同样的 `Runtime_JsCallAlias`/`Runtime_JsApplyAlias`（`RuntimeInterpreter.ts:1227`、`1657`、`600`）。底层都走 `runtime.callHostObjectMethod(target, name, args)`，其语义为 `target[name].apply(target, args)`（`RuntimeState.ts:900`）。

**语义**：在宿主对象上以 `methodName` 调用真实 JS 方法。返回值就是该 JS 方法的返回值。`HostCall` 把单个 arg 包成 `[arg]`；`HostApply` 直接用你给的数组。

**可运行示例**（宿主侧 `runtime.define('target', [])` 注入一个 JS 数组；对应 `RuntimeInterpreterHostBridge.test.ts:15`、`24`）：

后缀 `HostCall`（调用数组的 `push`）：
```kon
(target "push" 1 :HostCall)
```
返回 `1`（`Array.push` 返回新长度），且 `target` 变为 `[1]`。

后缀 `HostApply`（用参数数组）：
```kon
(target "push" [10 11] :HostApply)
```
返回 `2`（依次 push 10、11，最终长度 2），`target` 变为 `[10, 11]`。

前缀 `HostCall`：
```kon
(:HostCall target "push" 7)
```
返回 `1`，`target` 变为 `[7]`。

legacy `js_call` / `js_apply`（同样针对注入的 `target`）：
```kon
(js_call target "push" 5)
```
返回 `1`，`target` 变为 `[5]`。

```kon
(js_apply target "push" [8 9])
```
返回 `2`，`target` 变为 `[8, 9]`。

**常见错误 / 陷阱**：

- `target` 必须是宿主注入的真实 JS 对象（经 `runtime.define`）；纯 kunun `class` 实例的方法应该用 `~method` 调用，不要用 `HostCall`。
- 方法名是**字符串字面量**：`"push"`，不是 `~push`。
- 方法不存在会抛 `Host method not found: <name>`；对 null target 调用会抛 `Cannot call method ... on null target`（`RuntimeState.ts:900`）。
- 返回值是底层 JS 方法的返回值 —— 例如 `Array.push` 返回新长度（数字），不是数组本身。

---

## 7.8 host property 访问

**用途**：读写宿主注入的 JS 对象的属性、读数组长度与下标。

**精确语法形式 / 语义**：

- 读属性：`(obj.:key)` —— StaticIndex。
- 写属性：`(set obj.:key value)`。
- 数组长度：`(arr.:length)`（读属性）。
- 数组下标：`(arr::index)` —— Subscript。

读为 null-safe（不存在返回 null），写到 null target 会抛错（`RuntimeState.ts:931`）。

**可运行示例**（宿主侧 `runtime.define('model', { text: 'abc' })` 与 `runtime.define('items', [1, 2, 3])`；对应 `RuntimeInterpreterHostProperty.test.ts:6`、`15`）：

```kon
(model.:text)
```
求值结果：`"abc"`。

```kon
(set model.:text "def")
(model.:text)
```
两步后 `(model.:text)` = `"def"`。

```kon
(items.:length)
```
求值结果：`3`。

```kon
(items::1)
```
求值结果：`2`（下标 1 的元素）。

**常见错误 / 陷阱**：

- 属性键写法是 `.:key`（点冒号前缀），不是 `.key` 也不是 `["key"]`。
- 下标用 `::index`（双冒号）；`(arr.:length)` 的 `.:length` 是读 `length` 属性。注意区分这两种点冒号用途。
- 这些都作用在**宿主注入**的对象上；它与 `class` 实例的 `.:field` 语法形态一致（同一套 StaticIndex/Subscript 机制），但宿主对象的属性集由 JS 侧决定。

---

## 与其它章节的关系

- 表达式 / 链 / PN-RPN / 块 / 参数表基础：[第 5 章 表达式与求值模型](./05-evaluation-model.md)。
- host 函数标准库完整清单（算术 / 比较 / 逻辑 / 字符串 / IO / 数组）：[第 6 章 内建与标准库](./08-host-stdlib.md)。
- 带类型签名的函数 `(fn #f |!T x -> R| :[...])`、`method` 的 `|-> RetType|` 标注、泛型等：[第 8 章 类型系统](./09-type-system.md)。
