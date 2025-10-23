# Decisions

## Usage
- 用于记录需要用户确认的决策问题、选项、最终结论与理由
- 问题标题不用字母前缀；字母只用于选项
- 后续执行过程中出现的新决策，也继续追加到本文件，不新建分散的决策记录

### 1. 【P0】`::` 语义来源
- 背景：外部 Kon parser 代码支持 `::` 作为 `ContainerSubscript`，但外部文档中有多处说明 `::` 不作为后缀访问操作符。
- 需要决定：同步本项目时以代码还是文档为准。
- 选项：
  - A) 以外部 parser 代码为准，支持 `::` container subscript。
  - B) 以文档为准，移除或禁用 `::` container subscript。
  - C) 其他。
- 当前建议：A
- 用户答复：以代码为准；同时更新外部文档。
- 最终决策：采用 A。
- 决策理由：用户明确要求“以代码为准”，且测试中已有 `(a::1::"a")` 用例。
- 状态：accepted

### 2. 【P0】Knl/Kon 容器元素分隔符
- 背景：本项目需要保留三种 profile 的容器和分隔符差异，但用户明确希望 Kon 和 Knl 的 array/map 元素分隔只支持 whitespace。
- 需要决定：是否继续接受 comma 作为 Knl/Kon 容器元素分隔符。
- 选项：
  - A) Knl/Kon 只支持 whitespace，不支持 comma。
  - B) Knl/Kon 同时接受 whitespace 和 comma。
  - C) 仅 Kon 对齐外部 comma 行为，Knl 保持 whitespace。
- 当前建议：A
- 用户答复：Kon 和 Knl，array/map 都应当改成只支持 whitespace，不支持 comma。
- 最终决策：采用 A。
- 决策理由：用户明确要求；Kjson 保持 JSON-like 分隔符目标。
- 状态：accepted

### 3. 【P0】类型系统来源限定符
- 背景：外部文档曾使用 `T1::b` 表示来源限定名，但外部 parser 已将 `::` 用作 `ContainerSubscript`。`.` 已用于 namespace/path，`.:` 已用于 slot/static subscript，因此不能复用这些 token 表示来源限定。
- 需要决定：类型系统来源限定名使用哪个紧凑、可手写、无歧义的分隔符。
- 选项：
  - A) 使用 `:::`，例如 `T1:::b`、`com.example.ClassA:::b`。
  - B) 使用 `.:`，但会和 slot/static subscript 冲突。
  - C) 使用 `.`，但会和 namespace/path 冲突，例如 `com.example.ClassA.b`。
  - D) 使用 metadata 或结构化 name，但不符合手写代码诉求。
- 当前建议：A
- 用户答复：同意选择 `:::` 做类型系统来源限定。
- 最终决策：采用 A。
- 决策理由：`:::` 能与 `.` namespace、`.:` slot/static subscript、`::` container subscript 清晰区分，并保持紧凑手写形式。
- 外部基线：`ExtensibleScopedRowType` 已实现 `SourceQualifier // :::` token、`KnWord.SourceQualifier`、formatter round-trip 和 type binder origin/member 拆分，并更新文档；全量 `dotnet test KonRowType.sln` 通过。
- 状态：accepted
