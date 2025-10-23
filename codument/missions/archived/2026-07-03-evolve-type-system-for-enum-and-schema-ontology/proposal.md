# Mission: evolve type system for enum and schema ontology

## Background

The current Kunun type system is an opt-in ExtensibleScopedRowType port. It already provides structural row types, open and closed rows, row member origin, source-qualified member access, row merge, generic row spread parameters, class and trait binding, C3 method resolution order, typed effect rows, and typed runtime object/projection support.

Two external type-system RFCs now require capabilities beyond the migrated row core:

- First-class enum/value support: closed nominal enum types, scoped enum values, enum-aware binder/checker behavior, and a path from `!Enum<RecordStatus>` to native `!RecordStatus`.
- Schema/ontology kernel support: nominal schema types, composition-only mixins, effective attributes, aliases/canonicalization, relation endpoint typing, branded scalar values such as `Validity`, schema query type-set computation, and an external schema fact provider boundary.
- Annotation/metadata support: Kunun source already has data-representation affordances such as `#` markers and sticky prefix/postfix marks. Metadata such as `required`, `description`, labels, storage representation, and ORM/Cozo mapping should therefore live in a batteries-included annotation extension package instead of becoming hard-coded type-system core fields.

The current implementation shape makes this a long-cycle mission rather than a single track:

- `TypeSymbol` is currently only `{ Name }`; semantic metadata is not a shared model concept.
- `TypeRegistry` is a direct name-to-symbol map with lazy symbols and effects; it has no alias/canonicalization layer or scoped value namespace.
- `KonTypeBinder` recognizes top-level `type`, `fn`, `class`, and `trait`; body members are `field`, `method`, and `op`.
- `KonTypeChecker` checks stack-shaped function calls, member access, projection, class bodies, and effect rows; it has no enum value expression or schema operation model.
- Typed runtime contexts focus on class/object/projection/effect scope behavior; they do not expose schema providers, branded scalar conversion, or enum value runtime representation.
- No workspace package currently owns reusable type annotations/metadata interpretation. A new `kunun-type-annotations` package should provide the annotation vocabulary, parsing helpers, constraint profiles, and domain adapter hooks while depending on `kunun-type-system`, not the other way around.

## Goals

- Plan an incremental path that preserves the existing row core and typed runtime behavior.
- Add enum/value as a smaller nominal finite-type feature with focused binder/checker/runtime value tests.
- Add schema/ontology concepts as a layered kernel over rows, not as Cozo-specific logic.
- Add a new batteries-included `kunun-type-annotations` package for annotation/metadata extraction and interpretation over type declarations.
- Keep external stores as providers/adapters; Kunun core should model facts and validation boundaries, not own Cozo persistence.
- Split implementation into reviewable tracks with clear acceptance and regression points.

## Non-Goals

- Do not replace structural row subtyping.
- Do not force existing `class` or `type` declarations to become schema types.
- Do not implement Cozo stored relations, ORM compilers, or ontology/rule/action semantics in Kunun core.
- Do not make `required`, `description`, storage mapping, labels, source visibility, or migration hints core type-compatibility fields.
- Do not make enum values interchangeable with strings.
- Do not enable typed execution by default for ordinary runtime evaluation.

## Success Criteria

- Enum declarations bind and register `EnumTypeSymbol` and qualified `EnumValueSymbol` values.
- `!RecordStatus` resolves through the normal type prefix path, and `RecordStatus` is not compatible with `String` merely because its representation is string-like.
- Duplicate enum values and invalid enum bodies produce diagnostics.
- The `kunun-type-annotations` package can read Kunun declaration annotations and expose normalized metadata for fields, enum values, schema types, relations, and branded scalars.
- Annotation profiles can implement constraints such as required/optional tightening without changing ordinary row subtyping.
- Branded scalar symbols can represent values such as `Validity` without becoming plain primitives.
- Alias resolution detects cycles and exposes canonical/original names for diagnostics.
- Schema types are nominal, use a single parent graph, compose mixins without creating subtype edges, and can produce effective rows with origin-preserving attributes.
- Schema override checks reject value-type changes in the core schema layer; annotation profiles can additionally reject required-to-optional loosening while allowing optional-to-required tightening.
- Relation endpoint checks accept schema subtypes and reject incompatible endpoints.
- Schema query helpers can compute exact and polymorphic type sets.
- All tracks preserve existing `packages/type-system` tests and add focused tests matching the current `TypeSystemCore`, `TypeSystemBinder`, and `TypeSystemChecker` style.

## Why Mission, Not One Track

The requested change spans the core type model, registry APIs, computation runtime operations, binder syntax, checker semantics, runtime value boundaries, annotation interpretation, and eventual domain adapters. Some parts can proceed in parallel after a shared baseline audit, but later schema work depends on enum nominal symbols, the annotation package boundary, branded scalar, and alias decisions. A mission allows controlled re-planning after evidence from the enum MVP, annotation package, and schema foundation tracks.
