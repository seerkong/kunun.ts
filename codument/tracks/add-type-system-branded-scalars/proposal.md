# 变更：branded scalar types

## 背景和动机

Schema/ontology domains need scalar-like values such as `Validity` that have a representation but remain nominally distinct from primitive strings or ints.

## Goals

- Add `BrandedScalarTypeSymbol`.
- Add `TypeSystem.DefineBrandedScalar` and `RequireBrandedScalar`.
- Ensure branded scalar compatibility is nominal and not automatically compatible with the representation type.

## Verification

- `packages/type-system/__tests__/Case/TypeSystemSchemaKernel.test.ts`
- `bun run typecheck`

