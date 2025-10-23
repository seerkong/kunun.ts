# kunun 语言手册 · 参考目录索引

本目录是 **kunun 语言本体手册**：数据格式 + 类型系统 + 解释器内置语法。它是写给另一个 AI 看的——目标是让你据此**正确编写 kunun / kon 代码**，而不是泛读。每一章都按「用途 / 精确语法 / 语义 / 可运行示例 / 陷阱」组织，关键事实都用 `path:line` 标注源码出处，所有代码示例都已用仓库 harness 实跑验证（下游 agent 会逐条对抗式复核）。本目录覆盖**四层模型的前三层**；第四层「如何基于本语言编写动态工作流」在同级独立目录 [../dynamic-workflow/](../dynamic-workflow/)。

> **语法是 Kon**：圆括号 `()` = knot（链 / 调用），方括号 `[]` = vector，花括号 `{}` = map（条目用 `=` 分隔，写 `{a = 1 b = 2}`）。**容器元素之间只用空白分隔，逗号不是分隔符**——写 `[1 2]`，带逗号会被拒（实测 `[1 2]` 加逗号抛 `Comma separators are not allowed in this syntax profile`）；逗号在 kunun 里保留作 unquote（`,expr` / `,@` / `,%`），与分隔无关。字符串插值是 `\(expr)`。**函数调用一律加 `:` 前缀**：前缀位 `(:+ 1 2)`、`(:Concat "a" "b")`，中缀位 `(1 2 :+)`、`(true true :and)`；而 `var`/`set`/`if`/`fn`/`class`/`perform` 等关键字、`ai_*` 节点、以及 `:input=` 这类 keyword-arg 标记、`obj.:field` 字段访问、`Row:::member` 源限定都**不加** `:`。正文用中文；代码、关键字、类型名、操作符、函数名、文件路径一律保留英文原文。

---

## 四层模型与文件对应

kunun 是分层的：下层不知道上层存在，上层通过显式接口扩展下层（`README.md:96-108`）。

```
                      dynamic workflow (ai_* DSL)        ← 第 4 层：扩展（另一目录）
                               │  lowers to
                               ▼
  kon 数据格式  ──parse──►  解释器 + 标准内置语法 (RuntimeInterpreter)   ← 第 1 层 + 第 3 层
                               ▲
                               │  opt-in bridge（默认关闭）
                   ExtensibleScopedRowType 类型系统                       ← 第 2 层：可选叠加
```

| 层 | 是什么 | 本目录对应文件 |
|---|---|---|
| **第 1 层 · kon 数据格式** | Kon 的词法与语法：容器（`()` knot / `[]` vector / `{}` map）、空白分隔、字符串、`\(expr)` 插值。**代码即数据**。 | [02-lexical-tokens.md](./02-lexical-tokens.md)、[03-kon-data-format.md](./03-kon-data-format.md)、[04-strings.md](./04-strings.md) |
| **第 3 层 · 解释器 + 标准内置语法** | `RuntimeInterpreter` 双栈虚拟机执行 knot，加上 `var`/`fn`/`if`/`class`/`perform` 等内置特殊形式与 host 函数。**默认无类型执行**。 | [05-evaluation-model.md](./05-evaluation-model.md)、[06-builtins-control-flow.md](./06-builtins-control-flow.md)、[07-functions-objects.md](./07-functions-objects.md)、[08-host-stdlib.md](./08-host-stdlib.md) |
| **第 2 层 · ExtensibleScopedRowType 类型系统** | 可选叠加的静态类型检查：rows / classes / traits / generics / 类型化 effects。**严格 opt-in，默认关闭**，须从 `kunun` 或 `kunun-type-system` 触发 bridge 注册。 | [09-type-system.md](./09-type-system.md)、[10-effects-and-typed-execution.md](./10-effects-and-typed-execution.md) |
| **第 4 层 · dynamic workflow 扩展** | 六个 `ai_*` 节点的 host 注册扩展，lower 成 checkpoint-aware yield，由 `kwf` 持久化驱动。**不是语言内置**。 | 见同级目录 [../dynamic-workflow/](../dynamic-workflow/) |

> 第 1 层与第 3 层在本目录里**交织呈现**（先建立心智模型，再讲数据格式，最后讲求值与内置形式），因为 `RuntimeInterpreter` 直接消费 parser 产出的 knot，二者没有清晰的文件边界。第 2 层的类型标注（`!Type` 前缀、`class`/`trait`、`#(effect ...)`）在默认 `Eval*` 路径下**被忽略或无法解析**——只有走类型入口才生效（`09-type-system.md:5`、`10-effects-and-typed-execution.md:17-18`）。

---

## 建议阅读顺序

按文件编号顺序读即为推荐顺序。若按目标分流：

1. **必读地基（无论写什么都要先看）** → [01](./01-overview-mental-model.md) 建立心智模型 → [03](./03-kon-data-format.md) 容器与 knot 结构 → [05](./05-evaluation-model.md) 求值模型。这三章决定了你不会系统性写错。
2. **写普通逻辑** → 在地基之上加 [04](./04-strings.md) 字符串 / 插值、[06](./06-builtins-control-flow.md) 绑定与控制流、[07](./07-functions-objects.md) 函数与对象、[08](./08-host-stdlib.md) 查可用的 host 函数。
3. **需要精确判断切词或排查 parse 错误** → [02](./02-lexical-tokens.md) 词法层。
4. **要写带类型签名 / effect 的代码** → [09](./09-type-system.md) → [10](./10-effects-and-typed-execution.md)（务必先确认走的是类型入口）。
5. **要编排多 agent 工作流** → 转去 [../dynamic-workflow/](../dynamic-workflow/)。

---

## 文件清单（按阅读顺序）

- [01-overview-mental-model.md](./01-overview-mental-model.md) — 总览与心智模型：kunun 是什么、四层模型导航、代码即数据 / 双栈 / arity 触发 / PN-RPN / 共享操作数栈五条核心模型、Kon 容器一句话概述、自检 harness。
- [02-lexical-tokens.md](./02-lexical-tokens.md) — 词法与 token：唯一真实 lexer、完整 `TokenType` 表、括号 / sigil / 下标 token（`:::` 源限定 vs `::` 容器下标 vs `.:` 字段访问）、哪些是 dead/legacy lexer。
- [03-kon-data-format.md](./03-kon-data-format.md) — kon 数据格式：单一解析器 + 可插拔 `SyntaxConfig`、Kon 容器映射（`()`/`[]`/`{}`）、四类容器（unordered/ordered map、vector、knot）、knot 节点链结构与各 `Kn*` 节点类型。
- [04-strings.md](./04-strings.md) — 字符串：四种字面量（解释串 `"..."`/`"""`、原始串 `'...'`/`'''`）、转义规则、`\(expr)` 插值、三引号多行的硬性定界规则与报错。
- [05-evaluation-model.md](./05-evaluation-model.md) — 求值模型：operand stack + instruction stack 双栈、fiber、continuation、为什么不是 tree-walker、值流为何是 RPN、函数按 arity 触发应用、sentence/clause 共享帧取末值。
- [06-builtins-control-flow.md](./06-builtins-control-flow.md) — 内置形式：变量绑定（`var`/`set`）、控制流（`if`/`foreach`/`do`/`:break`）、运算符、字段 / 下标访问、链式赋值（`=` 是数据语法不是通用赋值），逐项标注 PN / RPN。
- [07-functions-objects.md](./07-functions-objects.md) — 函数与对象：lambda、具名 `fn`、元数变体与多参应用、对象脚本（`class` 的 `method`/`prop`/`field`/`new`）、host 对象桥接（`HostCall`/`HostApply`）。
- [08-host-stdlib.md](./08-host-stdlib.md) — 宿主标准库函数目录：`RegisterDefault` 注册的全部 host 函数（算术 / 比较 / 逻辑 / 字符串与类型转换 / IO / 数组 / 宿主对象桥接），含调用约定与 bridge 边界。
- [09-type-system.md](./09-type-system.md) — 类型系统（一）：三个类型入口、行类型（row）、class、trait、泛型、行合并与源限定访问、`~as` projection、栈式 `|in -> out|` 签名。
- [10-effects-and-typed-execution.md](./10-effects-and-typed-execution.md) — 类型系统（二）：类型化 effect 声明 `#(effect ...)`、`perform`、handler 覆盖与残余 effect 校验、按需类型执行（opt-in typing）与诊断码。

---

## 几条会反复咬人的全局事实（写代码前务必装进脑子）

- **函数调用一律加 `:` 前缀，关键字 / 宏不加。** 用户 fn、host 函数、运算符、方法都是「函数」，无论前缀位 `(:+ 1 2)`、`(:Concat "a" "b")` 还是中缀位 `(1 2 :+)`、`(true true :and)` 都带 `:`；而 `var`/`set`/`if`/`for`/`foreach`/`do`/`while`/`fn`/`class`/`type`/`trait`/`perform` 等关键字、所有 `ai_*` 节点都不加。**绝不**给这些加 `:`：keyword-arg 标记 `:input=`/`:output=`/`:effects=`、字段访问 `obj.:field`、源限定 `Row:::member`、符号 `#name`、块语法 `:[ ]`——它们不是函数调用，误加会破坏解析（`:break`/`:continue` 例外，保留 `:`）。逻辑运算：中缀 `(a b :and)`/`(a b :or)`、前缀 `(:and a b)`/`(:or a b)`、bare `(and a b)` 三种形式结果一致（`(:and true true)`→`true`）。
- **`=` 是数据语法，不是通用赋值。** `{name = "Alice"}` 是 map 条目、`(field #age = 0)` 是默认值。通用 `=` 赋值不存在；写入只允许作用于可写链目标，如 `(obj.:field = v)`、`(arr::0 := 9)`（`01-overview-mental-model.md:233`）。
- **容器分隔符只用空白，逗号不是分隔符。** vector / map / 参数表等容器元素之间只用空白分隔，带逗号会被拒（实测抛 `Comma separators are not allowed in this syntax profile`）。逗号被保留作 unquote 运算符：`,expr` unquote、`,@` unquote-splice、`,%` unquote-map——这正是它不能当分隔符的原因。
- **三个看起来像、其实不同的下标 token**：`:::` = 源限定符（成员来自哪个 row/class）、`::` = 容器下标（索引）、`.:` = 槽 / 字段 / 静态成员访问。冒号数量错一个，parse 就完全变了（`02-lexical-tokens.md`、`01-overview-mental-model.md:234`）。
- **类型检查严格 opt-in，默认执行无类型。** `!Type` 前缀、`class`/`type`/`trait`、`#(effect ...)` 只在 typed 入口下生效；默认 `RuntimeInterpreter` 执行会忽略它们，且绝不隐式安装 typed dispatch（`09-type-system.md:5`）。
- **绝不把 dead/legacy 符号当语言行为。** legacy `Interpreter` / `XnlState` / `ExtensionRegistry`、旧 lexer（`QuasiQuote`/`Word`/`Subscript`/`Property`）、`HostSupport/*.ts` 标准库均已废弃；活的只有 `RuntimeInterpreter` 与 `Lexer/Lexer.ts`（`01-overview-mental-model.md:237`、`02-lexical-tokens.md:17-22`、`08-host-stdlib.md:22-25`）。

---

## 怎么验证你写的代码（自检 harness）

从仓库根目录跑 `bun`。这些 harness 与本目录各章示例所用的一致：

```bash
# 核心语言 · 多表达式块（Kon 语法，返回最后一个表达式的值）
bun -e 'import {RuntimeInterpreter} from "kunun-runtime"; console.log(JSON.stringify(RuntimeInterpreter.EvalBlockSourceSync("(1 2 :+)")))'   # => 3

# 类型化代码块（须从 kunun 或 kunun-type-system 触发 bridge 注册）
bun -e 'import {RuntimeInterpreter} from "kunun"; console.log(RuntimeInterpreter.EvaluateTypedBlockSync(SRC))'
# 只做类型检查：RuntimeInterpreter.TypeCheckSource(src)
```

更接近真实的端到端示例见仓库的 `examples/*.kon`（`fan-out-reduce` / `routing` / `deep-research` / `adversarial-verify` / `loop-until-dry`）与 `typed-examples/*.kon`。动态工作流的 `kwf validate` / `kwf dry-run`（不调用任何模型）见 [../dynamic-workflow/](../dynamic-workflow/)。
