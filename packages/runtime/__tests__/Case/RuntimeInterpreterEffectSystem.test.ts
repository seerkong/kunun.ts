import assert from 'assert';
import fs from 'fs';

import { RuntimeInterpreter } from 'kunun-runtime';

const BASE_DIR = __dirname + '/../Resource/RuntimeInterpreter/Effect';

function readSource(fileName: string): string {
  return fs.readFileSync(`${BASE_DIR}/${fileName}`, 'utf-8');
}

describe('RuntimeInterpreter untyped effect system', function () {
  it('exposes scoped active effect handler maps with latest map priority', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const outerHandler = () => 'outer';
    const innerHandler = () => 'inner';

    const result = runtime.withActiveEffectHandlerMap({ add: outerHandler }, () => {
      assert.equal(runtime.getActiveEffectHandler('add'), outerHandler);
      return runtime.withActiveEffectHandlerMap({ add: innerHandler }, () => runtime.getActiveEffectHandler('add')());
    });

    assert.equal(result, 'inner');
    assert.equal(runtime.getActiveEffectHandler('add'), null);
  });

  it('keeps active handler maps visible across runtime function and handler calls', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const handler = (_resume: unknown, left: number, right: number) => left + right;
    const readHandler = runtime.createLambda(['left', 'right'], [
      (activeRuntime) => activeRuntime.getActiveEffectHandler('add')(null, activeRuntime.lookup('left'), activeRuntime.lookup('right')),
    ]);

    const result = runtime.withActiveEffectHandlerMap({ add: handler }, () => runtime.callRuntimeFunction(readHandler, [1, 2]));

    assert.equal(result, 3);
  });

  it('restores active handler maps from continuation snapshots', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const addHandler = () => 'add';
    const otherHandler = () => 'other';
    runtime.pushActiveEffectHandlerMap({ add: addHandler });
    const continuation = runtime.captureContinuation();

    runtime.pushActiveEffectHandlerMap({ add: otherHandler });
    assert.equal(runtime.getActiveEffectHandler('add'), otherHandler);

    runtime.restoreContinuation(continuation);

    assert.equal(runtime.getActiveEffectHandler('add'), addHandler);
  });

  it('evaluates try body without handlers', function () {
    assert.equal(RuntimeInterpreter.EvalBlockSourceSync(readSource('TryNoHandler.kon')), 6);
  });

  it('parses try handle clauses into active handler maps', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.registerHostFunction('HandlerExists', () => runtime.getActiveEffectHandler('add') != null, 0);

    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, readSource('TryHandlerMap.kon')), true);
  });

  it('performs a handled effect with resume continuation', function () {
    assert.equal(RuntimeInterpreter.EvalBlockSourceSync(readSource('PerformSingle.kon')), 3);
  });

  it('performs multiple handled effects through the active handler map', function () {
    assert.equal(RuntimeInterpreter.EvalBlockSourceSync(readSource('PerformMulti.kon')), 6);
  });

  it('throws a clear error for unhandled effects', function () {
    assert.throws(
      () => RuntimeInterpreter.EvalBlockSourceSync(readSource('PerformUnhandled.kon')),
      /Unhandled effect: missing/,
    );
  });

  it('uses named effect handler declarations through postfix handle syntax', function () {
    assert.equal(RuntimeInterpreter.EvalBlockSourceSync(readSource('PostfixNamedHandler.kon')), 3);
  });

  it('composes multiple named effect handlers through postfix handle syntax', function () {
    assert.equal(RuntimeInterpreter.EvalBlockSourceSync(readSource('PostfixComposedHandlers.kon')), 6);
  });
});
