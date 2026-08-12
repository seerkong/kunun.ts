import assert from 'assert';
import { RuntimeInterpreter } from 'kunun-runtime';
import {
  AccessModifier,
  EffectRow,
  FunctionTypeSymbol,
  KonTypeBinder,
  KonTypedBlockEvaluator,
  KonTypeChecker,
  KonTypedRuntimeContext,
  RowMember,
  RowMemberBuilder,
  RowMemberKind,
  RowQualifier,
  RowTypeSymbol,
  TypeReferenceSymbol,
  TypeSystem,
} from 'kunun-type-system';

describe('typed navigation properties', function () {
  it('exposes canonical member kinds while preserving the legacy constructor boolean', function () {
    const typeSystem = new TypeSystem();
    const signature = new FunctionTypeSymbol('Owner::run', [], [typeSystem.Registry.Int]);
    const field = RowMemberBuilder.Field('Owner', 'field', typeSystem.Registry.Int);
    const property = RowMemberBuilder.Property('Owner', 'property', typeSystem.Registry.String);
    const method = RowMemberBuilder.Method('Owner', 'method', signature);
    const spread = RowMemberBuilder.Spread('Owner', 'R', { Name: 'R', IsRowParameter: true } as any);
    const legacyField = new RowMember('legacyField', typeSystem.Registry.Int, RowQualifier.Default, 'Owner', false);
    const legacyMethod = new RowMember('legacyMethod', signature, RowQualifier.Default, 'Owner', true);

    assert.deepEqual(
      [field.Kind, property.Kind, method.Kind, spread.Kind, legacyField.Kind, legacyMethod.Kind],
      [
        RowMemberKind.Field,
        RowMemberKind.Property,
        RowMemberKind.Method,
        RowMemberKind.Spread,
        RowMemberKind.Field,
        RowMemberKind.Method,
      ],
    );
    assert.equal(field.IsField, true);
    assert.equal(property.IsProperty, true);
    assert.equal(method.IsMethod, true);
    assert.equal(spread.IsSpreadParameter, true);
    assert.throws(
      () => new RowMember('broken', signature, RowQualifier.Default, 'Owner', false, { Kind: RowMemberKind.Method }),
      /conflicts with legacy IsMethod=false/,
    );
  });

  it('preserves property kind, metadata, access, effect context, and qualifier through copies', function () {
    const typeSystem = new TypeSystem();
    const effects = EffectRow.FromEffects([typeSystem.Registry.GetOrCreateEffect('Read')]);
    const property = RowMemberBuilder.Property(
      'Owner',
      'target',
      new TypeReferenceSymbol('Target'),
      RowQualifier.Override,
      AccessModifier.Protected,
      { role: 'owner' },
    ).WithEffectContext(effects);
    const copied = property.WithType(new TypeReferenceSymbol('Other'));

    assert.equal(copied.Kind, RowMemberKind.Property);
    assert.equal(copied.IsProperty, true);
    assert.equal(copied.Qualifier, RowQualifier.Override);
    assert.equal(copied.Access, AccessModifier.Protected);
    assert.equal(copied.EffectContext, effects);
    assert.deepEqual(copied.Metadata, { role: 'owner' });
  });

  it('preserves property identity through generic, trait, inheritance, and effective-access rows', function () {
    const typeSystem = new TypeSystem();
    const effects = EffectRow.FromEffects([typeSystem.Registry.GetOrCreateEffect('Navigate')]);
    const parameter = { Name: 'T' };
    const genericProperty = RowMemberBuilder.Property(
      'GenericOwner',
      'target',
      parameter,
      RowQualifier.Default,
      AccessModifier.Public,
      { relation: 'target' },
    ).WithEffectContext(effects);
    const generic = typeSystem.DefineClass('GenericOwner', [genericProperty], true, [], [], false, [parameter]);
    const instantiated = typeSystem.InstantiateGenericClass(generic.Type, new TypeReferenceSymbol('SymbolicTarget'));

    const traitProperty = RowMemberBuilder.Property(
      'Navigable',
      'navigation',
      new TypeReferenceSymbol('Target'),
      RowQualifier.Default,
      AccessModifier.Public,
      { trait: true },
    ).WithEffectContext(effects);
    typeSystem.DefineClass('Navigable', [traitProperty], true, [], [], true);
    const inherited = typeSystem.DefineClass(
      'Inherited',
      [],
      true,
      [
        { Name: 'GenericOwner', Access: AccessModifier.Protected },
        { Name: 'Navigable' },
      ],
    ).Rows;

    const substituted = instantiated.DeclaredRows.Resolve('target');
    const inheritedProperty = inherited.Resolve('target');
    const traitForwarded = inherited.Resolve('navigation');
    assert.equal(substituted.Kind, RowMemberKind.Property);
    assert.equal(substituted.Type.Name, 'SymbolicTarget');
    assert.equal(substituted.EffectContext, effects);
    assert.deepEqual(substituted.Metadata, { relation: 'target' });
    assert.equal(inheritedProperty.Kind, RowMemberKind.Property);
    assert.equal(inheritedProperty.Access, AccessModifier.Protected);
    assert.equal(inheritedProperty.EffectContext, effects);
    assert.deepEqual(inheritedProperty.Metadata, { relation: 'target' });
    assert.equal(traitForwarded.Kind, RowMemberKind.Property);
    assert.equal(traitForwarded.EffectContext, effects);
    assert.deepEqual(traitForwarded.Metadata, { trait: true });
  });

  it('preserves opaque ORM relation NamedConf metadata through generic Property instantiation', function () {
    const result = KonTypeBinder.BindSource(`
      (class #Reference <T> :[
        #(orm :relation={
          cardinality = many_to_one
          target = T
          through = { entity = ReferenceLink }
        })
        (!T prop #target)
      ])
    `);

    assert.deepEqual(result.Diagnostics, []);
    const generic = result.TypeSystem.RequireClassSymbol('Reference');
    const declared = generic.DeclaredRows.Resolve('target');
    const instantiated = result.TypeSystem.InstantiateGenericClass(
      generic,
      new TypeReferenceSymbol('ConcreteTarget'),
    ).DeclaredRows.Resolve('target');
    const sourceAnnotation = declared.Metadata.source_annotations.PreModifiers.Knots[0];
    const relation = sourceAnnotation.NamedConf.relation;

    assert.equal(declared.Kind, RowMemberKind.Property);
    assert.equal(instantiated.Kind, RowMemberKind.Property);
    assert.equal(instantiated.Type.Name, 'ConcreteTarget');
    assert.equal(sourceAnnotation.Core.Value, 'orm');
    assert.equal(sourceAnnotation.Name, undefined);
    assert.equal(sourceAnnotation.Conf, undefined);
    assert.deepEqual(Object.keys(sourceAnnotation.NamedConf), ['relation']);
    assert.equal(relation.cardinality.Value, 'many_to_one');
    assert.equal(relation.target.Value, 'T');
    assert.equal(relation.through.entity.Value, 'ReferenceLink');
    assert.equal(
      instantiated.Metadata.source_annotations.PreModifiers.Knots[0],
      sourceAnnotation,
    );
  });

  it('binds explicitly typed class and trait properties with symbolic, collection, and metadata types', function () {
    const result = KonTypeBinder.BindSource(`
      (trait #Identified :[
        (!String prop #label)
      ])

      (class #Order :[
        (!Shop prop #shop @role = owner @visibility = protected)
        (!List<Shop> prop #shops)
        (prop #runtime_only
          get :[ 1 ])
      ])
    `);

    assert.deepEqual(result.Diagnostics, []);
    const traitProperty = result.TypeSystem.RequireClassSymbol('Identified').DeclaredRows.Resolve('label');
    const order = result.TypeSystem.RequireClassSymbol('Order');
    const shop = order.DeclaredRows.Resolve('shop');
    const shops = order.DeclaredRows.Resolve('shops');

    assert.equal(traitProperty.Kind, RowMemberKind.Property);
    assert.equal(shop.Kind, RowMemberKind.Property);
    assert.equal(shop.Type.Name, 'Shop');
    assert.equal(shop.Access, AccessModifier.Protected);
    assert.equal(shop.Metadata.role.Value, 'owner');
    assert.equal(shop.Metadata.source_annotations.PreModifiers.Identifiers[0].Value, 'Shop');
    assert.equal(shops.Type.Name, 'List<Shop>');
    assert.equal((shops.Type as TypeReferenceSymbol).TypeArguments[0].Name, 'Shop');
    assert.equal(order.DeclaredRows.Resolve('runtime_only'), null);
  });

  it('rejects prop declarations outside class and trait bodies with a stable diagnostic', function () {
    const result = KonTypeBinder.BindSource(`
      (type #Plain :[ (!String prop #value) ])
      (mixin #Shared :[ (!String prop #value) ])
      (schema #Record :[ (!String prop #value) ])
    `);

    assert.equal(result.Diagnostics.filter(diagnostic => diagnostic.Code === 'KTB044').length, 3);
    assert.equal((result.TypeSystem.Registry.Require('Plain') as RowTypeSymbol).Members.length, 0);
    assert.equal(result.TypeSystem.RequireSchemaMixin('Shared').Row.Members.length, 0);
    assert.equal(result.TypeSystem.RequireSchemaType('Record').DeclaredRow.Members.length, 0);
  });

  it('uses exact member-kind compatibility and retains only the legacy field-to-method adaptation', function () {
    const typeSystem = new TypeSystem();
    const intGetter = new FunctionTypeSymbol('get', [], [typeSystem.Registry.Int]);
    const open = (name: string, member: RowMember) => typeSystem.DefineRowType(name, [member], true);
    const field = open('FieldRow', RowMemberBuilder.Field('FieldRow', 'value', typeSystem.Registry.Int));
    const property = open('PropertyRow', RowMemberBuilder.Property('PropertyRow', 'value', typeSystem.Registry.Int));
    const method = open('MethodRow', RowMemberBuilder.Method('MethodRow', 'value', intGetter));

    assert.equal(typeSystem.IsSubtype(field, property), false);
    assert.equal(typeSystem.IsSubtype(property, field), false);
    assert.equal(typeSystem.IsSubtype(method, property), false);
    assert.equal(typeSystem.IsSubtype(property, method), false);
    assert.equal(typeSystem.IsSubtype(field, method), true);
    assert.equal(typeSystem.IsSubtype(field, field), true);
    assert.equal(typeSystem.IsSubtype(property, property), true);
  });

  it('rejects same-origin and inherited cross-kind replacement', function () {
    const typeSystem = new TypeSystem();
    assert.throws(
      () => typeSystem.DefineClass('Conflict', [
        RowMemberBuilder.Field('Conflict', 'value', typeSystem.Registry.Int),
        RowMemberBuilder.Property('Conflict', 'value', typeSystem.Registry.Int),
      ], true, []),
      /conflicting member kinds.*value.*field.*property/i,
    );
    assert.throws(
      () => typeSystem.DefineRowType('MergedConflict', [
        RowMemberBuilder.Field('SourceA', 'value', typeSystem.Registry.Int),
        RowMemberBuilder.Property('SourceB', 'value', typeSystem.Registry.Int),
      ], true),
      /conflicting member kinds.*value.*field.*property/i,
    );

    typeSystem.DefineClass('Base', [
      RowMemberBuilder.Property('Base', 'target', new TypeReferenceSymbol('Target')),
    ], true, []);
    const derived = typeSystem.DefineClass('Derived', [
      RowMemberBuilder.Field('Derived', 'target', typeSystem.Registry.Int),
    ], true, [{ Name: 'Base' }]);
    assert.throws(() => derived.Rows, /cannot replace inherited property member 'target' with field/i);

    const conflictingSource = `
      (class #PropertyBase :[ (!Target prop #value) ])
      (class #FieldDerived @inherits = [PropertyBase] :[ (!Int field #value) ])
      (class #FieldBase :[ (!Int field #other) ])
      (class #PropertyDerived @inherits = [FieldBase] :[ (!Target prop #other) ])
    `;
    const sourceConflicts = KonTypeBinder.BindSource(conflictingSource);
    assert.equal(sourceConflicts.Success, false);
    assert.equal(sourceConflicts.Diagnostics.filter(diagnostic => diagnostic.Code === 'KTB030').length, 2);
    assert.ok(sourceConflicts.Diagnostics.some(diagnostic => /property member 'value' with field/i.test(diagnostic.Message)));
    assert.ok(sourceConflicts.Diagnostics.some(diagnostic => /field member 'other' with property/i.test(diagnostic.Message)));

    const checkedConflicts = KonTypeChecker.CheckSource(conflictingSource);
    assert.equal(checkedConflicts.Success, false);
    assert.equal(checkedConflicts.Diagnostics.filter(diagnostic => diagnostic.Code === 'KTB030').length, 2);
  });

  it('keeps slot access on value members and receiver calls on methods', function () {
    const slot = KonTypeChecker.CheckSource(`
      (class #Box :[
        (!Int prop #value)
        (method #read |-> String|)
      ])
      (fn #slot |!Box box -> Int| :[ (box.:value) ])
      (fn #call |!Box box -> String| :[ (box ~read) ])
    `);
    const wrongKinds = KonTypeChecker.CheckSource(`
      (class #Box :[
        (!Int prop #value)
        (method #read |-> String|)
      ])
      (fn #badSlot |!Box box -> String| :[ (box.:read) ])
      (fn #badCall |!Box box -> Int| :[ (box ~value) ])
    `);

    assert.deepEqual(slot.Diagnostics, []);
    assert.equal(wrongKinds.Diagnostics.filter(diagnostic => diagnostic.Code === 'KTC010').length, 2);
  });

  it('checks inline accessors and companion method signatures against property authority', function () {
    const result = KonTypeChecker.CheckSource(`
      (class #Broken :[
        (!String field #stored)
        (method #get_value |self -> String|)
        (method #set_value |self String -> Never|)
        (!Int prop #value
          get :[ "wrong" ]
          set |next| :[ (set self.:stored next) ])
      ])
    `);

    assert.ok(result.Diagnostics.some(diagnostic => diagnostic.Code === 'KTC090' && diagnostic.Message.includes("getter 'get_value'")));
    assert.ok(result.Diagnostics.some(diagnostic => diagnostic.Code === 'KTC090' && diagnostic.Message.includes("setter 'set_value'")));
    assert.ok(result.Diagnostics.some(diagnostic => diagnostic.Code === 'KTC040' && diagnostic.Location.includes('Broken.value.get')));
    assert.ok(result.Diagnostics.some(diagnostic => diagnostic.Code === 'KTC041' && diagnostic.Location.includes('stored')));
    assert.equal(result.TypeSystem.RequireClassSymbol('Broken').DeclaredRows.Resolve('value').Type.Name, 'int');

    const inherited = KonTypeChecker.CheckSource(`
      (class #Base :[ (!Int prop #value) ])
      (class #Derived @inherits = [Base] :[
        (method #get_value |self -> String|)
        (method #set_value |self String -> Never|)
        (prop #value get :[ "wrong" ])
      ])
    `);
    assert.equal(inherited.Diagnostics.filter(diagnostic => diagnostic.Code === 'KTC090').length, 2);
    assert.ok(inherited.Diagnostics.some(diagnostic => diagnostic.Code === 'KTC040' && diagnostic.Location.includes('Derived.value.get')));

    const reverseInherited = KonTypeChecker.CheckSource(`
      (class #Base :[
        (method #get_value |self -> String|)
        (method #set_value |self String -> Never|)
      ])
      (class #Derived @inherits = [Base] :[ (!Int prop #value) ])
    `);
    assert.equal(reverseInherited.Diagnostics.filter(diagnostic => diagnostic.Code === 'KTC090').length, 2);
  });

  it('executes typed inline accessors without shadow methods', function () {
    const result = RuntimeInterpreter.EvaluateTypedBlockSync(`
      (class #Box :[
        (!Int field #stored)
        (!Int prop #value
          get :[ (self.:stored) ]
          set |next| :[ (set self.:stored next) ])
        (new |initial| :[ (set self.:stored initial) ])
      ])

      (var box (Box ~new 1))
      (set box.:value 42)
      (box.:value)
    `);

    assert.equal(result, 42);

    const inheritedResult = RuntimeInterpreter.EvaluateTypedBlockSync(`
      (class #Base :[ (!Int prop #value) ])
      (class #Derived @inherits = [Base] :[
        (!Int field #stored)
        (prop #value
          get :[ (self.:stored) ]
          set |next| :[ (set self.:stored next) ])
        (new |initial| :[ (set self.:stored initial) ])
      ])

      (var derived (Derived ~new 1))
      (set derived.:value 73)
      (derived.:value)
    `);
    assert.equal(inheritedResult, 73);

    const reverseInheritedResult = RuntimeInterpreter.EvaluateTypedBlockSync(`
      (class #Base :[ (method #get_value |self -> Int| :[ 7 ]) ])
      (class #Derived @inherits = [Base] :[ (!Int prop #value) ])
      (var derived (Derived ~new))
      (derived.:value)
    `);
    assert.equal(reverseInheritedResult, 7);

    const traitSource = `
      (trait #Named :[ (!String prop #name get :[ "trait" ]) ])
      (class #Item @implements = [Named] :[])
      (var item (Item ~new))
      ((item ~as Named).:name)
    `;
    assert.equal(RuntimeInterpreter.EvaluateTypedBlockSync(traitSource), 'trait');
    assert.equal(KonTypedBlockEvaluator.EvaluateSync(traitSource), 'trait');
  });

  it('keeps model-only properties out of field storage and reports missing accessors', function () {
    const binding = KonTypedRuntimeContext.BindSource(`
      (class #Model :[
        (!Int prop #value)
      ])
    `);
    const model = binding.Context.CreateObject('Model', {});

    assert.equal(model.Fields.value, undefined);
    assert.throws(() => binding.Context.GetPropertyGetter(model, 'value'), /Property 'value'.*missing getter accessor/);
    assert.throws(() => binding.Context.GetPropertySetter(model, 'value'), /Property 'value'.*missing setter accessor/);
    assert.throws(
      () => RuntimeInterpreter.EvaluateTypedBlockSync(`
        (class #Model :[ (!Int prop #value) ])
        (var model (Model ~new))
        (model.:value)
      `),
      /Property 'value'.*missing getter accessor/,
    );
    assert.throws(
      () => RuntimeInterpreter.EvaluateTypedBlockSync(`
        (class #Model :[ (!Int prop #value) ])
        (var model (Model ~new))
        (set model.:value 1)
      `),
      /Property 'value'.*missing setter accessor/,
    );
  });

  it('constructs a code-first class structurally equivalent to source binding', function () {
    const source = KonTypeBinder.BindSource(`
      (class #Order :[
        (!Int field #id)
        (!Shop prop #shop @visibility = protected @role = owner)
        (!List<Shop> prop #shops)
      ])
    `);
    const sourceClass = source.TypeSystem.RequireClassSymbol('Order');
    const codeFirst = new TypeSystem();
    const codeFirstMembers = sourceClass.DeclaredRows.Members.map(member => {
      if (member.IsProperty) {
        return RowMemberBuilder.Property(
          'Order',
          member.Name,
          member.Type,
          member.Qualifier,
          member.Access,
          member.Metadata,
        );
      }
      return RowMemberBuilder.Field(
        'Order',
        member.Name,
        member.Type,
        member.Qualifier,
        member.Access,
        member.Metadata,
      );
    });
    const programmaticClass = codeFirst.DefineClass('Order', codeFirstMembers, true, []).Type;

    const shape = (member: RowMember) => ({
      name: member.Name,
      kind: member.Kind,
      type: member.Type.Name,
      qualifier: member.Qualifier,
      access: member.Access,
      metadata: member.Metadata,
    });
    assert.deepEqual(programmaticClass.DeclaredRows.Members.map(shape), sourceClass.DeclaredRows.Members.map(shape));
  });
});
