# 变更：schema annotation constraint profiles

## 背景和动机

Required/optional and storage/domain metadata should be interpreted by `kunun-type-annotations`, not by `kunun-type-system` core.

## Goals

- Keep required policy in the annotation package.
- Provide a schema constraint profile that rejects required-to-optional loosening.
- Demonstrate that ordinary row subtyping is unchanged.

## Verification

- `packages/type-annotations/__tests__/Case/TypeAnnotations.test.ts`

