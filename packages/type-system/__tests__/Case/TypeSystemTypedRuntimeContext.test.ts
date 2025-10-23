import assert from 'assert';
import {
  AnyValue,
  EffectRow,
  FunctionTypeSymbol,
  FunctionValue,
  KonTypedRuntimeContext,
  MethodBuilder,
  ParseKonSourceItems,
  RowMemberBuilder,
  RowQualifier,
  StringValue,
  WrapTypedRuntimeValue,
} from 'kunun-type-system';
import { KnNodeType } from 'kunun-core/Model/KnNodeType';
import { KnNodeHelper } from 'kunun-core/Util/KnNodeHelper';
import { KnFormatterV1 } from 'kunun-converter/KnFormatterV1';
import { KonSyntaxConfig } from 'kunun-converter/KonSyntaxConfig';

describe('Kon typed runtime context', function () {
  it('binds source declarations into an executable typed context', function () {
    const result = KonTypedRuntimeContext.BindSource(`
      (class #Person :[
        (!String field #name)
      ])
    `);

    assert.equal(result.Success, true);
    assert.ok(result.Context);
    assert.equal(result.Context.TypeSystem.RequireClassSymbol('Person').Name, 'Person');
  });

  it('binds parsed nodes through the typed runtime facade', function () {
    const nodes = ParseKonSourceItems(`
      (class #Person :[
        (!String field #name)
      ])
    `);
    const result = KonTypedRuntimeContext.Bind(nodes);

    assert.equal(result.Success, true);
    assert.equal(result.Context.TypeSystem.RequireClassSymbol('Person').Name, 'Person');
  });

  it('does not create an executable typed context for invalid declarations', function () {
    const result = KonTypedRuntimeContext.BindSource(`
      (class :[
        (!String field #name)
      ])
    `);

    assert.equal(result.Success, false);
    assert.ok(result.Diagnostics.length > 0);
    assert.equal(result.Context, null);
  });

  it('hydrates declared fields from prototype values and rejects unknown fields', function () {
    const result = KonTypedRuntimeContext.BindSource(`
      (class #Person :[
        (!String field #name)
      ])
    `);
    const person = result.Context.CreateObject('Person', {
      name: 'Ada',
      unknown: 'ignored',
      get_name: 'accessor',
    });

    assert.equal(result.Context.ReadField(person, 'name'), 'Ada');
    assert.throws(() => result.Context.ReadField(person, 'unknown'), /does not exist|not exposed/);
  });

  it('uses projected class origin for duplicate field lookup and writes', function () {
    const result = KonTypedRuntimeContext.BindSource(`
      (class #Base :[
        (!String field #name)
      ])

      (class #Derived
        @inherits = [Base]
        :[
          (!String field #name)
        ])
    `);
    const derived = result.Context.CreateObject('Derived');
    const asBase = result.Context.Project(derived, 'Base');

    result.Context.WriteField(derived, 'name', 'derived');
    result.Context.WriteField(asBase, 'name', 'base');

    assert.equal(result.Context.ReadField(derived, 'name'), 'derived');
    assert.equal(result.Context.ReadField(asBase, 'name'), 'base');
  });

  it('restricts trait projected field lookup to the trait view', function () {
    const result = KonTypedRuntimeContext.BindSource(`
      (trait #Named :[
        (!String field #name)
        (method #get_name |-> String|)
      ])

      (class #Article
        @implements = [Named]
        :[
          (!String field #name)
          (!Bool field #draftOnly)
          (method #get_name |-> String|)
        ])
    `);
    const article = result.Context.CreateObject('Article', { name: 'title', draftOnly: true });
    const named = result.Context.Project(article, 'Named');

    assert.equal(result.Context.ReadField(named, 'name'), 'title');
    assert.throws(() => result.Context.ReadField(named, 'draftOnly'), /not exposed by projected view Named/);
  });

  it('resolves property accessors through projected prototypes', function () {
    const result = KonTypedRuntimeContext.BindSource(`
      (trait #Named :[
        (!String field #name)
        (method #get_name |-> String|)
      ])

      (class #Article
        @implements = [Named]
        :[
          (!String field #name)
          (method #get_name |-> String|)
        ])
    `);
    const articlePrototype = { get_name: () => 'article' };
    const article = result.Context.CreateObject('Article', articlePrototype);
    result.Context.PrototypeResolver = name => name === 'Article' ? articlePrototype : null;
    const named = result.Context.Project(article, 'Named');

    assert.equal(result.Context.GetPropertyGetter(named, 'name')(), 'article');
    assert.equal(result.Context.GetPropertySetter(named, 'name'), null);
  });

  it('materializes real parent storage for base classes', function () {
    const result = KonTypedRuntimeContext.BindSource(`
      (class #Base :[
        (!String field #name)
      ])

      (class #Derived
        @inherits = [Base]
        :[])
    `);
    const derived = result.Context.CreateObject('Derived');

    assert.ok(derived.Parents.Base);
    assert.ok(derived.Parents.Base.Fields.name);
  });

  it('preserves supported Kon values and rejects unsupported structured values', function () {
    const result = KonTypedRuntimeContext.BindSource(`
      (class #Box :[
        (!Any field #item)
      ])
    `);
    const box = result.Context.CreateObject('Box');
    const nested = { name: 'nested' };

    result.Context.WriteKonField(box, 'item', nested);
    assert.equal(result.Context.ReadKonField(box, 'item'), nested);
    assert.throws(() => result.Context.WriteKonField(box, 'item', [1, 2]), /cannot be converted/);
  });

  it('exposes C#-style value-level field facade without replacing JS field APIs', function () {
    const result = KonTypedRuntimeContext.BindSource(`
      (class #Box :[
        (!String field #item)
      ])
    `);
    const box = result.Context.CreateObject('Box');

    result.Context.WriteValueField(box, 'item', new StringValue('typed'));

    assert.equal(result.Context.ReadField(box, 'item'), 'typed');
    assert.equal(result.Context.ReadValueField(box, 'item').Type.Name, 'str');

    result.Context.WriteNodeField(box, 'item', 'node');
    assert.equal(result.Context.ReadField(box, 'item'), 'node');
  });

  it('invokes direct and class-projected prototype methods by typed origin', function () {
    const result = KonTypedRuntimeContext.BindSource(`
      (class #Base :[
        (method #value |-> String|)
      ])

      (class #Derived
        @inherits = [Base]
        :[
          (method #value |-> String|)
        ])
    `);
    const derivedPrototype = { 'Derived::value': () => 'derived' };
    const basePrototype = { 'Base::value': () => 'base' };
    result.Context.PrototypeResolver = name => name === 'Base' ? basePrototype : name === 'Derived' ? derivedPrototype : null;
    const derived = result.Context.CreateObject('Derived', derivedPrototype);
    const asBase = result.Context.Project(derived, 'Base');

    assert.equal(result.Context.Invoke(derived, 'value'), 'derived');
    assert.equal(result.Context.Invoke(asBase, 'value'), 'base');
  });

  it('invokes trait projection through the top implementation and rejects methods outside the trait view', function () {
    const result = KonTypedRuntimeContext.BindSource(`
      (trait #Named :[
        (method #label |-> String|)
      ])

      (class #Article
        @implements = [Named]
        :[
          (method #label |-> String|)
          (method #internal_label |-> String|)
        ])

      (class #SpecialArticle
        @inherits = [Article]
        :[
          (method #label |-> String|)
        ])
    `);
    const articlePrototype = { 'Article::label': () => 'article' };
    const specialPrototype = { 'SpecialArticle::label': () => 'special', internal_label: () => 'hidden' };
    result.Context.PrototypeResolver = name =>
      name === 'Article' ? articlePrototype : name === 'SpecialArticle' ? specialPrototype : null;
    const special = result.Context.CreateObject('SpecialArticle', specialPrototype);
    const named = result.Context.Project(special, 'Named');

    assert.equal(result.Context.Invoke(named, 'label'), 'special');
    assert.throws(() => result.Context.Invoke(named, 'internal_label'), /not exposed by projected view Named/);
  });

  it('selects contextual method implementations through active effect scopes', function () {
    const result = KonTypedRuntimeContext.BindSource(`
      #(effect decl #Sync)
      (type #Sync :[])

      #(effect decl #Async)
      (type #Async :[])

      (class #File :[
        #(effect row :[ Sync ])
        (method #read |-> String|)

        #(effect row :[ Async ])
        (method #read |-> String|)
      ])
    `);
    const filePrototype = {
      'File::read[Sync]': () => 'sync',
      'File::read[Async]': () => 'async',
    };
    const file = result.Context.CreateObject('File', filePrototype);

    const scope = result.Context.PushEffectScope('Async');
    try {
      assert.equal(result.Context.Invoke(file, 'read'), 'async');
    } finally {
      scope.dispose();
    }
  });

  it('rejects effectful typed method invocation outside a permitted effect scope', function () {
    const result = KonTypedRuntimeContext.BindSource(`
      #(effect decl #File)
      (type #File :[])

      (class #Reader :[
        #(effect row :[
          File
        ])
        (method #read |-> String|)
      ])
    `);
    const reader = result.Context.CreateObject('Reader', {
      'Reader::read[File]': () => 'content',
    });

    assert.throws(() => result.Context.Invoke(reader, 'read'), /not permitted/);

    const scope = result.Context.PushEffectScope('File');
    try {
      assert.equal(result.Context.Invoke(reader, 'read'), 'content');
    } finally {
      scope.dispose();
    }
  });

  it('wraps typed runtime values with explicit value kinds while preserving external values', function () {
    const result = KonTypedRuntimeContext.BindSource(`
      (class #Box :[
        (!Any field #item)
      ])
    `);
    const box = result.Context.CreateObject('Box');
    const list = [1, 2];
    const map = { name: 'Ada' };
    const fn = () => 'ok';

    assert.equal(WrapTypedRuntimeValue(list).kind, 'list');
    assert.equal(WrapTypedRuntimeValue(map).kind, 'map');
    assert.equal(WrapTypedRuntimeValue(fn).kind, 'function');
    assert.equal(WrapTypedRuntimeValue(box).kind, 'object');

    result.Context.WriteField(box, 'item', list);
    assert.equal(result.Context.ReadField(box, 'item'), list);
    assert.throws(() => result.Context.WriteKonField(box, 'item', [1, 2]), /cannot be converted/);
  });

  it('keeps type metadata on typed runtime values and globals', function () {
    const result = KonTypedRuntimeContext.BindSource(`
      (class #Box :[
        (!String field #name)
      ])
    `);
    const box = result.Context.CreateObject('Box');
    const projected = result.Context.Project(box, 'Box');

    assert.equal(WrapTypedRuntimeValue('Ada', result.Context.TypeSystem).type?.Name, 'str');
    assert.equal(WrapTypedRuntimeValue(1, result.Context.TypeSystem).type?.Name, 'int');
    assert.equal(WrapTypedRuntimeValue(true, result.Context.TypeSystem).type?.Name, 'bool');
    assert.equal(WrapTypedRuntimeValue(box, result.Context.TypeSystem).type?.Name, 'Box.rows');
    assert.equal(WrapTypedRuntimeValue(projected, result.Context.TypeSystem).type?.Name, 'Box.rows');

    result.Context.SetGlobal('box', box);
    result.Context.SetGlobal('name', 'Ada');

    assert.equal(result.Context.GetGlobal('box'), box);
    assert.equal(result.Context.GetGlobalValue('box').type?.Name, 'Box.rows');
    assert.equal(result.Context.GetGlobal('name'), 'Ada');
    assert.equal(result.Context.GetGlobalValue('name').type?.Name, 'str');
    assert.equal(result.Context.GetGlobal('missing'), undefined);
  });

  it('invokes projected methods through the InvokeWithProjection facade', function () {
    const result = KonTypedRuntimeContext.BindSource(`
      (class #Base :[
        (method #label |-> String|)
      ])

      (class #Derived
        @inherits = [Base]
        :[
          (method #label |-> String|)
        ])
    `);
    const basePrototype = { 'Base::label': () => 'base' };
    const derivedPrototype = { 'Derived::label': () => 'derived' };
    result.Context.PrototypeResolver = name => name === 'Base' ? basePrototype : name === 'Derived' ? derivedPrototype : null;
    const derived = result.Context.CreateObject('Derived', derivedPrototype);

    assert.equal(result.Context.Invoke(derived, 'label'), 'derived');
    assert.equal(result.Context.InvokeWithProjection(derived, 'Base', 'label'), 'base');
  });

  it('enforces runtime access modifier boundaries for projected origins', function () {
    const result = KonTypedRuntimeContext.BindSource(`
      (class #Base :[
        (method #public_value |-> String|)
        (method #internal_value @visibility = internal |-> String|)
        (method #protected_value @visibility = protected |-> String|)
        (method #private_value @visibility = private |-> String|)
      ])

      (class #Derived
        @inherits = [Base]
        :[])
    `);
    const basePrototype = {
      public_value: () => 'public',
      internal_value: () => 'internal',
      protected_value: () => 'protected',
      private_value: () => 'private',
    };
    result.Context.PrototypeResolver = name => name === 'Base' ? basePrototype : null;
    const derived = result.Context.CreateObject('Derived');

    assert.equal(result.Context.Invoke(derived, 'public_value'), 'public');
    assert.equal(result.Context.Invoke(derived, 'internal_value'), 'internal');
    assert.throws(() => result.Context.Invoke(derived, 'protected_value'), /not exposed|No matching|not accessible/);
    assert.throws(() => result.Context.Invoke(derived, 'private_value'), /not exposed|No matching|not accessible/);

    assert.equal(result.Context.InvokeWithProjection(derived, 'Base', 'protected_value'), 'protected');
    assert.throws(() => result.Context.InvokeWithProjection(derived, 'Base', 'private_value'), /not exposed|No matching|not accessible/);
  });

  it('exposes a core typed execution context that instantiates method rows from class definitions', function () {
    const result = KonTypedRuntimeContext.BindSource('');
    const typeSystem = result.Context.TypeSystem;
    const signature = typeSystem.Registry.CreateFunctionType('Counter::label', [], [typeSystem.Registry.String]);
    const member = RowMemberBuilder.Method('Counter', 'label', signature);
    typeSystem.DefineClass('Counter', [member], true, [{ Name: 'object' }], [
      MethodBuilder.FromFunction(member, () => new StringValue('core', typeSystem)),
    ]);

    const counter = result.Context.Instantiate('Counter');
    const value = result.Context.Execution.Invoke(counter, 'label');

    assert.equal(value.Type.Name, 'str');
    assert.equal(result.Context.FromTypedValue(value), 'core');
    assert.ok(counter.Rows.label[0].Function instanceof FunctionValue);
  });

  it('keeps core CreateObject field-only while Instantiate materializes method rows', function () {
    const result = KonTypedRuntimeContext.BindSource('');
    const typeSystem = result.Context.TypeSystem;
    const signature = typeSystem.Registry.CreateFunctionType('Box::name', [], [typeSystem.Registry.String]);
    const method = RowMemberBuilder.Method('Box', 'name', signature);
    const field = RowMemberBuilder.Field('Box', 'value', typeSystem.Registry.String);
    typeSystem.DefineClass('Box', [field, method], true, [{ Name: 'object' }], [
      MethodBuilder.FromFunction(method, () => new StringValue('instantiated', typeSystem)),
    ]);

    const fieldOnly = result.Context.Execution.CreateObject('Box');
    const instantiated = result.Context.Instantiate('Box');

    assert.ok(fieldOnly.Fields.value);
    assert.equal(fieldOnly.Rows.name, undefined);
    assert.ok(instantiated.Rows.name);
    assert.equal(result.Context.FromTypedValue(result.Context.Execution.Invoke(instantiated, 'name')), 'instantiated');
  });

  it('supports core projection dispatch, trait forwarding, and inherit forwarding', function () {
    const result = KonTypedRuntimeContext.BindSource('');
    const typeSystem = result.Context.TypeSystem;
    const signature = typeSystem.Registry.CreateFunctionType('label', [], [typeSystem.Registry.String]);

    typeSystem.DefineClass('Named', [
      RowMemberBuilder.Method('Named', 'label', signature, RowQualifier.Virtual),
    ], true, [], [], true);
    const baseMember = RowMemberBuilder.Method('Base', 'label', signature);
    typeSystem.DefineClass('Base', [baseMember], true, [{ Name: 'object' }], [
      MethodBuilder.FromFunction(baseMember, () => new StringValue('base', typeSystem)),
    ]);
    const derivedMember = RowMemberBuilder.Method('Derived', 'label', signature, RowQualifier.Inherit);
    typeSystem.DefineClass('Derived', [derivedMember], true, [{ Name: 'Named' }, { Name: 'Base' }], []);

    const derived = result.Context.Instantiate('Derived');

    assert.equal(result.Context.FromTypedValue(result.Context.Execution.Invoke(derived, 'label')), 'base');
    assert.equal(result.Context.FromTypedValue(result.Context.Execution.InvokeWithProjection(derived, 'Base', 'label')), 'base');
    assert.equal(result.Context.FromTypedValue(result.Context.Execution.InvokeWithProjection(derived, 'Named', 'label')), 'base');
  });

  it('enforces core effect scopes and preserves core globals/value conversion', function () {
    const result = KonTypedRuntimeContext.BindSource('');
    const typeSystem = result.Context.TypeSystem;
    const file = typeSystem.Registry.GetOrCreateEffect('File');
    const signature = new FunctionTypeSymbol(
      'Reader::read',
      [],
      [typeSystem.Registry.String],
      EffectRow.FromEffects([file]),
    );
    const read = RowMemberBuilder.Method('Reader', 'read', signature);
    typeSystem.DefineClass('Reader', [read], true, [{ Name: 'object' }], [
      MethodBuilder.FromFunction(read, () => new StringValue('content', typeSystem)),
    ]);
    const reader = result.Context.Instantiate('Reader');

    assert.throws(() => result.Context.Execution.Invoke(reader, 'read'), /not permitted/);

    const scope = result.Context.Execution.PushEffectScope('File');
    try {
      assert.equal(result.Context.FromTypedValue(result.Context.Execution.Invoke(reader, 'read')), 'content');
    } finally {
      scope.dispose();
    }

    const map = result.Context.ToTypedValue({ title: 'doc', nested: { ok: true } });
    assert.equal(map.Type.Name, 'any');
    assert.deepEqual(result.Context.FromTypedValue(map), { title: 'doc', nested: { ok: true } });

    const any = new AnyValue(null, typeSystem);
    result.Context.Execution.SetGlobal('nil', any);
    assert.equal(result.Context.Execution.GetGlobal('nil'), any);

    result.Context.SetGlobal('reader', reader);
    assert.equal(result.Context.GetCoreGlobal('reader').Type.Name, 'Reader.rows');
  });

  it('exposes origin-specific core field and method APIs', function () {
    const result = KonTypedRuntimeContext.BindSource('');
    const typeSystem = result.Context.TypeSystem;
    const signature = typeSystem.Registry.CreateFunctionType('label', [], [typeSystem.Registry.String]);
    const baseField = RowMemberBuilder.Field('Base', 'value', typeSystem.Registry.String);
    const derivedField = RowMemberBuilder.Field('Derived', 'value', typeSystem.Registry.Int);
    const baseMethod = RowMemberBuilder.Method('Base', 'label', signature);
    const derivedMethod = RowMemberBuilder.Method('Derived', 'label', signature);
    typeSystem.DefineClass('Base', [baseField, baseMethod], true, [{ Name: 'object' }], [
      MethodBuilder.FromFunction(baseMethod, () => new StringValue('base', typeSystem)),
    ]);
    typeSystem.DefineClass('Derived', [derivedField, derivedMethod], true, [{ Name: 'Base' }], [
      MethodBuilder.FromFunction(derivedMethod, () => new StringValue('derived', typeSystem)),
    ]);

    const derived = result.Context.Instantiate('Derived');
    result.Context.Execution.WriteFieldOrigin(derived, 'value', new StringValue('base-value', typeSystem), 'Base');
    result.Context.Execution.WriteFieldOrigin(derived, 'value', result.Context.ToTypedValue(7), 'Derived');

    assert.equal(result.Context.FromTypedValue(result.Context.Execution.ReadFieldOrigin(derived, 'value', 'Base')), 'base-value');
    assert.equal(result.Context.FromTypedValue(result.Context.Execution.ReadFieldOrigin(derived, 'value', 'Derived')), 7);
    assert.equal(result.Context.FromTypedValue(result.Context.Execution.InvokeOrigin(derived, 'label', 'Base')), 'base');
    assert.equal(result.Context.FromTypedValue(result.Context.Execution.InvokeOrigin(derived, 'label', 'Derived')), 'derived');

    result.Context.Execution.WriteField(derived, 'value', new StringValue('base-overload'), 'Base');
    assert.equal(result.Context.FromTypedValue(result.Context.Execution.ReadField(derived, 'value', 'Base')), 'base-overload');
    assert.equal(result.Context.FromTypedValue(result.Context.Execution.Invoke(derived, 'label', 'Base' as any)), 'base');
  });

  it('allows typed values to use initialized runtime type registry by default', function () {
    const result = KonTypedRuntimeContext.BindSource('');
    const typeSystem = result.Context.TypeSystem;
    const text = new StringValue('hello');
    const number = result.Context.Execution.ToTypedValue(1);

    assert.equal(text.Type, typeSystem.Registry.String);
    assert.equal(number.Type, typeSystem.Registry.Int);
  });

  it('marks KonTypedObject as a dedicated Kon node in the current TS model', function () {
    const result = KonTypedRuntimeContext.BindSource(`
      (class #Box :[
        (!String field #name)
      ])
    `);
    const box = result.Context.CreateObject('Box');

    assert.equal(box._Type, KnNodeType.KonTypedObject);
    assert.equal(KnNodeHelper.GetType(box), KnNodeType.KonTypedObject);
    assert.equal(new KnFormatterV1(new KonSyntaxConfig()).Stringify(box), '<typed-object>');
  });

  it('keeps TS Kon boundary primitives object-like values and unsupported arrays explicit', function () {
    const result = KonTypedRuntimeContext.BindSource(`
      (class #Box :[
        (!Any field #item)
      ])
    `);
    const box = result.Context.CreateObject('Box');
    const objectLike = { _Type: 'ObjectLike', name: 'nested' };

    result.Context.WriteKonField(box, 'item', 42);
    assert.equal(result.Context.ReadKonField(box, 'item'), 42);

    result.Context.WriteKonField(box, 'item', 'counter');
    assert.equal(result.Context.ReadKonField(box, 'item'), 'counter');

    result.Context.WriteKonField(box, 'item', true);
    assert.equal(result.Context.ReadKonField(box, 'item'), true);

    result.Context.WriteKonField(box, 'item', objectLike);
    assert.equal(result.Context.ReadKonField(box, 'item'), objectLike);

    assert.throws(() => result.Context.WriteKonField(box, 'item', [1]), /cannot be converted/);
  });
});
