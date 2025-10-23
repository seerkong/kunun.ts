import assert from 'assert';

import { RuntimeInterpreter } from 'kunun-runtime';

describe('RuntimeInterpreter continuation runtime', function () {
  it('captures continuation while excluding top scheduled instructions', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const fiber = runtime.getCurrentFiber();
    fiber.instructionStack.push({ opcode: 'keep:bottom' });
    fiber.instructionStack.push({ opcode: 'drop:perform-tail' });
    fiber.instructionStack.push({ opcode: 'drop:try-tail' });

    const continuation = runtime.captureContinuation(2);

    assert.deepEqual(continuation.instructionItems.map((item) => item.opcode), ['keep:bottom']);
  });

  it('restores env, instruction stack, operand stack, and appends resume operands', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.define('rootValue', 1);
    const rootEnvId = runtime.currentEnvId;
    const fiber = runtime.getCurrentFiber();
    fiber.operandStack.push('before');
    fiber.instructionStack.push({ opcode: 'resume:target' });
    const continuation = runtime.captureContinuation();

    runtime.diveLocalEnv('temporary');
    runtime.define('localValue', 2);
    fiber.operandStack.push('after');
    fiber.instructionStack.push({ opcode: 'discard:current' });

    runtime.restoreContinuation(continuation, ['resume-value']);

    assert.equal(runtime.currentEnvId, rootEnvId);
    assert.equal(runtime.lookup('rootValue'), 1);
    assert.deepEqual(fiber.instructionStack.snapshot().items.map((item) => item.opcode), ['resume:target']);
    assert.deepEqual(fiber.operandStack.snapshot().items, ['before', 'resume-value']);
  });

  it('calls continuation values as resume functions and skips later handler statements', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const fiber = runtime.getCurrentFiber();
    fiber.operandStack.push('captured');
    const continuation = runtime.captureContinuation();
    runtime.define('capturedResume', continuation);

    const result = RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, `
      (fn #Handler :|resume| :[
        (resume 42)
        99
      ])
      (:Handler capturedResume)
    `);

    assert.equal(result, 42);
    assert.deepEqual(fiber.operandStack.snapshot().items, [42]);
  });
});
