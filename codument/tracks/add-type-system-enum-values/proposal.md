# 变更：first-class enum values

## 背景和动机

The enum/value RFC requires Kunun to treat enum as a closed nominal type and enum values as scoped singleton values instead of ORM-only metadata.

## Goals

- Add `EnumTypeSymbol` and `EnumValueSymbol`.
- Add `TypeSystem.DefineEnum` and `RequireEnum`.
- Register enum types and qualified enum values.
- Bind `(enum #Name :[ (value #A) ])`.
- Check that enum types are not raw strings.

## Verification

- `packages/type-system/__tests__/Case/TypeSystemEnum.test.ts`
- `bun run typecheck`

