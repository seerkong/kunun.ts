import assert from 'assert';

import { RuntimeFiberStatus, RuntimeInterpreter } from 'kunun-runtime';

describe('RuntimeInterpreter env and fiber runtime', function () {
  it('supports global process local env dive rise and lookup behavior', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.defineGlobal('shared', 1);

    const globalEnvId = runtime.getGlobalEnv().Id;
    const processEnv = runtime.diveProcessEnv('request');
    runtime.define('processValue', 2);
    const localEnv = runtime.diveLocalEnv('block');
    runtime.define('localValue', 3);

    assert.equal(runtime.lookup('shared'), 1);
    assert.equal(runtime.lookup('processValue'), 2);
    assert.equal(runtime.lookup('localValue'), 3);
    assert.equal(runtime.currentEnvId, localEnv.Id);

    runtime.riseEnv();
    assert.equal(runtime.currentEnvId, processEnv.Id);
    runtime.changeEnvById(globalEnvId);
    assert.equal(runtime.lookup('shared'), 1);
  });

  it('executes env opcode handlers for global and process operations', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();

    runtime.addOpDirectly('Runtime_LandSuccess');
    runtime.addOpDirectly('Env_Lookup', 'answer');
    runtime.addOpDirectly('Env_Rise');
    runtime.addOpDirectly('Env_DeclareGlobalVar', { key: 'answer', value: 42 });
    runtime.addOpDirectly('Env_DiveProcessEnv', 'process');

    assert.equal(RuntimeInterpreter.StartLoopSync(runtime), 42);
    assert.equal(runtime.getCurrentEnv().EnvType, runtime.getGlobalEnv().EnvType);
  });

  it('resumes suspended fibers with result values and pre-resume instructions', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const root = runtime.getCurrentFiber();
    const child = runtime.createFiber(root);
    child.status = RuntimeFiberStatus.Suspended;

    runtime.addResumeFiberToken({
      fiberId: child.id,
      result: [10, 20],
      beforeResumeOps: [{ opcode: 'ValStack_Duplicate', memo: null }],
    });

    assert.equal(runtime.getResumeFiberTokenCount(), 1);
    const token = runtime.consumeResumeFiberToken();

    assert.equal(token.fiberId, child.id);
    assert.equal(child.status, RuntimeFiberStatus.Runnable);
    assert.deepEqual(child.operandStack.snapshot().items.slice(-2), [10, 20]);
    assert.equal(child.instructionStack.peek()?.opcode, 'ValStack_Duplicate');
  });

  it('can suspend and reactivate the current fiber through runtime tokens', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const token = runtime.suspendCurrentFiber();

    assert.equal(runtime.getFiberById(token.fiberId).status, RuntimeFiberStatus.Suspended);
    runtime.addResumeFiberToken({ ...token, result: ['ok'] });
    runtime.consumeResumeFiberToken();

    const fiber = runtime.getFiberById(token.fiberId);
    assert.equal(fiber.status, RuntimeFiberStatus.Runnable);
    assert.equal(fiber.operandStack.peek(), 'ok');
  });
});
