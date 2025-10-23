import assert from 'assert';
import { dispatchInstructions } from 'depa-actor';

import {
  RuntimeInterpreter,
  RuntimeOpCode,
  RuntimeSnapshot,
  RuntimeState,
} from 'kunun-runtime';

interface MockJob {
  id: string;
  effect: any;
  checkpoint: RuntimeSnapshot;
  status: 'pending' | 'completed' | 'failed';
  result?: any;
  error?: any;
}

class MockAiRuntime {
  public jobs = new Map<string, MockJob>();
  public dispatchCount = 0;

  public start(effect: any, jobId: string = effect.checkpoint.pendingWorkflowJobs[0]?.id): MockJob {
    if (jobId == null) {
      throw new Error('Workflow effect has no pending job metadata');
    }
    const existing = this.jobs.get(jobId);
    if (existing != null) {
      return existing;
    }
    this.dispatchCount += 1;
    const job: MockJob = {
      id: jobId,
      effect,
      checkpoint: effect.checkpoint,
      status: 'pending',
    };
    this.jobs.set(job.id, job);
    return job;
  }

  public complete(jobId: string, result: any): void {
    const job = this.requireJob(jobId);
    job.status = 'completed';
    job.result = result;
  }

  public fail(jobId: string, error: any): void {
    const job = this.requireJob(jobId);
    job.status = 'failed';
    job.error = error;
  }

  public requireJob(jobId: string): MockJob {
    const job = this.jobs.get(jobId);
    if (job == null) {
      throw new Error(`Mock job not found: ${jobId}`);
    }
    return job;
  }
}

function registerWorkflowTestHandlers(runtime: RuntimeState, finalKey = 'final'): void {
  runtime.registerWorkflowExtension('ai_agent');
  runtime.registerWorkflowExtension('ai_parallel', undefined, { jobExpansion: 'perArg' });
  // item x stage expansion is host-defined now that the default lowering is
  // domain-neutral: declare it explicitly through buildJobs.
  runtime.registerWorkflowExtension('ai_pipeline', undefined, {
    buildJobs: (args, sourceNodeId, extensionName) => {
      const items = Array.isArray(args[0]) ? args[0] : args;
      const stageNames = Array.isArray(args[1]) ? args[1].map(String) : ['stage'];
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
  runtime.registerInstructionHandler('Test_Finalize', ({ runtime, operandStack }) => {
    runtime.defineGlobal(finalKey, operandStack.pop());
  });
  runtime.registerInstructionHandler('Test_HandleFailure', ({ runtime }) => {
    const completion = runtime.getPendingAbruptCompletion();
    runtime.defineGlobal(finalKey, {
      caught: completion?.kind === 'throw',
      message: completion?.value?.message,
    });
  });
}

function runUntilYield(runtime: RuntimeState): any {
  const result = dispatchInstructions(
    runtime.makeDispatchContext(),
    (opcode) => runtime.resolveHandler(opcode),
    { maxInstructions: 20 },
  );
  assert.equal(result.stopReason, 'yield_requested');
  assert.equal(result.effects.length, 1);
  return result.effects[0];
}

function resumeWithResult(snapshot: RuntimeSnapshot, resultValue: any, finalKey = 'final'): RuntimeState {
  const resumed = RuntimeInterpreter.CreateRuntime();
  registerWorkflowTestHandlers(resumed, finalKey);
  resumed.hydrateSnapshot(snapshot);
  assert.deepEqual(resumed.getPendingWorkflowJobs(), snapshot.pendingWorkflowJobs);
  resumed.getCurrentFiber().operandStack.push(resultValue);
  const result = dispatchInstructions(
    resumed.makeDispatchContext(),
    (opcode) => resumed.resolveHandler(opcode),
    { maxInstructions: 20 },
  );
  assert.equal(result.stopReason, 'instruction_stack_empty');
  return resumed;
}

function createYieldingRuntime(name: string, args: any[], sourceNodeId = `prefix:${name}`): RuntimeState {
  const runtime = RuntimeInterpreter.CreateRuntime();
  registerWorkflowTestHandlers(runtime);
  runtime.addOpDirectly('Test_Finalize');
  runtime.addOpDirectly(RuntimeOpCode.WorkflowDispatch, {
    name,
    fixity: 'prefix',
    args,
    sourceNodeId,
  });
  return runtime;
}

describe('RuntimeInterpreter dynamic workflow mock runtime', function () {
  it('pauses on an agent effect, persists checkpoint, resumes with job result, and consumes the result', function () {
    const mock = new MockAiRuntime();
    const runtime = createYieldingRuntime('ai_agent', ['draft a test']);

    const effect = runUntilYield(runtime);
    assert.deepEqual(effect.checkpoint.pendingWorkflowJobs.map((job) => job.id), [
      'ai_agent:prefix:ai_agent/job:0',
    ]);
    const job = mock.start(effect);
    mock.complete(job.id, 'done');

    const resumed = resumeWithResult(job.checkpoint, mock.requireJob(job.id).result);

    assert.equal(resumed.lookup('final'), 'done');
    assert.equal(mock.dispatchCount, 1);
  });

  it('resumes parallel work with stable input order and without redispatching completed jobs', function () {
    const mock = new MockAiRuntime();
    const runtime = createYieldingRuntime('ai_parallel', ['left', 'right'], 'prefix:ai_parallel');

    const effect = runUntilYield(runtime);
    assert.deepEqual(effect.checkpoint.pendingWorkflowJobs.map((job) => job.id), [
      'ai_parallel:prefix:ai_parallel/item:0',
      'ai_parallel:prefix:ai_parallel/item:1',
    ]);
    const [leftJob, rightJob] = effect.checkpoint.pendingWorkflowJobs;
    const left = mock.start(effect, leftJob.id);
    const right = mock.start(effect, rightJob.id);
    mock.complete(left.id, 'L');

    const restoredCheckpoint = JSON.parse(JSON.stringify(effect.checkpoint));
    for (const pendingJob of restoredCheckpoint.pendingWorkflowJobs) {
      mock.start(effect, pendingJob.id);
    }
    assert.equal(mock.dispatchCount, 2);

    mock.complete(right.id, 'R');
    const resumed = resumeWithResult(restoredCheckpoint, [left.result, right.result]);

    assert.deepEqual(resumed.lookup('final'), ['L', 'R']);
  });

  it('uses stable pipeline item and stage paths across checkpoint hydration', function () {
    const mock = new MockAiRuntime();
    const runtime = createYieldingRuntime(
      'ai_pipeline',
      [[{ id: 'a' }, { id: 'b' }], ['normalize', 'write']],
      'prefix:ai_pipeline',
    );

    const effect = runUntilYield(runtime);
    const paths = effect.checkpoint.pendingWorkflowJobs.map((job) => job.path);
    assert.deepEqual(paths, [
      'prefix:ai_pipeline/item:0:normalize',
      'prefix:ai_pipeline/item:0:write',
      'prefix:ai_pipeline/item:1:normalize',
      'prefix:ai_pipeline/item:1:write',
    ]);
    for (const pendingJob of effect.checkpoint.pendingWorkflowJobs) {
      mock.start(effect, pendingJob.id);
    }
    mock.complete(effect.checkpoint.pendingWorkflowJobs[0].id, 'a-normalized');

    const restoredCheckpoint = JSON.parse(JSON.stringify(effect.checkpoint));
    for (const pendingJob of restoredCheckpoint.pendingWorkflowJobs) {
      mock.start(effect, pendingJob.id);
    }

    assert.equal(mock.dispatchCount, 4);
    assert.deepEqual(Array.from(mock.jobs.keys()), effect.checkpoint.pendingWorkflowJobs.map((job) => job.id));

    for (const pendingJob of effect.checkpoint.pendingWorkflowJobs.slice(1)) {
      mock.complete(pendingJob.id, `${pendingJob.path}:done`);
    }
    const resumed = resumeWithResult(
      restoredCheckpoint,
      effect.checkpoint.pendingWorkflowJobs.map((pendingJob) => mock.requireJob(pendingJob.id).result),
    );

    assert.deepEqual(resumed.lookup('final'), [
      'a-normalized',
      'prefix:ai_pipeline/item:0:write:done',
      'prefix:ai_pipeline/item:1:normalize:done',
      'prefix:ai_pipeline/item:1:write:done',
    ]);
  });

  it('restores loop and exception frames so a failed job can follow the exception path without behavior-tree state', function () {
    const mock = new MockAiRuntime();
    const runtime = RuntimeInterpreter.CreateRuntime();
    registerWorkflowTestHandlers(runtime);
    runtime.pushControlFrame({ kind: 'loop', frameId: 'loop:items', cursor: 1 });
    runtime.pushControlFrame({ kind: 'exception', frameId: 'try:agent', catchTarget: 'Test_HandleFailure' });
    runtime.addOpDirectly('Test_HandleFailure');
    runtime.addOpDirectly(RuntimeOpCode.WorkflowDispatch, {
      name: 'ai_agent',
      fixity: 'prefix',
      args: ['fragile job'],
      sourceNodeId: 'prefix:ai_agent',
    });

    const effect = runUntilYield(runtime);
    const job = mock.start(effect);
    mock.fail(job.id, new Error('agent failed'));

    const resumed = RuntimeInterpreter.CreateRuntime();
    registerWorkflowTestHandlers(resumed);
    resumed.hydrateSnapshot(job.checkpoint);
    resumed.setPendingAbruptCompletion({
      kind: 'throw',
      targetFrameId: 'try:agent',
      value: { message: job.error.message },
    });
    const result = dispatchInstructions(
      resumed.makeDispatchContext(),
      (opcode) => resumed.resolveHandler(opcode),
      { maxInstructions: 20 },
    );

    assert.equal(result.stopReason, 'instruction_stack_empty');
    assert.deepEqual(resumed.getControlFrames().map((frame) => frame.kind), ['loop', 'exception']);
    assert.deepEqual(resumed.lookup('final'), { caught: true, message: 'agent failed' });
  });
});
