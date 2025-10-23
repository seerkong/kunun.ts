import assert from 'assert';
import { dispatchInstructions } from 'depa-actor';

import { RuntimeInterpreter, RuntimeOpCode } from 'kunun-runtime';

describe('RuntimeInterpreter workflow extension lowering', function () {
  it('registers prefix workflow extensions that lower source calls to checkpoint-aware effects', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.registerWorkflowExtension('ai_agent');

    const effect = RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, '(ai_agent "summarize")');

    assert.equal(effect.kind, 'RuntimeWorkflowEffect');
    assert.equal(effect.name, 'ai_agent');
    assert.equal(effect.fixity, 'prefix');
    assert.deepEqual(effect.args, ['summarize']);
    assert.equal(effect.sourceNodeId, 'prefix:ai_agent');
    assert.equal(effect.checkpoint.currentFiberId, runtime.getCurrentFiber().id);
    assert.equal(effect.checkpoint.fibers.length, 1);
    assert.deepEqual(effect.pendingJobs.map((job) => job.id), ['ai_agent:prefix:ai_agent/job:0']);
    assert.deepEqual(effect.checkpoint.pendingWorkflowJobs, effect.pendingJobs);
  });

  it('allows hosts to register the explicit dynamic workflow extension names', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    for (const name of ['ai_workflow', 'ai_agent', 'ai_parallel', 'ai_pipeline', 'ai_phase', 'ai_log', 'json_schema']) {
      runtime.registerWorkflowExtension(name);
      assert.equal(runtime.hasWorkflowExtension(name, 'prefix'), true);
    }
  });

  it('registers infix workflow extensions and preserves source node metadata', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.registerWorkflowExtension('pipe', undefined, { fixity: 'infix' });

    const effect = RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, '(1 :pipe 2)');

    assert.equal(effect.kind, 'RuntimeWorkflowEffect');
    assert.equal(effect.name, 'pipe');
    assert.equal(effect.fixity, 'infix');
    assert.deepEqual(effect.args, [1, 2]);
    assert.equal(effect.sourceNodeId, 'infix:pipe');
    assert.equal(effect.checkpoint.currentFiberId, runtime.getCurrentFiber().id);
  });

  it('allows hosts to customize workflow extension lowering without making names language built-ins', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.registerWorkflowExtension('ai_agent', ({ name, args, sourceNodeId, checkpoint }) => ({
      kind: 'HostLoweredEffect',
      name,
      args,
      sourceNodeId,
      checkpointVersion: checkpoint.version,
    }));

    const effect = RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, '(ai_agent "draft")');

    assert.deepEqual(effect, {
      kind: 'HostLoweredEffect',
      name: 'ai_agent',
      args: ['draft'],
      sourceNodeId: 'prefix:ai_agent',
      checkpointVersion: 1,
    });
    // Without registration, `ai_agent` is not a language built-in: it is just an
    // unbound name, structurally identical to `(totallyUnknownWord 1 2)`, so it
    // raises the D8 unbound-name diagnostic rather than silently lowering to a
    // RuntimeWorkflowEffect. (Previously it silently resolved to the trailing
    // operand; the assertion below used to check the result was not a
    // RuntimeWorkflowEffect.)
    assert.throws(
      () => RuntimeInterpreter.EvalBlockSourceSync('(ai_agent "draft")'),
      /Unbound name: ai_agent/,
    );
  });

  it('dispatches workflow opcodes as yielded checkpoint-aware effects', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.registerWorkflowExtension('ai_agent');
    runtime.addOpDirectly(RuntimeOpCode.WorkflowDispatch, {
      name: 'ai_agent',
      fixity: 'prefix',
      args: ['write tests'],
      sourceNodeId: 'prefix:ai_agent',
    });

    const result = dispatchInstructions(
      runtime.makeDispatchContext(),
      (opcode) => runtime.resolveHandler(opcode),
      { maxInstructions: 1 },
    );

    assert.equal(result.stopReason, 'yield_requested');
    assert.equal(result.stopDetail, 'workflow:ai_agent');
    assert.equal(result.effects.length, 1);
    assert.equal(result.effects[0].kind, 'RuntimeWorkflowEffect');
    assert.equal(result.effects[0].name, 'ai_agent');
    assert.deepEqual(result.effects[0].args, ['write tests']);
    assert.equal(result.effects[0].checkpoint.currentFiberId, runtime.getCurrentFiber().id);
  });
});
