# 变更：同步 Kon Parser 语法

## 背景和动机 (Context And Why)

本项目是 `ExtensibleScopedRowType` 中 Kon 语法和解释器的早期 TypeScript 版本。当前已经恢复 `Knl`、`Kon`、`Kjson` 三个 converter 入口，但本项目的 `Kon` 仍主要是括号风格配置，尚未完全同步外部 Kon parser 的语法特征。

需要建立一个独立 track 来同步 parser 语法，同时保留三种 profile 的容器风格、key-value 分隔符和元素分隔符差异。

## “要做”和“不做” (Goals / Non-Goals)

**目标:**
- 让本项目 `KnConverter.Kon` 的 parser/formatter 行为与 `ExtensibleScopedRowType` 的 Kon parser 对齐。
- 保留 `Knl`、`Kon`、`Kjson` 三种 profile，并保持 map/vector/knot 容器配置差异。
- 将 `Knl` 和 `Kon` 的 array/map 元素分隔改为 whitespace-only，不支持 comma。
- 以外部 parser 代码为准，支持 `::` 作为 container subscript 词法 token 和 parser 结构。
- 同步外部项目已确认的新约定：`:::` 作为类型系统来源限定名，例如 `T1:::b`；`::` 不再承担来源限定语义。
- 记录外部项目文档已更新为 `:::` 来源限定、`::` container subscript、`.:` slot/static subscript 的基线。

**非目标:**
- 不同步解释器运行时行为。
- 不改变 `Kjson` 的 JSON-like 目标定位。
- 不在本 track 内解决所有类型系统语义或 row type 检查问题。
- 不实现类型系统解释或 row type 检查；仅在 parser/AST/formatter 层保留来源限定名所需信息。

## 变更内容（What Changes）

- **BREAKING**: `Knl` 和 `Kon` 的 array/map 逗号分隔输入将不再被接受。
- 扩展 lexer 以支持外部 Kon parser 所需 token，包括 `:::`, `::`、`.:`、`..`、quote/unquote 组合和相关 word/operator 形式。
- 扩展 AST model 以保存 external Kon parser 的链节点、签名、泛型、前后缀 marker、body/conf/slot/section 等信息。
- 扩展 word/name AST 以保留 `source:::member` 的 source qualifier 与 member name，并支持 `com.example.ClassA:::b`。
- 扩展 `KnParserV1` 使 `KonSyntaxConfig` 下支持 external Kon parser 的语法结构。
- 扩展 `KnFormatterV1` 使 `Kon` round-trip 外部 Kon 样例。
- 以外部项目当前实现和文档作为同步基线：`:::` 来源限定，`::` container subscript，`.:` slot/static subscript。

## 影响范围（Impact）

- 受影响的功能规范：`parser-syntax`
- 受影响的代码：
  - `lib/Converter/Lexer/Lexer.ts`
  - `lib/Converter/KnParserV1.ts`
  - `lib/Converter/KnFormatterV1.ts`
  - `lib/Converter/KnlSyntaxConfig.ts`
  - `lib/Converter/KonSyntaxConfig.ts`
  - `lib/Converter/KjsonSyntaxConfig.ts`
  - `lib/Model/*`
  - `__tests__/Case/*`
- 受影响的外部文档：
  - `/Users/kongweixian/lang/ExtensibleScopedRowType/docs/基于kon语法支持的类型系统.md`
