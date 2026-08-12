# Change: remove ORM datasource identity duplication

## Context And Why

Fresh verification of the NamedConf migration found that runtime parsing rejects datasource `key` and `name`, but `OrmDataSourceAnnotationDescriptor` and generated declarations still publicly expose `Key` and `Name`. The public type contract therefore retains the duplicate identity authority the migration intended to remove.

## Goal

- Remove `Key` and `Name` from the public datasource annotation descriptor and generated declarations/bundles.
- Add a public-surface regression test.
- Rebuild, typecheck, pack-dry-run, and verify Kunun `1.0.4` artifacts.
- Clarify in new evidence that `npm publish --dry-run` ran but no real publication occurred.

## Non-Goals

- Do not edit immutable archived track reports.
- Do not change datasource declaration identity or depa ORM runtime projection.
- Do not publish or bump Kunun beyond `1.0.4`.
