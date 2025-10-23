# 02 · 词法与 Token

本章描述 kunun/kon 源代码如何被切分成 token（词法层）。读者目标：据此精确判断任意源文本会切成哪些 token，从而避免写出会被错误切分或直接报词法错误的代码。

> 语法为 **Kon**：圆括号 `()` = knot，方括号 `[]` = vector，花括号 `{}` = map。词法层与 parser/SyntaxConfig 层职责分离——本章只记录词法切分，容器语义在 parser 层。

## 1. 唯一真实的 lexer

整个语言**只有一个**真实的 lexer：

- 文件：`packages/converter/lib/Lexer/Lexer.ts`
- 类：`Lexer`，入口 `Lexer.Lex(input: string): Token[]`（`packages/converter/lib/Lexer/Lexer.ts:163`）
- token 类型枚举：同文件的 `TokenType`（`packages/converter/lib/Lexer/Lexer.ts:1`）

它被 `KnParserV1` 与 `KonSyntaxConfig.ts` 直接引用（`packages/converter/lib/KnParserV1.ts:1`）。

> **警告：以下文件是 dead/legacy 代码，绝不可当作语言行为参考。**
> - `packages/converter/lib/Lexer.ts`（旧的逐字符 lexer，使用 `#` 当注释、token 名为 `Word`/`QuasiQuote`/`Subscript`/`Property`，从未被 import）
> - `packages/converter/lib/Token.ts`（旧 `TokenType`，含 `Eof`/`QuasiQuote`/`Property`/`UnquoteExpand`/`Subscript` 等成员）
> - `packages/converter/lib/Common/Token.ts`、`packages/converter/lib/Common/IndexStream.ts`（整文件注释掉）
>
> 凡是看到 `QuasiQuote`、`Word`、`Subscript`、`Property`、`Ukn`、`UnquoteExpand`、或首字母大写第二字母小写的 `Eof` 这类名字，都属于 dead code。活的枚举用的是 `BackQuote`、`Identifier`、`DotColon`、`Dot`、`Unknown`、`EOF`。本章只记录活的 lexer 行为。

## 2. 完整 Token 类型表

下表是活枚举 `TokenType` 的全部成员（声明顺序即 0 起的数值；`packages/converter/lib/Lexer/Lexer.ts:1-52`）。Lexed 后每个 token 携带 `Type`、`Value`（原始文本片段）、`Row`、`Column`（起点，1 基）。

### 2.1 括号 / 定界符（各一字符）

| Token 类型 | 字符 | Kon 角色 |
|---|---|---|
| `BeginCurlyBracket` / `EndCurlyBracket` | `{` `}` | 无序 map |
| `BeginBracket` / `EndBracket` | `[` `]` | vector |
| `BeginParenthese` / `EndParenthese` | `(` `)` | knot |

`<` `>`（见下）在 Kon 里组成有序 map，但它们**不是**括号 token，而是 `LowerThan`/`BiggerThan`。

### 2.2 标点 / sigil

| Token 类型 | 字符 | Kon 角色（来自 `KonSyntaxConfig.ts`） |
|---|---|---|
| `VerticalBar` | `\|` | knot 参数定界符 |
| `Tilde` | `~` | 类型标注前缀 |
| `UpArrow` | `^` | suffix-complement |
| `QuestionMark` | `?` | （标识符尾可吸收一个，见 §6） |
| `ExclamationMark` | `!` | prefix |
| `Percent` | `%` | quote-macro |
| `Dollar` | `$` | syntax-macro |
| `Colon` | `:` | knot-special-prefix |
| `ColonColonColon` | `:::` | — |
| `ColonColon` | `::` | — |
| `DotColon` | `.:` | 成员/键访问（如 `m.:key`） |
| `UnquoteSplice` | `,@` | — |
| `UnquoteMap` | `,%` | — |
| `Semicolon` | `;` | pairs-separator / call-param-end |
| `BackQuote` | `` ` `` | knot-prefix-type |
| `Sharp` | `#` | knot-metadata 前缀（**不是注释**） |
| `Comma` | `,` | knot-postfix-type |
| `At` | `@` | action-macro |
| `Equal` | `=` | metadata-separator / value-flag |
| `Ampersand` | `&` | — |
| `LowerThan` | `<` | 有序 map 起始 |
| `BiggerThan` | `>` | 有序 map 结束 |
| `Dot` | `.` | — |
| `DotDot` | `..` | — |
| `DotDotDot` | `...` | — |

> **陷阱（`^`/`UpArrow` 的 suffix-complement 路径基本不可用，已实测）：** `^` 在词法层稳定切成单个 `UpArrow` token，单独的 `^` 也能 parse 成一个 Word。但只要 `^` 出现在某个 atom 的后缀位置（简单/末尾位置），parser 走 suffix-complement 分支时会因缺少后续值而报有界诊断：`KnConverter.Kon.Parser.Parse("a^")` 抛 `Modifier UpArrow at 1:2 must be followed by a value`（`a^b`、`(a^)` 等也同样报错，只是错误文案不同）。实践中这个后缀路径基本不可用，避免书写。`^` 在数据格式中的角色另见 [03 · Kon 数据格式](03-kon-data-format.md)。

### 2.3 Trivia（空白类，parser 会跳过）

`NewLine`、`Whitespace`、`SingleLineComment`。详见 §4。

### 2.4 字面量 / 原子

`Boolean`、`Nil`、`Unknown`、`Undefined`、`Number`、`RawString`、`String`、`Identifier`、`Operator`。

### 2.5 末端

`EOF`。注意：`Lex` **从不产出 `EOF` token**，它只返回数组；`EOF` 是 `TokenStreamV1.Current()` 在越界时合成出来的（`packages/converter/lib/Lexer/TokenStreamV1.ts:14-21`）。

### 2.6 声明了但**永不产出**的成员（陷阱）

- `Null`：枚举里有，但字面量 `null` 被映射成 `Unknown`，从不产出 `Null`（`packages/converter/lib/Lexer/Lexer.ts:207-209`）。
- `Symbol`：枚举里有，但 lexer 从不产出。形如 `:foo` 的 symbol 是 `Colon` + `Identifier` 两个 token，由 **parser** 组装，不是词法层的事。

## 3. 匹配算法（决定优先级）

`Lex` 从位置 0 向右扫描（`packages/converter/lib/Lexer/Lexer.ts:163-252`）：

1. 若当前字符是 `"` 或 `'`，交给手写的 `ReadStringToken`（绕过主正则，见 §8）。
2. 否则用一条带命名组的粘性大正则 `reg_` 从当前位置匹配。若匹配为 null 或 `match.index !== startat`，立即抛 `LexException("Invalid Token", row, column)`。
3. 按声明顺序取第一个非空命名组作为该 token 的类型。

**关键后果**：正则里 `Number` 的分支排在 `Operator` **之前**，且 `Number` 模式以 `-?` 开头，所以紧贴数字的 `-` 会被吃进**负数**，而不是减号 operator（见 §5 的陷阱）。

> **任何不在正则覆盖范围内的字符都是硬词法错误。** 非 ASCII 字母（`café`）、emoji、垂直制表符 `\x0B`、换页符 `\x0C`、不间断空格 ` ` 等都会抛 `LexException("Invalid Token")`。kunun 没有 Unicode 标识符、没有奇异空白。

## 4. 空白、换行、注释（trivia）

三类 trivia 都由 lexer 产出，但 parser 通过 `TokenStreamV1.BlankTypes` 一律跳过（`packages/converter/lib/Lexer/TokenStreamV1.ts:4-8`），所以它们在 token 之间通常不影响语义——**除非**它们改变了切分本身（见 §5 的 `-`/数字粘连、§7 的 `<` vs `<=`，这些是纯邻接、在 lexer 阶段就定了）。

### 4.1 Whitespace

- 用途：分隔 token。
- 精确形式：正则 `(?: |\t| |\r)+`（`packages/converter/lib/Lexer/Lexer.ts:141`）。字符集就是 **ASCII 空格、制表符 tab、回车 CR** 三种（模式里中间那个看似特殊的字符其实又是一个普通空格）。
- 语义：连续的空格/tab/CR 折叠成**一个** `Whitespace` token。
- 陷阱：CR（`\r`）属于 `Whitespace`，**不是** `NewLine`，也不推进行号。`\r\n` 切成 `Whitespace "\r"` + `NewLine "\n"`：

```
"a\r\nb" => Identifier:"a"  Whitespace:"\r"  NewLine:"\n"  Identifier:"b"
```

纯 lone-CR 行尾的文件会把所有 token 报在第 1 行。

### 4.2 NewLine

- 精确形式：单个 `\n` 自成一个 `NewLine` token（`packages/converter/lib/Lexer/Lexer.ts:142`）。
- 语义：只有 `\n` 会推进 `Row` 并把 `Column` 重置为 1（`AdvancePosition`，`packages/converter/lib/Lexer/Lexer.ts:316-326`）；其它字符（含 `\r`、tab）只把 `Column` +1。

### 4.3 行注释

- 用途：单行注释。
- 精确形式：`//` 直到行尾，正则 `\/\/.*\n`（`packages/converter/lib/Lexer/Lexer.ts:140`）。
- 语义：整段（含结尾 `\n`）成为一个 `SingleLineComment` token，被 parser 跳过。
- **没有块注释 / 多行注释语法。**
- `#` **不是注释**，它是 `Sharp`（Kon 里的 knot-metadata 前缀）。`#` 注释只存在于 dead 的 `lib/Lexer.ts`。

正确（注释后有换行）：

```
"// hi\n42" => SingleLineComment:"// hi\n"  Number:"42"
```

可运行（核心语言多表达式块，注释会被跳过，块返回最后一个表达式）：

```kon
// a comment
42
```

> 用 `RuntimeInterpreter.EvalBlockSourceSync("// a comment\n42\n")` 验证，结果 `42`。

**陷阱（高风险）：`//` 注释必须有结尾换行。** 若 `//` 出现在**最后一行且没有换行**，它不会被识别为注释——`//` 退化成两个 `Operator "/"`，注释正文当成代码切分：

```
"// no newline at end"
=> Operator:"/"  Operator:"/"  Whitespace:" "  Identifier:"no"  Whitespace:" "  Identifier:"newline" ...
```

务必让每个注释行以换行结尾。

## 5. 数字字面量

- 用途：整数与浮点字面量。
- 精确文法（正则 `packages/converter/lib/Lexer/Lexer.ts:145`）：

```
-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[Ee][+-]?\d+)?
```

即：可选前导 `-`；整数部分是 `0` 或不以 0 开头的数字串；可选小数部分 `.\d+`（小数点后必须有数字）；可选指数 `[Ee][+-]?\d+`。

- 语义：产出一个 `Number` token；解析为 JS number。

**全部接受的形式（均切成单个 `Number`，且 parse + exec 通过）：**

| 源 | 求值结果 |
|---|---|
| `0` | `0` |
| `42` | `42` |
| `-7` | `-7` |
| `3.14` | `3.14` |
| `-0.5` | `-0.5` |
| `1e10` | `10000000000` |
| `2.5E-3` | `0.0025` |
| `1.5e+2` | `150` |

> 逐条用 `RuntimeInterpreter.ExecSync(KnConverter.Kon.Parser.Parse(SRC))` 验证通过。

**全部不接受的边界（不会词法报错，而是“吃不下”，剩余部分另行切分）：**

| 写法 | 实际切分 | 说明 |
|---|---|---|
| `007` | `Number:"0"` `Number:"0"` `Number:"7"` | 不允许前导零 |
| `.5` | `Dot:"."` `Number:"5"` | 不允许前导小数点 |
| `5.` | `Number:"5"` `Dot:"."` | 不允许结尾小数点 |
| `0x1F` | `Number:"0"` `Identifier:"x1F"` | 无十六进制/二进制/八进制 |
| `1_000` | `Number:"1"` `Identifier:"_000"` | 数字里不能有下划线 |
| `1e` | `Number:"1"` `Identifier:"e"` | 指数必须带数字 |
| `1e+` | `Number:"1"` `Identifier:"e"` `Operator:"+"` | 不完整指数 |
| `+5` | `Operator:"+"` `Number:"5"` | 只有 `-` 能给数字签名，`+` 不能 |

**陷阱（全语言最高风险的词法意外）：紧贴数字的 `-` 是负号，不是减法。** 因为 `Number` 分支带 `-?` 且排在 `Operator` 之前：

```
"1-2" => Number:"1"  Number:"-2"     // 没有 operator token！
"a-1" => Identifier:"a"  Number:"-1"
```

要让 `-` 成为减法/operator token，**必须在两侧加空格**：

```
"1 - 2" => Number:"1"  Whitespace:" "  Operator:"-"  Whitespace:" "  Number:"2"
```

可运行对照（Kon 前缀调用 `-`；运算符是函数，调用时带 `:` 前缀，减法需要 `-` 是 operator）：

```kon
(:- 1 2)
```

> `RuntimeInterpreter.EvalBlockSourceSync("(:- 1 2)")` => `-1`；`(:+ 1 2)` => `3`。注意前缀写法里 operator 与操作数天然被空格隔开，所以不会被误吸成负数。写中缀风格 `1-2` 才会踩坑。

## 6. 标识符

- 用途：变量名、knot 名、键名等。
- 精确文法（正则 `packages/converter/lib/Lexer/Lexer.ts:150`）：

```
[_a-zA-Z][_a-zA-Z0-9]*[\?]?
```

即：ASCII 字母或下划线开头，后跟 ASCII 字母/数字/下划线，**结尾最多吸收一个** `?`。

- 语义：产出 `Identifier`（除非命中关键字，见 §6.1）。

```
"foo bar? _x x9" => Identifier:"foo"  Identifier:"bar?"  Identifier:"_x"  Identifier:"x9"
```

可运行（`?` 结尾的标识符可作绑定名）：

```kon
(var ready? true)
ready?
```

> `RuntimeInterpreter.EvalBlockSourceSync("(var ready? true)\nready?")` => `true`。

**规则与陷阱：**

- **仅 ASCII。** `café`、emoji、任何非 ASCII 字母都抛 `Invalid Token`。
- **`?` 只能作单个结尾字符。** 中间的 `?` 会切断标识符：`a?b` => `Identifier:"a?"` + `Identifier:"b"`；`a??` => `Identifier:"a?"` + `QuestionMark:"?"`。不能有 `??`，也不能把 `?` 放在非结尾位置。
- **`-`/`.` 不是标识符字符。** kebab-case 与点路径都会被切开：`foo-bar` => `Identifier:"foo"` `Operator:"-"` `Identifier:"bar"`；`a.b.c` => `Identifier:"a"` `Dot:"."` `Identifier:"b"` `Dot:"."` `Identifier:"c"`。（旧的注释掉的正则 `packages/converter/lib/Lexer/Lexer.ts:129,148-149` 曾允许 operator 字符进词，但活的模式不允许。点路径/词路径由 parser 重新拼装。）
- `+ - * / = < >` 同样不是标识符字符，它们各自是 operator/标点 token。

### 6.1 关键字识别（match 后处理）

匹配出 `Identifier` 后，按**精确值**改写类型（`packages/converter/lib/Lexer/Lexer.ts:201-218`）：

| 字面量 | Token 类型 | exec 结果 |
|---|---|---|
| `true` / `false` | `Boolean` | `true` / `false` |
| `null` | `Unknown` | （映射到 Unknown，非 `Null`） |
| `ukn` | `Unknown` | |
| `nil` | `Nil` | `null` |
| `undefined` | `Undefined` | |

只按精确值保留，`truex`、`nilable` 等是普通 `Identifier`：

```
"truex nilable" => Identifier:"truex"  Identifier:"nilable"
```

## 7. Operator 与各类 sigil/标点 token

### 7.1 Operator token

- 精确文法（正则 `packages/converter/lib/Lexer/Lexer.ts:151`）：

```
\+[\+|=]?|\-[\-|>|=]?|\*[=]?|\/[=]?|==|>=|<=
```

- 设计意图里的 14 个 operator 值：`+ ++ += - -- -> -= * *= / /= == >= <=`，token 类型为 `Operator`。
- **陷阱（正则字符类里的 `|` 是字面量，不是分支）：** 上面正则的 `[\+|=]` 与 `[\-|>|=]` 是**字符类**，里面的 `|` 是一个**普通字符**而非"或"分支。所以 lexer 实际还会多产出两个意外的 operator 值 `+|` 和 `-|`（紧贴在 `+`/`-` 后的单个 `|` 会被吃进 operator）。真实可产出集合至少有 16 个，不止 14 个。这意味着 `a+|b` 切成 `Identifier:"a"` `Operator:"+|"` `Identifier:"b"`——**不会**分出独立的 `VerticalBar`（已实测 `Lexer.Lex("a+|b")` 得到三个 token：`{Type:Identifier,Value:"a"}`、`{Type:Operator,Value:"+|"}`、`{Type:Identifier,Value:"b"}`）。只有当 `|` 紧跟 `+`/`-` 时才被吸收：单独的 `|`（如 `a|b`）仍是 `VerticalBar`。
- 贪婪/最长匹配（已验证）：

```
"+++" => Operator:"++"  Operator:"+"
"+==" => Operator:"+="  Equal:"="
"->"  => Operator:"->"
"a->b" => Identifier:"a"  Operator:"->"  Identifier:"b"
"a+|b" => Identifier:"a"  Operator:"+|"  Identifier:"b"   // |被吃进 operator，无 VerticalBar
"+|=" => Operator:"+|"  Equal:"="                          // 先吃 +|，再分出 =
"-|>" => Operator:"-|"  BiggerThan:">"                      // 先吃 -|，再分出 >
```

- **重要语义**：源码里 `if (type === TokenType.Operator) { type = TokenType.Identifier; }`（`packages/converter/lib/Lexer/Lexer.ts:198-200`）是**死代码**——它在 token 已用 `Operator` 构造之后改了个局部变量，发出的 token 仍是 `Operator`。parser 在所有“接受词”的地方都同时接受 `Identifier || Operator`（`packages/converter/lib/KnParserV1.ts:123,139,171,527,1007`），所以 operator 在 parse 层可当词/标识符用，但其 token 类型确实是 `Operator`。

### 7.2 单字符标点

```
"# $ % ^ ~ ! ? | ; = @ &"
=> Sharp Dollar Percent UpArrow Tilde ExclamationMark QuestionMark VerticalBar Semicolon Equal At Ampersand
```

- `=` => `Equal`，但 `==` => `Operator`。
- `<` => `LowerThan`，`>` => `BiggerThan`，但 `<=` `>=` => `Operator`。
- 无 `&&` / `||` operator：`&&` => 两个 `Ampersand`，`||` => 两个 `VerticalBar`。

**陷阱（邻接敏感）：** `<` `>` 单独成 token（Kon 里作有序 map 定界符），但 `<=` `>=` `==` 因贪婪匹配总是被吃成一个 `Operator`。要得到紧邻的 `LowerThan` + `Equal`，必须用空格隔开。`<>` => `LowerThan` + `BiggerThan`（Kon 里的空有序 map）。

### 7.3 多字符标点（按最长优先在正则中排序）

冒号家族（`packages/converter/lib/Lexer/Lexer.ts:158`）：

```
"::: :: : .: . .. ..."
=> ColonColonColon  ColonColon  Colon  DotColon  Dot  DotDot  DotDotDot
"::::" => ColonColonColon:":::"  Colon:":"
```

点家族：`.:` => `DotColon`，`...` => `DotDotDot`，`..` => `DotDot`，`.` => `Dot`。`a...` => `Identifier:"a"` + `DotDotDot`。

逗号家族（`packages/converter/lib/Lexer/Lexer.ts:155`）：

```
",@ ,% ," => UnquoteSplice:",@"  UnquoteMap:",%"  Comma:","
```

`.:` 在 Kon 中用于成员/键访问，可运行：

```kon
(var m {category = "frontend"})
(m.:category)
```

> `RuntimeInterpreter.EvalBlockSourceSync("(var m {category = \"frontend\"})\n(m.:category)")` => `"frontend"`。

### 7.4 括号 token

每个括号恒为单字符 token，紧跟在 trivia 之后早早匹配，绝不与相邻字符合并（`packages/converter/lib/Lexer/Lexer.ts:143`）。lexer **不追踪嵌套/配平**，那是 parser 的事。

```
"{}[]()" => BeginCurlyBracket  EndCurlyBracket  BeginBracket  EndBracket  BeginParenthese  EndParenthese
```

> Kon：`{}` 无序 map、`[]` vector、`()` knot、`<>` 有序 map（经 `LowerThan`/`BiggerThan`，非括号 token）。括号语义由 parser 决定，但词法切分恒定。

## 8. 字符串：由 `ReadStringToken` 专门处理

当 `Lex` 遇到开头的 `"` 或 `'` 时，**绕过主正则**，调用手写的 `ReadStringToken`（`packages/converter/lib/Lexer/Lexer.ts:254-306`）。返回的 token 的 `Value` 是**包含引号在内的整段原文**；去转义/插值留到 parser 做。

- `"` 定界 => `String`；`'` 定界 => `RawString`。
- 三引号 `"""` / `'''` 触发三引号字面量，可跨行。
- lexer 阶段只检查“定界符独占一行”等结构规则；缩进剥离、闭合对齐等在 **parser** 阶段。

词法边界速记（细节见 [04 · 字符串](04-strings.md)）：

```
'"a\\nb"'   => String:"\"a\\nb\""      // 双引号 String，含原始转义文本
"'a\\b'"    => RawString:"'a\\b'"       // 单引号 RawString，反斜杠是字面量
"'it''s'"   => RawString:"'it'"  RawString:"'s'"   // 单引号串不能含单引号
'"""inline"""' => THROW(Triple-quoted string opening delimiter must be alone on its line)
```

空串 `""`、`''` 合法。非三引号串里出现裸 `\n`/`\r` 抛 `Unterminated string literal`；到 EOF 仍未闭合也抛该错误（`packages/converter/lib/Lexer/Lexer.ts:286-305`）。本章不展开字符串语义，详见 [04 · 字符串](04-strings.md)。

## 9. 与 parser 的衔接

- lexer 不产 `EOF`；`TokenStreamV1.Current()` 越界时合成一个 `EOF`（value `""`，沿用最后一个 token 的 Row/Column）（`packages/converter/lib/Lexer/TokenStreamV1.ts:14-21`），`Next()` 越界返回 `null`。
- parser 用 `SkipBlankTokens()` 跳过 `NewLine`/`Whitespace`/`SingleLineComment`，靠 `Peek`/`Next` 单 token 前瞻。所以这些 trivia 在 token **之间**通常无关紧要——但凡是改变切分本身的邻接（`-`/数字、`<` vs `<=`）都在词法阶段就已确定，parser 无从挽回。
- `KnParserV1.Parse` 对全空白输入（`/^\s*$/s`）会短路成 `KnUnknown.Shared`，在 lex 之前就处理（`packages/converter/lib/KnParserV1.ts:30-35`）。

## 相关章节

- 字符串字面量（双引号/单引号/三引号、转义、插值、缩进剥离）：[04 · 字符串](04-strings.md)
- 数字/标识符/标点如何被 parser 组装成 AST：见后续语法章节。
