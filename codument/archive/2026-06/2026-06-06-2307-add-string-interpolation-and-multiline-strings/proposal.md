# 变更：添加多行字符串与字符串插值

## 背景和动机 (Context And Why)
Kunun 当前字符串能力不足以舒适表达包含换行、模板文本和运行时值拼接的脚本。RuntimeInterpreter 的新资源脚本已经在向更完整的 Kon/Knl 语法演进，字符串字面量需要支持多行内容和 profile-aware 的表达式插值。

## “要做”和“不做” (Goals / Non-Goals)
**目标:**
- 支持双引号解释型字符串的单行和三双引号多行形式。
- 支持单引号原始字符串的单行和三单引号多行形式。
- 支持 profile-specific 字符串插值：Kon 使用反斜杠加圆括号，Knl 使用反斜杠加方括号。
- 在 RuntimeInterpreter 中按当前环境求值插值表达式并拼接结果。
- 添加 parser 和 RuntimeInterpreter 测试，覆盖转义、插值、原始字符串和 delimiter-like 内容。

**非目标:**
- 不实现可变长度 delimiter。
- 不把 workflow 半成品测试或资源纳入本 track 范围。
- 不改变 legacy Interpreter 语义。
- 不实现完整格式化器重写；仅在必要时补足新 AST 的基本输出支持。
- 不强制 Kjson 在本 track 中获得插值能力，除非实现时发现共享 lexer 需要最小兼容处理。

## 变更内容（What Changes）
- 扩展 lexer/parser，使其识别 `"`、`"""`、`'`、`'''` 四种字符串字面量形态。
- 为解释型字符串增加字符串片段与插值片段的 parser/runtime 表达。
- 插值表达式按当前 SyntaxConfig 的 knot delimiter 解析。
- RuntimeInterpreter 对插值字符串执行当前环境求值，并将结果转换为字符串拼接。
- Raw 字符串保持字面内容，不处理转义和插值。

## 影响范围（Impact）
- 受影响的功能规范：`parser-syntax`、`runtime-interpreter`
- 受影响的代码：`lib/Converter/Lexer/Lexer.ts`、`lib/Converter/KnParserV1.ts`、`lib/Converter/*SyntaxConfig.ts`、`lib/Model/*`、`lib/RuntimeInterpreter/*`
- 受影响的测试：parser syntax tests、RuntimeInterpreter source/string tests、非 workflow RuntimeInterpreter resource scripts
