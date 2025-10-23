## 上下文

Core relations currently express ontology/type endpoints. depa-orm relations express both endpoints and concrete ORM implementation paths. The new design keeps these layers together at the source declaration site but separate in meaning:

- `(relation ...)` remains the core ontology/type-system declaration.
- `#(orm #relation :{ ... })` is a prefix annotation that configures ORM interpretation.
- Field declarations keep their language type, while business/domain scalar meaning and ORM storage mapping are expressed as field prefix annotations.

## 方案概览

1. Canonical source shape
   - Use a prefix Knot annotation immediately before the relation declaration.
   - The marker core is `orm`, and marker name is `relation`.
   - The marker config uses `:{ ... }` because each child concept such as `from`, `to`, `write`, and `cardinality` appears once.
   - Repeated child concepts, such as multi-hop `through` segments or constraints, are represented as arrays inside that config.

```kon
#(orm #relation :{
  cardinality = many_to_one
  from = {
    field = relation_b2
    keys = [_b2]
    foreign = true
    visible = true
    enable_write_biz_fields = false
  }
  to = {
    field = rev__B__relation_b2
    keys = [_id]
    foreign = false
    visible = false
  }
  write = {
    cascade_delete = delete
  }
})
(relation #B_to_A
  :{
    from = B
    to = A
    directed = true
  })
```

2. Through path support
   - A `through` item represents one ordered intermediate path segment.
   - Multiple `through` items are interpreted in source order.
   - Endpoint join semantics:
     - `from.keys` connects to first `through.from_keys`.
     - `through[i].to_keys` connects to `through[i+1].from_keys`.
     - final `through.to_keys` connects to `to.keys`.

```kon
#(orm #relation :{
  cardinality = many_to_many
  from = { field = roles keys = [_id] }
  through = [
    (through #UserRole :{
      from_keys = [user_id]
      to_keys = [role_id]
      from_foreign = true
      to_foreign = true
      on = [
        { field = whether_delete equals = 0 }
        { field = relation_key equals = User_to_Role }
      ]
    })
  ]
  to = { field = users keys = [_id] }
  write = { cascade_delete = delete }
})
(relation #User_to_Role
  :{
    from = User
    to = Role
    directed = false
  })
```

3. Annotation profile API
   - Add a typed profile in `kunun-type-annotations`, for example `OrmRelationAnnotationProfile`.
   - The profile accepts a parsed relation Knot or annotation entry and returns a normalized descriptor:
     - `Cardinality`
     - `From`
     - `Through[]`
     - `To`
     - `Write`
     - `Type`
   - The profile validates required sections and reports diagnostics without affecting core type binding.

4. Type-system integration
   - Keep `RelationTypeSymbol` focused on `Name`, `From`, `To`, `Directed`, and generic metadata.
   - Ensure relation source annotations remain recoverable by downstream tooling.
   - If needed, add a binder-side source metadata carrier that stores normalized annotation bags without interpreting ORM semantics.

5. Field metadata preservation
   - `RowMember` should preserve declaration metadata so field-level ORM information can survive binding.
   - Field metadata includes declaration config such as `:{ required = true index = true unique = false fieldLength = "128" dateMode = text enumSource = ArticleStatus refType = Category }`, metadata such as `#description = ...`, and prefix annotations such as `#(orm #field :{ ... })`.
   - The annotation package can then extract from bound row members rather than requiring every ORM adapter to keep an AST side table.

6. Field business type and ORM scalar profiles
   - Kunun core scalar types remain small and language-oriented. A field that is logically an email, phone number, person id, department id, rich-text value, file, picture, JSON object, or list still declares a core type such as `!String`, `!Int`, `!Bool`, or a collection/schema type.
   - Business meaning is attached through `#(domain #field :{ ... })`.
   - ORM/depa scalar mapping is attached through `#(orm #field :{ ... })`.
   - The binder preserves these prefix annotations on `RowMember.Metadata.source_annotations`; `kunun-type-annotations` parses them into typed descriptors.

```kon
#(domain #field :{
  type = { name = PhoneNumber base = String }
  validate = { kind = e164 }
})
#(orm #field :{
  type = { code = phone base = string }
  db = { name = mobile_phone type = varchar }
  format = e164
})
(!String field #phone :{ required = true })
```

For collection-like ORM/business fields, the field can keep a representational core type while the ORM annotation carries item semantics:

```kon
#(orm #field :{
  type = { code = list base = string multiple = true }
  items = { code = person base = string ref_type = __person }
  db = { name = owner_ids type = json }
})
(!String field #owners)
```

## 影响范围与修改点（Impact）

- `packages/type-annotations/lib/Annotations.ts` or adjacent files: relation-specific ORM profile parsing.
- `packages/type-annotations/lib/OrmFieldAnnotations.ts`: field-specific domain and ORM profile parsing.
- `packages/type-annotations/__tests__/Case/`: profile tests.
- `packages/type-system/lib/KonTypeBinder.ts`: preserve relation source annotation context if current consumers cannot access AST nodes.
- `packages/type-system/lib/Types.ts`: preserve metadata on row members.
- `packages/type-system/__tests__/Case/`: integration tests for annotated relation declarations.

## 决策摘要

- ORM relation data is represented as a prefix Knot annotation.
- Business field type and ORM scalar mapping data are represented as field prefix Knot annotations.
- depa-orm scalar universe is not promoted into `TypeRegistry`; adapters consume annotation profiles instead.
- The project will not introduce `(orm-relation ...)`.
- `through` is an ordered array of implementation path segments.
- ORM metadata remains outside core type compatibility.

## 风险 / 权衡

- Prefix annotations are AST-level information; if downstream tools only receive `RelationTypeSymbol`, extra preservation work may be needed.
- Too much ORM behavior in one annotation can become dense; typed profile validation should produce precise diagnostics.
- Cardinality could be useful to the type system later, but this track keeps it in the ORM profile until query/type rules require core support.

## 兼容性设计

- Existing `(relation ...)` declarations without ORM annotations remain valid.
- Existing field declarations without domain/ORM field annotations remain valid.
- depa-orm business scalar adapters can map `#(domain #field ...)` and `#(orm #field ...)` to `FieldDefinition` without needing new Kunun built-ins.
- Existing depa-orm relation resources can migrate mechanically:
  - `originEntity` / `targetEntity` become relation config `from` / `to`.
  - `originFieldKey` / `targetFieldKey` become ORM annotation `from.field` / `to.field`.
  - `originJoinKeys` / `targetJoinKeys` become ORM annotation `from.keys` / `to.keys`.
  - `relationshipType` becomes `cardinality = ...`.
  - `cascadeDelete` becomes `write = { cascade_delete = ... }`.

## 迁移计划

1. Implement annotation profile parser and tests.
2. Add binder/source integration tests proving prefix annotations survive relation parsing.
3. Add depa-orm migration fixture examples.
4. Keep query/runtime consumption for a later track.

## 待解决问题

- Final API names for typed ORM annotation descriptor classes.
- Whether to store normalized descriptors on relation symbols or let ORM tooling parse from source AST directly.
