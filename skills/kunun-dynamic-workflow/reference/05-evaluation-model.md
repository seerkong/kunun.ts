# 求值模型：双栈、fiber、continuation 与函数应用

本章描述 kunun 运行期到底**怎么算**一段代码。它是写对 kunun/kon 代码的底层依据：求值顺序、函数何时触发、为什么 prompt 在 checkpoint 前就算好、为什么循环和 try 里能暂停恢复，全部由本章的机制决定。

本章语法一律用 **Kon**：`()` = knot（链/调用），`[]` = vector，`{}` = map。

> 阅读前置：本章只讲“怎么求值”。语法形态（容器、分隔符、字符串、`.:`/`::`/`:::`）见 [02 语法与数据格式](./03-kon-data-format.md)；函数/类/类型见 [04 函数与类型](./07-functions-objects.md)；workflow DSL 见 [06 workflow DSL](../dynamic-workflow/02-dsl-reference.md)。相对链接为占位，按本仓 `skill/reference/` 实际章节命名调整。

> 文件路径约定：本章不带 `node_modules` 前缀的裸 `.ts` 文件名（`RuntimeInterpreter.ts`、`RuntimeState.ts`、`RuntimeFiber.ts`）都在 `packages/runtime/lib/RuntimeInterpreter/` 下，**例外**：`EnvTree.ts` 在 `packages/core/lib/StateManagement/`、`KnOperandStack.ts` 在 `packages/core/lib/Model/`（首次出现处会显式标注）；`stack.ts` 在 `node_modules` 的 depa-actor 包内。

---

## 1. 两个栈：operand stack 与 instruction stack

### 用途

kunun 的执行单元是 **fiber**（绿色线程）。每个 fiber 拥有**两个独立的栈**，二者都是 LIFO：

- **instruction stack（指令栈）**：装“还没做的工作”，每一项是一条 `RuntimeInstruction`（`{opcode, memo}`）。
- **operand stack（操作数栈）**：装“已经算出来的值”，按 frame（帧）分段。

两个栈都是 depa-actor 提供的通用 `ArrayStackMachine`：`push` 追加到末尾，`pop`/`peek` 取末尾（`node_modules/.bun/depa-actor@.../src/execution/stack.ts:39-55`）。fiber 持有它们：`RuntimeFiber.ts:35-36` 定义 `instructionStack` 与 `operandStack`。

### 语义

运行期**不做树遍历递归**。执行 = 一个单步派发循环不断地：从 instruction stack 顶弹出一条指令 → 按 `opcode` 找 handler → 执行 handler（handler 往往会往栈上再压更多指令，或把值压到 operand stack）→ 循环。直到栈顶是 `Runtime_LandSuccess`/`Runtime_LandFail` 哨兵或栈空（`RuntimeInterpreter.ts:3158-3207`）。

关键事实：**值流是后缀（RPN/postfix）的**。无论源码长什么样，操作数最终都按源码顺序落到 operand stack 上，函数/操作符再把它们弹回来消费。

### 不要混淆的同名类（dead/无关代码）

- `packages/core/lib/Model/KnOperandStack.ts` 里的 `KnOperandStack` 只是一个 `{ _Type, Value: any[] }` 的数据模型壳，**运行期不用它做求值**。
- core 里另有 `Algo/StackMachine`，也与运行期求值无关。
- 运行期真正用的是 depa-actor 的 `ArrayStackMachine`（经 `createOperandStack`/`createInstructionStack`，`RuntimeFiber.ts:1,41-43`）。

不要把这些壳类当成语言行为来写。

### 陷阱：instruction stack 是 LIFO，序列要倒序压

因为指令栈是 LIFO，要让程序按源码顺序执行，压栈时必须**倒序**：`addOpsInOrder(ops)` 从最后一条压到第一条，于是 `ops[0]` 落在栈顶、最先执行（`RuntimeState.ts:780-786`）。而 `addOpDirectly` 只压一条到栈顶（`RuntimeState.ts:772-778`），所以**连续多次 `addOpDirectly`，最后调用的那条最先执行**。这就是为什么每个入口都先压 `Runtime_LandSuccess`、再压程序节点——哨兵沉在栈底，最后才碰到。

---

## 2. 指令栈展开（instruction-stack expansion），不是树遍历递归

### 语义

一个 AST 节点不是被“递归地算完”，而是被**展开（expand）**成一串指令压回指令栈。`Node_RunNode` 的 handler 调用 `ExpandNode`，`ExpandNode` 按节点类型把工作 lower 成更细的指令（`RuntimeInterpreter.ts:48-50, 1056-1080`）：

- RawString → 直接 `ValStack_PushValue` 压它的值。
- Knot（链）→ `Node_ExpandChain`。
- Vector → 压 frame、逐元素 `Node_RunNode`、`Node_MakeArray N`、收帧（`ExpandVector`, `1082-1089`）。
- UnorderedMap → 压 frame、逐项压 key + `Node_RunNode` value、`Node_MakeMap N`（`ExpandMap`, `1091-1102`）。
- Word → 若是 host function 压函数本身，否则压 `lookup(name)`（`728-733`）。
- 其它字面量 → 直接压值。

一个 block（`Node_RunBlock`）把每条语句展开为 `Node_RunNode`，语句之间插入 `ValStack_PopValue`，只留最后一条的值（`ExpandBlock`, `1113-1122`）。

### 为什么这很重要（设计不变量）

展开式执行使**continuation 显式且可序列化**——这是 checkpoint/resume、effect、未来 codegen 的前提（`codument/behaviors/runtime-interpreter.xml:261-314`）。如果用 JS 递归 tree-walk，暂停点就藏在 JS 调用栈里，无法快照。因此：**逻辑短路、`return`、循环、effect、workflow yield 都不是普通 host function**，它们必须压显式指令来掌控求值顺序与暂停点。

### 可运行示例：观察展开而非递归

```ts
// bun -e 运行；包目录 packages/runtime
import {RuntimeInterpreter} from "kunun-runtime";
import {KnConverter} from "kunun-converter/KnConverter";

const runtime = RuntimeInterpreter.CreateRuntime();
const node = KnConverter.Kon.Parser.Parse("(1 2 :+)");
const result = RuntimeInterpreter.ExecWithRuntimeSync(runtime, node);
const opcodes = runtime.instructionHistory.map(e => e.instruction.opcode);
console.log(result, opcodes.join(" "));
```

输出（已验证）：

```
3 Node_RunNode Node_ExpandChain ValStack_PushFrame Node_ChainStep Node_RunNode ValStack_PushValue Node_ChainStep Node_RunNode ValStack_PushValue Node_ChainStep Ctrl_ApplyCallable ValStack_PopFrameAndPushTopVal
```

注意 `Node_ExpandChain` 出现在 `Node_RunNode` **之后**——证明节点被展开成后续指令，而不是在 `Node_RunNode` 内部递归算完（对应 passing test `packages/runtime/__tests__/Case/RuntimeInterpreterInstructionStackExpansion.test.ts:10-22`）。同时看到**整条链只压了一次 `ValStack_PushFrame`**：三个 knot（`1`、`2`、`:+`）共享同一个 frame，操作数 `1`、`2` 压进去，`Ctrl_ApplyCallable` 把它们弹出来给 `+`。

> 陷阱：运行期里**同时存在第二条遗留的递归 tree-walk 路径**（`EvaluateNode`/`EvaluateChain`，`RuntimeInterpreter.ts:916-2079`），用于参数取值、插值片段、`CallCallable` 等少数场景，它走 JS 异常信号而**不可 checkpoint**。主路径是指令栈展开。不要假设“每个构造都走指令栈”，但**作者侧能写的源码语义以指令栈展开为准**。

---

## 3. operand stack 的 frame 语义：一条 sentence 的多个 clause 共享一个 frame

### 语义

operand stack 按 frame 分段。`pushFrame()` 记录当前长度作为新帧底（`stack.ts:57-59`）；`popFrameAllValues()` 把帧底以上全部取出（`61-64`）；`popFrameAndPushTopValue()` 弹一帧、只把该帧**最后一个值**重新压回父帧（`66-73`）。这就是“子表达式坍缩为单个结果”的机制。

一条链（chain / sentence）由 `KnKnot.Next` 串成的多个 knot（clause）组成。`ExpandChain` 给**整条链压一个 frame**，逐 knot 走 `Node_ChainStep`，最后收一次帧（`RuntimeInterpreter.ts:1124-1147`）。含义就是：

- **同一条 sentence 里所有 clause 把结果压到同一个 operand frame 上。**
- 操作符/函数从这个共享 frame 消费操作数。
- 帧收尾时只保留**最后一个值**作为这条 sentence 的结果（中间值被丢弃）。

`GetCurrentFrameValueCount = items.length - lastFrameBottom`（`1528-1532`）度量“当前帧已攒了几个操作数”，这正是下一节按元数触发的依据。

### 可运行示例

```ts
import {RuntimeInterpreter} from "kunun-runtime";
const E = (s) => RuntimeInterpreter.EvalBlockSourceSync(s);
console.log(E("(1 :+ 1 :+ 1)"));   // 3  —— 链式 infix，操作数都在同一帧
console.log(E("(var x 1) (var y 2) (x y :+)")); // 3 —— 程序值 = 最后一条 sentence 的值
```

### 陷阱

- **帧只保留最后一个值。** 一条 sentence 或一个 block 的结果是它**最后一个 clause** 的值；前面的中间值被丢弃（block 在语句间插 `ValStack_PopValue`，`1117-1118`）。
- **map 字面量不保证 key 顺序、且丢 `_Type`。** `{ a = (1 2 :+) b = 9 }` → 求值为 `{"b":9,"a":3}`（已验证，JSON key 顺序不等于源码顺序）。map 里的 `=` 是**数据语法**，不是赋值。
- vector 字面量保序：`[1 (2 3 :+) 4]` → `[1,5,4]`（已验证）。

---

## 4. 按元数触发的函数应用（arity-driven application）

### 用途与语义

函数/操作符**只有在攒够操作数时才触发**。一个 callable 的 arity 由 `GetCallableArity` 决定（`RuntimeInterpreter.ts:2212-2232`）：host function 用注册的 arity；source lambda 用 `params.length`；普通 JS 函数用 `fn.length`。

`AppendChainCurrentOps`（`1259-1426`）按 knot 的 `CallType` lower，核心是 **lookahead（前瞻消费后续 knot 补足参数）**：

- **InfixCall / Operator**（`1280-1349`）：解析 callable、算 arity；把显式输入节点逐个 `Node_RunNode`。若**没有**显式输入，则计算 `needed = max(arity - 当前帧已有值数, 0)`，从后续 `knot.Next.Core` 拉 `needed` 个节点当参数；最后 `argCount = max(arity, 显式输入数)`，发 `Ctrl_ApplyCallable {callableNode, argCount}`。
- **裸 Word 解析为 callable**（`1403-1423`）：同样 lookahead，**只有当 `needed` 减到 0 才触发** `Ctrl_ApplyCallable`；否则退化为压值/闭包。
- **PrefixCall / PostfixCall**（`1351-1362`）：`Node_RunNode` 那个 callable，再逐个 `Node_RunNode` 输入，发 `Ctrl_ApplyCallable {callableFromStack:true, argCount: 输入节点数}`——**这条路径直接用输入节点个数当 argCount，不按 arity 截断。**

`Ctrl_ApplyCallable` handler（`110-137`）弹 `argCount` 个操作数（用 `unshift` 保持原始顺序），解析 callable，然后**调度一条指令栈上的 lambda 调用**或**立即调用** host 函数。

### 可运行示例

```ts
import {RuntimeInterpreter} from "kunun-runtime";
const E = (s) => RuntimeInterpreter.EvalBlockSourceSync(s);
// 函数调用 `:add`（arity=2）前瞻消费后面两个 knot 3 和 4
console.log(E("(fn #add :|a b| :[ (a b :+) ]) (:add 3 4)")); // 7
```

### 陷阱：postfix 与 prefix 的 argCount 不同（变参 host fn 尤甚）

`+`、`*` 注册 arity 为 2，但实现是 reduce-over-all-args。于是同样三个数：

```ts
import {RuntimeInterpreter} from "kunun-runtime";
const E = (s) => RuntimeInterpreter.EvalBlockSourceSync(s);
console.log(E("(1 2 3 :+)")); // 5  —— postfix：arity=2 只消费栈顶 2 个，留 1 在帧上，帧最终值=结果
console.log(E("(:+ 1 2 3)")); // 6  —— prefix：把全部 3 个输入都当参数
```

`(a b c :op)` 与 `(:op a b c)` **对变参操作符不等价**。写算术时用二元形式 `(a b :+)` 或显式 prefix `(:+ a b c)`，不要写 `(a b c :+)` 期望求和。

### 陷阱：未声明变量返回 `undefined`/null，但调用未知 word 抛错

`lookup` 查不到名字时回退到起始 env、返回 `undefined`（不抛错，`EnvTree.LookupDeclareEnv` `packages/core/lib/StateManagement/EnvTree.ts:20-33`——注意 `EnvTree` 在 **core** 包，不在 runtime 目录）：

```ts
console.log(RuntimeInterpreter.EvalBlockSourceSync("nope")); // null（未声明变量不抛错）
```

但把未知 word 当函数调用会抛 `Callable not found: <name>`：`(3 :add5)` → 抛错（已验证）。

---

## 5. PN 与 RPN 在运行期的求值顺序

### 语义

操作数永远按**源码出现顺序从左到右**落到共享帧上，操作符按这个顺序消费。`Ctrl_ApplyCallable` 用 `unshift` 把弹出的操作数还原为原始顺序（`120`）。因此：

> 无论写后缀 `(a b :op)`、中缀 `(a :op b)`、还是前缀 `(:op a b)`，**第一个源操作数都是左/首参数。**

用非交换操作符可证（全部已验证）：

```ts
import {RuntimeInterpreter} from "kunun-runtime";
const E = (s) => RuntimeInterpreter.EvalBlockSourceSync(s);
console.log(E("(10 3 :-)")); // 7  左=10 右=3
console.log(E("(:- 10 3)")); // 7  同上：第一个源操作数仍是左参
console.log(E("(10 2 :/)")); // 5
console.log(E("(5 3 :gt)"), E("(3 5 :gt)")); // true false
```

### 可观察求值顺序的示例（副作用函数）

用一个记录调用顺序的 host 函数，证明操作数是左到右求值：

```ts
import {RuntimeInterpreter} from "kunun-runtime";
const runtime = RuntimeInterpreter.CreateRuntime();
const order = [];
runtime.registerHostFunction("note", (v) => { order.push(v); return v; }, 1);
runtime.registerHostFunction("pair", (a, b) => [a, b], 2);
RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, "((:note 1) (:note 2) :pair)");
console.log(JSON.stringify(order)); // [1,2] —— 左操作数先求值
```

---

## 6. 环境与作用域（Env / EnvTree）

### 语义

环境组成一棵树 `EnvTree`。构造时建好 BuildIn → Global 链（`RuntimeState.ts:207-218`）。env 种类：BuildIn、Global、Process、Local。每个 fiber 记 `currentEnvId`（`RuntimeState.ts:220-222`）——env 树是 fiber 间**共享**的，但每个 fiber 有自己的当前 env 指针和自己的两个栈。

作用域操作（`RuntimeState.ts:456-525`）：

- `diveLocalEnv(name)` / `diveProcessEnv` 建子 env 并切入；`riseEnv` 回父；`changeEnvById` 跳到任意 env；`makeSubLocalEnvUnderEnv(parentId)` 在**指定父**下建子（用于词法闭包和成员调用）。
- `lookup(key)` 沿父链找**最近声明该 key 的 env**；找不到回退起始 env，返回 `undefined`（不抛错）。
- `define` 在当前 env 定义；`setVar` 写到已声明它的 env（否则当前 env）；`defineGlobal`/`setGlobal` 写全局。

对应指令：`Env_DeclareLocalVar`、`Env_SetLocalEnv`、`Env_Lookup`、`Env_DiveLocalEnv`（支持 `{parentEnvId,name,bindings}` 做闭包）、`Env_Rise`、`Env_ChangeEnvById` 等（handler `RuntimeInterpreter.ts:398-443`）。

### 闭包：定义时**急切快照**所有可见变量

`createLambda` 把定义时所有可见变量复制进 `closureValues`，并记 `definitionEnvId`（`RuntimeState.ts:536-545`）。调用 source lambda 时（`ScheduleRuntimeLambdaCall`, `980-1008`）在 `definitionEnvId` 下 dive 一个 local env，把 `closureValues` + 形参重新 `define` 进去。这是**值快照**，不是按引用捕获。

```ts
import {RuntimeInterpreter} from "kunun-runtime";
const E = (s) => RuntimeInterpreter.EvalBlockSourceSync(s);
// mk 在 base=1 时定义内层 lambda；之后 set base 100 不影响已快照的 base=1
console.log(E("(var base 1) (fn #mk :|n| :[ (fn #add :|| :[ (base n :+) ]) ]) (var f (:mk 10)) (set base 100) (:f)")); // 11
```

> 注意：遗留 `callRuntimeFunction` 路径（JS-函数体 lambda，嵌入/JS-callback 场景）**也是同一套急切快照语义**，不存在按引用查后续 env 的差异。仓库里那个测试（`RuntimeInterpreter.test.ts:186-195`）`define('base', 20)` 后 `createLambda` 急切快照 `base=20` 进 `closureValues`，随后 `setVar('base', 100)`，最终 `callRuntimeFunction(addBase, [5])` 返回 **25 = 20 + 5**——若闭包真看到后续的 `base=100` 结果会是 105。`callRuntimeFunction`（`RuntimeState.ts:559-560`）把 `closureValues` 快照重新 `Define` 进调用 env，遮蔽父 env 里后改的 `base=100`，与 source lambda 的急切快照（`snapshotVisibleEnvValues`，`RuntimeState.ts:542`）完全一致。两条路径都不按引用捕获，以本例的 11 / 测试的 25 为准。

---

## 7. continuation 与 checkpoint 的本质

### continuation 是什么

`captureContinuation(excludeTopN)`（`RuntimeState.ts:644-660`）拍下当前 fiber 的：当前 env id + operand stack（items + frameBottoms）+ instruction stack（去掉栈顶 `excludeTopN` 条）+ active effect handler maps 的副本。`restoreContinuation(cont, operands)`（`662-677`）把这些全部装回去，再把 resume 操作数压到 operand stack 上。

**这就是 kunun 的通用控制原语。** 因为暂停点完全由“两个栈 + env + effect maps”刻画，而这些都是**显式数据**（不在 JS 调用栈里），所以可以：

1. 在任意时刻整体快照、序列化、之后恢复——这是 checkpoint/resume。
2. 实现 `return`：函数调用进入时用 `Ctrl_MakeContExcludeTopNInstruction 2` 捕获一个 continuation 并绑到 env 变量 `return`；`(:return v)` lower 成 `Runtime_RestoreContinuationFromEnv {name:'return'}`，直接恢复到调用点之后、跳过函数体剩余指令（`980-1008, 1478-1489`）。
3. 实现循环 `break`/`continue`：循环每次迭代把 `break`/`continue` continuation 绑进循环 env（`IterForEachLoop` 在 `220-229` 绑 `continue`）。
4. 实现 algebraic effect（`perform`/`try...handle`）：handler 拿到的 `resume` 就是一个 continuation，`(:resume v)` 恢复到 `perform` 处。
5. 实现 async resume：suspend 的 fiber 用 resume token 注入结果后继续。

### 为什么能在循环 / try 中暂停恢复，且不依赖 JS 调用栈

循环体、try 体的“当前进度”全部表现为 instruction stack 上**尚未执行的指令** + operand stack 上**已算的值** + 控制帧（LoopFrame/ExceptionFrame）。这些都是普通数据。所以一个 yield 发生时，循环的迭代游标、try 的 catch/finally 都被 continuation 完整保留，恢复时无需任何原始 JS 栈帧（`codument/behaviors/runtime-interpreter.xml:281-285` `no-hidden-js-recursion`）。

### 可运行示例：return 短路

```ts
import {RuntimeInterpreter} from "kunun-runtime";
const E = (s) => RuntimeInterpreter.EvalBlockSourceSync(s);
console.log(E("(fn #early :|| :[ (:return 1) 2 ]) (:early)")); // 1 —— return 恢复函数 continuation，跳过尾部的 2
```

### 可运行示例：effect / perform / resume（continuation 作为 resume）

```ts
import {RuntimeInterpreter} from "kunun-runtime";
const E = (s) => RuntimeInterpreter.EvalBlockSourceSync(s);
const r = E("(fn #AddHandler :|resume val1 val2| :[ (:resume (val1 val2 :+)) ]) (try :[ (perform #add :|1 2|) ] handle #add AddHandler)");
console.log(r); // 3 —— perform 暂停，handler 用 resume continuation 注入 1+2 后恢复
```

更复杂的：handler 算出值、恢复后继续用它：

```ts
import {RuntimeInterpreter} from "kunun-runtime";
const r = RuntimeInterpreter.EvalBlockSourceSync(
  "(try :[ (var x (perform #ask :||)) (x 10 :+) ] handle #ask (fn #h :|resume| :[ (:resume 5) ]))"
);
console.log(r); // 15 —— resume 5 → x=5 → 5+10
```

> `perform`/`try...handle` 的精确语法（含 postfix `%(effect handle #h)` + 标记 `#(effect handler #h handles :[...])`）见 [04 函数与类型](./07-functions-objects.md) 的 effect 小节，以及 `packages/runtime/__tests__/Resource/RuntimeInterpreter/Effect/*.kon`。

---

## 8. fiber 与调度

### 语义

fiber 状态（`RuntimeFiber.ts:5-11`）：`Runnable`、`Running`、`Idle`、`Suspended`、`Dead`。fiber 共享 env 树，但各持独立的指令栈/操作数栈/当前 env id。

- `getCurrentFiber`：优先返回 `Running` 的；没有就把一个 `Runnable` 提升为 `Running`（`RuntimeState.ts:246-257`）。
- `switchToNextRunnableFiberWithWork`：选下一个“有指令可跑”的 Runnable/Running fiber，把别的降回 Runnable（`320-332`）。
- 调度指令（handler `RuntimeInterpreter.ts:444-470`）：`Fiber_CurrentToIdle`、`Fiber_CurrentToSuspended`、`Fiber_AwakenMulti`、`Fiber_YieldToParentAndChangeCurrentFiberState`、`Fiber_YieldToFiberAndChangeCurrentFiberState`（**把当前帧的值搬到目标 fiber**）、`Fiber_FinalizeCurrent`（标记 Dead）、`Fiber_AddResumeToken`、`Fiber_ConsumeResumeToken`。

### yield-to-fiber 的含义

`yieldToFiberAndChangeCurrentFiberState(fiberId, status)`（`RuntimeState.ts:290-298`）：把**当前 fiber 当前帧的所有值** `popFrameAllValues` 取出，切到目标 fiber，再把这些值压到目标 fiber 的操作数栈上。也就是说 fiber 间“传值”是显式地把一个帧的内容搬过去——这同样是纯数据搬运，没有 JS 栈耦合。

### suspend / resume 周期（async 与 timer）

`Runtime_AwaitHostFunction`（`621-634`）、`Runtime_SetTimeout`（`635-652`）都先 `suspendCurrentFiber()` 然后 `return {yield:true}`；底层 Promise/timer 完成时 `addResumeFiberToken({fiberId, result, beforeResumeOps?})`。`consumeResumeFiberToken`（`RuntimeState.ts:350-367`）倒序压入 `beforeResumeOps`、压入 `result` 操作数、把 fiber 置回 `Runnable`。`StartLoopAsync`（`3209-3222`）在派发步骤之间不断 drain token，直到没有活 fiber 工作也没有挂起 token。

### 可运行示例：set_timeout 暂停当前 fiber、稍后恢复

注入一个**可控的 timer host**（捕获回调、手动触发，避免真实 sleep；这是测试套件的做法）：

```ts
import {RuntimeInterpreter} from "kunun-runtime";

(async () => {
  const runtime = RuntimeInterpreter.CreateRuntime();
  const pending = [];
  runtime.setTimerHost({ setTimeout: (cb) => { pending.push(cb); return pending.length; } });
  const log = [];
  runtime.registerHostFunction("note", (v) => { log.push(v); return v; }, 1);

  const nodes = RuntimeInterpreter.ParseSourceBlock(
    "(:note 1) (set_timeout (fn #cb :|| :[ (:note 3) ]) 0) (:note 2)"
  );
  const done = RuntimeInterpreter.ExecBlockWithRuntimeAsync(runtime, nodes);
  await Promise.resolve();
  while (pending.length) pending.shift()();  // 手动触发 timer
  await done;
  console.log(JSON.stringify(log)); // [1,3,2]
})();
```

输出 `[1,3,2]`（已验证）说明：`(:note 1)` 先跑；`set_timeout` **挂起 fiber 并 yield**，此时 `(:note 2)` 还没跑；手动触发后 fiber 恢复，先跑 timer 回调 `(:note 3)`，再继续到 `(:note 2)`。这个顺序直观展示了“暂停点不在 JS 调用栈、而在指令栈上排队”。

> 真实异步顺序对边界细节敏感。要写依赖具体顺序的 async 代码，先用上面这种可控 timer host 跑通再用。canonical 形式见 `packages/runtime/__tests__/Case/RuntimeInterpreter*.test.ts` 中的 async/timer/fiber 用例。

---

## 9. 为何 prompt / 值在 checkpoint 之前就被计算

### 语义

workflow 扩展（`ai_agent` 等）是 **host 注册的、领域中立的 lowering**（`RuntimeState.ts:812-865`），运行期对扩展名**没有任何特判**（no name-magic）。一个 prefix/infix workflow 关键字在指令路径上 lower 成：**先逐个 `Node_RunNode` 求值参数，再发 `Workflow_InvokeExtension`/`Workflow_Dispatch`**（`TryExpandPrefixSpecial` `1158-1170`；`AppendChainCurrentOps` infix 分支 `1307-1328`）。

因为参数的 `Node_RunNode` 指令排在 dispatch 指令**之前**，所以等到扩展真正触发、`captureSnapshot()` 跑时，参数/prompt 的值**已经算完并在操作数栈上 / 作为 args 传入**。`Workflow_Dispatch`（`471-494`）是 yielding 变体：消费完参数后返回 `{yield:true, effects:[effect]}`，派发循环以 `yield_requested` 停下，留下一个**干净的、参数已就绪的 checkpoint**。

**这是有意设计**：resume 时不会重算 prompt（昂贵且可能有副作用），且 checkpoint 里存的是已确定的值，可序列化。副作用型参数表达式只在 yield 前执行一次。

### 可运行示例（原始扩展级别）

```ts
import {RuntimeInterpreter} from "kunun-runtime";
const runtime = RuntimeInterpreter.CreateRuntime();
let received = null;
runtime.registerWorkflowExtension("ai_agent", ({args}) => { received = args; return {kind:"effect", args}; });
RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, "(ai_agent (1 2 :+))");
console.log(JSON.stringify(received)); // [3] —— 内层 (1 2 :+) 在 dispatch 前已算成 3
```

### 可运行示例（DSL / checkpoint 级别，用 kwf dry-run）

`kwf dry-run` 不调用任何模型，驱动 yield→注入 mock 结果→resume 的完整 checkpoint 循环：

```bash
bun packages/workflow-host/bin/kwf.ts dry-run /dev/stdin <<'KON'
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
KON
```

输出（已验证）：

```
workflow: stdin
status: completed (ok)
yields: 1
  yield: ai_agent (1 job)
    - asker: sys

q = hi
result: ["dry-run:ask"]
```

prompt 里的 `\(q)` 已被插值成 `q = hi`——即在 yield/checkpoint **之前**就完成了求值。`:input` map 的条目变成变量、`:output` vector 列出的变量作为最终结果数组返回。workflow 语法细节见 [06 workflow DSL](../dynamic-workflow/02-dsl-reference.md)。

---

## 10. 一条 sentence 多个 clause 共享 operand stack：实践含义

把第 3、4、5 节合起来，作者需要记住的可操作规则：

1. **写算术/调用时，源码从左到右就是操作数入栈顺序，首个操作数即首参。** 后缀、中缀、前缀都成立。
2. **共享帧意味着相邻 clause 会“喂”给后面的操作符。** 这正是裸 word / 无显式输入的 infix 能前瞻消费后续 knot 的原因（第 4 节）。
3. **一条 sentence 的值是它最后一个 clause 的值；中间值被丢。** 想保留多个结果就显式装进 `[...]` vector。
4. **变参 host fn 在后缀形态下只消费 arity 个操作数**（见第 4 节 `(1 2 3 :+) => 5` 陷阱），别指望后缀形态自动 reduce 所有操作数。
5. **副作用按操作数从左到右的顺序发生**（第 5 节 `note` 示例 `[1,2]`）。

---

## 附录：自更新操作符是 prefix，不是 infix（高频陷阱）

`+=`、`-=`、`*=`、`/=`、`++`、`--` 的**可用形式是 prefix**：`(:+= x 3)`、`(:++ x)`、`(:-- x)`。虽然 `AppendChainCurrentOps` 有一条 infix self-update 分支，但中缀写法 `(x :+= 3)` 在实践中**静默不改值**（返回旧值）：

```ts
import {RuntimeInterpreter} from "kunun-runtime";
const E = (s) => RuntimeInterpreter.EvalBlockSourceSync(s);
console.log(E("(var x 5) (:+= x 3) x")); // 8  —— prefix，已更新
console.log(E("(var x 5) (x :+= 3) x")); // 5  —— infix，未更新（陷阱）
```

写自更新一律用 prefix 形式。

---

## 速查

| 概念 | 机制 | 出处 |
| --- | --- | --- |
| 双栈 | 每 fiber 一个 instruction stack + 一个 operand stack（depa-actor `ArrayStackMachine`） | `RuntimeFiber.ts:35-36`；`stack.ts:39-73` |
| 单步派发 | 弹一条指令→找 handler→执行→循环，停在 LandSuccess/空/yield | `RuntimeInterpreter.ts:3158-3207` |
| 展开非递归 | `Node_RunNode`→`ExpandNode` 把节点 lower 成指令压回栈 | `RuntimeInterpreter.ts:1056-1080` |
| 共享帧 | `ExpandChain` 给整条链压一个 frame，收尾只留最后值 | `RuntimeInterpreter.ts:1124-1147`；`stack.ts:66-73` |
| 按元数触发 | lookahead 补足参数，`needed=0` 才发 `Ctrl_ApplyCallable` | `RuntimeInterpreter.ts:1259-1426, 110-137` |
| RPN 值流 | 操作数左到右入栈，`unshift` 还原顺序 | `RuntimeInterpreter.ts:120` |
| Env 树 | `EnvTree`，`lookup` 沿父链找声明 env，未命中返回 undefined | `packages/core/lib/StateManagement/EnvTree.ts:20-33`；`RuntimeState.ts:456-525` |
| 闭包 | 定义时急切快照可见变量进 `closureValues` | `RuntimeState.ts:536-545` |
| continuation | 快照 env+两栈+effect maps；恢复即装回 | `RuntimeState.ts:644-677` |
| return/break/continue | 绑 env continuation，`Runtime_RestoreContinuationFromEnv` 恢复 | `RuntimeInterpreter.ts:1478-1489, 220-229` |
| fiber 调度 | Runnable/Running/Idle/Suspended/Dead；resume token 驱动 | `RuntimeFiber.ts:5-11`；`RuntimeState.ts:320-367` |
| checkpoint 前算 prompt | 参数 `Node_RunNode` 排在 dispatch 之前 | `RuntimeInterpreter.ts:471-512`；`RuntimeState.ts:842-865` |
