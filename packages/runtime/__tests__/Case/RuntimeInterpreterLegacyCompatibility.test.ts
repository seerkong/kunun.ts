import assert from 'assert';
import fs from 'fs';
import path from 'path';

import { RuntimeFiberStatus, RuntimeInterpreter } from 'kunun-runtime';

const BASE_DIR = path.join(__dirname, '../Resource/RuntimeInterpreter/Legacy');

function readSource(fileName: string): string {
  return fs.readFileSync(path.join(BASE_DIR, fileName), 'utf-8');
}

describe('RuntimeInterpreter legacy compatibility migration', function () {
  it('runs chain assignment and legacy self-update syntax from source', function () {
    const result = RuntimeInterpreter.EvalBlockSourceSync(readSource('ChainAssignmentAndSugar.kon'));

    assert.deepEqual(result, ['Bob', 9, 4]);
  });

  it('supports legacy scheduler state transitions and yield between fibers', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const root = runtime.getCurrentFiber();
    const child = runtime.createFiber(root, RuntimeFiberStatus.Runnable);

    root.operandStack.pushFrame();
    root.operandStack.push('payload');
    runtime.yieldToFiberAndChangeCurrentFiberState(child.id, RuntimeFiberStatus.Suspended);

    assert.equal(root.status, RuntimeFiberStatus.Suspended);
    assert.equal(child.status, RuntimeFiberStatus.Running);
    assert.equal(child.operandStack.peek(), 'payload');

    runtime.awakenFibers([root.id]);
    assert.equal(root.status, RuntimeFiberStatus.Runnable);

    runtime.finalizeCurrentFiber();
    assert.equal(child.status, RuntimeFiberStatus.Dead);
  });

  it('awaits host async functions through fiber resume tokens', async function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.registerHostFunction('asyncAdd', async (left, right) => left + right, 2);

    const result = await RuntimeInterpreter.ExecBlockWithRuntimeAsync(
      runtime,
      RuntimeInterpreter.ParseSourceBlock('(await_host_fn asyncAdd [2 3])'),
    );

    assert.equal(result, 5);
  });

  it('runs set_timeout callbacks through a controllable timer host', async function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const scheduled: Array<() => void> = [];
    runtime.setTimerHost({
      setTimeout: (handler) => {
        scheduled.push(handler);
        return `timeout:${scheduled.length}`;
      },
    });

    runtime.define('hits', []);
    const promise = RuntimeInterpreter.ExecBlockWithRuntimeAsync(
      runtime,
      RuntimeInterpreter.ParseSourceBlock(`
        (fn #mark :|| :[
          (hits "ok" :append)
        ])
        (set_timeout mark 1)
        (hits)
      `),
    );

    assert.equal(scheduled.length, 1);
    scheduled[0]();
    assert.deepEqual(await promise, ['ok']);
  });

  it('clears set_interval handles through host aliases', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    let cleared: any = null;
    runtime.setTimerHost({
      setInterval: () => 'interval:1',
      clearInterval: (handle) => {
        cleared = handle;
      },
    });

    const handle = RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, `
      (fn #tick :|| :[ 1 ])
      (set_interval tick 1)
    `);

    assert.equal(handle, 'interval:1');
    assert.equal(runtime.callHostFunction('clear_interval', [handle]), null);
    assert.equal(cleared, 'interval:1');
  });

  it('supports reusable MakeFuncSync callables while preserving default API', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const add = RuntimeInterpreter.MakeFuncSync(runtime, `
      (fn #add :|left right| :[
        (left right :+)
      ])
    `, true);

    assert.equal(add(1, 2), 3);
    assert.equal(add(4, 5), 9);
  });

  it('keeps equals data syntax separate from chain assignment', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const result = RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, `
      (var data {name = "Alice" age = 20})
      [(data.:name) (data.:age)]
    `);

    assert.deepEqual(result, ['Alice', 20]);
  });
});
