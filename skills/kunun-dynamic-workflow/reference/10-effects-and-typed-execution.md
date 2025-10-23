# 类型系统（二）：类型化 effect、handler 与按需类型执行

本章承接[类型系统（一）](./09-type-system.md)（rows / classes / traits / generics）。这里讲两件事：

1. **类型化 effect 系统** —— 静态地把「函数会触发哪些副作用」编码进函数签名，并在编译期校验 `perform`、handler 覆盖与残余 effect。
2. **按需类型执行（opt-in typing）** —— 默认 `RuntimeInterpreter` 执行完全不做类型检查；类型检查 / 类型化运行时只在显式入口被触发。

> 语法按 **Kon** 讲：`()` = knot/chain，`[]` = vector，`{}` = map。
>
> 全部代码示例均已用本仓库的类型检查 harness 跑通（`RuntimeInterpreter.TypeCheckSource` / `EvaluateTypedBlockSync` / `KonTypedRuntimeContext`）。每个示例后给出验证结论与对应诊断码。

---

## 0. 心智模型与硬性前提

- 类型系统是从外部 C# 项目 `ExtensibleScopedRowType` 移植来的**可选静态层**，叠在不变的无类型运行时之上（`codument/behaviors/runtime-type-system.xml:111-124`）。
- **默认执行永远是无类型的。** `!Type` 前缀、`class`/`type`/`trait`/`fn` 声明体、`@inherits`/`@merge`、以及 `fn` 体内的 `perform`，只有走类型入口时才有意义；普通 `RuntimeInterpreter` 执行**无害地忽略它们**（声明照常绑定值，类型标注不生效），且**不会隐式安装类型化派发**（`runtime-type-system.xml:220-224`）。
- **但 `#(effect decl/row ...)` premodifier 不是被忽略，而是根本解析不了。** 这类 effect hash-paren premodifier 只能经类型入口（`TypeCheckSource` / `EvaluateTypedBlockSync` 等）处理；一旦走默认无类型 `Eval*` 路径，会在**解析期**直接抛 `null is not an object (evaluating 'this.AsPairKey(firstNode).Value')`（`packages/converter/lib/KnParserV1.ts:675`），而非静默跳过。所以本章所有 effect 示例都必须走类型入口；§9.2 那个唯一的默认无类型示例里刻意不含任何 `#(effect ...)` 标记。
- 类型检查器**只检查** `fn`、`class`、`trait` 三种顶层声明（`type` 声明只参与绑定，不单独跑表达式检查）。其判定入口是 `KonTypeChecker.CheckSource`（`packages/type-system/lib/KonTypeChecker.ts:63-70`）。
- effect 相关诊断码以 `KTC0xx`（检查器）/ `KTB09x`（绑定器）开头。本章给出的全是实跑得到的真实码与消息。

---

## 1. effect 声明：`#(effect decl #E)`

### 用途
声明一个 effect 的存在（它的「名字」），把它注册进类型系统的 effect registry。

### 精确语法形式
```
#(effect decl #E)
```
- 这是一个 **premodifier**（hash-paren 前置修饰符），写在某个声明节点之前。
- `decl` 之后必须是 `#E` 形式的 hash-word（effect 名）。
- 习惯上紧跟一个**同名的 `type` 声明**作为该 effect 的「操作集合」（见 §4）。它本身可以是空 body `:[]`，也可以装若干 `(op ...)`。

### 语义
- 绑定器读取**被修饰节点**的 `PreModifiers.Knots`，遇到 `effect` + `decl` 就 `GetOrCreateEffect(name)`（`packages/type-system/lib/KonTypeBinder.ts:397-414`）。
- 形式不对（缺 `#E`）会报 `KTB091: Effect declaration must use #(effect decl #Name).`。

### 可运行示例
```
#(effect decl #Console)
(type #Console
  :[
    (op #log |!String message -> Unit|)
  ])
```
*验证：* 与下文 §6 完整示例一起 `TypeCheckSource` → `success=true, diags=[]`。

### 陷阱
- `#(effect decl #E)` 与紧随的 `(type #E :[...])` 是**两个独立节点**：前者注册 effect 名，后者定义这个 effect 的操作行（一个 row）。effect 的「操作」是后者 row 里的 `op`/`method` 成员。
- premodifier 是挂在它**修饰的下一个节点**上的，不能孤立成行后再隔空生效——它必须紧贴被修饰节点（这里是那个 `type`）。

---

## 2. effect 行：`#(effect row :[ A B ])`

### 用途
给**函数 / 方法**标注一个 effect 行（effect row）：声明「这个函数体允许触发哪些 effect」。这是函数 effect 边界的来源。

### 精确语法形式
```
#(effect row :[ A B ])
(fn #f |...| :[ ... ])
```
- `row` 之后是一个 vector `:[ ... ]`，里面是 effect 名（用空白分隔，**不能用逗号** —— Kon 规则）。
- **必须紧贴下一个 `fn`/`method`**：它设置绑定器的 `pendingFunctionEffectRow`，由紧随的函数声明消费，函数绑定完成后该 pending 状态被清空（`KonTypeBinder.ts:415-417, 251, 294-298`）。

### 语义
- effect 行成为该函数签名的 `EffectRow`。函数体内通过 `perform` 触发的 effect，必须是该行的子集，否则报残余 effect 诊断（见 §5）。
- 在 **class/trait body 内**，`#(effect row :[ ... ])` 同样可以修饰一个 `method`，给该方法附上 effect 上下文（`EffectContext`），用于运行期同名方法的按 effect 选择（见 §8）。

### 可运行示例
```
#(effect decl #Console)
(type #Console :[ (op #log |!String m -> Unit|) ])

#(effect row :[ Console ])
(fn #noop |-> Unit| :[])
```
*验证：* `TypeCheckSource` → `success=true`。声明了 row 但不 `perform` 也是合法的（不强制使用）。

### 陷阱
- vector 里写 `:[ A, B ]` 会因为逗号被 Kon 解析器拒绝（解析期错误，不是类型错误）。正确写法：`:[ A B ]`。
- 它修饰**下一个声明**。如果 `#(effect row ...)` 后面不是 `fn`/`method`，pending 状态会在错误的地方被消费或清掉，行为不可预期 —— 永远让它紧贴目标函数。

---

## 3. handler 声明：`#(effect handler #h handles :[ E ])`

### 用途
把一个 `fn` 注册为某些 effect 的 handler。handler 用于在 `perform` 处的 effect 边界**消除（subtract）** 残余 effect。

### 精确语法形式
```
#(effect handler #h handles :[ E ])
(fn #hImpl |...| :[ ... ])
```
- `handler` 后是 handler 名 `#h`，随后是关键字 `handles`，再是一个 vector `:[ E ... ]` 列出它处理的 effect。
- **必须紧贴下一个 `fn`**（premodifier 规则）：它设置 `pendingHandler`，由紧随的函数绑定时登记成 `EffectHandlerBinding`（`KonTypeBinder.ts:418-419, 256-263, 428-439`）。
- handler 名 `#h` 与紧随 fn 的名字（`#hImpl`）**可以不同**；后续用 `%(effect handle #h)` 引用的是 handler 名 `#h`，不是 fn 名。

### 语义
- 缺 `handles` 关键字或缺 handler 名会报 `KTB092: Effect handler declaration must use #(effect handler #handlerName handles :[ ... ]).`。
- 登记后，handler 才能被 §5 的 postfix `%(effect handle #h)` 使用。

### 可运行示例
```
#(effect decl #Console)
(type #Console :[ (op #log |!String m -> Unit|) ])

#(effect handler #consoleHandler handles :[ Console ])
(fn #consoleHandlerImpl |-> Unit|
  :[])
```
*验证：* 见 §6 完整示例，`success=true`。

### 陷阱
- premodifier 必须紧贴 fn。把 handler 标记和实现 fn 之间插入别的声明会让登记失效。
- handler 名 vs 实现 fn 名容易混。引用 handler 时用的是 `#h`（handler 名）。

---

## 4. 操作签名：`(op #name |sig|)`

### 用途
在 effect 的 `type` row 里声明一个**操作（operation）**的输入/输出签名，供 `perform` 校验。

### 精确语法形式
```
(op #name |!T1 a !T2 b -> Out|)
```
- `op` 是 `method` 的**同义词**：绑定器对 `method` 和 `op` 走同一条 `BindMethodMember`（`KonTypeBinder.ts:276-279`）。写 `(method #name |sig|)` 等价。
- in/out 表 `|inputs -> outputs|`：输入是 `!Type name` 形式的参数，输出是裸类型名。
- 输出是一个**位置栈（stack）**；空输出 `|-> |`（即 `-> ` 后无内容）绑定为 `Never`（`KonTypeBinder.ts:316-318`）。`Unit`/`unit`/`Never`/`never` 都别名到 `Never`（`KonTypeChecker.ts:603-608`）。

### 语义
- effect type row 里的每个 `op`/`method` 成员就是该 effect 可被 `perform` 的操作。
- `perform #E.op` 通过 `E:::op`（source qualifier）找到这个成员，按它的签名校验参数与输出（见 §5）。

### 可运行示例
```
#(effect decl #Math)
(type #Math :[ (op #add |!Int a !Int b -> Int|) ])

#(effect row :[ Math ])
(fn #use |-> Int| :[ (perform #Math.add |1 2|) ])
```
*验证：* `TypeCheckSource` → `success=true`。把 `(op ...)` 换成 `(method ...)` 同样通过（method/op 同义）。

### 陷阱
- `op`/`method` 之外的 body 关键字在 row 里被**静默忽略**（`BindMember` 的 `default` 分支返回 `null`，`KonTypeBinder.ts:282-284`），不会报错也不生效。effect 操作只能用 `op`/`method`。
- 没有 in/out 表的 `op`/`method` 报 `KTB042`。

---

## 5. `perform` 校验与 postfix `%(effect handle #h)`

### 5.1 `perform` 表达式

#### 精确语法形式
```
(perform #E.op |arg1 arg2|)
```
- `#E.op`：effect 名 + 操作名。解析为 `E:::op`（effect 是 source qualifier，op 是成员名），绑定器从 `E` 这个 effect type row 里按名找 `op` 成员（`KonTypeChecker.ts:775-797`）。
- `|args|` 是参数元组；参数按位置展开成一个**实参类型栈**，与操作签名的参数栈逐位比较。

#### 校验语义（`KonTypeChecker.ts:436-459`）
1. **操作必须已声明**：找不到 `E.op` → `KTC070: Typed perform operation '<E.op>' is not declared.`
2. **参数栈必须匹配**：实参栈与签名参数栈类型/长度不符 → `KTC071: Perform '<E.op>' expects input stack '...' but received '...'.`
3. **输出栈**：`perform` 表达式的输出 = 操作签名的输出栈（注意：若它是函数体最后一个表达式，会被当作函数返回栈与声明返回类型比对，见陷阱）。
4. **残余 effect**：`perform` 贡献一个 `E` 到当前表达式的残余 effect 行。

#### 可运行（负例）示例
```
// KTC070 —— 操作未声明
#(effect decl #Console)
(type #Console :[ (op #log |!String m -> Unit|) ])
#(effect row :[ Console ])
(fn #bad |-> Unit| :[ (perform #Console.shout |"x"|) ])
```
*验证：* `success=false`，`KTC070: Typed perform operation 'Console.shout' is not declared.`

```
// KTC071 —— 参数栈类型不符（op 要 String，给了 Int）
#(effect decl #Console)
(type #Console :[ (op #log |!String m -> Unit|) ])
#(effect row :[ Console ])
(fn #bad |-> Unit| :[ (perform #Console.log |123|) ])
```
*验证：* `success=false`，`KTC071: Perform 'Console.log' expects input stack 'str' but received 'int'.`

### 5.2 残余 effect 与函数边界：`KTC050`

函数体内每个表达式的残余 effect 取并集；最后必须是函数声明 effect 行的子集，否则报：

```
// KTC050 —— 函数 perform 了 Console，但没声明 effect 行 → 残余泄漏
#(effect decl #Console)
(type #Console :[ (op #log |!String m -> Unit|) ])
(fn #unhandled |!String text -> Unit| :[ (perform #Console.log |text|) ])
```
*验证：* `success=false`，`KTC050: Function 'unhandled' has unhandled residual effects [Console].`（`KonTypeChecker.ts:107-109`）

effect 沿**调用**传播：调用一个带 effect 行的函数，会把它的 effect 并进调用者的残余行（`KonTypeChecker.ts:359, 430`）。调用者要么自己也声明对应的 effect 行，要么用 handler 消除它。

```
// 传播 OK —— 调用者声明了相同的行
#(effect decl #Console)
(type #Console :[ (op #log |!String m -> Unit|) ])
#(effect row :[ Console ])
(fn #emit |!String t -> Unit| :[ (perform #Console.log |t|) ])
#(effect row :[ Console ])
(fn #caller |!String t -> Unit| :[ (:emit t) ])
```
*验证：* `success=true`。若把 `#caller` 的 `#(effect row :[ Console ])` 去掉，则报 `KTC050: Function 'caller' has unhandled residual effects [Console].`

### 5.3 postfix `%(effect handle #h)`：减去 effect

#### 用途
在函数体内，用一个已登记的 handler **消除**到此为止累计的残余 effect。

#### 精确语法形式
```
(fn #main |...| :[
  (... perform 表达式 ...)
  %(effect handle #h)
])
```
- `%(...)` 是 **postfix call**（百分号前缀的尾随修饰），出现在函数体内作为独立 body 项。
- `effect handle #h` 中 `#h` 是 §3 登记的 **handler 名**。
- 检查器识别 postfix `effect` 节点（`KonTypeChecker.ts:653-655`），从中读出 handler 名，对残余 effect 行做 `Subtract(handler.HandledEffects)`（`KonTypeChecker.ts:91-96, 640-651`）。

#### 诊断
- **未知 handler** → `KTC060: Unknown effect handler '<name>'.`
- **handler 无效（不减少任何残余 effect）** → `KTC061: Effect handler '<name>' does not affect residual effects [...].`

#### 可运行（负例）示例
```
// KTC061 —— handler 处理的是 FileIO，但残余里只有 Console
#(effect decl #Console)
(type #Console :[ (op #log |!String m -> Unit|) ])
#(effect decl #FileIO)
(type #FileIO :[ (op #read |!String p -> String|) ])
#(effect handler #fileHandler handles :[ FileIO ])
(fn #fileHandlerImpl |-> Unit| :[])
#(effect row :[ Console ])
(fn #main |!String t -> Unit|
  :[
    (perform #Console.log |t|)
    %(effect handle #fileHandler)
  ])
```
*验证：* `success=false`，`KTC061: Effect handler 'fileHandler' does not affect residual effects [Console].`

```
// KTC060 —— 引用了不存在的 handler 名
#(effect decl #Console)
(type #Console :[ (op #log |!String m -> Unit|) ])
#(effect row :[ Console ])
(fn #main |!String t -> Unit|
  :[
    (perform #Console.log |t|)
    %(effect handle #ghost)
  ])
```
*验证：* `success=false`，`KTC060: Unknown effect handler 'ghost'.`

### 陷阱（重要）
- **「函数最后一个 body 表达式 = 返回栈」与 `perform` 输出的相互作用**。`perform #E.op` 的输出 = 该 op 的输出栈。如果一个返回 `Unit` 的函数把 `(perform #E.op ...)`（且 `op` 返回非 `Unit`，例如 `String`）放在**最后一行**，那行的输出栈会被当成函数返回栈，与声明的 `Unit` 不符，报 `KTC040: Return expression output stack 'str' is not compatible with expected 'never'.`。
  - 解决：让最后一行是 `Unit`-返回的表达式，或把返回类型改成匹配输出栈。多 `perform` 时把返回 `Unit` 的那个放最后。

---

## 6. 端到端可运行示例：声明 + perform + handler + handle

把 §1–§5 串起来的最小完整闭环：

```
#(effect decl #Console)
(type #Console
  :[
    (op #log |!String message -> Unit|)
  ])

#(effect row :[ Console ])
(fn #printMessage |!String text -> Unit|
  :[
    (perform #Console.log |text|)
  ])

#(effect handler #consoleHandler handles :[ Console ])
(fn #consoleHandlerImpl |-> Unit|
  :[])

(fn #main |-> Unit|
  :[
    (:printMessage "hi")
    %(effect handle #consoleHandler)
  ])
```
*验证：* `RuntimeInterpreter.TypeCheckSource(...)` → `success=true, diags=[]`。
读法：`printMessage` 声明并使用 `Console` 行；`main` 用 `(:printMessage ...)` 调用它（残余出现 `Console`），随后 `%(effect handle #consoleHandler)` 把 `Console` 减掉，`main` 的闭合边界（无声明行）干净。

多 effect / 多 handler 版本（注意把返回 `Unit` 的 `perform` 放最后，规避 §5 的 `KTC040` 陷阱）：

```
#(effect decl #Console)
(type #Console :[ (op #log |!String m -> Unit|) ])
#(effect decl #Audit)
(type #Audit :[ (op #record |!String m -> Unit|) ])

#(effect handler #consoleHandler handles :[ Console ])
(fn #consoleHandlerImpl |-> Unit| :[])
#(effect handler #auditHandler handles :[ Audit ])
(fn #auditHandlerImpl |-> Unit| :[])

#(effect row :[ Console Audit ])
(fn #emit |!String t -> Unit|
  :[
    (perform #Audit.record |t|)
    (perform #Console.log |t|)
  ])

(fn #main |!String t -> Unit|
  :[
    (:emit t)
    %(effect handle #consoleHandler)
    %(effect handle #auditHandler)
  ])
```
*验证：* `success=true, diags=[]`。两个 handler 各减一个 effect，`main` 边界清空。

---

## 7. 类型化代码块里的 effect 行（与 workflow DSL 共存）

effect 行可以挂在一个普通 `fn` 上，即使该函数体是 `ai_workflow`（动态 workflow DSL，见[动态 workflow 章节](../dynamic-workflow/) 或 [SKILL.md](../SKILL.md)）。检查器只校验 `fn` 的边界：函数声明的 effect 行覆盖体内 `perform` 的残余即可，`ai_workflow`/`ai_agent`/`foreach` 等 DSL 形被当作普通链调用（无类型贡献）。

仓库现成素材 `typed-examples/typed-loop-until-dry.kon`（`typed-examples/typed-loop-until-dry.kon:91-206`）演示了这种组合：

```
#(effect decl #WorkflowAgent)
(type #WorkflowAgent
  :[
    (op #findIssues |!AgentRequest<SweepRound IssueBatch> request -> AgentResult<IssueBatch>|)
  ])

#(effect decl #WorkflowCheckpoint)
(type #WorkflowCheckpoint
  :[
    (op #save |!String label -> Unit|)
  ])

#(effect decl #WorkflowLog)
(type #WorkflowLog
  :[
    (op #write |!String message -> Unit|)
  ])

#(effect row :[ WorkflowAgent WorkflowCheckpoint WorkflowLog ])
(fn #typedLoopUntilDry |!SweepScope scope -> SweepOutput|
  :[
    (ai_workflow #typedLoopUntilDry
      // ... DSL body, 内部用 (perform #WorkflowCheckpoint.save |"..."|)
      //     和 (perform #WorkflowLog.write |"..."|)
      :[ ... ])
  ])
```
*验证：* 对**整个文件** `RuntimeInterpreter.TypeCheckSource(readFileSync('typed-examples/typed-loop-until-dry.kon'))` → `success=true, diagCount=0`。
读法：`typedLoopUntilDry` 声明的 effect 行 `:[ WorkflowAgent WorkflowCheckpoint WorkflowLog ]` 覆盖了体内对 `WorkflowCheckpoint.save` 与 `WorkflowLog.write` 的 `perform`，因此闭合边界干净。这是「把 effect 类型当作 workflow 能力声明」的范式。

> 注意：该文件里的 `:effects = [...]`、`:input_type = ...` 等是 DSL 配置键（map/vector 形式的元数据），不是类型系统语法 —— 类型检查器并不消费它们，它们由 workflow 运行时解读。effect 的静态校验完全来自 `#(effect row ...)` premodifier + body 里的 `perform`。

---

## 8. effect 权限在 typed runtime 的运行期强制

类型化 effect 不只是静态的：**typed runtime**（`KonTypedRuntimeContext`）在运行期也强制 effect 权限。带 effect 行的方法，若在没有对应 effect scope 时被调用，会**在调用实现之前**抛错（`packages/type-system/lib/KonTypedRuntimeContext.ts:352-361`，对应 `runtime-type-system.xml:226-236`）。

### 精确机制
- 用 `(method #m |...|)` 配 `#(effect row :[ E ])` premodifier 声明带 effect 上下文的方法。
- 运行期通过 `context.PushEffectScope('E')` 推入一个 effect scope（返回带 `dispose()` 的句柄）。
- 调用方法时 `EnsureEffectsAllowed` 检查方法签名的 effect 行是否是当前活跃 scope 的子集；不是就抛 `Effect [E] required by '...' is not permitted in the current scope.`。

### 可运行示例（TypeScript 宿主侧驱动 typed runtime）
```ts
import 'kunun-type-system';
import { KonTypedRuntimeContext } from 'kunun-type-system';

const result = KonTypedRuntimeContext.BindSource(`
  #(effect decl #File)
  (type #File :[])

  (class #Reader :[
    #(effect row :[ File ])
    (method #read |-> String|)
  ])
`);

const reader = result.Context.CreateObject('Reader', {
  'Reader::read[File]': () => 'content',
});

// 无 scope：被拒绝
try {
  result.Context.Invoke(reader, 'read');
} catch (e) {
  // Effect [File] required by 'Reader::read' is not permitted in the current scope.
}

// 有 scope：放行
const scope = result.Context.PushEffectScope('File');
try {
  result.Context.Invoke(reader, 'read'); // => 'content'
} finally {
  scope.dispose();
}
```
*验证：* 实跑输出 —— 无 scope 抛 `Effect [File] required by 'Reader::read' is not permitted in the current scope.`，有 scope 返回 `'content'`。这正是 `TypeSystemTypedRuntimeContext.test.ts` 的 `rejects effectful typed method invocation outside a permitted effect scope` 用例。

### 同名方法按 effect scope 选择
同一个 class 可以声明**同名、不同 effect 上下文**的方法；运行期按活跃 scope 选出兼容实现，选不出唯一则报歧义（`KonTypedRuntimeContext.ts:314-334`，`runtime-type-system.xml:153-157`）。prototype 上对应 key 是 `Origin::name[EffectDisplay]`，例如 `'File::read[Sync]'` / `'File::read[Async]'`（见 `TypeSystemTypedRuntimeContext.test.ts` 的 `selects contextual method implementations through active effect scopes`）。

### 陷阱
- effect scope 是**栈式**的，必须配对 `dispose()`（建议 `try/finally`）。失衡会抛 `Effect scope imbalance detected.`（`KonTypedRuntimeContext.ts:206-211`）。
- prototype 的方法实现 key 必须按 `Origin::name`（或带 effect 上下文的 `Origin::name[Effect]`）命名，否则 `Invoke` 找不到实现。

---

## 9. 按需类型执行（opt-in）：三个入口

类型层完全是 opt-in 的。要先**注册 bridge**，再选一个类型入口。

### 9.1 注册 bridge
导入 `kunun-type-system`（或导入伞包 `kunun`）会触发 bridge 注册 —— 这是模块加载的副作用（`packages/type-system/lib/index.ts:13-16`，bridge 实现见 `RuntimeTypeSystemBridge.ts:7-13`）：

```ts
import 'kunun-type-system';            // 注册 bridge；之后类型入口才可用
import { RuntimeInterpreter, RuntimeTypeCheckError } from 'kunun-runtime';
```
没有注册 bridge 时，裸 `kunun-runtime` 的类型入口会抛「register type-system」指引错误；默认无类型执行不受影响（`codument/behaviors/workspace-packaging.xml:32-51`）。

### 9.2 入口一：默认执行 —— 不做类型检查
```ts
const runtime = RuntimeInterpreter.CreateRuntime();
runtime.define('touched', 0);
const r = RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, `
  (class #Person :[ (!String field #name) ])
  (fn #bad |!Person person -> Int| :[ (person.:name) ])
  (set touched 1)
`);
// #bad 的返回类型上是错的（field 是 String，声明返回 Int）——但默认无类型执行完全忽略。
// r === 1，touched === 1：类型错误被完全忽略，正常执行
```
*验证：* 实跑 `result=1, touched=1`。这对应 `runtime-type-system.xml:114-118` 的 `default-untyped`。

### 9.3 入口二：`typeCheck` 选项 —— 检查失败抛 `RuntimeTypeCheckError`
```ts
const runtime = RuntimeInterpreter.CreateRuntime();
runtime.define('touched', 0);
try {
  RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, `
    (class #Person :[ (!String field #name) ])
    (fn #bad |!Person person -> Int| :[ (person.:name) ])
    (set touched 1)
  `, { typeCheck: true });
} catch (e) {
  // e instanceof RuntimeTypeCheckError === true
  // runtime.lookup('touched') === 0：脚本体没有执行
}
```
*验证：* 实跑：抛 `RuntimeTypeCheckError`，且 `touched` 保持 `0` —— **检查失败时脚本体不执行**（`runtime-type-system.xml:119-123`）。

只想拿诊断、不执行，用 `RuntimeInterpreter.TypeCheckSource(src)`，返回 `{ Success, Diagnostics }`（每条诊断有 `.Code` 与 `.Message`）：
```ts
const res = RuntimeInterpreter.TypeCheckSource(`
  (class #Person :[ (!String field #name) ])
  (fn #bad |!Person person -> Int| :[ (person.:name) ])
`);
// res.Success === false
// res.Diagnostics 含一条 Code === 'KTC040'
```
*验证：* 实跑 `Success=false`，含 `KTC040`。本章 §5 的全部 effect 诊断都是这个 API 跑出来的。

### 9.4 入口三：`EvaluateTypedBlockSync` —— 跑完整类型化块
先类型检查，通过后用安装了 typed runtime context 的**完整 RuntimeInterpreter** 执行整个块（`runtime-type-system.xml:202-225`）。支持 class `~new`、`.:` 读写、`~method` 调用、`prop` get/set、`~as` 投影：

```ts
const result = RuntimeInterpreter.EvaluateTypedBlockSync(`
  (class #Person :[
    (!String field #name)
    (new |personName| :[ (set self.:name personName) ])
  ])
  (var person (Person ~new "Alice"))
  (set person.:name "Bob")
  (person.:name)
`);
// result === 'Bob'
```
*验证：* 实跑 `'Bob'`（`TypeSystemRuntimeIntegration.test.ts:66-81`）。

投影示例（`~as` 把对象限制到目标视图，方法按视图派发）：
```ts
const result = RuntimeInterpreter.EvaluateTypedBlockSync(`
  (class #A :[ (method #label |-> String| :[ "A" ]) (new || :[]) ])
  (class #B @inherits = [A] :[ (method #label |-> String| :[ "B" ]) (new || :[]) ])
  (var b (B ~new))
  ((b ~as A) ~label)
`);
// result === 'A'：投影到 A 视图，调到 A 的 label
```
*验证：* 实跑 `'A'`（`TypeSystemRuntimeIntegration.test.ts:83-102`）。

---

## 10. typed runtime 的边界与陷阱

`EvaluateTypedBlockSync` / `KonTypedRuntimeContext` 用一套**两层 Value 模型**，与默认无类型运行时不同。理解这些边界才能写出能跑的类型化块。

### 10.1 两层 Value 模型 + `KonTypedObject` 存储
- typed runtime 把每个值包成 `TypedRuntimeValue { kind, value, type? }`，`kind` ∈ `primitive | list | map | function | object | projected-object | any`（`KonTypedRuntimeContext.ts:24-53`）。这是「显式 value kind」层。
- 类型化对象本体是 `KonTypedObject`：按 origin 寻址的字段存储 `Fields`、真实基类的 `Parents`、可选投影 `Projection`（`KonTypedRuntimeContext.ts:74-84`）。字段读写要先初始化，未初始化读取抛 `Field '...' has not been initialized.`（`KonTypedRuntimeContext.ts:142-148`）。
- 还有更底层的一层「core」Value（`StringValue` / `AnyValue` / `FunctionValue` 等），通过 `context.Execution` / `ToTypedValue` / `FromTypedValue` 访问（见 `TypeSystemTypedRuntimeContext.test.ts:393-515`）。两层之间用 `WriteValueField`/`ReadValueField`（core Value 层）与 `WriteField`/`ReadField`（JS 值层）互转。

### 10.2 数组在 Kon 边界被拒
跨 **Kon 字段边界** 写入数组会被显式拒绝：`WriteKonField` / `ReadKonField` 对 `Array` 抛 `Kon value 'Array' cannot be converted to a typed runtime value.`（`KonTypedRuntimeContext.ts:190-192, 484-496`）。

```ts
import { KonTypedRuntimeContext } from 'kunun-type-system';
const bind = KonTypedRuntimeContext.BindSource(`(class #Box :[ (!Any field #item) ])`);
const box = bind.Context.CreateObject('Box');
bind.Context.WriteKonField(box, 'item', [1, 2]); // 抛 'Kon value 'Array' cannot be converted...'
```
*验证：* 实跑抛 `Kon value 'Array' cannot be converted to a typed runtime value.`

> 区别要点：用底层 `WriteField`（JS 值层）写数组是允许的，`WrapTypedRuntimeValue([1,2]).kind === 'list'`（`TypeSystemTypedRuntimeContext.test.ts:295-314`）。被拒的是 **Kon 节点边界**的 `WriteKonField`/`ReadKonField`。原始值（string/number/bool）和 object-like（普通对象）则正常 round-trip（`TypeSystemTypedRuntimeContext.test.ts:540-562`）。

### 10.3 字段默认值的 `Any` 回退
`(field #count = 10)`（无 `!Type` 前缀，带默认值）→ 绑定器登记字段类型为 `Any`，运行期 hydrate 默认值（`runtime-type-system.xml:215-219`）：
```ts
const result = RuntimeInterpreter.EvaluateTypedBlockSync(`
  (class #Counter :[ (field #count = 10) ])
  (var counter (Counter ~new))
  (counter.:count)
`);
// result === 10
```
*验证：* 实跑 `10`（`TypeSystemRuntimeIntegration.test.ts:178-189`）。

### 10.4 投影视图收窄字段/方法可见性
`~as` 投影后，只能访问目标视图暴露的成员。trait 投影外的方法在 typed block 里调用会抛 `... is not exposed by projected view <Trait>`（`TypeSystemRuntimeIntegration.test.ts:104-124`）。这与静态检查器的 `KTC010`/`KTC020` 投影诊断对应。

### 通用陷阱清单
- **类型检查只看 `fn`/`class`/`trait`。** 顶层裸表达式、`type` 声明体不会被单独跑表达式检查。要校验逻辑，把它放进一个 `fn`。
- **未知类型名不报错。** 绑定器对未注册类型名静默回退成 `TypeReferenceSymbol`（无诊断）。拼错类型名不会被类型检查器抓到，只会让后续成员访问意外失败。
- **row 默认 OPEN，用 `..never` 闭合。** 见[类型系统（一）](./09-type-system.md)；effect type row（`(type #E :[...])`）同理。
- **effect premodifier 必须紧贴下一个声明。** `#(effect decl/row/handler ...)` 都是挂在紧随节点上的 `PreModifiers`。
- **逗号在 Kon 里非法。** `:[ A B ]`、`|!Int a !Int b -> Int|` 全部用空白分隔。

---

## 速查表

| 语法形 | 作用 | 关键诊断 |
|---|---|---|
| `#(effect decl #E)` | 声明 effect 名 | `KTB091`（形式错） |
| `(type #E :[ (op #o |sig|) ])` | 定义 effect 的操作集合 | `KTB042`（op 缺签名） |
| `#(effect row :[ A B ])` + `fn` | 给函数标 effect 边界 | `KTC050`（残余泄漏） |
| `#(effect handler #h handles :[ E ])` + `fn` | 登记 handler | `KTB092`（形式错） |
| `(perform #E.op |args|)` | 触发 effect 操作 | `KTC070`（未声明）/`KTC071`（参数不符） |
| `%(effect handle #h)` | 减去 effect | `KTC060`（未知 handler）/`KTC061`（无效 handler） |
| `RuntimeInterpreter.TypeCheckSource(src)` | 只检查，返回诊断 | — |
| `EvalBlockSourceWithRuntimeSync(rt, src, {typeCheck:true})` | 检查失败抛 `RuntimeTypeCheckError`，不执行 | — |
| `EvaluateTypedBlockSync(src)` | 检查通过后跑完整类型化块 | — |
| `KonTypedRuntimeContext` + `PushEffectScope(E)` | 运行期 effect 权限强制 | 抛 `Effect [E] required ... not permitted` |

---

## 参考来源（源码出处）

- 类型检查器主体、`perform`/handler/残余 effect 校验：`packages/type-system/lib/KonTypeChecker.ts`（`CheckPerform` 436-459、`ApplyHandler` 640-651、`CheckFunction` 80-110、`IsPostfixEffectHandle`/`ReadHandlerPostfixes` 653-671、primitive 别名 601-623）
- effect premodifier 绑定（decl/row/handler）：`packages/type-system/lib/KonTypeBinder.ts:397-448`；`op==method` 同义 276-279；handler 登记 256-263
- typed runtime / effect scope 权限 / `KonTypedObject` / 数组拒绝：`packages/type-system/lib/KonTypedRuntimeContext.ts`（`EnsureEffectsAllowed` 352-361、`PushEffectScope` 194-213、`WrapTypedRuntimeValue` 32-53、`ToRuntimeValue`/`ToKonValue` 484-496）
- bridge 注册（模块加载副作用）：`packages/type-system/lib/index.ts:13-16`；`packages/type-system/lib/RuntimeTypeSystemBridge.ts:7-13`
- opt-in 入口与 typed block 用例：`packages/type-system/__tests__/Case/TypeSystemRuntimeIntegration.test.ts`
- typed runtime context 用例（effect scope、投影、数组拒绝、两层 Value）：`packages/type-system/__tests__/Case/TypeSystemTypedRuntimeContext.test.ts`
- 现成完整素材：`typed-examples/typed-loop-until-dry.kon`；effect 正/负例：`packages/type-system/__tests__/Resource/TypeSystem/CheckerValid.kon`、`CheckerInvalid.kon`
- 规范条款：`codument/behaviors/runtime-type-system.xml`（typed-effect-system 79-110、perform 签名 189-200、runtime-integration 111-169、typed-runtime-permissions 226-237、field-default 215-219、typed-dispatch-not-implicit 220-224）
