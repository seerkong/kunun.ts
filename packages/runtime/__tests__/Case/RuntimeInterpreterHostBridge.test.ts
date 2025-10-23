import assert from 'assert';

import { RuntimeInterpreter } from 'kunun-runtime';

describe('RuntimeInterpreter host object bridge', function () {
  it('calls host object methods through runtime bridge APIs', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const target: number[] = [];

    assert.equal(runtime.callHostObjectMethod(target, 'push', [1]), 1);
    assert.equal(runtime.applyHostObjectMethod(target, 'push', [2]), 2);
    assert.deepEqual(target, [1, 2]);
  });

  it('provides a script-level HostCall equivalent for legacy js_call', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const target: number[] = [];
    runtime.define('target', target);

    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, '(target "push" 1 :HostCall)'), 1);
    assert.deepEqual(target, [1]);
  });

  it('provides a script-level HostApply equivalent for legacy js_apply', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const target: number[] = [];
    runtime.define('target', target);

    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, '(target "push" [1] :HostApply)'), 1);
    assert.deepEqual(target, [1]);
  });
});
