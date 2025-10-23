import assert from 'assert';

import { RuntimeInterpreter, RuntimeOpCode, RuntimeState } from 'kunun-runtime';

function dispatchOnce(runtime: RuntimeState, name: string, args: any[]): any {
  runtime.addOpDirectly(RuntimeOpCode.WorkflowDispatch, {
    name,
    fixity: 'prefix',
    args,
    sourceNodeId: `prefix:${name}`,
  });
  const result = RuntimeInterpreter.DispatchUntilStop(runtime);
  assert.equal(result.stopReason, 'yield_requested');
  return result.effects[0];
}

describe('RuntimeInterpreter generic workflow job expansion', function () {
  it('defaults to a single job regardless of the extension name (no name magic)', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    // an ai_parallel-looking name without explicit expansion gets NO special case
    runtime.registerWorkflowExtension('ai_parallel');

    const effect = dispatchOnce(runtime, 'ai_parallel', ['left', 'right']);
    assert.equal(effect.pendingJobs.length, 1);
    assert.ok(effect.pendingJobs[0].path.endsWith('/job:0'));
    assert.deepEqual(effect.pendingJobs[0].args, ['left', 'right']);
  });

  it('expands one job per arg when jobExpansion is perArg, for any extension name', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.registerWorkflowExtension('fan_anything', undefined, { jobExpansion: 'perArg' });

    const effect = dispatchOnce(runtime, 'fan_anything', ['a', 'b', 'c']);
    assert.equal(effect.pendingJobs.length, 3);
    assert.deepEqual(effect.pendingJobs.map((job: any) => job.path), [
      'prefix:fan_anything/item:0',
      'prefix:fan_anything/item:1',
      'prefix:fan_anything/item:2',
    ]);
    assert.deepEqual(effect.pendingJobs.map((job: any) => job.metadata.itemIndex), [0, 1, 2]);
    assert.deepEqual(effect.pendingJobs[1].args, ['b']);
  });

  it('delegates job construction entirely to a buildJobs callback', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.registerWorkflowExtension('staged', undefined, {
      buildJobs: (args, sourceNodeId, extensionName) => {
        const [items, stageNames] = [args[0] as any[], args[1] as string[]];
        const jobs: any[] = [];
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
          for (let stageIndex = 0; stageIndex < stageNames.length; stageIndex++) {
            const stageName = stageNames[stageIndex];
            const path = `${sourceNodeId}/item:${itemIndex}:${stageName}`;
            jobs.push({
              id: `${extensionName}:${path}`,
              extensionName,
              sourceNodeId,
              path,
              status: 'pending',
              args: [items[itemIndex], stageName],
              metadata: { itemIndex, stageIndex, stageName },
            });
          }
        }
        return jobs;
      },
    });

    const effect = dispatchOnce(runtime, 'staged', [[{ id: 'x' }], ['normalize', 'write']]);
    assert.deepEqual(effect.pendingJobs.map((job: any) => job.path), [
      'prefix:staged/item:0:normalize',
      'prefix:staged/item:0:write',
    ]);
    const roundtrip = JSON.parse(JSON.stringify(effect.checkpoint));
    assert.deepEqual(
      roundtrip.pendingWorkflowJobs.map((job: any) => job.id),
      effect.pendingJobs.map((job: any) => job.id),
    );
  });

  it('DispatchUntilStop yields on workflow effects and then drains to empty', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.registerWorkflowExtension('one_shot');
    runtime.registerInstructionHandler('Test_Store', ({ runtime: rt, operandStack }) => {
      rt.defineGlobal('stored', operandStack.pop());
    });
    runtime.addOpDirectly('Test_Store');
    runtime.addOpDirectly(RuntimeOpCode.WorkflowDispatch, {
      name: 'one_shot',
      fixity: 'prefix',
      args: ['payload'],
      sourceNodeId: 'prefix:one_shot',
    });

    const first = RuntimeInterpreter.DispatchUntilStop(runtime);
    assert.equal(first.stopReason, 'yield_requested');
    assert.equal(first.effects.length, 1);

    runtime.getCurrentFiber().operandStack.push('answer');
    const second = RuntimeInterpreter.DispatchUntilStop(runtime);
    assert.equal(second.stopReason, 'instruction_stack_empty');
    assert.equal(runtime.lookup('stored'), 'answer');
  });
});
