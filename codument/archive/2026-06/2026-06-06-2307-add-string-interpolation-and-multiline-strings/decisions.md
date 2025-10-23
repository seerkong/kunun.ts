# Decisions

## Usage
- 用于记录需要用户确认的决策问题、选项、最终结论与理由
- 问题标题不用字母前缀；字母只用于选项
- 后续执行过程中出现的新决策，也继续追加到本文件，不新建分散的决策记录

### 1. 【P0】字符串字面量族
- 背景：语言需要同时支持可插值字符串和不转义原始字符串。
- 需要决定：采用哪些 delimiter 作为正式语法。
- 选项：
  - A) 双引号解释型字符串 + 单引号原始字符串
  - B) 仅添加三双引号多行字符串
  - C) 其他（可填写）
- 当前建议：A
- 用户答复：同意使用 `"..."`、`"""..."""`、`'...'`、`'''...'''`。
- 最终决策：采用双引号解释型字符串和单引号原始字符串，各自支持单行与三引号多行形式。
- 决策理由：区分解释型和 raw 语义，避免 raw 字符串又承担转义规则。
- 状态：confirmed

### 2. 【P0】插值 delimiter 跟随 profile
- 背景：Kon 和 Knl 的 knot delimiter 不同。
- 需要决定：插值语法是否写死为一种 delimiter。
- 选项：
  - A) 跟随当前 profile 的 knot delimiter
  - B) 所有 profile 都使用 Kon 的圆括号插值
  - C) 其他（可填写）
- 当前建议：A
- 用户答复：Kon 中使用 `\(...)`，Knl 中使用 `\[...]`。
- 最终决策：插值 delimiter 跟随当前 parser profile 的 knot delimiter。
- 决策理由：保持与 Kon/Knl 既有语法视觉一致，避免在 Knl 中混入 Kon knot 形态。
- 状态：confirmed

### 3. 【P1】不引入可变长度 delimiter
- 背景：raw multiline 若需要包含自身 delimiter，C# 风格可变 delimiter 是一种扩展方案。
- 需要决定：第一版是否引入该能力。
- 选项：
  - A) 不引入，碰撞时切换另一种字符串形式
  - B) 引入 C# 风格可变长度 delimiter
  - C) 其他（可填写）
- 当前建议：A
- 用户答复：不需要变长 delimiter。
- 最终决策：不引入可变长度 delimiter。
- 决策理由：降低 lexer/parser 复杂度，当前需求可通过切换字符串形式解决常见 delimiter-like 内容。
- 状态：confirmed

### 4. 【P0】三引号多行字符串缩进
- 背景：三双引号和三单引号都是多行字符串，需要避免 resource 中出现不对齐、不可读的 inline 写法。
- 需要决定：三引号 delimiter 和内容缩进的正式规则。
- 选项：
  - A) opening/closing delimiter 独占一行并左侧对齐，内容按 delimiter 左侧缩进裁剪
  - B) 保留任意 inline 三引号形式
  - C) 其他（可填写）
- 当前建议：A
- 用户答复：三引号必须左侧对齐；中间行不能比 delimiter 左侧的非空字符更靠左；解析内部内容时忽略 delimiter 左侧部分。
- 最终决策：采用严格缩进裁剪规则，三引号 delimiter 独占一行并对齐，非空内容行不得比 delimiter 缩进更浅。
- 决策理由：让 multiline resource 的实际 Kon 代码保持可读，并使缩进不污染字符串内容。
- 状态：confirmed
