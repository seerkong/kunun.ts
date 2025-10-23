# 变更：schema relations and query type sets

## 背景和动机

Schema/ontology domains need first-class relation schemas and APIs that compute exact or polymorphic schema type sets.

## Goals

- Add `RelationTypeSymbol`.
- Add directed and undirected endpoint compatibility checks.
- Add exact and polymorphic schema type-set APIs.

## Verification

- `packages/type-system/__tests__/Case/TypeSystemSchemaKernel.test.ts`

