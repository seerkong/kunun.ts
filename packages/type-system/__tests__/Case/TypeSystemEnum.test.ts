import assert from 'assert';
import {
  EnumTypeSymbol,
  EnumValueSymbol,
  KonTypeBinder,
  KonTypeChecker,
  TypeSystem,
} from 'kunun-type-system';

describe('Kunun enum type system', function () {
  it('defines enum types and qualified enum values through the TypeSystem API', function () {
    const typeSystem = new TypeSystem();
    const status = typeSystem.DefineEnum('RecordStatus', ['OPEN', 'CLOSED']);

    assert.ok(status instanceof EnumTypeSymbol);
    assert.equal(status.IsClosed, true);
    assert.equal(status.Representation.Name, 'str');
    assert.deepEqual(status.Values.map(value => value.ValueName), ['OPEN', 'CLOSED']);
    assert.equal(typeSystem.RequireEnum('RecordStatus'), status);
    assert.equal(typeSystem.Registry.Require('RecordStatus'), status);

    const open = typeSystem.Registry.Require('RecordStatus.OPEN') as EnumValueSymbol;
    assert.equal(open.Owner, status);
    assert.equal(open.QualifiedName, 'RecordStatus.OPEN');
    assert.equal(typeSystem.AreTypesCompatible(open, status), true);
    assert.equal(typeSystem.AreTypesCompatible(typeSystem.Registry.String, status), false);
  });

  it('binds enum declarations and reports duplicate values', function () {
    const valid = KonTypeBinder.BindSource(`
      (enum #RecordStatus :[
        (value #OPEN)
        (value #CLOSED :{ code = "closed" })
      ])
    `);
    const invalid = KonTypeBinder.BindSource(`
      (enum #RecordStatus :[
        (value #OPEN)
        (value #OPEN)
      ])
    `);

    assert.deepEqual(valid.Diagnostics, []);
    assert.ok(valid.TypeSystem.Registry.Require('RecordStatus') instanceof EnumTypeSymbol);
    assert.ok(valid.TypeSystem.Registry.Require('RecordStatus.CLOSED') instanceof EnumValueSymbol);
    assert.ok(invalid.Diagnostics.some(diagnostic => diagnostic.Code === 'KTB111'));
  });

  it('checks enum field prefixes and rejects raw string assignment', function () {
    const valid = KonTypeChecker.CheckSource(`
      (enum #RecordStatus :[
        (value #OPEN)
        (value #CLOSED)
      ])

      (class #Record :[
        (!RecordStatus field #status)
      ])

      (fn #readStatus |!Record record -> RecordStatus|
        :[
          (record.:status)
        ])
    `);
    const invalid = KonTypeChecker.CheckSource(`
      (enum #RecordStatus :[
        (value #OPEN)
        (value #CLOSED)
      ])

      (fn #bad |-> RecordStatus|
        :[
          "OPEN"
        ])
    `);

    assert.deepEqual(valid.Diagnostics, []);
    assert.ok(invalid.Diagnostics.some(diagnostic =>
      diagnostic.Code === 'KTC040'
      && diagnostic.Message.includes('str')
      && diagnostic.Message.includes('RecordStatus')));
  });
});
