# 变更：schema types and mixins

## 背景和动机

Schema/ontology domains need nominal entity types and composition-only mixins while preserving row shape and origin behavior.

## Goals

- Add `SchemaTypeSymbol`.
- Add `SchemaMixinSymbol`.
- Build effective rows from mixins, far ancestors, near ancestors, and self.
- Check schema subtyping through parent graph.
- Reject inherited value type changes.

## Verification

- `packages/type-system/__tests__/Case/TypeSystemSchemaKernel.test.ts`

