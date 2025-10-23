# 变更：Relation ORM annotations

## 背景和动机 (Context And Why)

Kunun now has core relation declarations such as `(relation #works_in :{ from = Server to = Department directed = true })`. That syntax is useful for ontology/type-system relation endpoints, but it cannot yet describe ORM implementation details such as relation property keys, join keys, through tables, visibility, or cascade-write behavior.

The depa-orm DSL already models these implementation details through `RelationshipDefinition`, `RelationProperty`, `RelationPathEndpoint`, and `RelationPathThrough`. To migrate that DSL into Kunun without polluting the type-system core, ORM-specific relation data should be expressed as Kunun prefix annotations on the relation declaration.

## "要做"和"不做" (Goals / Non-Goals)

**目标:**
- Define canonical syntax for ORM relation implementation annotations using prefix Knot annotations.
- Add a relation annotation profile that parses canonical `#(orm #relation :{ ... })` from relation declarations.
- Support endpoint metadata: property field, join keys, visibility, foreign-key placement, and write flags.
- Support ordered `through` path segments, including multi-through paths and constraints.
- Preserve field-level metadata on bound row members so ORM FieldDefinition data can survive Kunun binding.
- Support depa-orm relationship fields such as relation type and endpoint display names in the ORM relation profile.
- Support business/ORM scalar profiles through field prefix annotations instead of expanding Kunun core scalar types.
- Preserve the core `(relation ...)` declaration as the ontology/type-system source of relation name and endpoints.
- Provide migration mapping from depa-orm `RelationshipDefinition` fields to Kunun relation annotations.

**非目标:**
- Do not add relation query expression syntax in this track.
- Do not make core type compatibility depend on ORM metadata.
- Do not introduce a separate top-level `(orm-relation ...)` declaration.
- Do not implement a full ORM engine inside `kunun-type-system`.
- Do not register depa-orm business scalars such as email, phone, person, department, file, picture, rich text, or JSON object as language built-in scalar types.

## 变更内容（What Changes）

- `kunun-type-annotations` gains an ORM relation annotation profile/parser.
- `kunun-type-annotations` gains field annotation profiles for business/domain type metadata and ORM scalar mapping metadata.
- `kunun-type-system` relation binding preserves enough source annotation context or metadata for downstream profile extraction.
- `RowMember` gains metadata preservation for field/method declarations, including attrs, metadata, and source annotations.
- Tests cover prefix annotation parsing, endpoint parsing, through parsing, and depa-orm migration equivalence examples.
- Documentation/design examples define the canonical syntax:

```kon
#(orm #relation :{
  cardinality = many_to_one
  from = { field = relation_b2 keys = [_b2] foreign = true }
  to = { field = rev__B__relation_b2 keys = [_id] visible = false }
  write = { cascade_delete = delete }
})
(relation #B_to_A :{ from = B to = A directed = true })
```

Field business type metadata is represented as prefix annotations on top of the core Kunun type:

```kon
#(domain #field :{
  type = { name = EmployeeEmail base = String }
  validate = { pattern = email }
})
#(orm #field :{
  type = { code = person base = string ref_type = __person multiple = true }
  db = { name = owner_ids type = varchar }
  items = { code = person base = string ref_type = __person }
})
(!String field #owners)
```

## 影响范围（Impact）

- 受影响的能力（behaviors）：`runtime-type-system`
- 受影响的代码：
  - `packages/type-annotations/lib/`
  - `packages/type-annotations/__tests__/`
  - `packages/type-system/lib/KonTypeBinder.ts`
  - `packages/type-system/__tests__/`
