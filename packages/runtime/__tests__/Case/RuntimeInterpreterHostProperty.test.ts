import assert from 'assert';

import { RuntimeInterpreter } from 'kunun-runtime';

describe('RuntimeInterpreter host property boundary', function () {
  it('reads and writes host object properties through static property syntax', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.define('model', { text: 'abc' });

    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, '(model.:text)'), 'abc');
    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, '(set model.:text "def")'), 'def');
    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, '(model.:text)'), 'def');
  });

  it('reads host array length and subscript values', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.define('items', [1, 2, 3]);

    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, '(items.:length)'), 3);
    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, '(items::1)'), 2);
  });
});
