import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { RunStore, cliMain, executeRun, startRunInStore } from 'kunun-workflow-host';

const FIXTURES = path.join(__dirname, '../fixtures');

function setupWorkspace(): { root: string; configPath: string; scriptPath: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-cli-'));
  const configPath = path.join(root, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify({
    defaultAdapter: 'mock',
    timeout: 30,
    adapters: {
      mock: { label: 'Mock', command: ['bun', path.join(FIXTURES, 'mock-agent.ts')], stdin: '{prompt}' },
    },
  }));
  const scriptPath = path.join(root, 'demo.kon');
  fs.writeFileSync(scriptPath, `
    (var q (args.:question))
    (var results (ai_parallel #fan
      :{ input = ["x" "y"] item = it }
      :[ (ai_agent #worker :{ sys_prompt = "s" user_prompt = "ECHO:\\(q)-\\(it)" }) ]))
    results
  `);
  return { root, configPath, scriptPath };
}

function runsRootOf(root: string): string {
  return path.join(root, 'runs');
}

async function cli(args: string[], lines: string[] = []): Promise<{ code: number; lines: string[] }> {
  const code = await cliMain(args, (line) => lines.push(line));
  return { code, lines };
}

describe('workflow-host CLI', function () {
  it('runs a workflow to completion with --wait and prints the result', async function () {
    const { root, configPath, scriptPath } = setupWorkspace();
    const { code, lines } = await cli([
      'run', scriptPath,
      '--args', '{"question":"Q"}',
      '--wait',
      '--config', configPath,
      '--runs-root', runsRootOf(root),
    ]);

    assert.equal(code, 0);
    assert.ok(lines[0].startsWith('run: demo-'));
    assert.ok(lines.includes('state: done'));
    assert.deepEqual(JSON.parse(lines[lines.length - 1]), ['Q-x', 'Q-y']);
  });

  it('supports status, logs, result and list against a finished run', async function () {
    const { root, configPath, scriptPath } = setupWorkspace();
    const first = await cli([
      'run', scriptPath, '--args', '{"question":"Q"}', '--wait',
      '--config', configPath, '--runs-root', runsRootOf(root),
    ]);
    const runId = first.lines[0].replace('run: ', '');

    const status = await cli(['status', runId, '--config', configPath, '--runs-root', runsRootOf(root)]);
    assert.equal(JSON.parse(status.lines.join('\n')).state, 'done');

    const logs = await cli(['logs', runId, '--config', configPath, '--runs-root', runsRootOf(root)]);
    const types = logs.lines.map((line) => JSON.parse(line).type);
    assert.ok(types.includes('run_started') && types.includes('run_finished'));

    const result = await cli(['result', runId, '--config', configPath, '--runs-root', runsRootOf(root)]);
    assert.deepEqual(JSON.parse(result.lines.join('\n')), ['Q-x', 'Q-y']);

    const list = await cli(['list', '--config', configPath, '--runs-root', runsRootOf(root)]);
    assert.ok(list.lines.includes(runId));
  });

  it('pause + resume --wait completes a paused run from its checkpoint', async function () {
    const { root, configPath, scriptPath } = setupWorkspace();
    const store = new RunStore(runsRootOf(root));

    // create the run without executing it, request a pause, then drive it:
    // the first execution pauses at the yield boundary, resume finishes it.
    const runId = startRunInStore(store, {
      workflowName: 'demo',
      scriptPath,
      source: fs.readFileSync(scriptPath, 'utf-8'),
      args: { question: 'P' },
    });
    await cli(['pause', runId, '--config', configPath, '--runs-root', runsRootOf(root)]);
    const paused = await executeRun(store, runId, JSON.parse(fs.readFileSync(configPath, 'utf-8')));
    assert.equal(paused.state, 'paused');

    const resumed = await cli(['resume', runId, '--wait', '--config', configPath, '--runs-root', runsRootOf(root)]);
    assert.equal(resumed.code, 0);
    assert.equal(store.readStatus(runId).state, 'done');
    assert.deepEqual(store.readResult(runId), ['P-x', 'P-y']);
  });

  it('validate --json summarizes the first yield and exits 0', async function () {
    const { root, configPath, scriptPath } = setupWorkspace();
    const { code, lines } = await cli([
      'validate', scriptPath, '--args', '{"question":"Q"}', '--json',
      '--config', configPath, '--runs-root', runsRootOf(root),
    ]);
    assert.equal(code, 0);
    const result = JSON.parse(lines.join('\n'));
    assert.equal(result.ok, true);
    assert.equal(result.status, 'yielded');
    assert.equal(result.firstYield.effect, 'ai_parallel');
    assert.equal(result.firstYield.jobCount, 2);
  });

  it('validate emits a human-readable report by default', async function () {
    const { root, configPath, scriptPath } = setupWorkspace();
    const { code, lines } = await cli([
      'validate', scriptPath, '--args', '{"question":"Q"}',
      '--config', configPath, '--runs-root', runsRootOf(root),
    ]);
    assert.equal(code, 0);
    const text = lines.join('\n');
    assert.ok(text.includes('status: yielded'));
    assert.ok(text.includes('ai_parallel'));
  });

  it('validate exits 1 on invalid workflow source', async function () {
    const { root, configPath } = setupWorkspace();
    const broken = path.join(root, 'broken.kon');
    fs.writeFileSync(broken, '(ai_agent #broken :{ ');
    const { code, lines } = await cli([
      'validate', broken, '--json', '--config', configPath, '--runs-root', runsRootOf(root),
    ]);
    assert.equal(code, 1);
    const result = JSON.parse(lines.join('\n'));
    assert.equal(result.ok, false);
    assert.ok(result.diagnostics.length >= 1);
  });

  it('validate exits 2 on malformed --args', async function () {
    const { root, configPath, scriptPath } = setupWorkspace();
    const { code } = await cli([
      'validate', scriptPath, '--args', '{not json',
      '--config', configPath, '--runs-root', runsRootOf(root),
    ]);
    assert.equal(code, 2);
  });

  it('dry-run --json simulates the workflow to completion', async function () {
    const { root, configPath, scriptPath } = setupWorkspace();
    const { code, lines } = await cli([
      'dry-run', scriptPath, '--args', '{"question":"Q"}', '--json',
      '--config', configPath, '--runs-root', runsRootOf(root),
    ]);
    assert.equal(code, 0);
    const result = JSON.parse(lines.join('\n'));
    assert.equal(result.ok, true);
    assert.equal(result.status, 'completed');
    assert.ok(result.yields.length >= 1);
  });

  it('dry-run exits 1 with a max-yields diagnostic when the limit is hit', async function () {
    const { root, configPath } = setupWorkspace();
    const twoYields = path.join(root, 'two.kon');
    fs.writeFileSync(twoYields, `
      (var a (ai_agent #one :{ sys_prompt = "s" user_prompt = "one" }))
      (var b (ai_agent #two :{ sys_prompt = "s" user_prompt = "two" }))
      [a b]
    `);
    const { code, lines } = await cli([
      'dry-run', twoYields, '--max-yields', '1', '--json',
      '--config', configPath, '--runs-root', runsRootOf(root),
    ]);
    assert.equal(code, 1);
    const result = JSON.parse(lines.join('\n'));
    assert.equal(result.ok, false);
    assert.equal(result.status, 'max-yields');
  });

  it('runs detached in the background and reaches done state', async function () {
    const { root, configPath, scriptPath } = setupWorkspace();
    const store = new RunStore(runsRootOf(root));
    const { code, lines } = await cli([
      'run', scriptPath, '--args', '{"question":"B"}',
      '--config', configPath, '--runs-root', runsRootOf(root),
    ]);
    assert.equal(code, 0);
    const runId = lines[0].replace('run: ', '');

    const deadline = Date.now() + 20000;
    let state = '';
    while (Date.now() < deadline) {
      state = store.readStatus(runId).state;
      if (state === 'done' || state === 'failed') {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert.equal(state, 'done', `background run state: ${state}; worker.log: ${
      fs.existsSync(path.join(runsRootOf(root), runId, 'worker.log'))
        ? fs.readFileSync(path.join(runsRootOf(root), runId, 'worker.log'), 'utf-8').slice(0, 500)
        : '<missing>'
    }`);
    assert.deepEqual(store.readResult(runId), ['B-x', 'B-y']);
  });
});
