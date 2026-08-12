# Change: canonicalize ORM annotations with NamedConf

## Context And Why

Kunun's public datasource, entity, and field ORM annotation profiles still discover `#(orm #profile :{...})` by marker name and read `KnKnot.Conf`. The language already represents named annotation configuration in `KnKnot.NamedConf`, and typed class members preserve modifier knots in the public type-system model. Keeping the old transport would force depa ORM and downstream consumers to retain two annotation shapes.

## Goals

- Make `#(orm :datasource={...})`, `#(orm :entity={...})`, `#(orm :field={...})`, and generic `#(orm :relation={...})` the only canonical annotation transport.
- Keep ORM as a prefix annotation attached to datasource/class/Field/typed Property declarations.
- Parse Kunun's existing datasource/entity/field public profiles from NamedConf only.
- Preserve generic `:relation` metadata on typed Properties without reintroducing an ORM relation descriptor/profile.
- Reject old transport, profile/target mismatch, nested Field `storage`, datasource `key`/`name`, and invalid profile multiplicity.
- Keep the package family at the already-unreleased `1.0.4` and verify tests, typecheck, build, pack content, and publish dry run without publishing.

## Non-Goals

- Do not define depa ORM relation vocabulary or runtime schemas in Kunun.
- Do not reintroduce `OrmRelationAnnotationProfile`, detached `RelationModel`, or an ORM relation parser.
- Do not modify depa ORM's `OrmKununMetadata.*` adapters in this track.
- Do not publish packages.

## Impact

This is a hard source-contract change for Kunun ORM annotation consumers. Positive tests and generated public artifacts migrate to NamedConf. Old literals remain only in explicit rejection tests and immutable Codument archives.
