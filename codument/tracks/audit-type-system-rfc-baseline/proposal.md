# 变更：type-system RFC baseline audit

## 背景和动机

Mission `evolve-type-system-for-enum-and-schema-ontology` 需要把 enum/value、annotation metadata、schema/ontology kernel 需求拆成可追踪实现边界。本 track 记录基线审计和边界确认。

## Goals

- 确认 enum/value 属于 `kunun-type-system` core nominal model。
- 确认 `required`、`description`、storage hints 等 metadata 属于 `kunun-type-annotations` extension package。
- 确认 schema type/mixin/relation/query set 属于 row core 之上的 schema kernel。

## Non-Goals

- 不直接新增运行时代码。
- 不把 domain metadata 写入 `TypeSymbol` 或 `RowMember` core 字段。

## Verification

- Mission design/proposal/decisions 已记录分层边界。
- 后续 implementation tracks 已按该边界落地。

