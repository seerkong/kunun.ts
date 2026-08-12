# Design: ORM NamedConf transport

## Canonical Mapping

| Profile | Target | Kunun responsibility |
| --- | --- | --- |
| `datasource` | datasource declaration | parse provider/environment/options; declaration name remains identity |
| `entity` | class/schema declaration | parse existing entity profile |
| `field` | Field member | parse flat scalar/column/index/validation profile |
| `relation` | typed Property member | preserve generic NamedConf metadata only |

NamedConf is transport into the public Kunun type-system model, not a model authority. Source-first and programmatic construction must expose equivalent attached metadata.

## Admission

The annotation knot must have core `orm`, no marker name, and exactly one supported NamedConf key. Existing public profiles accept only their matching key and target kind. Direct marker parsing is not canonical because it lacks attachment context.

The implementation rejects:

- `#(orm #field :{...})` and sibling old marker forms;
- target-internal ORM configuration;
- absent or multiple ORM NamedConf profiles;
- `:field` on a Property or `:relation` on a Field;
- nested `storage` under `:field`;
- relation keys under `:field`;
- datasource `key`/`name` and direct datasource node configuration.

## Authority Boundary

Kunun may expose a generic helper to locate an attached ORM NamedConf profile and validate target kind. Existing datasource/entity/field descriptors remain Kunun public API. Relation payload remains opaque generic metadata for downstream depa ORM and does not acquire a Kunun ORM descriptor, validator, or runtime projection.

## Package Boundary

Changes remain in the Kunun package family, use package-name imports across packages, preserve the runtime/type-system dependency boundary, retain `src` in package files, and keep every package at `1.0.4`.
