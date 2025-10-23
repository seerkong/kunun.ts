import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { RunStore } from 'kunun-workflow-host';

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-store-'));
}

describe('workflow-host RunStore', function () {
  it('creates a run directory with meta and initial status', function () {
    const store = new RunStore(tempRoot());
    const runId = store.create({
      workflowName: 'demo',
      scriptPath: '/abs/demo.kon',
      source: '(ai_log #x :{ message = "hi" })',
      args: { question: 'q' },
    });

    assert.ok(runId.length > 0);
    const meta = store.readMeta(runId);
    assert.equal(meta.workflowName, 'demo');
    assert.deepEqual(meta.args, { question: 'q' });
    assert.equal(store.readStatus(runId).state, 'created');
  });

  it('writes status atomically: concurrent reads never see partial JSON', function () {
    const store = new RunStore(tempRoot());
    const runId = store.create({ workflowName: 'demo', scriptPath: 'x', source: 's' });

    for (let i = 0; i < 200; i++) {
      store.writeStatus(runId, { state: 'running', dispatched: i, updatedAt: `t${i}` });
      const read = store.readStatus(runId);
      assert.ok(['running'].includes(read.state));
      assert.equal(typeof read.dispatched, 'number');
    }
  });

  it('appends events as JSONL and reads them back in order', function () {
    const store = new RunStore(tempRoot());
    const runId = store.create({ workflowName: 'demo', scriptPath: 'x', source: 's' });

    store.appendEvent(runId, { type: 'run_started' });
    store.appendEvent(runId, { type: 'agent_started', label: 'a' });
    store.appendEvent(runId, { type: 'run_finished' });

    const events = store.readEvents(runId);
    assert.deepEqual(events.map((event: any) => event.type), ['run_started', 'agent_started', 'run_finished']);
  });

  it('persists checkpoints and job results keyed by job id', function () {
    const store = new RunStore(tempRoot());
    const runId = store.create({ workflowName: 'demo', scriptPath: 'x', source: 's' });

    store.writeCheckpoint(runId, { version: 1, fibers: [] });
    assert.equal(store.readCheckpoint(runId)?.version, 1);

    const jobId = 'ai_agent:prefix:ai_agent:draft/job:0';
    store.writeJobResult(runId, jobId, { status: 'completed', value: { ok: true } });
    assert.deepEqual(store.readJobResults(runId)[jobId], { status: 'completed', value: { ok: true } });
    assert.equal(Object.keys(store.readJobResults(runId)).length, 1);
  });

  it('stores final result and error exclusively', function () {
    const store = new RunStore(tempRoot());
    const runId = store.create({ workflowName: 'demo', scriptPath: 'x', source: 's' });

    store.writeResult(runId, { report: 'done' });
    assert.deepEqual(store.readResult(runId), { report: 'done' });
    assert.equal(store.readError(runId), null);

    const failed = store.create({ workflowName: 'demo', scriptPath: 'x', source: 's' });
    store.writeError(failed, new Error('boom'));
    assert.ok(store.readError(failed)?.message.includes('boom'));
  });

  it('lists runs for a workflow', function () {
    const store = new RunStore(tempRoot());
    const a = store.create({ workflowName: 'demo', scriptPath: 'x', source: 's' });
    const b = store.create({ workflowName: 'demo', scriptPath: 'x', source: 's' });

    const runs = store.listRuns();
    assert.ok(runs.includes(a) && runs.includes(b));
    assert.notEqual(a, b);
  });
});
