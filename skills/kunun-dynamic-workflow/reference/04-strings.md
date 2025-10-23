# 04 字符串：解释串、原始串、多行与插值

本章覆盖 kunun 的四种字符串字面量、转义规则、字符串插值，以及三引号多行串的全部硬性规则与对应报错。语法按 **Kon** 固定讲：`()` = knot，`[]` = vector，`{}` = map。

字符串的词法在 `packages/converter/lib/Lexer/Lexer.ts` 完成（`ReadStringToken` 扫描 token 并强制三引号定界行规则），解析在 `packages/converter/lib/KnParserV1.ts`：不含插值的解释串塌缩成普通 JS `string`，含插值的成为 `KnInterpolatedString`，原始串成为 `KnRawString`。运行期对插值表达式用 JavaScript `String()` 强制转字符串再拼接（`packages/runtime/lib/RuntimeInterpreter/RuntimeInterpreter.ts:358-365,1845-1852`）。

---

## 1. 四种字面量总览

按定界符分两族：双引号是**解释串**（处理转义 + 插值），单引号是**原始串**（逐字保留，不转义、不插值）。每族各有单行与三引号多行两种形态。词法器仅凭起始字符/序列选择形态（`Lexer.ts:175,254-257`）。

| 形态 | 定界符 | 转义？ | 插值？ | 解析产物 |
|------|--------|--------|--------|----------|
| 解释单行 | `"..."` | 是 | 是 | 普通 `string`（无插值）/ `KnInterpolatedString`（有插值） |
| 解释多行 | `"""` … `"""` | 是 | 是 | 同上 |
| 原始单行 | `'...'` | **否** | **否** | `KnRawString` |
| 原始多行 | `'''` … `'''` | **否** | **否** | `KnRawString` |

- **用途**：双引号串用于需要换行/制表/插入变量的文本（如 workflow 的 `user_prompt`）；单引号串用于路径、正则、含 `\` 或 `\(...)` 字样且不希望被处理的字面文本。
- **语义**：双引号串与单引号串都用 `"`/`'` 作定界符；区别只在转义与插值的处理（见第 4 节）。
- **关键**：词法器用 `input.startsWith(quote.repeat(3), start)` 判断三引号（`Lexer.ts:256`），所以 **`"""` 永远是三引号多行串的开始**，无法表示「空单行解释串」。空解释串写 `""`，空原始串写 `''`。

可运行示例（四种形态各一条，配合一个空串示例）：

```kon
[
  "interpreted: tab\there, newline\thanks"
  'raw: \n stays literal'
  """
  multiline interpreted
  second line
  """
  '''
  multiline raw
  \n stays literal
  '''
]
```

求值结果（`EvalBlockSourceSync`，下同）：

```
[
  "interpreted: tab\there, newline\thanks",  // \t 解码成制表符
  "raw: \\n stays literal",                  // 原始串里 \n 是两个字面字符
  "multiline interpreted\nsecond line",
  "multiline raw\n\\n stays literal"
]
```

空串：

```kon
[ "" '' ]
```

→ `["", ""]`（两个空字符串）。`packages/converter/__tests__/Case/StringLiteralSyntax.test.ts:7-28` 验证了单行/多行的解释 vs 原始差异。

---

## 2. 解释单行串 `"..."`

- **精确语法形式**：`"` 开头、`"` 结尾，单行；中间可含转义序列与 `\(...)` 插值。
- **语义**：反斜杠启动转义；未转义的 `"` 结束字符串。串内字面换行/回车是**硬错误**。
- **陷阱**：
  - 串内出现真实换行 → `Unterminated string literal`（`Lexer.ts:286-288`）。
  - 单引号 `'` 在 `"..."` 内是普通内容：`"it's"` 合法。
  - 末尾孤立反斜杠会转义掉收尾引号 → `"a\"` 报 `Unterminated string literal`。

转义解码表（`KnParserV1.ts:407-430` `ReadEscape`）。**只有下列序列真正解码**：

| 转义 | 结果 |
|------|------|
| `\n` | 换行 |
| `\t` | 制表符 |
| `\r` | 回车 |
| `\b` | 退格 |
| `\f` | 换页 |
| `\"` | `"` |
| `\\` | `\` |

**所有其它转义（默认分支）丢弃反斜杠、保留后一个字符原样**（`KnParserV1.ts:427-428`）。即 `\/`→`/`、`\q`→`q`。**特别注意：`\uXXXX` 不做 Unicode 解码**，反斜杠被丢弃、`u` 及其后字符原样保留：

```kon
[ "\u0041" ]
```

→ `["A"]`。`\uXXXX` 会**解码为对应 Unicode 字符**（**triage D10 已修复**；此前不解码、产出字面 `u0041`）。

含双引号的解释串用 `\"`：

```kon
[ "raw quotes ok: \"q\"" ]
```

→ `["raw quotes ok: \"q\""]`（内容是 `raw quotes ok: "q"`）。对应 `StringLiteralSyntax.test.ts:8` 与 runtime 资源 `LiteralFormsAndEscapes.kon`（`RuntimeInterpreterStringLiteral.test.ts:35-46`，验证通过）。

---

## 3. 原始单行串 `'...'`

- **精确语法形式**：`'` 开头、`'` 结尾，单行；内容逐字。
- **语义**：词法器对原始串**完全不做转义**（`escaped` 标志只对 `"` 设置，`Lexer.ts:273,280`），字符串在第一个 `'` 处结束，内容存入 `KnRawString.Value`（`KnParserV1.ts:295-303`）。
- **常见错误/陷阱**：
  - 反斜杠序列、插值标记都是字面文本：`'raw: \n stays literal'` 内容含字面 `\n`（见第 1 节结果）。
  - **原始单行串无法包含自身定界符 `'`**（没有转义机制；这是明确的设计决策，不引入可变长定界符——见归档 `decisions.md` 第 3 条）。`'a'b'` → `Unterminated string literal`。要含 `'` 就改用 `"..."`。
  - 双引号在 `'...'` 内合法：

```kon
[ 'say "hi"' ]
```

→ `["say \"hi\""]`（内容是 `say "hi"`）。

  - 原始单行串内字面换行同样报 `Unterminated string literal`（同一代码路径 `Lexer.ts:286`）。

插值标记在原始串里是字面文本：

```kon
[ 'hello \(name)' ]
```

→ 解析出 `KnRawString`，`.Value === 'hello \\(name)'`（`StringLiteralSyntax.test.ts:70-74`）。

---

## 4. 插值：`\(expr)`

- **精确语法形式**：插值标记 = 反斜杠 + knot 开定界符 `(`，在 knot 闭定界符 `)` 处结束（`KnParserV1.ts:376-387`；`KonSyntaxConfig` knot = `(` `)`，`KonSyntaxConfig.ts:60-61`）。
- **语义**：`expr` 作为源码子串被解析器递归解析（`this.Parse(expressionSource)`，`KnParserV1.ts:384`）。任意合法表达式都行：裸词 `\(name)`、knot 调用 `\((1 2 :+))`（外层 `\( )` 是插值，内层 `( )` 才是 knot 调用）。无插值返回普通 `string`；有 ≥1 处插值返回 `KnInterpolatedString`（其 `Parts` 在 `{kind:'text'}` 与 `{kind:'expr'}` 间交替，`KnInterpolatedString.ts:3-13`）。运行期每个 expr 求值后用 `String()` 转字符串再拼接。
- **原始串不插值**：`'...'` 与 `'''...'''` 内的插值标记是字面文本（见第 3、6 节）。

可运行示例：

```kon
(var name "Kunun")
[
  "hello \(name)"
  "sum = \((1 2 :+))"
  "bool = \(true)"
]
```

→ `["hello Kunun", "sum = 3", "bool = true"]`（数字 `3`、布尔 `true` 都经 `String()` 转成字符串）。对应 `RuntimeInterpreterStringLiteral.test.ts:14-25`（`Source/StringInterpolation.kon`）。

插值可出现在任意表达式位置——函数体、类方法、`foreach` 循环内都可用，均验证通过（`RuntimeInterpreterStringLiteral.test.ts:48-56`，`InterpolationInLanguageFeatures.kon`）。

### 让插值标记字面化：转义反斜杠

在 `\(` 前再加一个反斜杠（即 `\\(`），反斜杠先被解码成单个 `\`，从而阻止插值：

```kon
(var name "Kunun")
[ "literal: \\(name)" ]
```

→ `["literal: \\(name)"]`（内容是字面 `literal: \(name)`，name 不被求值）。

### 只认圆括号：用错括号不报错，而是变成字面文本

插值标记只认 `\(`。若在 `\` 后写成方括号 `\[...]`，`\[` 会当作未知转义（丢反斜杠，见第 2 节默认分支），`[name]` 成为字面文本：

```kon
(var name "Kunun")
[ "hi \[name]" ]
```

→ `["hi [name]"]`（`name` **未**被求值）。这类错误**不报错**，必须用圆括号 `\(...)`。

---

## 5. 三引号多行串：硬性规则与对应报错

`"""` 和 `'''` 都是**多行专用**，受一组严格的定界行/缩进规则约束。下面逐条给出规则、会触发的**确切报错文本**，以及可运行的成功/失败示例。

设 `indentWidth = 开定界符列号 - 1`（开 `"""` 缩进多少列，`KnParserV1.ts:317`）；它既是每个内容行的剥离宽度，也是闭定界符必须对齐的缩进。结果串**不含**首尾定界行，且**不以尾换行结尾**（`KnParserV1.ts:325,332-337`）。行尾统一规范化为 `\n`（输入 CRLF 会输出 LF，`KnParserV1.ts:339`）。

### 规则 1：开定界符必须独占一行

源码行上开 `"""` 之前只能是空白，之后到行尾也只能是空白（`Lexer.ts:261-270`）。违反 → **`Triple-quoted string opening delimiter must be alone on its line`**。

失败示例（内联三引号，开行后有内容）：

```kon
"""inline"""
```

→ 报 `Triple-quoted string opening delimiter must be alone on its line`（`StringLiteralSyntax.test.ts:39`）。`"""x` 开行带内容 `x` 同样报此错。

失败示例（与其它 token 共享开行——这是最容易踩的）：

```kon
(id """
    ok
    """)
```

→ 报同样的 `opening delimiter` 错（`(id ` 在 `"""` 之前，`StringLiteralSyntax.test.ts:45`）。`[ """ ... ]` 同理。

成功示例（要把三引号串作为 knot 实参或 vector 元素，`"""` 必须另起独占行）：

```kon
[
  """
  x
  """
]
```

→ `["x"]`（验证通过）。

> 补充：解析器另要求开定界符后紧跟换行（允许先有水平空白），否则 `Triple-quoted string opening delimiter must be followed by a newline`（`KnParserV1.ts:320-323`）；多数畸形输入由词法器的「独占一行」检查先行触发。开 `"""` 后同行的尾随空白允许并忽略（`StringLiteralSyntax.test.ts:20-23`）。

### 规则 2：闭定界符必须独占一行（无尾随内容）

闭定界符之后到行尾只能是空白（词法器，`Lexer.ts:290-297`）。违反 → **`Triple-quoted string closing delimiter must be alone on its line`**。

失败示例：

```kon
"""
ok
""" trailing
```

→ 报 `Triple-quoted string closing delimiter must be alone on its line`（`StringLiteralSyntax.test.ts:47`；`'''` 形态同理，:48）。

### 规则 3：闭定界符必须与开定界符对齐

闭定界符所在行的前导空白必须**恰好** `indentWidth` 个 `[ \t]` 且无其它字符（解析器，`KnParserV1.ts:326-330`）。缩进数量不等或含非空白 → **`Triple-quoted string closing delimiter must align with opening delimiter`**。

失败示例（开缩进 2，闭缩进 1）：

```kon
  """
  ok
 """
```

→ 报 `Triple-quoted string closing delimiter must align with opening delimiter`（`StringLiteralSyntax.test.ts:41`）。闭缩进 4（多于开的 2）同样报此错。

> 注意规则 2 与规则 3 是**两个文件里的两条独立检查**：闭定界符「正确独占一行但缩进错」会通过词法器、在解析器报 `align with`；「缩进对但后面跟了内容」在词法器报 `alone on its line`。报错子串不同。

### 规则 4：非空内容行不得比定界符缩进更浅

每个**非空**内容行的前 `indentWidth` 个字符必须全是 `[ \t]`，且行长 ≥ `indentWidth`（`KnParserV1.ts:359-367` `NormalizeTripleQuotedLine`）。否则 → **`Triple-quoted string content must not be less indented than its delimiter`**。

失败示例（开缩进 2，内容 `bad` 缩进 1）：

```kon
  """
 bad
  """
```

→ 报 `Triple-quoted string content must not be less indented than its delimiter`（`StringLiteralSyntax.test.ts:40`）。

**陷阱：缩进按列数计，制表符算 1 列、不做 tab 宽度展开。** 空格缩进的定界符下用一个 tab 缩进内容行（tab = 1 列 < 2），即使编辑器里看起来对齐，也报 `less indented`。保持定界符与内容缩进**逐字节一致**（同为空格或同为 tab）。

**例外：空白行（`line.trim()` 为空）被宽容处理。** 若空白行短于 `indentWidth`，它直接变空串、**不报错**（`KnParserV1.ts:360-362`）。所以多行串中间的空行总是安全的：

```kon
[
  """
  a

  b
  """
]
```

→ `["a\n\nb"]`（中间空行虽缩进 0 < 2 但不报错）。

### 规则汇总：成功的完整多行串

```kon
[
  """
  hello
  world
  """
]
```

→ `["hello\nworld"]`（2 空格公共缩进被剥离；定界行不计入；无尾换行）。对应 `StringLiteralSyntax.test.ts:15-19`。

---

## 6. 三引号串的定界符样内容与转义

- **解释三引号 `"""..."""`**：单个 `"` 是普通内容（仅在单行 `"..."` 里 `"` 才会结束串）。要输出连续三个双引号须转义：内容行写 `\"\"\"`。

```kon
(var name "Kunun")
[
  """
  name=\(name)
  sum=\((1 2 :+))
  triple double=\"\"\"
  """
]
```

→ `["name=Kunun\nsum=3\ntriple double=\"\"\""]`（内容末行是 `triple double="""`）。裸 `"` 与 `'` 在解释三引号内都是普通内容：

```kon
[
  """
  he said "hi" and it's fine
  """
]
```

→ `["he said \"hi\" and it's fine"]`。

- **原始三引号 `'''...'''`**：逐字保留，可直接含 `"""`，插值标记保持字面：

```kon
[
  '''
  """
  '''
]
```

→ `["\"\"\""]`（内容是字面 `"""`）。原始多行串里插值也不求值：

```kon
[
  '''
  raw multiline
  \(name)
  '''
]
```

→ `["raw multiline\n\\(name)"]`（`\(name)` 原样保留）。综合行为见 runtime 资源 `LiteralFormsAndEscapes.kon`（`RuntimeInterpreterStringLiteral.test.ts:35-46`，验证通过）。

### 多行解释串里的插值（含 knot 调用与下标）

多行解释串可引用变量、做 knot 调用、用 `::` 下标：

```kon
(var lines ["alpha" "beta"])
(var left 3)
(var right 4)
[
  """
  BEGIN
  \((lines::0))
  \((left right :+))
  END
  """
]
```

→ `["BEGIN\nalpha\n7\nEND"]`。对应 `MultilineExpressionInterpolation.kon`（`RuntimeInterpreterStringLiteral.test.ts:58-65`）。其中 `\((lines::0))`：外层 `\( )` 是插值，内层 `(lines::0)` 是带下标的表达式。

---

## 7. 重要陷阱与限制（汇总）

1. **`\uXXXX` 解码为对应 Unicode 字符**（**triage D10 已修复**）。`"A"` → `"A"`。此前不解码、产出字面 `u0041`。

2. **双引号插值表达式内现可嵌套双引号串**（**triage D9 已修复**）。`"\((:Concat "a" "b"))"` → `"ab"`，正确解析。此前词法器会在内层 `"` 处提前闭合外层串、产出乱码。仍可用原始单引号串作为等价写法：

```kon
(fn #echo :|s| :[ s ])
[ "x=\((echo 'inner with )paren'))" ]
```

→ `["x=inner with )paren"]`。词法器不会在 `"..."` 内的 `'` 处断开；插值的深度跟踪还会跳过这个内部字符串，所以里面的 `)` 不会提前结束插值（`KnParserV1.ts:462-481`）。

3. **`"""` 永不表示空双引号串。** `startsWith(quote.repeat(3))`（`Lexer.ts:256`）使任何 `"""` 都是三引号开始，通常以 `opening delimiter` 报错。空解释串 = `""`，空原始串 = `''`。

4. **闭定界符有两条独立规则、来自两个文件**：词法器的 `alone on its line`（行尾不得有内容）与解析器的 `align with opening delimiter`（必须左对齐）。报错子串不同，排错时据此定位。

5. **插值标记只认圆括号 `\(...)`**：`\` 后写成方括号 `\[...]` 不报错，`\[` 丢反斜杠、`[...]` 变成字面文本（见第 4 节）。

6. **原始串零处理，包括不能转义自身定界符**。`'...'` 不能含 `'`，`'''...'''` 不能含 `'''`；碰撞时切换到双引号形态（设计上不引入可变长定界符，归档 `decisions.md` 第 3 条）。

---

## 8. 对应到 dynamic-workflow 的踩坑

动态工作流 DSL（`packages/workflow-host`）大量用三引号串写 `sys_prompt` / `user_prompt`，且常嵌在多层 knot 内（`ai_agent` → `ai_phase` → `ai_workflow`），第 5 节的定界行规则在这里最容易被违反。用 `kwf validate` / `kwf dry-run` 可在不调用任何模型的前提下复现这些解析错。

**正确写法**：`user_prompt = ` 之后**换行**，让 `"""` 独占一行（规则 1），内容缩进对齐：

```kon
(ai_workflow #demo
  :input = {topic = "kunun strings"}
  :output = [note]
  :[
    (ai_phase #Write
      :[
        (var note (ai_agent #writer :{
          label = "writer"
          sys_prompt = "You are a concise technical writer."
          user_prompt =
          """
          Write one sentence about \(topic).
          """
        }))
      ])
  ])
```

`kwf validate /dev/stdin <<'KON' ... KON` → `status: yielded (ok)`，并展开出注入 `topic` 后的 prompt 文本。`kwf dry-run` → `status: completed (ok)`、`result: ["dry-run:writer"]`（占位结果，不调模型）。

**踩坑 1：把 `"""` 与 `user_prompt =` 写在同一行**（违反规则 1）：

```kon
user_prompt = """Write one sentence about \(topic)."""
```

→ `kwf validate` 报 `diagnostic: Triple-quoted string opening delimiter must be alone on its line`。这正是第 5 节规则 1。修法：`=` 后换行，`"""` 独占一行。

**踩坑 2：内容行比 `"""` 缩进更浅**（违反规则 4，深层嵌套时极常见，因为人工对齐容易少打空格）：

```kon
          user_prompt =
          """
        bad less-indented line
          """
```

→ `kwf validate` 报 `diagnostic: Triple-quoted string content must not be less indented than its delimiter`。修法：内容行缩进 ≥ 开 `"""` 的缩进列，且空格/制表符与定界符一致。

**踩坑 3：用方括号做插值**——在 workflow 里写 `\[topic]` 不会注入变量，而是生成字面 `[topic]`，且不报错。务必用圆括号 `\(topic)`（第 4 节）。

**踩坑 4：prompt 里要带字面 `\(...)`（例如示范插值语法本身）**时，用 `\\(...)` 转义（第 4 节），或整段改用原始三引号 `'''...'''`（第 6 节，但那样真正的变量也不会被注入）。

---

## 相关章节

- knot / vector / map 容器：见 [03 容器与数据格式](./03-kon-data-format.md)（如适用）。
- `::` 下标、`:+` 等表达式：见 [05 表达式与运算](./05-evaluation-model.md)（如适用）。
- 动态工作流 DSL 与 `ai_agent` / `ai_phase`：见 [workflow DSL 章节](../dynamic-workflow/02-dsl-reference.md)（如适用）。
