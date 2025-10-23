import assert from 'assert';

import { RuntimeInterpreter } from 'kunun-runtime';

describe('RuntimeInterpreter embedding API', function () {
  it('exports a script function as a synchronous JS callable', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const add = RuntimeInterpreter.MakeFuncSync(runtime, `
      (fn #add :|left right| :[
        (left right :+)
      ])
    `);

    assert.equal(add(3, 4), 7);
  });

  it('preserves closure values captured by the exported script function', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, '(var base 10)');

    const addBase = RuntimeInterpreter.MakeFuncSync(runtime, `
      (fn #addBase :|value| :[
        (base value :+)
      ])
    `);
    RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, '(set base 20)');

    assert.equal(addBase(5), 15);
  });

  it('reports a clear error when source does not evaluate to a callable', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();

    assert.throws(
      () => RuntimeInterpreter.MakeFuncSync(runtime, '(var value 1)'),
      /does not evaluate to a callable/,
    );
  });
});
