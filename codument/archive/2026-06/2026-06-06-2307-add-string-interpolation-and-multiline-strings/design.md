## 上下文
本 track 为 Kunun 增加字符串字面量能力：解释型字符串支持转义和插值，原始字符串保留字面内容。插值语法必须跟随 parser profile 的 knot delimiter；Kon 使用圆括号，Knl 使用方括号。

Workflow 相关测试和资源明确不属于本 track 输入，因为它们当前是半成品。

## 方案概览
1. 字符串字面量模型
  - `"..."` 表示解释型单行字符串，支持转义和插值。
  - `"""..."""` 表示解释型多行字符串，支持转义和插值；opening/closing delimiter 必须独占一行并左侧缩进对齐，delimiter 行除缩进和 delimiter 外不得包含其他非空内容。
  - `'...'` 表示原始单行字符串，不转义、不插值。
  - `'''...'''` 表示原始多行字符串，不转义、不插值；opening/closing delimiter 必须独占一行并左侧缩进对齐，delimiter 行除缩进和 delimiter 外不得包含其他非空内容。
2. 插值语法
  - 插值起始为反斜杠加当前 profile 的 knot start。
  - 插值结束为当前 profile 的 knot end。
  - Kon 示例为 `\(name)` 和 `\((1 2 :+))`。
  - Knl 示例为 `\[name]` 和 `\[[1 2 :+]]`。
3. Parser 表示
  - Raw 字符串可以继续使用或扩展现有 raw string representation。
  - Interpreted 字符串如果没有插值，可继续降级为普通 JavaScript string。
  - Interpreted 字符串如果包含插值，应使用显式 AST 节点记录片段，避免在 parser 阶段求值。
4. RuntimeInterpreter 求值
  - RuntimeInterpreter 识别插值字符串 AST。
  - 文本片段直接拼接。
  - 表达式片段通过 RuntimeInterpreter 当前求值路径执行，并按 JavaScript `String(value)` 或既有 `ToString` 行为转为文本。
5. 转义策略
  - 解释型字符串支持双引号、反斜杠、换行、tab、回车等常见转义。
  - 多行解释型字符串内单个双引号可作为内容；连续三双引号需要通过转义的双引号输出。
  - 原始字符串不提供转义，碰到自己的固定 delimiter 就结束；不引入可变 delimiter。
6. 多行缩进策略
  - 三引号 delimiter 左侧的缩进是内容裁剪基准。
  - Opening delimiter 左侧只能有缩进，closing delimiter 右侧至行尾也只能有空白；delimiter 不能和 knot/vector/调用的其他 token 共享一行。
  - 解析内部内容时，所有内容行都会移除与 delimiter 左侧相同宽度的缩进。
  - 非空内容行如果在该缩进列之前出现非空字符，parser 必须报错。
  - opening delimiter 行和 closing delimiter 行不进入字符串内容。

## 影响范围与修改点（Impact）
- `lib/Converter/Lexer/Lexer.ts`：识别 multiline 字符串和更复杂的 interpreted string 内容。
- `lib/Converter/KnParserV1.ts`：把字符串 token 或 scanner 结果转换为 raw/interpolated AST。
- `lib/Converter/SyntaxConfig.ts` 与各 profile config：暴露足够的字符串插值 delimiter 信息，优先复用 knot delimiter。
- `lib/Model/`：按需新增插值字符串节点类型。
- `lib/Util/KnNodeHelper.ts`：按需识别新增节点类型。
- `lib/RuntimeInterpreter/RuntimeInterpreter.ts`：执行插值字符串节点。
- `__tests__/Case/` 与 `__tests__/Resource/RuntimeInterpreter/`：增加非 workflow 覆盖。

## 决策摘要
- 详见 `codument/tracks/add-string-interpolation-and-multiline-strings/decisions.md`
- 当前关键结论：不使用可变 delimiter；raw 字符串不插值不转义；插值 delimiter 按 profile knot delimiter 派生。

## 风险 / 权衡
- 风险：当前 regex lexer 不适合嵌套插值和 multiline 内容。
  - 缓解措施：优先为字符串扫描增加专门逻辑，而不是继续堆叠单个复杂正则。
- 风险：parser 阶段误把插值表达式按错误 profile 解析。
  - 缓解措施：插值 parser 使用当前 KnParserV1 实例的 SyntaxConfig。
- 风险：raw/interpreted 字符串节点和普通 JS string 混用导致 runtime 行为不清晰。
  - 缓解措施：无插值解释型字符串可保持 JS string；有插值时使用明确节点类型。

## 兼容性设计
- 已存在的 `"abc"` 行为保持兼容。
- 已存在的 `'abc'` raw string 行为保持为 raw 字面值。
- 新的 multiline delimiter 是新增语法，不改变现有单行 delimiter。
- Legacy Interpreter 不在本 track 修改范围内。

## 迁移计划
1. 添加失败测试定义新字符串语法。
2. 扩展 parser 和 model。
3. 添加 RuntimeInterpreter 插值求值。
4. 跑非 workflow RuntimeInterpreter 测试和 parser syntax 测试。

## 待解决问题
- Kjson profile 是否需要在后续 track 中明确支持或排除插值。
- Kjson profile 是否需要在后续 track 中明确支持或排除插值。
