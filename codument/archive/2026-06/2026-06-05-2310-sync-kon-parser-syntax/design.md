## 上下文

本项目的 converter 已经拆分为 `Knl`、`Kon`、`Kjson` 三个 profile。当前 `Kon` 只完成了容器括号层面的恢复，还没有同步 `ExtensibleScopedRowType` 外部 Kon parser 的完整语法。

本 track 只同步 parser 和 formatter 层面的数据表示语法，不涉及解释器运行语义。

## 方案概览

1. 保留 profile 配置边界
   - `Knl`、`Kon`、`Kjson` 继续通过 `SyntaxConfig` 区分容器 token、key-value 分隔符和元素分隔符。
   - `Kon` 使用 `{}` map、`[]` vector、`()` knot。
   - `Knl` 使用旧 KNL 容器风格。
   - `Kjson` 保持 JSON-like 目标。

2. 调整分隔符规则
   - `Knl` 和 `Kon` 的 array/map 元素分隔改为 whitespace-only。
   - `Knl` 和 `Kon` parser 遇到 comma 作为 array/map 元素分隔时应报错。
   - `Kjson` 不纳入 whitespace-only 约束，继续作为 JSON-like profile。

3. 迁移 external Kon parser 语法
   - 迁移 lexer 支持：`:::`、`::`、`.:`、`..rowSpread`、`?` suffix words、`->`、`--`、quote/unquote forms。
   - 迁移 value parser 支持：map、array、chain、raw/string/number/bool/null、word generic args、source-qualified word、row spread、quote/unquote、standalone in/out table。
   - 迁移 chain parser 支持：`#name`、`<T>`、`|in -> out|`、`:{conf}`、`:[body]`、`:name = container`、`:postfix`、`~instance`、`.:static`、`::container`、`@attr`。

4. 扩展 AST model
   - 优先在现有 `KnKnot` / `KnWord` / map/vector 模型上补字段，避免一次性替换所有 interpreter 依赖。
   - 新增 `KnInOutTable` 和 quote node 类型，或用现有 wrapper 类型补齐等价表达。
   - 保证 formatter 能 round-trip 保存 external Kon parser 结构。
   - `KnWord` 或等价 word model 需要保存 `SourceQualifier`，使 `T1:::b` 与 `com.example.ClassA:::b` 能区分 source path 与 member path。

5. 同步测试与文档
   - 移植 external `Kon.Core.Tests` 中 parser/formatter 语法测试到本项目。
   - 以外部项目当前代码和文档为基线：`:::` 表示类型系统来源限定，`::` 表示 container subscript，`.:` 表示 slot/static subscript。

## 影响范围与修改点（Impact）

- `lib/Converter/Lexer/Lexer.ts`：词法 token 与 operator/word 规则。
- `lib/Converter/KnParserV1.ts`：Kon parser 语法结构。
- `lib/Converter/KnFormatterV1.ts`：Kon formatter round-trip。
- `lib/Converter/*SyntaxConfig.ts`：分隔符和 profile 配置。
- `lib/Model/*`：语法所需 AST 字段和节点类型。
- `__tests__/Case/*`：新增 parser/formatter parity 测试。
- 外部项目基线：`ExtensibleScopedRowType` 已更新为 `:::` 来源限定名，并通过全量 `dotnet test KonRowType.sln`。

## 决策摘要

- 详见 `codument/tracks/sync-kon-parser-syntax/decisions.md`
- 当前关键结论：
  - `::` 以外部 parser 代码为准，作为 container subscript 支持。
  - `:::` 作为类型系统来源限定名，支持 `T1:::b` 和 `com.example.ClassA:::b`，与 `.` namespace、`.:` slot/static subscript 区分。
  - `Knl` 和 `Kon` 的 array/map 元素分隔只支持 whitespace，不支持 comma。

## 风险 / 权衡

- 风险：`Knl`/`Kon` 分隔符变更是 breaking change。
  - 缓解：用明确测试覆盖 comma rejection，并让 `Kjson` 保留 JSON-like 路径。
- 风险：外部 Kon 的 AST 类名与本项目 `KnKnot` 不完全一致。
  - 缓解：先在现有模型上补字段和等价节点，避免牵动解释器。
- 风险：`:::` 是新 token，必须采用最长匹配，避免把 `:::` 错分为 `::` + `:`。
  - 缓解：lexer 测试同时覆盖 `:::` source qualifier 与 `::` container subscript。

## 兼容性设计

- `Kjson` 保持 JSON-like 行为，不随 `Knl/Kon` whitespace-only 规则收紧。
- `Knl` 和 `Kon` 的 container bracket profile 仍由 `SyntaxConfig` 管理。
- 新增 AST 字段应尽量 optional，避免破坏现有 interpreter 代码。

## 迁移计划

1. 先添加 failing tests，覆盖 `Kon` external parser parity 和 `Knl/Kon` comma rejection。
2. 扩展 lexer 和 AST model。
3. 改 parser 通过 tests。
4. 改 formatter 通过 round-trip tests。
5. 对齐外部项目已完成的 `:::` / `::` / `.:` 文档基线。
6. 运行 TypeScript 编译和测试；若项目 tsconfig 与当前 TypeScript 不兼容，记录原因并运行可用的替代检查。

## 待解决问题

- `Kjson` 是否要严格 JSON comma 语法还是继续允许现有 parser 的宽松行为，暂不在本 track 内处理。
- `Kjson` 是否也需要严格拒绝非 JSON comma 形式，留给后续 JSON-like profile 精化。
