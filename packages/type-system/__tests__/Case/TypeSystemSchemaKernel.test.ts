import assert from 'assert';
import {
  BrandedScalarTypeSymbol,
  RelationTypeSymbol,
  RowMemberBuilder,
  SchemaMixinSymbol,
  SchemaTypeSymbol,
  TypeSystem,
} from 'kunun-type-system';

describe('Kunun schema type-system kernel', function () {
  it('keeps branded scalars nominal instead of treating them as their representation', function () {
    const typeSystem = new TypeSystem();
    const validity = typeSystem.DefineBrandedScalar('Validity', typeSystem.Registry.String);

    assert.ok(validity instanceof BrandedScalarTypeSymbol);
    assert.equal(validity.Representation, typeSystem.Registry.String);
    assert.equal(typeSystem.AreTypesCompatible(validity, typeSystem.Registry.String), false);
    assert.equal(typeSystem.AreTypesCompatible(typeSystem.Registry.String, validity), false);
  });

  it('builds effective schema rows from mixins, ancestors, and self without making mixins parents', function () {
    const typeSystem = new TypeSystem();
    const auditable = typeSystem.DefineSchemaMixin('Auditable', [
      RowMemberBuilder.Field('Auditable', 'created_by', typeSystem.Registry.String),
    ]);
    const asset = typeSystem.DefineSchemaType('Asset', [
      RowMemberBuilder.Field('Asset', 'name', typeSystem.Registry.String),
    ]);
    const server = typeSystem.DefineSchemaType('Server', [
      RowMemberBuilder.Field('Server', 'hostname', typeSystem.Registry.String),
    ], {
      Parent: asset,
      Mixins: [auditable],
    });

    assert.ok(auditable instanceof SchemaMixinSymbol);
    assert.ok(server instanceof SchemaTypeSymbol);
    assert.equal(typeSystem.IsSchemaSubtype(server, asset), true);
    assert.equal(server.EffectiveRow.Members.some(member => member.Name === 'created_by' && member.Origin === 'Auditable'), true);
    assert.equal(server.EffectiveRow.Members.some(member => member.Name === 'name' && member.Origin === 'Asset'), true);
    assert.equal(server.EffectiveRow.Members.some(member => member.Name === 'hostname' && member.Origin === 'Server'), true);
  });

  it('rejects inherited schema member type changes while allowing same-type overrides', function () {
    const typeSystem = new TypeSystem();
    typeSystem.DefineSchemaType('Asset', [
      RowMemberBuilder.Field('Asset', 'name', typeSystem.Registry.String),
    ]);

    assert.throws(() => typeSystem.DefineSchemaType('BadServer', [
      RowMemberBuilder.Field('BadServer', 'name', typeSystem.Registry.Int),
    ], {
      Parent: 'Asset',
    }), /cannot change inherited type/);

    const ok = typeSystem.DefineSchemaType('GoodServer', [
      RowMemberBuilder.Field('GoodServer', 'name', typeSystem.Registry.String),
    ], {
      Parent: 'Asset',
    });
    assert.equal(typeSystem.IsSchemaSubtype(ok, typeSystem.RequireSchemaType('Asset')), true);
  });

  it('canonicalizes aliases and detects cycles', function () {
    const typeSystem = new TypeSystem();
    typeSystem.DefineSchemaType('Employee', []);
    typeSystem.DefineSchemaTypeAlias('Staff', 'Employee');
    typeSystem.DefineAttributeAlias('Employee', 'full_name', 'name');

    assert.equal(typeSystem.RequireSchemaType('Staff').Name, 'Employee');
    assert.equal(typeSystem.ResolveAttributeName('Employee', 'full_name'), 'name');
    assert.throws(() => {
      typeSystem.DefineSchemaTypeAlias('A', 'B');
      typeSystem.DefineSchemaTypeAlias('B', 'A');
    }, /Alias cycle/);
  });

  it('checks directed and undirected relation endpoints and computes polymorphic type sets', function () {
    const typeSystem = new TypeSystem();
    const person = typeSystem.DefineSchemaType('Person', []);
    const employee = typeSystem.DefineSchemaType('Employee', [], { Parent: person });
    const department = typeSystem.DefineSchemaType('Department', []);
    const worksIn = typeSystem.DefineRelation('works_in', person, department, true);
    const paired = typeSystem.DefineRelation('paired_with', person, person, false);

    assert.ok(worksIn instanceof RelationTypeSymbol);
    assert.equal(typeSystem.CheckRelationEndpoints(worksIn, employee, department), true);
    assert.equal(typeSystem.CheckRelationEndpoints(worksIn, department, employee), false);
    assert.equal(typeSystem.CheckRelationEndpoints(paired, employee, person), true);
    assert.deepEqual(typeSystem.GetSchemaTypeSet(person).map(type => type.Name), ['Person', 'Employee']);
    assert.deepEqual(typeSystem.GetSchemaTypeSet(person, { exact: true }).map(type => type.Name), ['Person']);
  });
});
