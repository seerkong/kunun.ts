# Decisions

## Planning Assumptions

- Question severity is `light`: the user asked for planning, analysis, and mission creation, so this mission proceeds without blocking questions.
- The mission is self-contained; RFC content is summarized here rather than requiring a reader to open hidden project inputs.
- Enum/value should be the first implementation feature because it is smaller, validates nominal symbol and registry changes, and is useful independently.
- Schema/ontology support should be layered over rows and implemented through reusable kernel APIs, not hardcoded for Cozo OM.
- Metadata such as `required`, `description`, storage representation, labels, visibility/source flags, and migration hints should be modeled as annotations interpreted by an extension package, not as core type-system fields.
- Create a new workspace package named `kunun-type-annotations` for batteries-included annotation extraction, normalized metadata, constraint profiles, and adapter hooks.
- `kunun-type-annotations` may depend on `kunun-type-system`; `kunun-type-system` must not depend on `kunun-type-annotations`.
- Binder surface syntax for schema declarations can remain tentative until model-level APIs and tests are stable.
- The first schema tracks should favor direct TypeSystem API tests before committing to final Kon syntax.
- `Enum<T>` compatibility is a migration aid, not the core enum model.
- Default untyped runtime behavior is a hard compatibility boundary.

## Open Decisions For Future Tracks

- Final enum value reference syntax: `RecordStatus.OPEN`, `#RecordStatus.OPEN`, or `(value-ref #RecordStatus #OPEN)`.
- Whether `Enum<T>` remains a first-class generic alias or only a compatibility binder rewrite.
- Whether schema types are a new `schema` declaration or a mode on existing `class`/`type`.
- Which raw parser/data-representation nodes should count as annotation carriers for the first `kunun-type-annotations` implementation.
- Which annotation vocabulary is built-in versus domain-provided.
- Whether alias APIs live in `TypeRegistry` or a dedicated `SchemaRegistry` wrapping it.
- Whether external schema fact providers should be synchronous, asynchronous, or both.
