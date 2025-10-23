import assert from 'assert';
import {
  BrandedScalarTypeSymbol,
  KonTypeBinder,
  RelationTypeSymbol,
  SchemaMixinSymbol,
  SchemaTypeSymbol,
} from 'kunun-type-system';

describe('Kunun schema ontology Kon syntax', function () {
  it('binds scalar, mixin, schema, relation, and same-level aliases', function () {
    const binding = KonTypeBinder.BindSource(`
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

      (schema #Machine :{ alias_of = Server })

      (relation #works_in
        :{
          from = Server
          to = Asset
          directed = true
        })

      (relation #member_of :{ alias_of = works_in })

      (attr #host :{ alias_of = Server.hostname })
    `);

    assert.deepEqual(binding.Diagnostics, []);
    assert.ok(binding.TypeSystem.RequireBrandedScalar('Id') instanceof BrandedScalarTypeSymbol);
    assert.ok(binding.TypeSystem.RequireSchemaMixin('Auditable') instanceof SchemaMixinSymbol);

    const server = binding.TypeSystem.RequireSchemaType('Server');
    assert.ok(server instanceof SchemaTypeSymbol);
    assert.equal(binding.TypeSystem.RequireSchemaType('Machine'), server);
    assert.equal(server.EffectiveRow.Members.some(member => member.Name === 'created_by'), true);
    assert.equal(server.EffectiveRow.Members.some(member => member.Name === 'name'), true);
    assert.equal(server.EffectiveRow.Members.some(member => member.Name === 'hostname'), true);

    const worksIn = binding.TypeSystem.RequireRelation('works_in');
    assert.ok(worksIn instanceof RelationTypeSymbol);
    assert.equal(binding.TypeSystem.RequireRelation('member_of'), worksIn);
    assert.equal(binding.TypeSystem.ResolveAttributeName('Server', 'host'), 'hostname');
  });

  it('reports malformed alias declarations without aborting the bind pass', function () {
    const binding = KonTypeBinder.BindSource(`
      (schema #Asset :[
        (!String field #name)
      ])

      (schema #BadSchemaAlias :{ alias_of = Missing })
      (relation #BadRelationAlias :{ alias_of = missing_relation })
      (attr #bad :{ alias_of = Missing.hostname })
      (attr #badTarget :{ alias_of = Asset.missing })

      (schema #Container :[
        (attr #nested :{ alias_of = Asset.name })
      ])

      (schema #StillWorks :[
        (!String field #ok)
      ])
    `);

    assert.ok(binding.Diagnostics.some(diagnostic => diagnostic.Code === 'KTB132'));
    assert.ok(binding.Diagnostics.some(diagnostic => diagnostic.Code === 'KTB142'));
    assert.ok(binding.Diagnostics.some(diagnostic => diagnostic.Code === 'KTB152'));
    assert.ok(binding.Diagnostics.some(diagnostic => diagnostic.Code === 'KTB153'));
    assert.ok(binding.Diagnostics.some(diagnostic => diagnostic.Code === 'KTB122'));
    assert.ok(binding.TypeSystem.RequireSchemaType('StillWorks') instanceof SchemaTypeSymbol);
  });

  it('reports alias cycles', function () {
    const binding = KonTypeBinder.BindSource(`
      (schema #A :[])
      (schema #B :[])
      (schema #A1 :{ alias_of = A2 })
      (schema #A2 :{ alias_of = A1 })

      (relation #r1 :{ from = A to = B })
      (relation #rAlias1 :{ alias_of = rAlias2 })
      (relation #rAlias2 :{ alias_of = rAlias1 })
    `);

    assert.ok(binding.Diagnostics.some(diagnostic =>
      diagnostic.Code === 'KTB132'
      && diagnostic.Message.includes('Alias cycle')));
    assert.ok(binding.Diagnostics.some(diagnostic =>
      diagnostic.Code === 'KTB142'
      && diagnostic.Message.includes('Alias cycle')));
  });
});
