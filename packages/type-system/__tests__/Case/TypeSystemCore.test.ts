import assert from 'assert';
import {
  AccessModifier,
  EffectRow,
  FunctionTypeSymbol,
  InheritanceKind,
  MethodBuilder,
  RowMemberBuilder,
  RowMemberResolutionStatus,
  RowQualifier,
  RowTypeSymbol,
  TypeComputationOps,
  TypeProjection,
  TypeSystem,
} from 'kunun-type-system';

describe('TypeSystem core model', function () {
  it('stores class definitions with method bodies while preserving class symbol lookup', function () {
    const typeSystem = new TypeSystem();
    const signature = typeSystem.Registry.CreateFunctionType('Counter::get', [], [typeSystem.Registry.Int]);
    const member = RowMemberBuilder.Method('Counter', 'get', signature);
    const body = MethodBuilder.FromFunction(member, () => 42);

    const created = typeSystem.DefineClass('Counter', [member], true, [{ Name: 'object' }], [body]);
    const definition = typeSystem.RequireClass('Counter');

    assert.equal(created, definition);
    assert.equal(created.Type.Name, 'Counter');
    assert.equal(created.Name, 'Counter');
    assert.equal(created.Rows.Name, 'Counter.rows');
    assert.equal(typeSystem.RequireClassSymbol('Counter'), created.Type);
    assert.equal(definition.Methods.length, 1);
    assert.equal(definition.Methods[0].Member, member);
    assert.equal(definition.Methods[0].Implementation(null, []), 42);
  });

  it('provides C#-style method and effectful function helper APIs', function () {
    const typeSystem = new TypeSystem();
    const file = typeSystem.Registry.GetOrCreateEffect('File');
    const signature = typeSystem.Registry.CreateFunctionType(
      'Reader::read',
      [],
      [typeSystem.Registry.String],
      EffectRow.FromEffects([file]),
    );
    const body = MethodBuilder.FromLambda('Reader', 'read', signature, () => 'content');

    assert.equal(signature.EffectRow.ToDisplayString(), '[File]');
    assert.equal(body.Member.Origin, 'Reader');
    assert.equal(body.Member.Name, 'read');
    assert.equal(body.Implementation(null, []), 'content');
  });

  it('exposes RowMember forwarding and effect context helper parity', function () {
    const typeSystem = new TypeSystem();
    const file = typeSystem.Registry.GetOrCreateEffect('File');
    const effectRow = EffectRow.FromEffects([file]);
    const signature = typeSystem.Registry.CreateFunctionType('Reader::read', [], [typeSystem.Registry.String]);

    const defaultMember = RowMemberBuilder.Method('Reader', 'read', signature);
    const inheritMember = RowMemberBuilder.Method('Reader', 'read', signature, RowQualifier.Inherit);
    const overrideMember = RowMemberBuilder.Method('Reader', 'read', signature, RowQualifier.Override);
    const virtualMember = RowMemberBuilder.Method('Reader', 'read', signature, RowQualifier.Virtual);
    const contextual = defaultMember.WithEffectContext(effectRow);

    assert.equal(defaultMember.ShouldForward, true);
    assert.equal(inheritMember.ShouldForward, true);
    assert.equal(overrideMember.ShouldForward, true);
    assert.equal(virtualMember.ShouldForward, false);
    assert.equal(contextual.EffectContextKey, '[File]');
  });

  it('dispatches public type computation through the interpreter-backed kernel', function () {
    const typeSystem = new TypeSystem();
    const registry = typeSystem.Registry;

    const t1 = typeSystem.DefineRowType('T1', [
      RowMemberBuilder.Method('T1', 'a', registry.CreateFunctionType('T1::a', [], [registry.Int])),
    ], true);
    const t2 = typeSystem.DefineRowType('T2', [
      RowMemberBuilder.Method('T2', 'b', registry.CreateFunctionType('T2::b', [], [registry.String])),
    ], true);
    const merged = typeSystem.MergeRows('T3', t1, t2);
    const subtype = typeSystem.IsSubtype(merged, t1);

    const trace = typeSystem.TypeComputationRuntime.Trace.map(entry => entry.op);
    assert.ok(trace.includes(TypeComputationOps.DefineRowType));
    assert.ok(trace.includes(TypeComputationOps.MergeRows));
    assert.ok(trace.includes(TypeComputationOps.IsSubtype));
    assert.equal(subtype, true);
  });

  it('keeps row member origins and resolves source-qualified members', function () {
    const typeSystem = new TypeSystem();
    const registry = typeSystem.Registry;
    const t1 = typeSystem.DefineRowType('T1', [
      RowMemberBuilder.Method('T1', 'a', registry.CreateFunctionType('T1::a', [], [registry.Int])),
      RowMemberBuilder.Method('T1', 'b', registry.CreateFunctionType('T1::b', [], [registry.String])),
    ], true);
    const t2 = typeSystem.DefineRowType('T2', [
      RowMemberBuilder.Method('T2', 'b', registry.CreateFunctionType('T2::b', [], [registry.Int])),
      RowMemberBuilder.Method('T2', 'c', registry.CreateFunctionType('T2::c', [], [registry.Bool])),
    ], true);

    const merged = typeSystem.MergeRows('T3', t1, t2);

    assert.equal(merged.Resolve('b')?.Origin, 'T1');
    assert.equal(merged.Resolve('b', 'T2')?.Origin, 'T2');
    assert.equal(merged.EnumerateByName('b').length, 2);
  });

  it('reports contextual member ambiguity when effect context cannot choose one candidate', function () {
    const typeSystem = new TypeSystem();
    const sync = typeSystem.Registry.GetOrCreateEffect('Sync');
    const signature = typeSystem.Registry.CreateFunctionType('read', [], [typeSystem.Registry.String]);
    const file = typeSystem.DefineRowType('File', [
      RowMemberBuilder.Method('File', 'read', signature).WithEffectContext(EffectRow.FromEffects([sync])),
      RowMemberBuilder.Method('File', 'read', signature).WithEffectContext(EffectRow.FromEffects([sync])),
    ], true);

    const resolution = file.ResolveWithEffectContext('read', EffectRow.FromEffects([sync]));

    assert.equal(resolution.Status, RowMemberResolutionStatus.Ambiguous);
    assert.equal(resolution.Candidates.length, 2);
  });

  it('supports generic row spread parameter instantiation', function () {
    const typeSystem = new TypeSystem();
    const registry = typeSystem.Registry;
    const tail = typeSystem.DefineRowType('Tail', [
      RowMemberBuilder.Method('Tail', 'c', registry.CreateFunctionType('Tail::c', [], [registry.Bool])),
    ], true);

    const generic = typeSystem.DefineGenericRowType('T1', [
      { Name: 'P', IsRowParameter: false },
      { Name: 'Q', IsRowParameter: true },
    ], [
      RowMemberBuilder.Method('T1', 'a', registry.CreateFunctionType('T1::a', [], [{ Name: 'P' } as any])),
      RowMemberBuilder.Spread('T1', 'Q', { Name: 'Q', IsRowParameter: true } as any),
    ], true);

    const instantiated = typeSystem.InstantiateGenericRowType(generic, registry.Int, tail);

    assert.ok(instantiated.Members.some(member => member.Name === 'a' && (member.Type as any).ReturnType.Name === 'int'));
    assert.ok(instantiated.Members.some(member => member.Name === 'c' && member.Origin === 'Tail'));
  });

  it('checks effect row union, subtraction, and subset behavior', function () {
    const typeSystem = new TypeSystem();
    const io = typeSystem.Registry.GetOrCreateEffect('IoError');
    const print = typeSystem.Registry.GetOrCreateEffect('Print');

    const effects = EffectRow.FromEffects([io]).Union(EffectRow.FromEffects([print]));
    const residual = effects.Subtract(EffectRow.FromEffects([io]));

    assert.deepEqual(effects.Effects.map(effect => effect.Name), ['IoError', 'Print']);
    assert.deepEqual(residual.Effects.map(effect => effect.Name), ['Print']);
    assert.equal(residual.IsSubsetOf(effects), true);
    assert.equal(effects.IsSubsetOf(residual), false);
  });

  it('validates class and trait projection through row subtyping', function () {
    const typeSystem = new TypeSystem();
    const registry = typeSystem.Registry;
    typeSystem.DefineClass('ToString', [
      RowMemberBuilder.Method('ToString', 'to_string', registry.CreateFunctionType('to_string', [registry.Any], [registry.String]), RowQualifier.Virtual),
    ], true, [], [], true);
    typeSystem.DefineClass('A', [
      RowMemberBuilder.Method('A', 'to_string', registry.CreateFunctionType('to_string', [registry.Any], [registry.String]), RowQualifier.Override),
    ], true, [{ Name: 'ToString', Inheritance: InheritanceKind.Real, Access: AccessModifier.Public }], [], false);

    const cls = typeSystem.RequireClassSymbol('A');
    const trait = typeSystem.RequireClassSymbol('ToString');

    assert.ok(new TypeProjection(cls, trait).IsValidProjection(typeSystem));
    assert.ok(typeSystem.IsSubtype(cls, trait));
  });

  it('computes class method resolution order with C3 linearization', function () {
    const typeSystem = new TypeSystem();
    const empty = [];
    const base = (name: string) => typeSystem.DefineClass(name, empty, true, [{ Name: 'object' }]);
    base('A');
    base('B');
    base('C');
    base('D');
    base('E');

    typeSystem.DefineClass('K1', empty, true, [{ Name: 'C' }, { Name: 'A' }, { Name: 'B' }]);
    typeSystem.DefineClass('K2', empty, true, [{ Name: 'B' }, { Name: 'D' }, { Name: 'E' }]);
    typeSystem.DefineClass('K3', empty, true, [{ Name: 'A' }, { Name: 'D' }]);
    const z = typeSystem.DefineClass('Z', empty, true, [{ Name: 'K1' }, { Name: 'K3' }, { Name: 'K2' }]);

    assert.deepEqual(
      z.MethodResolutionOrder.map(type => type.Name),
      ['Z', 'K1', 'C', 'K3', 'A', 'K2', 'B', 'D', 'E', 'object'],
    );
  });

  it('prunes earlier rows blocked by a virtual member until an override appears', function () {
    const typeSystem = new TypeSystem();
    const registry = typeSystem.Registry;
    const signature = registry.CreateFunctionType('value', [], [registry.Int]);

    typeSystem.DefineClass('DefaultValue', [
      RowMemberBuilder.Method('DefaultValue', 'value', signature),
    ], true, [], [], true);
    typeSystem.DefineClass('Base', [
      RowMemberBuilder.Method('Base', 'value', signature, RowQualifier.Virtual),
    ], true, [{ Name: 'object' }]);
    const derived = typeSystem.DefineClass('Derived', [
      RowMemberBuilder.Method('Derived', 'value', signature, RowQualifier.Override),
    ], true, [{ Name: 'DefaultValue' }, { Name: 'Base' }]);

    const relevant = derived.Rows.Members.filter(member => member.Name === 'value');

    assert.ok(relevant.some(member => member.Origin === 'Derived'));
    assert.ok(relevant.some(member => member.Origin === 'Base' && member.IsVirtual));
    assert.ok(!relevant.some(member => member.Origin === 'DefaultValue'));
  });

  it('rejects overriding final members during row materialization', function () {
    const typeSystem = new TypeSystem();
    const registry = typeSystem.Registry;
    const signature = registry.CreateFunctionType('value', [], [registry.Int]);

    typeSystem.DefineClass('Base', [
      RowMemberBuilder.Method('Base', 'value', signature, RowQualifier.Final),
    ], true, [{ Name: 'object' }]);
    const derived = typeSystem.DefineClass('Derived', [
      RowMemberBuilder.Method('Derived', 'value', signature, RowQualifier.Override),
    ], true, [{ Name: 'Base' }]);

    assert.throws(() => derived.Rows, /Cannot override final member 'value'/);
  });

  it('allows projection from a class to an implemented trait and restricts member view', function () {
    const typeSystem = new TypeSystem();
    const registry = typeSystem.Registry;
    const titleSignature = registry.CreateFunctionType('title', [], [registry.String]);

    typeSystem.DefineClass('Named', [
      RowMemberBuilder.Method('Named', 'title', titleSignature, RowQualifier.Virtual),
    ], true, [], [], true);
    const article = typeSystem.DefineClass('Article', [
      RowMemberBuilder.Method('Article', 'title', titleSignature, RowQualifier.Override),
      RowMemberBuilder.Field('Article', 'draftOnly', registry.Bool),
    ], true, [{ Name: 'Named' }]);

    const projection = new TypeProjection(article.Type, typeSystem.RequireClassSymbol('Named'));

    assert.equal(projection.IsValidProjection(typeSystem), true);
    assert.ok(typeSystem.RequireClassSymbol('Named').Rows.Members.some(member => member.Name === 'title'));
    assert.ok(!typeSystem.RequireClassSymbol('Named').Rows.Members.some(member => member.Name === 'draftOnly'));
  });

  it('keeps C# subtyping parity for closed rows, effect rows, row tails, and getter-shaped fields', function () {
    const typeSystem = new TypeSystem();
    const registry = typeSystem.Registry;
    const readSignature = registry.CreateFunctionType('Readable::read', [], [registry.String]);
    const closeSignature = registry.CreateFunctionType('Closable::close', [], [registry.Bool]);
    const console = registry.GetOrCreateEffect('Console');
    const file = registry.GetOrCreateEffect('File');

    const readable = typeSystem.DefineRowType('Readable', [
      RowMemberBuilder.Method('Readable', 'read', readSignature),
    ], true);
    const exactReadable = typeSystem.DefineRowType('ExactReadable', [
      RowMemberBuilder.Method('ExactReadable', 'read', readSignature),
    ], false);
    const fileRow = typeSystem.DefineRowType('File', [
      RowMemberBuilder.Method('File', 'read', readSignature),
      RowMemberBuilder.Method('File', 'close', closeSignature),
    ], true);

    assert.equal(typeSystem.IsSubtype(fileRow, readable), true);
    assert.equal(typeSystem.IsSubtype(fileRow, exactReadable), false);

    const rowTail = { Name: 'R', IsRowParameter: true };
    const readablePlus = typeSystem.DefineGenericRowType('ReadablePlus', [rowTail], [
      RowMemberBuilder.Method('ReadablePlus', 'read', readSignature),
      RowMemberBuilder.Spread('ReadablePlus', 'R', rowTail),
    ], false);
    const closable = typeSystem.DefineRowType('Closable', [
      RowMemberBuilder.Method('Closable', 'close', closeSignature),
    ], false);
    const readableAndClosable = typeSystem.InstantiateGenericRowType(readablePlus, closable);
    const exactReadableClosable = typeSystem.DefineRowType('ExactReadableClosable', [
      RowMemberBuilder.Method('ExactReadableClosable', 'read', readSignature),
      RowMemberBuilder.Method('ExactReadableClosable', 'close', closeSignature),
    ], false);

    assert.equal(typeSystem.IsSubtype(readableAndClosable, exactReadableClosable), true);
    assert.equal(typeSystem.IsSubtype(exactReadableClosable, readableAndClosable), true);

    const consoleAndFile = new FunctionTypeSymbol('Worker::work', [], [registry.String], EffectRow.FromEffects([console, file]));
    const consoleOnly = new FunctionTypeSymbol('ConsoleWorker::work', [], [registry.String], EffectRow.FromEffects([console]));
    const worker = typeSystem.DefineRowType('Worker', [
      RowMemberBuilder.Method('Worker', 'work', consoleAndFile),
    ], true);
    const consoleWorker = typeSystem.DefineRowType('ConsoleWorker', [
      RowMemberBuilder.Method('ConsoleWorker', 'work', consoleOnly),
    ], true);

    assert.equal(typeSystem.IsSubtype(consoleWorker, worker), true);
    assert.equal(typeSystem.IsSubtype(worker, consoleWorker), false);

    const namedGetter = typeSystem.DefineRowType('Named', [
      RowMemberBuilder.Method('Named', 'name', registry.CreateFunctionType('Named::name', [], [registry.String])),
    ], true);
    const personField = typeSystem.DefineRowType('Person', [
      RowMemberBuilder.Field('Person', 'name', registry.String),
    ], true);

    assert.equal(typeSystem.IsSubtype(personField, namedGetter), true);
  });
});
