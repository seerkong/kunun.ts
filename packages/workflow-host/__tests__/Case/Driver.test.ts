import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { HostConfig, RunStore, executeRun, startRunInStore } from 'kunun-workflow-host';

const MOCK_ADAPTER_CMD = ['bun', path.join(__dirname, '../fixtures/mock-agent.ts')];

function testConfig(): HostConfig {
  return {
    defaultAdapter: 'mock',
    concurrency: 4,
    maxAgents: 100,
    schemaRetries: 2,
    timeout: 30,
    adapters: {
      mock: { label: 'Mock', command: MOCK_ADAPTER_CMD, stdin: '{prompt}' },
    },
  };
}

function tempStore(): RunStore {
  return new RunStore(fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-driver-')));
}

describe('workflow-host driver loop', function () {
  it('drives a single-agent workflow to completion through the mock adapter', async function () {
    const store = tempStore();
    const runId = startRunInStore(store, {
      workflowName: 'single',
      scriptPath: '<inline>',
      source: `
        (var draft (ai_agent #draftDoc :{
          sys_prompt = "s"
          user_prompt = "ECHO:drafted-content"
        }))
        draft
      `,
    });

    const status = await executeRun(store, runId, testConfig());

    assert.equal(status.state, 'done');
    assert.equal(store.readResult(runId), 'drafted-content');
    assert.equal(store.readStatus(runId).state, 'done');
    // checkpoint persisted before dispatch
    assert.ok(store.readCheckpoint(runId) != null);
    const eventTypes = store.readEvents(runId).map((event: any) => event.type);
    assert.ok(eventTypes.includes('run_started'));
    assert.ok(eventTypes.includes('agent_started'));
    assert.ok(eventTypes.includes('agent_finished'));
    assert.ok(eventTypes.includes('run_finished'));
  });

  it('fans out ai_parallel jobs and rejoins ordered results', async function () {
    const store = tempStore();
    const runId = startRunInStore(store, {
      workflowName: 'fan',
      scriptPath: '<inline>',
      source: `
        (var results (ai_parallel #fan
          :{ input = ["a" "b" "c"] item = it }
          :[ (ai_agent #worker :{ sys_prompt = "s" user_prompt = "ECHO:done-\\(it)" }) ]))
        results
      `,
    });

    const status = await executeRun(store, runId, testConfig());

    assert.equal(status.state, 'done');
    assert.deepEqual(store.readResult(runId), ['done-a', 'done-b', 'done-c']);
  });

  it('injects meta args as the args binding inside the workflow source', async function () {
    const store = tempStore();
    const runId = startRunInStore(store, {
      workflowName: 'args',
      scriptPath: '<inline>',
      source: `
        (var q (args.:question))
        (var draft (ai_agent #echoArgs :{ sys_prompt = "s" user_prompt = "ECHO:\\(q)" }))
        draft
      `,
      args: { question: 'why-bun' },
    });

    const status = await executeRun(store, runId, testConfig());

    assert.equal(status.state, 'done');
    assert.equal(store.readResult(runId), 'why-bun');
  });

  it('marks the run failed and records the error when an agent process fails', async function () {
    const store = tempStore();
    const runId = startRunInStore(store, {
      workflowName: 'failing',
      scriptPath: '<inline>',
      source: `
        (var draft (ai_agent #fragile :{ sys_prompt = "s" user_prompt = "FAIL" }))
        draft
      `,
    });

    const status = await executeRun(store, runId, testConfig());

    assert.equal(status.state, 'failed');
    assert.ok(store.readError(runId)?.message.includes('fragile'));
  });
});
