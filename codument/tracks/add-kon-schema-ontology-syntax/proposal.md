# 变更：Kon schema/ontology syntax

## 背景和动机

The schema/ontology kernel is currently usable only through TypeScript APIs on `TypeSystem`. That proves the type-system model, but it leaves Kon users without source-level declarations for branded scalars, schema types, mixins, relations, and aliases.

This track adds idiomatic Kon declaration syntax that lowers to the existing kernel APIs. Alias syntax is intentionally same-level: an alias is declared with the same core keyword as the thing being aliased plus `:{ alias_of = ... }`.

## Goals

- Add Kon declarations for branded scalars, mixins, schema types, relations, schema aliases, relation aliases, and scoped attribute aliases.
- Lower those declarations in `KonTypeBinder` to the existing `TypeSystem` schema/ontology kernel APIs.
- Add binder/checker tests that exercise the new Kon syntax rather than only TypeScript API calls.
- Preserve annotation and metadata values for `kunun-type-annotations` without moving metadata policy into core row compatibility.
- Use same-level alias declarations: `(schema #Machine :{ alias_of = Server })`, `(relation #member_of :{ alias_of = works_in })`, and `(attr #host :{ alias_of = Server.hostname })`.
- Do not support nested alias declarations inside `schema` bodies.

## Non-Goals

- Do not redesign the existing `TypeSystem` schema/ontology kernel unless a small bug fix is required to bind the syntax safely.
- Do not add relation query expression syntax.
- Do not make schema declarations automatically create runtime constructors unless an existing binder/runtime path already requires it.
- Do not move `required`, `description`, storage representation, or similar metadata policies into core type compatibility.

## Proposed Kon Syntax

```kon
(scalar #Id :{ repr = String })

(mixin #Auditable :[
  (!String field #created_by)
])

(schema #Asset :[
  (!String field #name)
])

(schema #Server
  :{
    extends = Asset
    mixins = [Auditable]
  }
  :[
    (!String field #hostname)
  ])

(relation #works_in
  :{
    from = Server
    to = Department
    directed = true
  })

(relation #paired_with
  :{
    from = Person
    to = Person
    directed = false
  })

(schema #Machine :{ alias_of = Server })

(relation #member_of :{ alias_of = works_in })

(attr #host :{ alias_of = Server.hostname })
```

## Expected Behavior

- `scalar` registers a `BrandedScalarTypeSymbol`.
- `mixin` registers a `SchemaMixinSymbol` whose body uses existing row member syntax.
- `schema` registers a `SchemaTypeSymbol`; `extends` is the parent schema and `mixins` lists composition-only schema mixins.
- `relation` registers a `RelationTypeSymbol`; `directed` defaults to true when absent and can be explicitly configured.
- `schema` with `alias_of` registers only a schema alias; it MUST NOT have body, `extends`, or `mixins`.
- `relation` with `alias_of` registers only a relation alias; it MUST NOT have `from` or `to`.
- top-level `attr` with `:{ alias_of = SchemaName.attrName }` registers a scoped attribute alias; it MUST NOT be nested inside `schema`.

## Impact

- `packages/type-system/lib/KonTypeBinder.ts` gains new top-level declaration branches.
- `packages/type-system/__tests__/Case/TypeSystemSchemaKernel.test.ts` or a new dedicated test file gains Kon source binding tests.
- Existing TypeScript kernel API tests remain valid.
