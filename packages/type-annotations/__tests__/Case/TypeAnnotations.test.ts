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
  SchemaConstraintProfile,
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

  it('preserves field-level ORM metadata on bound row members', function () {
    const binding = KonTypeBinder.BindSource(`
      (schema #Article :[
        #(orm :field={
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
    assert.equal(sourceAnnotation.Name, undefined);
    assert.equal(sourceAnnotation.Conf, undefined);
    assert.ok(sourceAnnotation.NamedConf.field);
  });

  it('parses field business types from prefix annotations without extending language scalar types', function () {
    const [schema] = ParseKonSourceItems(`
      (schema #Employee :[
        #(domain #field :{
          type = { name = EmployeeEmail base = String }
          validate = { pattern = email }
        })
        #(orm :field={
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
        #(orm :field={
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
        #(orm :field={
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
      #(orm :entity={
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

  it('parses ORM datasource NamedConf without duplicating declaration identity', function () {
    const [datasource] = ParseKonSourceItems(`
      #(orm :datasource={
        kind = mysql
        env_conn = DATABASE_URL
        options = { pool = 10 ssl = true }
      })
      (datasource #main)
    `);

    const parsed = new OrmDataSourceAnnotationProfile().Parse(datasource);

    assert.equal(datasource.Name.Value, 'main');
    assert.deepEqual(parsed.Diagnostics, []);
    assert.deepEqual(parsed.Descriptor, {
      Kind: 'mysql',
      EnvConn: 'DATABASE_URL',
      Options: { pool: 10, ssl: true },
    });
  });

  it('rejects legacy marker Conf transport for every public ORM profile', function () {
    const [field] = ParseKonSourceItems(`
      #(orm #field :{ type = { code = string } })
      (!String field #title)
    `);
    const [entity] = ParseKonSourceItems(`
      #(orm #entity :{ type = table })
      (schema #Article :[])
    `);
    const [datasource] = ParseKonSourceItems(`
      #(orm #datasource :{ kind = mysql })
      (datasource #main)
    `);
    const cases = [
      {
        code: 'ORMFIELD001',
        profile: new OrmFieldAnnotationProfile(),
        target: field,
      },
      {
        code: 'ORMENTITY001',
        profile: new OrmEntityAnnotationProfile(),
        target: entity,
      },
      {
        code: 'ORMDATASOURCE001',
        profile: new OrmDataSourceAnnotationProfile(),
        target: datasource,
      },
    ];

    for (const { code, profile, target } of cases) {
      for (const input of [target, target.PreModifiers.Knots[0]]) {
        const parsed = profile.Parse(input);
        assert.deepEqual(parsed.Diagnostics.map(diagnostic => diagnostic.Code), [code]);
        assert.match(parsed.Diagnostics[0].Message, /NamedConf|:\w+=\{/);
      }
    }
  });

  it('rejects unnamed Conf transport without reading its payload', function () {
    const [field] = ParseKonSourceItems(`
      #(orm :{ type = { code = string } })
      (!String field #title)
    `);
    const marker = field.PreModifiers.Knots[0];
    Object.defineProperty(marker, 'Conf', {
      configurable: true,
      get(): never {
        throw new Error('legacy Conf payload must not be read');
      },
    });

    const parsed = new OrmFieldAnnotationProfile().Parse(field);

    assert.deepEqual(parsed.Diagnostics.map(diagnostic => diagnostic.Code), ['ORMFIELD001']);
  });

  it('rejects ORM NamedConf profiles attached to the wrong member kind', function () {
    const [fieldWithRelation] = ParseKonSourceItems(`
      #(orm :relation={ cardinality = many_to_one })
      (!String field #owner_id)
    `);
    const [propertyWithField] = ParseKonSourceItems(`
      #(orm :field={ type = { code = relation } })
      (!Owner prop #owner)
    `);
    const profile = new OrmFieldAnnotationProfile();

    const relationOnField = profile.Parse(fieldWithRelation);
    const fieldOnProperty = profile.Parse(propertyWithField);

    assert.deepEqual(relationOnField.Diagnostics.map(diagnostic => diagnostic.Code), ['ORMFIELD003']);
    assert.deepEqual(fieldOnProperty.Diagnostics.map(diagnostic => diagnostic.Code), ['ORMFIELD003']);
  });

  it('rejects nested storage and relation keys from the flat ORM field profile', function () {
    const [nestedStorage] = ParseKonSourceItems(`
      #(orm :field={
        storage = { db = { name = owner_id type = bigint } }
      })
      (!Int field #owner_id)
    `);
    const [relationShape] = ParseKonSourceItems(`
      #(orm :field={
        type = { code = relation }
        relation = { target = Owner }
      })
      (!Int field #owner_id)
    `);
    const profile = new OrmFieldAnnotationProfile();

    const storage = profile.Parse(nestedStorage);
    const relation = profile.Parse(relationShape);

    assert.ok(storage.Diagnostics.some(diagnostic =>
      diagnostic.Code === 'ORMFIELD004' && diagnostic.Location === 'storage'));
    assert.ok(relation.Diagnostics.some(diagnostic =>
      diagnostic.Code === 'ORMFIELD004' && diagnostic.Location === 'relation'));
  });

  it('rejects datasource key and name because the declaration owns identity', function () {
    const [datasource] = ParseKonSourceItems(`
      #(orm :datasource={
        key = duplicate_key
        name = DuplicateName
        kind = mysql
      })
      (datasource #main)
    `);

    const parsed = new OrmDataSourceAnnotationProfile().Parse(datasource);

    assert.equal(datasource.Name.Value, 'main');
    assert.deepEqual(
      parsed.Diagnostics.map(diagnostic => [diagnostic.Code, diagnostic.Location]),
      [
        ['ORMDATASOURCE004', 'key'],
        ['ORMDATASOURCE004', 'name'],
      ],
    );
    assert.equal(Object.prototype.hasOwnProperty.call(parsed.Descriptor, 'Key'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(parsed.Descriptor, 'Name'), false);
  });
});
