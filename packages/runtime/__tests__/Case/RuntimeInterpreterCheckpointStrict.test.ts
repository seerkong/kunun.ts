import assert from 'assert';

import { RuntimeInterpreter } from 'kunun-runtime';

describe('RuntimeInterpreter strict checkpoint serialization boundary', function () {
  it('rejects snapshots containing host functions with a path-qualified error in strict mode', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.getCurrentFiber().operandStack.push(() => 42);

    assert.throws(
      () => runtime.captureSnapshot({ strict: true }),
      (error: any) => /not JSON-serializable/.test(error.message)
        && /fibers\[0\]\.operandStack\.items\[0\]/.test(error.message),
    );

    const bigintRuntime = RuntimeInterpreter.CreateRuntime();
    bigintRuntime.getCurrentFiber().operandStack.push(123n);
    assert.throws(
      () => bigintRuntime.captureSnapshot({ strict: true }),
      /not JSON-serializable: bigint/,
    );

    const symbolRuntime = RuntimeInterpreter.CreateRuntime();
    symbolRuntime.getCurrentFiber().operandStack.push(Symbol('host'));
    assert.throws(
      () => symbolRuntime.captureSnapshot({ strict: true }),
      /not JSON-serializable: symbol/,
    );
  });

  it('rejects snapshots containing circular references in strict mode', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const circular: any = { name: 'loop' };
    circular.self = circular;
    runtime.getCurrentFiber().operandStack.push(circular);

    assert.throws(
      () => runtime.captureSnapshot({ strict: true }),
      /circular reference/,
    );
  });

  it('keeps the default capture behavior unchanged for the same runtime state', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.getCurrentFiber().operandStack.push(() => 42);

    const snapshot = runtime.captureSnapshot();
    assert.equal(snapshot.version, 1);
    assert.ok(snapshot.fibers.length >= 1);
  });

  it('accepts serializable runtime state in strict mode', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.defineGlobal('config', { retries: 3, tags: ['a', 'b'] });
    runtime.getCurrentFiber().operandStack.push({ ok: true });

    const snapshot = runtime.captureSnapshot({ strict: true });
    const roundtrip = JSON.parse(JSON.stringify(snapshot));
    assert.equal(roundtrip.version, 1);
  });
});
