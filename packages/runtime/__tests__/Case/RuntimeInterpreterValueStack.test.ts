import assert from 'assert';

import { RuntimeInterpreter } from 'kunun-runtime';

describe('RuntimeInterpreter value stack parity', function () {
  it('duplicates the top value with ValStack_Duplicate', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();

    runtime.addOpDirectly('Runtime_LandSuccess');
    runtime.addOpDirectly('ValStack_Duplicate');
    runtime.addOpDirectly('ValStack_PushValue', 7);

    RuntimeInterpreter.StartLoopSync(runtime);

    assert.deepEqual(runtime.getCurrentFiber().operandStack.snapshot().items.slice(-2), [7, 7]);
  });

  it('swaps the top two values', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();

    runtime.addOpDirectly('Runtime_LandSuccess');
    runtime.addOpDirectly('ValStack_SwapTop');
    runtime.addOpDirectly('ValStack_PushValue', 'right');
    runtime.addOpDirectly('ValStack_PushValue', 'left');

    RuntimeInterpreter.StartLoopSync(runtime);

    assert.deepEqual(runtime.getCurrentFiber().operandStack.snapshot().items.slice(-2), ['right', 'left']);
  });

  it('collects top N values while preserving stable order', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();

    runtime.addOpDirectly('Runtime_LandSuccess');
    runtime.addOpDirectly('ValStack_CollectTopN', 3);
    runtime.addOpDirectly('ValStack_PushValue', 3);
    runtime.addOpDirectly('ValStack_PushValue', 2);
    runtime.addOpDirectly('ValStack_PushValue', 1);

    RuntimeInterpreter.StartLoopSync(runtime);

    assert.deepEqual(runtime.getCurrentFiber().operandStack.peek(), [1, 2, 3]);
  });

  it('preserves frame boundary behavior with duplicate and pop frame top value', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();

    runtime.addOpDirectly('Runtime_LandSuccess');
    runtime.addOpDirectly('ValStack_PopFrameAndPushTopVal');
    runtime.addOpDirectly('ValStack_Duplicate');
    runtime.addOpDirectly('ValStack_PushValue', 'value');
    runtime.addOpDirectly('ValStack_PushFrame');

    RuntimeInterpreter.StartLoopSync(runtime);

    assert.equal(runtime.getCurrentFiber().operandStack.peek(), 'value');
    assert.equal(runtime.getCurrentFiber().operandStack.snapshot().items.length, 1);
  });
});
