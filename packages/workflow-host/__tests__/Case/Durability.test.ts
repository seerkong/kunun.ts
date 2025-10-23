import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  HostConfig,
  RunStore,
  Scheduler,
  defaultConfig,
  executeRun,
  startRunInStore,
} from 'kunun-workflow-host';

const MOCK_CMD = ['bun', path.join(__dirname, '../fixtures/mock-agent.ts')];

function mockConfig(overrides: Partial<HostConfig> = {}): HostConfig {
  return {
    ...defaultConfig(),
    defaultAdapter: 'mock',
    timeout: 30,
    adapters: { mock: { label: 'Mock', command: MOCK_CMD, stdin: '{prompt}' } },
    ...overrides,
  };
}

function tempStore(): RunStore {
  return new RunStore(fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-durable-')));
}

const PARALLEL_SOURCE = `
  (var results (ai_parallel #fan
    :{ input = ["a" "b" "c" "d"] item = it }
    :[ (ai_agent #worker :{ sys_prompt = "s" user_prompt = "ECHO:done-\\(it)" }) ]))
  results
`;

describe('workflow-host scheduler', function () {
  it('caps concurrent agents at the configured limit while completing all of them', async function () {
    const scheduler = new Scheduler(3, 100);
    let active = 0;
    let peak = 0;

    const tasks = Array.from({ length: 12 }, (_, i) => scheduler.runAgent(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return i;
    }));
    const done = await Promise.all(tasks);

    assert.equal(done.length, 12);
    assert.ok(peak <= 3, `peak concurrency ${peak} exceeded cap`);
    assert.equal(scheduler.dispatchedCount, 12);
  });

  it('enforces the total agent cap as a runaway backstop', async function () {
    const scheduler = new Scheduler(2, 3);
    await scheduler.runAgent(async () => 1);
    await scheduler.runAgent(async () => 2);
    await scheduler.runAgent(async () => 3);
    await assert.rejects(() => scheduler.runAgent(async () => 4), /agent limit exceeded/i);
  });
});

describe('workflow-host durable control', function () {
  it('pauses at a yield boundary and a later resume reaches the same final result', async function () {
    const store = tempStore();
    const runId = startRunInStore(store, { workflowName: 'pause', scriptPath: '<inline>', source: PARALLEL_SOURCE });

    store.writeControl(runId, 'pause');
    const paused = await executeRun(store, runId, mockConfig());
    assert.equal(paused.state, 'paused');
    assert.ok(store.readCheckpoint(runId) != null, 'checkpoint persisted before pausing');
    assert.equal(store.readResult(runId), null);

    const resumed = await executeRun(store, runId, mockConfig());
    assert.equal(resumed.state, 'done');
    assert.deepEqual(store.readResult(runId), ['done-a', 'done-b', 'done-c', 'done-d']);
  });

  it('stops on the stop signal and reports the stopped state', async function () {
    const store = tempStore();
    const runId = startRunInStore(store, { workflowName: 'stop', scriptPath: '<inline>', source: PARALLEL_SOURCE });

    store.writeControl(runId, 'stop');
    const stopped = await executeRun(store, runId, mockConfig());
    assert.equal(stopped.state, 'stopped');
    assert.equal(store.readResult(runId), null);
  });

  it('resumes an interrupted run without re-dispatching jobs that already completed', async function () {
    const store = tempStore();
    const runId = startRunInStore(store, { workflowName: 'crashy', scriptPath: '<inline>', source: PARALLEL_SOURCE });

    // First pass pauses at the yield boundary: checkpoint exists, nothing dispatched.
    store.writeControl(runId, 'pause');
    await executeRun(store, runId, mockConfig());

    // Simulate work that completed before an interruption: persist one job result by hand.
    const checkpoint = store.readCheckpoint(runId);
    const jobs = checkpoint.pendingWorkflowJobs;
    assert.equal(jobs.length, 4);
    store.writeJobResult(runId, jobs[1].id, { status: 'completed', value: 'done-b' });

    const resumed = await executeRun(store, runId, mockConfig());
    assert.equal(resumed.state, 'done');
    assert.deepEqual(store.readResult(runId), ['done-a', 'done-b', 'done-c', 'done-d']);

    // Only the three missing jobs were dispatched after the interruption.
    const events = store.readEvents(runId);
    const resumeMarker = events.findIndex((event: any) => event.type === 'run_resumed');
    assert.ok(resumeMarker >= 0);
    const started = events.slice(resumeMarker).filter((event: any) => event.type === 'agent_started');
    assert.equal(started.length, 3);
    assert.ok(!started.some((event: any) => event.jobId === jobs[1].id));
  });
});
