# Design: Kon schema/ontology syntax

## Current State

The schema/ontology kernel is available through `TypeSystem` APIs:

- `DefineBrandedScalar`
- `DefineSchemaMixin`
- `DefineSchemaType`
- `DefineRelation`
- `DefineSchemaTypeAlias`
- `DefineRelationAlias`
- `DefineAttributeAlias`

`KonTypeBinder` currently routes only `type`, `fn`, `class`, `trait`, and `enum` top-level declarations. Therefore the existing kernel has no Kon source-level syntax.

## Syntax Lowering

### `scalar`

```kon
(scalar #Id :{ repr = String })
```

Lowering:

```ts
typeSystem.DefineBrandedScalar('Id', representation)
```

If `repr` is absent, default to `String`, matching enum representation default behavior.

### `mixin`

```kon
(mixin #Auditable :[
  (!String field #created_by)
])
```

Lowering:

```ts
typeSystem.DefineSchemaMixin('Auditable', members)
```

Use the same row member reader as `type` / `class` declarations so field and method syntax remains consistent.

### `schema`

```kon
(schema #Server
  :{
    extends = Asset
    mixins = [Auditable]
  }
  :[
    (!String field #hostname)
  ])
```

Lowering:

```ts
typeSystem.DefineSchemaType('Server', members, {
  Parent: 'Asset',
  Mixins: ['Auditable'],
})
```

`extends` is a single parent schema. `mixins` is a vector/list of mixin names in the config map. The effective-row and inherited-type-safety rules stay in the kernel.

### `relation`

```kon
(relation #works_in
  :{
    from = Server
    to = Department
    directed = true
  })
```

Lowering:

```ts
typeSystem.DefineRelation('works_in', 'Server', 'Department', true)
```

`directed` defaults to true when absent and can be explicitly false:

```kon
(relation #paired_with :{ from = Person to = Person directed = false })
```

### aliases

```kon
(schema #Machine :{ alias_of = Server })
(relation #member_of :{ alias_of = works_in })
(attr #host :{ alias_of = Server.hostname })
```

Lowering:

```ts
typeSystem.DefineSchemaTypeAlias('Machine', 'Server')
typeSystem.DefineRelationAlias('member_of', 'works_in')
typeSystem.DefineAttributeAlias('Server', 'host', 'hostname')
```

Alias rules:

- Alias declarations are always same-level top-level declarations, not nested inside schema bodies.
- The core keyword says what kind of alias is being declared.
- The `#name` position always names the new alias.
- `alias_of` names the canonical target.
- `(schema #Machine :{ alias_of = Server })` registers `Machine` as an alias of schema `Server`.
- `(relation #member_of :{ alias_of = works_in })` registers `member_of` as an alias of relation `works_in`.
- `(attr #host :{ alias_of = Server.hostname })` registers `host` as a scoped attribute alias for canonical attribute `hostname` on schema `Server`.
- A `schema` alias MUST NOT include body, `extends`, or `mixins`.
- A `relation` alias MUST NOT include `from` or `to`.
- An `attr` alias MUST be top-level and its target MUST be a qualified `SchemaName.attributeName`.

## Diagnostics

Add stable binder diagnostics for:

- malformed declaration name
- unknown representation type
- unknown parent schema
- unknown schema mixin
- unknown relation endpoint schema
- duplicate declaration
- alias cycle
- malformed `alias_of` target

Diagnostics should not abort the entire bind pass.

## Testing Plan

- Add positive Kon source binding tests for every declaration form.
- Add negative tests for missing schema targets and alias cycles.
- Keep existing TypeScript API tests as kernel tests.
- Add at least one test that verifies `(attr #host :{ alias_of = Server.hostname })` resolves `host` to `hostname` in `Server` scope.
