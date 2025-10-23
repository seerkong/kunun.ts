import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { HostConfig, RunStore, executeRun, startRunInStore } from 'kunun-workflow-host';

const EXAMPLES_DIR = path.join(__dirname, '../../../../examples');
const EXAMPLE_ADAPTER_CMD = ['bun', path.join(__dirname, '../fixtures/example-agent.ts')];

function exampleConfig(): HostConfig {
  return {
    defaultAdapter: 'example',
    concurrency: 4,
    maxAgents: 100,
    schemaRetries: 2,
    timeout: 30,
    adapters: {
      example: { label: 'Example mock', command: EXAMPLE_ADAPTER_CMD, stdin: '{prompt}' },
    },
  };
}

async function runExample(fileName: string): Promise<{ store: RunStore; runId: string; result: any }> {
  const store = new RunStore(fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-examples-')));
  const scriptPath = path.join(EXAMPLES_DIR, fileName);
  const runId = startRunInStore(store, {
    workflowName: fileName.replace('.kon', ''),
    scriptPath,
    source: fs.readFileSync(scriptPath, 'utf-8'),
  });
  const status = await executeRun(store, runId, exampleConfig());
  assert.equal(status.state, 'done', `${fileName} should complete (state=${status.state})`);
  return { store, runId, result: store.readResult(runId) };
}

describe('workflow-host bundled examples', function () {
  it('every bundled example completes through the driver with the example adapter', async function () {
    const files = fs.readdirSync(EXAMPLES_DIR).filter((file) => file.endsWith('.kon')).sort();
    assert.ok(files.length >= 5, `expected at least 5 examples, found ${files.length}`);
    for (const fileName of files) {
      await runExample(fileName);
    }
  });

  it('fan-out-reduce drafts in parallel and synthesizes', async function () {
    const { store, runId, result } = await runExample('fan-out-reduce.kon');
    const [drafts, final] = result;
    assert.equal(drafts.length, 3);
    assert.ok(String(final).startsWith('mockreply:'));
    const labels = store.readEvents(runId)
      .filter((event: any) => event.type === 'agent_started')
      .map((event: any) => event.label);
    assert.ok(labels.includes('draft-0') && labels.includes('draft-2') && labels.includes('synthesizer'));
  });

  it('routing classifies and dispatches only the matching specialist', async function () {
    const { store, runId, result } = await runExample('routing.kon');
    const [classification, answer] = result;
    assert.equal(classification.category, 'frontend');
    assert.ok(String(answer).includes('mockreply:'));
    const labels = store.readEvents(runId)
      .filter((event: any) => event.type === 'agent_started')
      .map((event: any) => event.label);
    assert.ok(labels.includes('frontend'));
    assert.equal(labels.includes('general'), false);
  });

  it('adversarial-verify keeps only surviving claims', async function () {
    const { result } = await runExample('adversarial-verify.kon');
    const [claims, verdicts, survivorCount] = result;
    assert.equal(claims.length, 2);
    assert.deepEqual(verdicts.map((verdict: any) => verdict.verdict), ['survives', 'refuted']);
    assert.equal(survivorCount, 1);
  });

  it('loop-until-dry stops at the first dry round and accumulates findings', async function () {
    const { result } = await runExample('loop-until-dry.kon');
    const [totalFindings, dryRound] = result;
    assert.equal(totalFindings, 2);
    assert.equal(dryRound, 1);
  });

  it('deep-research runs plan, parallel search, extraction, pipeline review, and report', async function () {
    const { store, runId } = await runExample('deep-research.kon');
    const labels = store.readEvents(runId)
      .filter((event: any) => event.type === 'agent_started')
      .map((event: any) => String(event.label));
    assert.ok(labels.some((label) => label === 'planner'));
    assert.ok(labels.some((label) => label.startsWith('search-')));
    assert.ok(labels.some((label) => label.startsWith('skeptic-')));
  });
});
