import assert from 'assert';

import {
  RuntimeFiberStatus,
  RuntimeInterpreter,
  RuntimeState,
} from 'kunun-runtime';

describe('RuntimeInterpreter checkpoint runtime', function () {
  it('captures and hydrates all fibers, stacks, current fiber, env values, and active handlers', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.defineGlobal('globalValue', 'root');
    runtime.diveProcessEnv('workflow');
    runtime.define('processValue', 42);
    runtime.pushActiveEffectHandlerMap({ ask: 'handler-ref' });

    const root = runtime.getCurrentFiber();
    root.operandStack.push('root-operand');
    root.instructionStack.push({ opcode: 'root-next', memo: { step: 1 } });

    const child = runtime.createFiber(root);
    child.status = RuntimeFiberStatus.Idle;
    child.currentEnvId = runtime.currentEnvId;
    child.operandStack.push('child-operand');
    child.instructionStack.push({ opcode: 'child-next' });

    const snapshot = runtime.captureSnapshot();
    assert.equal(snapshot.currentFiberId, root.id);
    assert.equal(snapshot.fibers.length, 2);
    assert.deepEqual(snapshot.activeEffectHandlerMaps, [{ ask: 'handler-ref' }]);
    assert.equal(JSON.parse(JSON.stringify(snapshot)).fibers.length, 2);

    runtime.define('processValue', 99);
    root.operandStack.push('discard');
    child.status = RuntimeFiberStatus.Dead;

    const restored = RuntimeInterpreter.CreateRuntime();
    restored.hydrateSnapshot(snapshot);

    assert.equal(restored.getCurrentFiber().id, root.id);
    assert.equal(restored.lookup('globalValue'), 'root');
    assert.equal(restored.lookup('processValue'), 42);
    assert.equal(restored.getActiveEffectHandler('ask'), 'handler-ref');
    assert.deepEqual(restored.getFiberById(root.id).operandStack.snapshot().items.slice(-1), ['root-operand']);
    assert.deepEqual(restored.getFiberById(root.id).instructionStack.snapshot().items.map((item) => item.opcode), ['root-next']);
    assert.equal(restored.getFiberById(child.id).status, RuntimeFiberStatus.Idle);
    assert.deepEqual(restored.getFiberById(child.id).operandStack.snapshot().items.slice(-1), ['child-operand']);
  });

  it('captures loop frames, exception frames, and pending abrupt completion metadata', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.pushControlFrame({
      kind: 'loop',
      frameId: 'loop:items',
      cursor: 2,
      continueTarget: 'loop:items:continue',
      breakTarget: 'loop:items:break',
      envId: runtime.currentEnvId,
    });
    runtime.pushControlFrame({
      kind: 'exception',
      frameId: 'try:agent',
      catchTarget: 'try:agent:catch',
      finallyTarget: 'try:agent:finally',
      envId: runtime.currentEnvId,
    });
    runtime.setPendingAbruptCompletion({
      kind: 'continue',
      targetFrameId: 'loop:items',
      value: 'resume-next-item',
    });

    const snapshot = runtime.captureSnapshot();
    assert.deepEqual(snapshot.controlFrames.map((frame) => frame.kind), ['loop', 'exception']);
    assert.deepEqual(snapshot.pendingAbruptCompletion, {
      kind: 'continue',
      targetFrameId: 'loop:items',
      value: 'resume-next-item',
    });

    const restored = RuntimeInterpreter.CreateRuntime();
    restored.hydrateSnapshot(snapshot);

    assert.deepEqual(restored.getControlFrames(), snapshot.controlFrames);
    assert.deepEqual(restored.getPendingAbruptCompletion(), snapshot.pendingAbruptCompletion);
  });

  it('hydrates continuation snapshots through public depa-actor stack APIs', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const fiber = runtime.getCurrentFiber();
    fiber.operandStack.push('before');
    fiber.instructionStack.push({ opcode: 'resume:target' });
    const continuation = runtime.captureContinuation();

    fiber.operandStack.push('discard');
    fiber.instructionStack.push({ opcode: 'discard' });
    runtime.restoreContinuation(continuation, ['resume-value']);

    assert.deepEqual(fiber.instructionStack.snapshot().items.map((item) => item.opcode), ['resume:target']);
    assert.deepEqual(fiber.operandStack.snapshot().items, ['before', 'resume-value']);
  });
});
