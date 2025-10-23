## 上下文

This track refines the battery-included annotation layer for depa-orm consumption. Kunun core type symbols remain the source for type-system concepts; ORM implementation semantics live in `kunun-type-annotations`.

## 方案概览

1. Field object properties
   - Add `properties` as the canonical key for object field child properties.
   - Keep `property` as a compatibility alias.
   - Normalize both into `OrmFieldAnnotationDescriptor.Properties`.

```kon
#(orm #field :{
  type = { code = object }
  properties = [
    { name = title code = string }
    { name = count code = int }
  ]
})
(!String field #payload)
```

2. Relation order descriptors
   - Preserve current `field` / `direction`.
   - Add optional `namespace`, `alias`, `order_set`, `entity_name`, and `relative_path`.
   - Keep order entries in `Constraints.Order`.

```kon
order = [
  {
    field = created_at
    direction = desc
    namespace = audit
    alias = createdAt
    order_set = default
    entity_name = UserRole
    relative_path = [user role]
  }
]
```

3. Relation validation helper
   - Expose a depa-oriented validator in the annotation package.
   - Default enum checks:
     - relation type: `LOOK_UP`, `MASTER_DETAIL`
     - cardinality: `ONE_TO_ONE`, `ONE_TO_MANY`, `MANY_TO_ONE`, `MANY_TO_MANY` and lower snake aliases
   - Validate cascade values, endpoint shape, join-key count, and through continuity.
   - Allow adapter-provided schema lookup hooks for field existence and type compatibility.

4. Entity and datasource profiles
   - Entity profile reads type, primary key, db mapping, and logical delete metadata.
   - Datasource profile reads key, name, kind, env connection, and options.

```kon
#(orm #entity :{
  type = table
  primary_key = [_id]
  db = { name = users }
  logical_delete = { field = whether_delete value = 1 }
})
(schema #User :[])
```

```kon
#(orm #datasource :{
  key = main
  name = Main
  kind = mysql
  env_conn = DATABASE_URL
})
(datasource #main)
```

## 决策摘要

- `properties` is canonical; `property` remains accepted.
- Validation remains outside the core type-system and returns diagnostics instead of throwing.
- Entity/datasource metadata becomes profile-owned instead of adapter handwritten parsing.

## 风险 / 权衡

- Full join-key field existence/type compatibility depends on schema context; the validator must support optional adapter-provided lookup callbacks.
- Entity/datasource declarations do not yet have core type-system symbols, so the profiles must work from raw parsed Knots or direct markers.

## 兼容性设计

- Existing relation and field annotations without new fields remain valid.
- Existing singular `property` annotations continue to parse.
- Existing depa adapters can adopt the new profiles incrementally.
