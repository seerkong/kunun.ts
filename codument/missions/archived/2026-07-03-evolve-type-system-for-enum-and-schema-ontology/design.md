# Mission Design

## Current Type-System Reading

The current implementation is intentionally compact:

- `Types.ts` defines primitive, reference, function, effect, row, generic row, class/trait, class definition, and projection symbols.
- `RowMember` stores member name, type, qualifier, origin, method flag, access, and optional effect context.
- `TypeSystem.ts` exposes row/class/generic/effect APIs and routes public computation through `KonTypeComputationRuntime`.
- `TypeRegistry.ts` registers primitive types, arbitrary symbols, lazy row symbols, and effects by name.
- `KonTypeBinder.ts` binds top-level `type`, `fn`, `class`, and `trait` declarations; member binding is limited to `field`, `method`, and `op`.
- `KonTypeChecker.ts` resolves type prefixes, stack-shaped calls, slot/receiver access, projections, class body checks, generic functions/classes, and typed effects.
- `KonTypedRuntimeContext.ts` and `KonTypedExecutionContext.ts` materialize typed objects, class rows, projections, fields, method implementations, globals, and effect scopes.

This gives a strong row/projection/effect foundation, but the two RFCs require explicit nominal concepts, scoped value namespaces, annotation interpretation, canonicalization, and provider boundaries.

## Revised Layering Decision

Kunun's data representation already has syntax affordances for annotation-like metadata, including `#` markers and sticky prefix/postfix marks. Therefore metadata such as `required`, `description`, labels, storage representation, ORM/Cozo mapping, visibility/source flags, migration hints, and UI ordering should not become hard-coded `TypeSymbol` or `RowMember` compatibility fields.

The mission should use this package boundary:

| Layer | Owns | Does not own |
|---|---|---|
| `kunun-type-system` core | Type identity, enum/value nominality, row shape, source origin, structural subtyping, schema nominal graph, relation endpoint type compatibility, branded scalar identity. | Domain metadata vocabulary, storage mapping, UI labels, required/profile policy, Cozo/ORM persistence semantics. |
| `kunun-type-annotations` extension package | Batteries-included annotation extraction, normalized metadata bags, constraint profiles, common annotation vocabulary, adapter hooks for ORM/Cozo-like domains. | Core type compatibility, default runtime dispatch, parser token ownership. |
| Domain adapters | Storage-specific serialization, legacy fallback, database facts, ORM definitions, migration policy. | Core type-system semantics. |

`kunun-type-annotations` should be a new workspace package. It should depend on `kunun-type-system` and parser/core packages as needed. `kunun-type-system` must not depend on it. This keeps ordinary row/class/effect behavior small while giving downstream domains a ready-to-use annotation layer.

## RFC Gap Analysis

### Enum/value RFC

Required additions:

- `EnumTypeSymbol` as a closed nominal type.
- `EnumValueSymbol` or singleton value type owned by exactly one enum.
- Registry support for both `RecordStatus` and qualified values such as `RecordStatus.OPEN`.
- `TypeSystem.DefineEnum` and `TypeSystem.RequireEnum`.
- Binder support for top-level `enum` and body `value`.
- Checker support for enum type prefixes, enum value expressions, and rejection of raw strings.
- Optional compatibility for `Enum<T>` during downstream ORM migration.

Main risks:

- Choosing canonical enum value reference syntax before parser support is fully confirmed.
- Avoiding unqualified enum value collisions in the flat `TypeRegistry`.
- Preserving compatibility for existing `TypeReferenceSymbol` fallback behavior.

### Schema/ontology RFC

Required additions:

- A new `kunun-type-annotations` package that can parse/extract annotation metadata from typed declarations and provide batteries-included vocabularies for `required`, `description`, storage hints, labels, source visibility, and migration hints.
- A minimal core extension point, if needed, that preserves raw annotation carriers without interpreting them as type compatibility semantics.
- `BrandedScalarTypeSymbol` for values such as `Validity`.
- Alias/canonicalization APIs with cycle diagnostics and scoped attribute aliases.
- `SchemaTypeSymbol` with nominal single-parent hierarchy and row-backed effective attributes.
- `SchemaMixinSymbol` as composition-only member contribution, not subtype inheritance.
- Effective row builder with precedence `mixins -> far ancestors -> near ancestors -> self`.
- Core override checks for value-type compatibility.
- Annotation profile checks for required/optional tightening, storage compatibility, descriptions, and domain-specific validation.
- `RelationTypeSymbol` with directed/undirected endpoint validation.
- Schema query APIs for descendants, exact type sets, polymorphic type sets, and aggregate pre-checks.
- Optional `SchemaFactProvider` boundary for external schema stores.

Main risks:

- Mixing schema nominal subtype with existing structural row subtype too early.
- Adding Cozo-specific semantics to Kunun core instead of a reusable schema kernel.
- Letting annotation vocabulary leak into `kunun-type-system` as permanent core fields.
- Expanding binder syntax before the model and provider boundary are stable.
- Letting alias fallback or storage representation leak into ordinary runtime typing.

## Iteration Strategy

Use a foundation-first split:

1. Audit and lock behavioral baselines before changing model semantics.
2. Deliver enum/value as a focused nominal-type MVP.
3. Create `kunun-type-annotations` as the batteries-included annotation/metadata extension package.
4. Add branded scalar and alias infrastructure at the appropriate core or schema boundary.
5. Add schema types, mixins, effective rows, and core override policy.
6. Add annotation-backed schema constraint profiles for required/optional and domain metadata.
7. Add relation/query/provider/runtime-adapter boundaries.
8. Run integration verification and decide which knowledge becomes behavior/docs.

The enum track is smaller and can validate the nominal-symbol path early. Annotation work should be packaged separately before schema semantics depend on `required` or storage hints. Schema work should avoid binder-heavy syntax until the model APIs and annotation package boundary are proven by direct TypeSystem and extension-package tests.

## Mission Actors

| Actor | Role | Responsibility |
|---|---|---|
| MissionPlanner | desired-state producer | Maintains the staged mission graph and revises track boundaries when model evidence changes. |
| MissionObserver | sensor | Reads type-system code, tests, RFC summaries, behavior registry, active tracks, archives, and verification reports. |
| MissionReconciler | controller | Compares mission.xml desired state with actual track/test evidence and identifies ready, blocked, drifted, or complete states. |
| MissionApplier | actuator | Creates or revises bounded tracks, writes reports, updates mission.xml status/TrackLink bindings, and stops after one bounded action. |

## Controlled Replanning

Replanning is allowed when a track proves that an assumed boundary is wrong, a parser syntax choice is blocked, or downstream domain needs change the priority order. Any replan must:

- cite evidence in `reports/replan-XXX.md`;
- update `mission.xml` and increment `Metadata.Revision`;
- keep enum/value and schema/ontology concerns separately testable unless a dependency is proven;
- keep metadata/annotation interpretation in `kunun-type-annotations` unless a concept is proven to affect core type identity or compatibility;
- preserve default untyped runtime behavior as a non-negotiable gate.

## Candidate Tracks

| Candidate track | Purpose |
|---|---|
| `audit-type-system-rfc-baseline` | Convert this mission analysis into a precise behavior delta and implementation inventory. |
| `add-type-system-enum-values` | Add enum/value symbols, registry APIs, binder support, and checker tests. |
| `add-type-annotations-package` | Create `kunun-type-annotations` with annotation extraction, normalized metadata bags, built-in vocabulary, and tests over type declarations. |
| `add-type-system-branded-scalars` | Add branded scalar identity and conversion boundary without storage metadata policy in core. |
| `add-type-system-schema-alias-registry` | Add canonicalization and alias cycle diagnostics, including scoped attribute aliases. |
| `add-type-system-schema-types-and-mixins` | Add schema types, mixins, effective rows, and override safety. |
| `add-schema-annotation-constraint-profiles` | Implement required/optional and storage/domain constraint interpretation in `kunun-type-annotations`. |
| `add-type-system-relations-and-query-sets` | Add relation symbols, endpoint validation, type-set APIs, and provider boundary. |
| `verify-type-system-domain-integration` | Verify enum and schema features against ORM/Cozo-shaped fixtures and preserve existing row tests. |

## Verification Gates

- Run the existing type-system tests after every implementation track.
- Add core API tests before binder syntax where possible.
- Add package-boundary tests proving `kunun-type-system` has no dependency on `kunun-type-annotations`.
- Add binder diagnostics tests for each new top-level declaration.
- Add checker tests only after a value/reference syntax has been selected.
- Add annotation package tests for `#` and sticky mark metadata extraction before using those annotations in schema profiles.
- Add runtime/provider tests only after symbols and checker behavior are stable.
- Validate that default runtime APIs remain untyped unless an explicit typed entrypoint is used.
