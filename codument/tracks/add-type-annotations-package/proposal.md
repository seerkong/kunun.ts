# 变更：kunun-type-annotations package

## 背景和动机

Kunun declarations already carry annotation-like data through metadata, attrs, named attrs, and modifier groups. RFC metadata such as required, description, storage hints, labels, and migration hints should live outside `kunun-type-system` core.

## Goals

- Add `kunun-type-annotations` workspace package.
- Extract normalized annotation entries from metadata carriers.
- Provide batteries-included annotation names.
- Keep dependency direction from annotations package to type-system/core, not the reverse.

## Verification

- `packages/type-annotations/__tests__/Case/TypeAnnotations.test.ts`
- `bun run typecheck`

