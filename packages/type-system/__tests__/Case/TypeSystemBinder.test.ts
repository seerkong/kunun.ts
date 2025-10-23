import assert from 'assert';
import fs from 'fs';
import { KnWord } from 'kunun-core';
import { GenericRowTypeSymbol, KonTypeBinder, RowTypeSymbol, TypeProjection } from 'kunun-type-system';

const BASE_DIR = __dirname + '/../Resource/TypeSystem';

function readSource(fileName: string): string {
  return fs.readFileSync(`${BASE_DIR}/${fileName}`, 'utf-8');
}

describe('Kon type-system binder', function () {
  it('binds ExtensibleScopedRowType goal syntax into row/class/generic/effect symbols', function () {
    const result = KonTypeBinder.BindSource(readSource('Goal.kon'));

    assert.deepEqual(result.Diagnostics, []);

    const t1 = result.TypeSystem.Registry.Require('T1') as RowTypeSymbol;
    const t2 = result.TypeSystem.Registry.Require('T2') as RowTypeSymbol;
    const t3 = result.TypeSystem.Registry.Require('T3') as RowTypeSymbol;
    assert.equal(result.TypeSystem.IsSubtype(t3, t1), true);
    assert.equal(result.TypeSystem.IsSubtype(t3, t2), true);
    assert.equal(result.TypeSystem.IsSubtype(t1, t3), false);

    const bMembers = t3.EnumerateByName('b');
    assert.deepEqual(bMembers.map(member => member.Origin), ['T1', 'T2']);

    const sourceQualified = result.TypeSystem.Registry.Require('SourceQualified') as RowTypeSymbol;
    assert.equal(sourceQualified.Members[0].Name, 'b');
    assert.equal(sourceQualified.Members[0].Origin, 'T1');

    const generic = result.TypeSystem.Registry.Require('T1Generic') as GenericRowTypeSymbol;
    assert.equal(generic.TypeParameters.find(parameter => parameter.Name === 'Q')?.IsRowParameter, true);
    const tail = result.TypeSystem.Registry.Require('Tail') as RowTypeSymbol;
    const instantiated = result.TypeSystem.InstantiateGenericRowType(generic, result.TypeSystem.Registry.Int, tail);
    assert.ok(instantiated.Members.some(member => member.Name === 'a'));
    assert.ok(instantiated.Members.some(member => member.Name === 'c' && member.Origin === 'Tail'));

    const closed = result.TypeSystem.Registry.Require('ClosedT') as RowTypeSymbol;
    assert.equal(closed.IsOpen, false);

    const cls = result.TypeSystem.RequireClassSymbol('A');
    const trait = result.TypeSystem.RequireClassSymbol('ToString');
    assert.equal(new TypeProjection(cls, trait).IsValidProjection(result.TypeSystem), true);

    assert.deepEqual(result.Functions.readConfig.EffectRow.Effects.map(effect => effect.Name), ['IoError', 'Print']);
    assert.deepEqual(result.ApplyEffectHandler(result.Functions.readConfig.EffectRow, 'ioErrorHandler').Effects.map(effect => effect.Name), ['Print']);
    assert.equal(result.EffectHandlers.find(handler => handler.Name === 'ioErrorHandler')?.ImplementationFunctionName, 'handleIoError');
  });

  it('returns diagnostics for invalid top-level and unknown merge targets', function () {
    const result = KonTypeBinder.BindSource(`
      1
      (type #Broken @merge = [Missing])
    `);

    assert.ok(result.Diagnostics.some(diagnostic => diagnostic.Code === 'KTB002'));
    assert.ok(result.Diagnostics.some(diagnostic => diagnostic.Code === 'KTB021'));
    assert.equal(result.Success, false);
  });

  it('reports effect handler application gaps and closed boundary residual effects', function () {
    const result = KonTypeBinder.BindSource(`
      #(effect decl #Console)
      (type #Console :[])

      #(effect decl #File)
      (type #File :[])

      #(effect row :[
        File
      ])
      (fn #runApp |-> Unit|
        :[])

      #(effect handler #consoleHandler handles :[
        Console
      ])
      (fn #consoleHandlerImpl |-> Unit|
        :[])
    `);

    const residual = result.ApplyEffectHandler(result.Functions.runApp.EffectRow, 'consoleHandler');
    const unknownResidual = result.ApplyEffectHandler(result.Functions.runApp.EffectRow, 'missingHandler');
    result.ValidateClosedEffectBoundary('runApp', residual);

    assert.deepEqual(residual.Effects.map(effect => effect.Name), ['File']);
    assert.deepEqual(unknownResidual.Effects.map(effect => effect.Name), ['File']);
    assert.ok(result.Diagnostics.some(diagnostic => diagnostic.Code === 'KTB096'));
    assert.ok(result.Diagnostics.some(diagnostic => diagnostic.Code === 'KTB097' && diagnostic.Message.includes('does not handle any residual effects')));
    assert.ok(result.Diagnostics.some(diagnostic => diagnostic.Code === 'KTB098' && diagnostic.Message.includes("Boundary 'runApp' has unhandled residual effects")));
  });

  it('applies multiple effect handlers until the full residual row is eliminated', function () {
    const result = KonTypeBinder.BindSource(`
      #(effect decl #Console)
      (type #Console :[])

      #(effect decl #File)
      (type #File :[])

      #(effect row :[
        Console
        File
      ])
      (fn #runApp |-> Unit|
        :[])

      #(effect handler #consoleHandler handles :[
        Console
      ])
      (fn #consoleHandlerImpl |-> Unit|
        :[])

      #(effect handler #fileHandler handles :[
        File
      ])
      (fn #fileHandlerImpl |-> Unit|
        :[])
    `);

    const residual = result.ApplyEffectHandlers(result.Functions.runApp.EffectRow, ['fileHandler', 'consoleHandler']);

    assert.equal(residual.IsEmpty, true);
  });

  it('validates generic row type use arity and spread row constraints', function () {
    const result = KonTypeBinder.BindSource(`
      (type #Tail :[
        (method #tail |-> Bool|)
      ])

      (type #Box <T R>
        :[
          (!T field #value)
          ..R
        ])

      (fn #ok |-> Unit|
        :[])
    `);

    const binder = new KonTypeBinder(result.TypeSystem);
    const ok = new KnWord('Box');
    ok.GenericArgs = [new KnWord('Int'), new KnWord('Tail')];
    const badArity = new KnWord('Box');
    badArity.GenericArgs = [new KnWord('Int')];
    const badSpread = new KnWord('Box');
    badSpread.GenericArgs = [new KnWord('Int'), new KnWord('String')];

    const okType = binder.BindTypeNode(ok);
    binder.BindTypeNode(badArity);
    binder.BindTypeNode(badSpread);
    const diagnostics = binder.Bind([]).Diagnostics;

    assert.deepEqual(result.Diagnostics, []);
    assert.ok(diagnostics.some(diagnostic => diagnostic.Code === 'KTB101' && diagnostic.Message.includes('expects 2 type arguments')));
    assert.ok(diagnostics.some(diagnostic => diagnostic.Code === 'KTB101' && diagnostic.Message.includes('must be a row type')));
    assert.equal(okType.Name, 'Box<int,Tail>');
  });

  it('reports negative diagnostics instead of silently registering malformed body and base metadata', function () {
    const result = KonTypeBinder.BindSource(`
      (type #Broken :[
        1
        (method #ok |-> Int|)
      ])

      (class #BadBase
        @inherits = [(
          visibility = private
        )]
        :[])
    `);

    const broken = result.TypeSystem.Registry.Require('Broken') as RowTypeSymbol;

    assert.ok(result.Diagnostics.some(diagnostic => diagnostic.Code === 'KTB040'));
    assert.ok(result.Diagnostics.some(diagnostic => diagnostic.Code === 'KTB071'));
    assert.deepEqual(broken.Members.map(member => member.Name), ['ok']);
  });
});
