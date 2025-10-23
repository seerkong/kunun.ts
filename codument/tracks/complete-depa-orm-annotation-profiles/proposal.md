# 变更：Complete depa-orm annotation profiles

## 背景和动机 (Context And Why)

The previous depa-orm feedback confirmed that Kunun now has the key adapter prerequisites: row member metadata preservation, relation metadata, field scalar/storage metadata, and canonical `:{ ... }` annotation syntax. The remaining Kunun-side work is to make the annotation package a more stable depa adapter contract instead of leaving scattered parsing and validation in depa-orm.

## "要做"和"不做" (Goals / Non-Goals)

**目标:**
- Support canonical field object `properties = [ ... ]` while retaining singular `property` compatibility.
- Extend relation order descriptors toward depa `DataQueryIdentifier`.
- Add depa-oriented relation validation helpers for enum values, cascade values, endpoint shape, join-key cardinality, and through continuity.
- Add typed ORM entity and datasource annotation profiles.
- Cover all additions with tests using canonical Kon `:{ ... }` syntax.

**非目标:**
- Do not move ORM semantics into core type compatibility.
- Do not implement the depa-orm adapter in this repository.
- Do not require the Kunun type registry to know business scalar names.
- Do not make schema lookup validation mandatory; adapter-provided context remains optional.

## 变更内容（What Changes）

- `kunun-type-annotations` gains stronger field/relation profile coverage.
- `kunun-type-annotations` gains `OrmEntityAnnotationProfile` and `OrmDataSourceAnnotationProfile`.
- Relation validation is exposed as a helper that depa-orm can call before generating ORM definitions.
- Tests document canonical examples and compatibility behavior.

## 影响范围（Impact）

- 受影响的能力（behaviors）：`runtime-type-system`
- 受影响的代码：
  - `packages/type-annotations/lib/`
  - `packages/type-annotations/__tests__/Case/TypeAnnotations.test.ts`
  - `codument/tracks/complete-depa-orm-annotation-profiles/`
