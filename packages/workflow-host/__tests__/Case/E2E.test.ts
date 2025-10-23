/**
 * Optional end-to-end tests that run real agent adapter CLIs.
 *
 * Activate:  KWF_E2E=1 bun test packages/workflow-host/__tests__/Case/E2E.test.ts
 * Adapter:   KWF_E2E_ADAPTER=claude  (default: codex)
 *
 * All tests are skipped unless KWF_E2E=1 is set so the suite never blocks CI.
 */
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { HostConfig, cliMain, createWorkflowBackend } from 'kunun-workflow-host';

const E2E = process.env.KWF_E2E === '1';
const ADAPTER = process.env.KWF_E2E_ADAPTER ?? 'codex';

const ADAPTER_SPECS: Record<string, { command: string[]; stdin: string }> = {
  codex: {
    command: ['codex', 'exec', '--skip-git-repo-check', '--cd', '{workspace}', '-'],
    stdin: '{prompt}',
  },
  claude: {
    command: ['claude', '--print', '--permission-mode', 'acceptEdits'],
    stdin: '{prompt}',
  },
};

function e2eConfig(): HostConfig {
  const spec = ADAPTER_SPECS[ADAPTER];
  if (!spec) throw new Error(`Unknown E2E adapter: "${ADAPTER}". Set KWF_E2E_ADAPTER to codex or claude.`);
  return {
    defaultAdapter: ADAPTER,
    concurrency: 1,
    maxAgents: 10,
    schemaRetries: 3,
    timeout: 180,
    adapters: { [ADAPTER]: { label: ADAPTER, command: spec.command, stdin: spec.stdin } },
  };
}

function createBackend() {
  const runsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-e2e-'));
  return createWorkflowBackend({ config: e2eConfig(), runsRoot });
}

// Helper so skipped tests get proper timeout only when they actually run.
function e2eTest(name: string, fn: () => Promise<void> | void, timeoutMs = 120_000) {
  if (E2E) {
    it(name, fn, timeoutMs);
  } else {
    it.skip(name, fn);
  }
}

describe(`kwf E2E – real ${ADAPTER} adapter (KWF_E2E=1 to activate)`, function () {
  e2eTest('single ai_agent call reaches done state with non-empty result', async function () {
    const backend = createBackend();
    const outcome = await backend.runWorkflow({
      source: `
        (ai_agent #ping :{
          sys_prompt = "You are a minimal responder. Reply with a single short sentence."
          user_prompt = "Say hello."
        })
      `,
      workflowName: 'e2e-ping',
      wait: true,
    });

    assert.equal(outcome.state, 'done', `expected state=done, got:\n${JSON.stringify(outcome, null, 2)}`);
    assert.ok(
      typeof outcome.result === 'string' && outcome.result.trim().length > 0,
      `expected non-empty string result, got: ${JSON.stringify(outcome.result)}`,
    );
  });

  e2eTest('ai_agent with output_schema returns schema-conforming object', async function () {
    const backend = createBackend();
    const outcome = await backend.runWorkflow({
      source: `
        (ai_agent #classify :{
          sys_prompt = "You are a text classifier. Always reply as JSON."
          user_prompt = "Classify this as frontend or backend: 'The login button is broken on mobile'"
          output_schema = {
            type = "object"
            properties = { category = {type = "string"} }
            required = ["category"]
          }
        })
      `,
      workflowName: 'e2e-schema',
      wait: true,
    });

    assert.equal(outcome.state, 'done', `expected state=done, got:\n${JSON.stringify(outcome, null, 2)}`);
    assert.ok(
      outcome.result != null && typeof outcome.result === 'object' && !Array.isArray(outcome.result),
      `expected object result, got: ${JSON.stringify(outcome.result)}`,
    );
    assert.ok(
      typeof (outcome.result as Record<string, unknown>).category === 'string',
      `expected result.category to be a string, got: ${JSON.stringify(outcome.result)}`,
    );
  }, 180_000);

  e2eTest('multi-step sequential workflow both agents run and result contains all values', async function () {
    const backend = createBackend();
    const outcome = await backend.runWorkflow({
      source: `
        (var first (ai_agent #step1 :{
          sys_prompt = "You are a word generator. Reply with exactly one word."
          user_prompt = "Reply with the word: alpha"
        }))
        (var second (ai_agent #step2 :{
          sys_prompt = "You are a word appender. Take the word given and append: beta"
          user_prompt = "Append beta to this word: \(first)"
        }))
        [first second]
      `,
      workflowName: 'e2e-sequential',
      wait: true,
    });

    assert.equal(outcome.state, 'done', `expected state=done, got:\n${JSON.stringify(outcome, null, 2)}`);
    assert.ok(Array.isArray(outcome.result), `expected array result, got: ${JSON.stringify(outcome.result)}`);
    assert.equal((outcome.result as unknown[]).length, 2, `expected 2-element array`);
    (outcome.result as unknown[]).forEach((v, i) => {
      assert.ok(v != null && String(v).trim().length > 0, `result[${i}] should be non-empty`);
    });
  }, 180_000);

  e2eTest('CLI kwf run executes real workflow via a .kon file and exits 0', async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-e2e-cli-'));
    const konFile = path.join(root, 'hello.kon');
    const configPath = path.join(root, 'config.json');

    fs.writeFileSync(konFile, [
      '(ai_agent #hello :{',
      '  sys_prompt = "Reply with a single short sentence."',
      '  user_prompt = "Say hello."',
      '})',
    ].join('\n'));

    const spec = ADAPTER_SPECS[ADAPTER];
    fs.writeFileSync(configPath, JSON.stringify({
      defaultAdapter: ADAPTER,
      concurrency: 1,
      timeout: 120,
      adapters: { [ADAPTER]: { label: ADAPTER, command: spec.command, stdin: spec.stdin } },
    }));

    const lines: string[] = [];
    const code = await cliMain(
      ['run', konFile, '--wait', '--config', configPath, '--runs-root', path.join(root, 'runs')],
      (line) => lines.push(line),
    );

    assert.equal(code, 0, `CLI exited with ${code}:\n${lines.join('\n')}`);
    assert.ok(lines.some((l) => l.includes('done')), `expected "done" in CLI output:\n${lines.join('\n')}`);
  });

  // Validate and dry-run don't dispatch the adapter at all — included here to
  // prove the guarantee holds even when a real adapter is configured.
  e2eTest('validate does NOT dispatch the real adapter', function () {
    const backend = createBackend();
    const result = backend.validateWorkflow({
      source: `
        (ai_agent #x :{
          sys_prompt = "sys"
          user_prompt = "hello"
        })
      `,
    });

    assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
    assert.equal(result.status, 'yielded');
    assert.ok(result.firstYield != null);
  }, 10_000);

  e2eTest('dry-run completes multi-step workflow without dispatching the real adapter', function () {
    const backend = createBackend();
    const result = backend.dryRunWorkflow({
      source: `
        (var a (ai_agent #step1 :{ sys_prompt = "s" user_prompt = "q1" }))
        (var b (ai_agent #step2 :{ sys_prompt = "s" user_prompt = "q2 \(a)" }))
        [a b]
      `,
    });

    assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
    assert.equal(result.status, 'completed');
    assert.ok(result.yields.length >= 2, `expected ≥2 yields, got ${result.yields.length}`);
  }, 10_000);
});
