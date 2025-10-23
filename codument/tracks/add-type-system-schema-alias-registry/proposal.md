# 变更：schema alias registry

## 背景和动机

Schema/ontology domains need canonicalization for type, relation, and scoped attribute names with cycle diagnostics.

## Goals

- Add schema type alias APIs.
- Add relation alias APIs.
- Add scoped attribute alias APIs.
- Detect alias cycles.

## Verification

- `packages/type-system/__tests__/Case/TypeSystemSchemaKernel.test.ts`

