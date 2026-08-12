# 变更：添加 typed navigation property 模型

## 背景和动机 (Context And Why)

Kunun class runtime 已区分 `field` 与 `prop`，但 type binder 只把 field、method 和 op 建成 `RowMember`。现有 property 测试主要验证 getter/setter accessor 执行，无法让下游 code-first 工具使用一个公开、静态、带类型和 metadata 的 navigation property 模型。

这导致 depa ORM 等下游建立 shadow entity/relation builder，并把关系声明迁移到独立 relation 原语。为了让 Kunun 类型系统重新成为 class DSL 和 programmatic code-first 的共同 authority，需要补齐 typed property member。

## Goals / Non-Goals

**目标：**

- 在 public type-system contract 中显式区分 field、property、method 和 spread member。
- 绑定带显式类型的 class `prop` 为 typed property member。
- 保留 property prefix annotations 和 declaration metadata，供 ORM 等扩展包读取但不由 core 解释。
- 允许 programmatic callers 通过 `RowMemberBuilder.Property` 与 `TypeSystem.DefineClass` 构造和 source binding 等价的 class model。
- 保持现有 accessor-only `prop` runtime 行为和 field/method 类型行为。

**非目标：**

- 不在 Kunun core 中定义 ORM cardinality、join tuple、cascade 或 database mapping。
- 不把 schema-level `RelationTypeSymbol` 改造成 class property。
- 不要求 property 由数据库 field 推导。
- 不在本 track 修改 depa ORM 或 consumer fixtures。

## 变更内容（What Changes）

- **BREAKING semantic extension**：`RowMember` 新增稳定的 member kind，`Property` 不再与 `Field` 混同。
- 新增 `RowMemberBuilder.Property` 和 `IsField` / `IsProperty` 查询面，同时保持 `IsMethod` compatibility。
- `KonTypeBinder` 识别显式 typed `prop`；缺少显式类型的 accessor property 保持现有 runtime-only 路径。
- property metadata 通过现有 `TypeMetadata` preservation path 保留。
- 新增 source-first/programmatic structural-equivalence、symbolic target、collection type、metadata 和 compatibility tests。

## 影响范围（Impact）

- 受影响的能力：`runtime-type-system`
- 受影响的代码：`kunun-type-system` 的 `Types`、`KonTypeBinder`、typed context/checker 与相关 tests
- 下游影响：depa ORM 可在后续 track 直接消费 typed navigation property，而不自建 relation authoring model
