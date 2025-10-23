import assert from 'assert';
import { KnWord } from 'kunun-core';
import { KonTypeBinder, ParseKonSourceItems } from 'kunun-type-system';
import {
  AnnotationExtractor,
  BuiltInAnnotationNames,
  DomainFieldAnnotationProfile,
  OrmDataSourceAnnotationProfile,
  OrmEntityAnnotationProfile,
  OrmFieldAnnotationProfile,
  OrmRelationAnnotationProfile,
  SchemaConstraintProfile,
  ValidateDepaOrmRelation,
} from 'kunun-type-annotations';

describe('Kunun type annotations package', function () {
  it('extracts attr and metadata annotations without involving type compatibility', function () {
    const nodes = ParseKonSourceItems(`
      (class #Record :[
        (!String field #title :{ required = true } #description = "Title")
      ])
    `);
    const cls: any = nodes[0];
    const field = cls.Body[0];
    const entries = new AnnotationExtractor().Extract(field).Entries;

    assert.ok(entries.some(entry =>
      entry.Source === 'config'
      && entry.Name === BuiltInAnnotationNames.Required
      && entry.Value === true));
    assert.ok(entries.some(entry =>
      entry.Source === 'metadata'
      && entry.Name === BuiltInAnnotationNames.Description
      && entry.Value === 'Title'));
  });

  it('extracts pre and post modifier annotations from manually constructed nodes', function () {
    const word = new KnWord('field');
    word.PreModifiers = {
      Identifiers: [new KnWord('indexed')],
      NamedValues: new Map([[new KnWord('storage'), 'record_status']]),
      Knots: [],
      UnorderedMap: null,
      OrderedMap: null,
      Vector: null,
    };

    const entries = new AnnotationExtractor().Extract(word).Entries;

    assert.ok(entries.some(entry => entry.Source === 'preModifier' && entry.Name === 'indexed'));
    assert.ok(entries.some(entry => entry.Source === 'preModifier' && entry.Name === 'storage' && entry.Value === 'record_status'));
  });

  it('keeps required override policy in the annotation profile layer', function () {
    const parent = { Attr: { required: true } };
    const child = { Attr: {} };
    const tightened = { Attr: { required: true } };
    const profile = new SchemaConstraintProfile();

    assert.equal(profile.ValidateRequiredOverride(parent, child).length, 1);
    assert.deepEqual(profile.ValidateRequiredOverride(parent, tightened), []);
  });

  it('parses ORM relation prefix annotations with endpoints, write config, and through paths', function () {
    const [relation] = ParseKonSourceItems(`
      #(orm #relation :{
        type = LOOK_UP
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
            where = [
              { field = status equals = active }
            ]
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
            limit = 20
          })
        ]
        to = { field = users field_name = "related users" keys = [_id] visible = false }
        write = { cascade_delete = delete }
      })
      (relation #User_to_Role :{ from = User to = Role directed = false })
    `);

    const parsed = new OrmRelationAnnotationProfile().Parse(relation);

    assert.deepEqual(parsed.Diagnostics, []);
    assert.equal(parsed.Descriptor.Type, 'LOOK_UP');
    assert.equal(parsed.Descriptor.Cardinality, 'many_to_many');
    assert.deepEqual(parsed.Descriptor.From, {
      Field: 'roles',
      Keys: ['_id'],
    });
    assert.deepEqual(parsed.Descriptor.To, {
      Field: 'users',
      FieldName: 'related users',
      Keys: ['_id'],
      Visible: false,
    });
    assert.equal(parsed.Descriptor.Through.length, 1);
    assert.equal(parsed.Descriptor.Through[0].Entity, 'UserRole');
    assert.deepEqual(parsed.Descriptor.Through[0].FromKeys, ['user_id']);
    assert.deepEqual(parsed.Descriptor.Through[0].ToKeys, ['role_id']);
    assert.equal(parsed.Descriptor.Through[0].FromForeign, true);
    assert.equal(parsed.Descriptor.Through[0].ToForeign, true);
    assert.deepEqual(parsed.Descriptor.Through[0].Constraints.On, [
      { Field: 'whether_delete', Equals: 0 },
      { Field: 'relation_key', Equals: 'User_to_Role' },
    ]);
    assert.deepEqual(parsed.Descriptor.Through[0].Constraints.Where, [
      { Field: 'status', Equals: 'active' },
    ]);
    assert.deepEqual(parsed.Descriptor.Through[0].Constraints.Order, [
      {
        Field: 'created_at',
        Direction: 'desc',
        Namespace: 'audit',
        Alias: 'createdAt',
        OrderSet: 'default',
        EntityName: 'UserRole',
        RelativePath: ['user', 'role'],
      },
    ]);
    assert.equal(parsed.Descriptor.Through[0].Constraints.Limit, 20);
    assert.deepEqual(parsed.Descriptor.Write, { CascadeDelete: 'delete' });
    assert.deepEqual(ValidateDepaOrmRelation(parsed.Descriptor), []);
  });

  it('reports malformed ORM relation annotations without affecting generic extraction', function () {
    const [relation] = ParseKonSourceItems(`
      #(orm #relation :{
        from = { field = missing_keys }
        through = [
          (through #Broken :{ from_keys = [a] })
        ]
      })
      (relation #Broken_relation :{ from = A to = B })
    `);

    const extractorEntries = new AnnotationExtractor().Extract(relation).Entries;
    const parsed = new OrmRelationAnnotationProfile().Parse(relation);

    assert.ok(extractorEntries.some(entry => entry.Source === 'preModifier' && entry.Name === 'relation'));
    assert.ok(parsed.Diagnostics.some(diagnostic => diagnostic.Code === 'ORMREL002'));
    assert.ok(parsed.Diagnostics.some(diagnostic => diagnostic.Code === 'ORMREL003'));
  });

  it('validates depa ORM relation enums and join path shapes', function () {
    const [relation] = ParseKonSourceItems(`
      #(orm #relation :{
        type = UNKNOWN_REL
        cardinality = sideways
        from = { field = roles keys = [_id] }
        through = [
          (through #A :{ from_keys = [user_id] to_keys = [role_id tenant_id] })
          (through #B :{ from_keys = [role_id] to_keys = [id] })
        ]
        to = { field = users keys = [_id] }
        write = { cascade_delete = explode }
      })
      (relation #Broken :{ from = User to = Role })
    `);

    const parsed = new OrmRelationAnnotationProfile().Parse(relation);
    const diagnostics = ValidateDepaOrmRelation(parsed.Descriptor, {
      FromEntity: 'User',
      ToEntity: 'Role',
      Schema: {
        HasField: (entity, field) => !(entity === 'User' && field === 'roles'),
      },
    });

    assert.ok(diagnostics.some(diagnostic => diagnostic.Code === 'ORMRELVAL001'));
    assert.ok(diagnostics.some(diagnostic => diagnostic.Code === 'ORMRELVAL002'));
    assert.ok(diagnostics.some(diagnostic => diagnostic.Code === 'ORMRELVAL003'));
    assert.ok(diagnostics.some(diagnostic => diagnostic.Code === 'ORMRELVAL005'));
    assert.ok(diagnostics.some(diagnostic => diagnostic.Code === 'ORMRELVAL006'));
  });

  it('preserves ORM relation prefix annotations on bound relation metadata without changing core relation binding', function () {
    const binding = KonTypeBinder.BindSource(`
      (schema #B :[])
      (schema #A :[])

      #(orm #relation :{
        type = LOOK_UP
        cardinality = many_to_one
        from = { field = relation_b2 field_name = "引用A" keys = [_b2] foreign = true }
        to = { field = rev__B__relation_b2 field_name = "has b list" keys = [_id] visible = false }
        write = { cascade_delete = delete }
      })
      (relation #B_to_A :{ from = B to = A directed = true })
    `);

    const relation = binding.TypeSystem.RequireRelation('B_to_A');
    const parsed = new OrmRelationAnnotationProfile().Parse(relation);

    assert.deepEqual(binding.Diagnostics, []);
    assert.equal(relation.From.Name, 'B');
    assert.equal(relation.To.Name, 'A');
    assert.equal(relation.Directed, true);
    assert.deepEqual(parsed.Diagnostics, []);
    assert.equal(parsed.Descriptor.Type, 'LOOK_UP');
    assert.equal(parsed.Descriptor.Cardinality, 'many_to_one');
    assert.deepEqual(parsed.Descriptor.From, {
      Field: 'relation_b2',
      FieldName: '引用A',
      Keys: ['_b2'],
      Foreign: true,
    });
    assert.deepEqual(parsed.Descriptor.To, {
      Field: 'rev__B__relation_b2',
      FieldName: 'has b list',
      Keys: ['_id'],
      Visible: false,
    });
    assert.deepEqual(parsed.Descriptor.Write, { CascadeDelete: 'delete' });
  });

  it('preserves field-level ORM metadata on bound row members', function () {
    const binding = KonTypeBinder.BindSource(`
      (schema #Article :[
        #(orm #field :{
          db = { name = original_title type = varchar }
        })
        (!String field #title
          :{
            required = true
            index = true
            unique = false
            fieldLength = "128"
            dateMode = text
            enumSource = ArticleStatus
            refType = Category
          }
          #description = "Article title")
      ])
    `);

    const article = binding.TypeSystem.RequireSchemaType('Article');
    const title = article.DeclaredRow.Members.find(member => member.Name === 'title');
    const entries = new AnnotationExtractor().Extract(title).Entries;
    const sourceAnnotation = title.Metadata.source_annotations.PreModifiers.Knots[0];

    assert.deepEqual(binding.Diagnostics, []);
    assert.equal(title.Metadata.required, true);
    assert.equal(title.Metadata.index, true);
    assert.equal(title.Metadata.unique, false);
    assert.equal(title.Metadata.fieldLength, '128');
    assert.equal(title.Metadata.dateMode.Value, 'text');
    assert.equal(title.Metadata.enumSource.Value, 'ArticleStatus');
    assert.equal(title.Metadata.refType.Value, 'Category');
    assert.ok(entries.some(entry => entry.Source === 'metadata' && entry.Name === 'description' && entry.Value === 'Article title'));
    assert.equal(sourceAnnotation.Core.Value, 'orm');
    assert.equal(sourceAnnotation.Name.Value, 'field');
  });

  it('parses field business types from prefix annotations without extending language scalar types', function () {
    const [schema] = ParseKonSourceItems(`
      (schema #Employee :[
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
      ])
    `);

    const field = schema.Body[0];
    const domain = new DomainFieldAnnotationProfile().Parse(field);
    const orm = new OrmFieldAnnotationProfile().Parse(field);

    assert.deepEqual(domain.Diagnostics, []);
    assert.deepEqual(domain.Descriptor.Type, {
      Name: 'EmployeeEmail',
      Base: 'String',
    });
    assert.deepEqual(domain.Descriptor.Validations, [
      { Pattern: 'email' },
    ]);
    assert.deepEqual(orm.Diagnostics, []);
    assert.deepEqual(orm.Descriptor.Type, {
      Code: 'person',
      Base: 'string',
      RefType: '__person',
      Multiple: true,
    });
    assert.deepEqual(orm.Descriptor.Db, {
      Name: 'owner_ids',
      Type: 'varchar',
    });
    assert.deepEqual(orm.Descriptor.Items, {
      Code: 'person',
      Base: 'string',
      RefType: '__person',
    });
  });

  it('preserves field business type annotations on bound row members', function () {
    const binding = KonTypeBinder.BindSource(`
      (schema #Employee :[
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
      ])
    `);

    const employee = binding.TypeSystem.RequireSchemaType('Employee');
    const phone = employee.DeclaredRow.Members.find(member => member.Name === 'phone');
    const domain = new DomainFieldAnnotationProfile().Parse(phone);
    const orm = new OrmFieldAnnotationProfile().Parse(phone);

    assert.deepEqual(binding.Diagnostics, []);
    assert.equal(phone.Type.Name, 'str');
    assert.deepEqual(domain.Diagnostics, []);
    assert.deepEqual(domain.Descriptor.Type, {
      Name: 'PhoneNumber',
      Base: 'String',
    });
    assert.deepEqual(domain.Descriptor.Validations, [
      { Kind: 'e164' },
    ]);
    assert.deepEqual(orm.Diagnostics, []);
    assert.deepEqual(orm.Descriptor.Type, {
      Code: 'phone',
      Base: 'string',
    });
    assert.deepEqual(orm.Descriptor.Db, {
      Name: 'mobile_phone',
      Type: 'varchar',
    });
    assert.equal(orm.Descriptor.Format, 'e164');
  });

  it('parses canonical object field properties and keeps singular property compatibility', function () {
    const [schema] = ParseKonSourceItems(`
      (schema #Article :[
        #(orm #field :{
          type = { code = object }
          properties = [
            { name = title code = string base = string }
            { name = count code = int base = int }
          ]
          property = { name = legacy_flag code = bool base = bool }
        })
        (!String field #payload)
      ])
    `);

    const field = schema.Body[0];
    const orm = new OrmFieldAnnotationProfile().Parse(field);

    assert.deepEqual(orm.Diagnostics, []);
    assert.deepEqual(orm.Descriptor.Type, {
      Code: 'object',
    });
    assert.deepEqual(orm.Descriptor.Properties, [
      { Name: 'title', Code: 'string', Base: 'string' },
      { Name: 'count', Code: 'int', Base: 'int' },
      { Name: 'legacy_flag', Code: 'bool', Base: 'bool' },
    ]);
  });

  it('parses ORM entity profile from bound schema metadata', function () {
    const binding = KonTypeBinder.BindSource(`
      #(orm #entity :{
        type = table
        primary_key = [_id tenant_id]
        db = { name = users schema = app }
        logical_delete = { field = whether_delete value = 1 }
        datasource = main
      })
      (schema #User :[
        (!String field #_id)
      ])
    `);

    const user = binding.TypeSystem.RequireSchemaType('User');
    const parsed = new OrmEntityAnnotationProfile().Parse(user);

    assert.deepEqual(binding.Diagnostics, []);
    assert.deepEqual(parsed.Diagnostics, []);
    assert.deepEqual(parsed.Descriptor, {
      Type: 'table',
      PrimaryKey: ['_id', 'tenant_id'],
      Db: { Name: 'users', Schema: 'app' },
      LogicalDelete: { Field: 'whether_delete', Value: 1 },
      DataSource: 'main',
    });
  });

  it('parses ORM datasource profile from annotated Knots and direct markers', function () {
    const [datasource] = ParseKonSourceItems(`
      #(orm #datasource :{
        key = main
        name = Main
        kind = mysql
        env_conn = DATABASE_URL
        options = { pool = 10 ssl = true }
      })
      (datasource #main)
    `);

    const marker = datasource.PreModifiers.Knots[0];
    const fromKnot = new OrmDataSourceAnnotationProfile().Parse(datasource);
    const fromMarker = new OrmDataSourceAnnotationProfile().Parse(marker);

    assert.deepEqual(fromKnot.Diagnostics, []);
    assert.deepEqual(fromKnot.Descriptor, {
      Key: 'main',
      Name: 'Main',
      Kind: 'mysql',
      EnvConn: 'DATABASE_URL',
      Options: { pool: 10, ssl: true },
    });
    assert.deepEqual(fromMarker.Diagnostics, []);
    assert.deepEqual(fromMarker.Descriptor, fromKnot.Descriptor);
  });
});
