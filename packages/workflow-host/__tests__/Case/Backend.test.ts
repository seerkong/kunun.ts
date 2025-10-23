import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { HostConfig, createWorkflowBackend } from 'kunun-workflow-host';

const FIXTURES = path.join(__dirname, '../fixtures');

function testConfig(): HostConfig {
  return {
    defaultAdapter: 'mock',
    concurrency: 4,
    maxAgents: 100,
    schemaRetries: 2,
    timeout: 30,
    adapters: {
      mock: { label: 'Mock', command: ['bun', path.join(FIXTURES, 'mock-agent.ts')], stdin: '{prompt}' },
    },
  };
}

function createBackend() {
  const runsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-backend-'));
  return createWorkflowBackend({ config: testConfig(), runsRoot });
}

describe('workflow-host shared backend', function () {
  it('runs a workflow to completion when wait is set', async function () {
    const backend = createBackend();
    const outcome = await backend.runWorkflow({
      source: `
        (var draft (ai_agent #d :{ sys_prompt = "s" user_prompt = "ECHO:backend-done" }))
        draft
      `,
      workflowName: 'backend-demo',
      wait: true,
    });

    assert.ok(outcome.runId.length > 0);
    assert.equal(outcome.state, 'done');
    assert.equal(outcome.result, 'backend-done');
    assert.equal(backend.getStatus(outcome.runId).state, 'done');
    assert.equal(backend.getResult(outcome.runId), 'backend-done');
    assert.ok(backend.getEvents(outcome.runId).some((event: any) => event.type === 'run_finished'));
    assert.ok(backend.listRuns().includes(outcome.runId));
  });

  it('records pause and stop control requests', async function () {
    const backend = createBackend();
    const outcome = await backend.runWorkflow({
      source: '(ai_log #x :{ message = "hi" }) 1',
      workflowName: 'control-demo',
      wait: true,
    });
    backend.requestPause(outcome.runId);
    backend.requestStop(outcome.runId);
    // control file written without throwing; resume clears it
    const resumed = await backend.resumeRun(outcome.runId, true);
    assert.equal(resumed.state, 'done');
  });

  it('exposes example and skill assets', async function () {
    const backend = createBackend();
    assert.ok(backend.listExamples().includes('routing'));
    assert.ok((await backend.getExample('routing')).includes('ai_workflow'));
    assert.ok((await backend.getSkill()).includes('kunun dynamic workflows'));

    const exportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-backend-export-'));
    const written = await backend.exportExamples(exportDir);
    assert.equal(written.length >= 5, true);
    assert.ok(fs.existsSync(path.join(exportDir, 'routing.kon')));
  });

  it('keeps the CLI free of direct driver/store business logic', function () {
    const cliSource = fs.readFileSync(path.join(__dirname, '../../lib/cli.ts'), 'utf-8');
    assert.equal(cliSource.includes('executeRun('), false);
    assert.equal(cliSource.includes('startRunInStore('), false);
    assert.equal(cliSource.includes('new RunStore('), false);
  });

  it('exposes the embedded language manual through listDocs/getDoc', async function () {
    const backend = createBackend();
    const docs = backend.listDocs();
    assert.ok(docs.includes('reference/03-kon-data-format.md'));
    assert.ok(docs.includes('dynamic-workflow/00-cheatsheet.md'));
    assert.equal(docs.length, 17);

    const ROOT = path.join(__dirname, '../../../..');
    const rel = 'reference/03-kon-data-format.md';
    const expected = fs.readFileSync(path.join(ROOT, 'skill', rel), 'utf-8');
    assert.equal(await backend.getDoc(rel), expected);

    await assert.rejects(() => backend.getDoc('reference/missing.md'), /Unknown doc/);
  });

  it('searches the manual for a keyword and returns path + line + snippet', async function () {
    const backend = createBackend();
    const hits = await backend.searchDocs('ai_workflow');
    assert.ok(hits.length > 0);
    // every hit names a real doc and a snippet that contains the keyword
    for (const hit of hits) {
      assert.ok(backend.listDocs().includes(hit.path), `unknown doc path ${hit.path}`);
      assert.ok(hit.line >= 1);
      assert.ok(hit.snippet.includes('ai_workflow'));
    }
    // the dynamic-workflow DSL reference is the densest source of the keyword
    assert.ok(hits.some((h) => h.path === 'dynamic-workflow/02-dsl-reference.md'));

    // a keyword with no matches yields an empty result
    assert.deepEqual(await backend.searchDocs('zzz-no-such-token-zzz'), []);
  });
});
