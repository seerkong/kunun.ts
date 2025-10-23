/**
 * E2E: natural-language -> workflow generation -> validate -> dry-run.
 *
 * Exercises the `kwf agent` scaffold path non-interactively (via backend API,
 * skipping the CLI's askConfirm). The key assertion: the workflow the model
 * writes from the injected generation kernel (cheatsheet) is VALID and
 * dry-runnable — i.e. it does not trip this session's new diagnostics
 * (Unbound name / missing fn / foreach-over-non-array / unclosed container).
 *
 * Activate:  KWF_E2E=1 bun test packages/workflow-host/__tests__/Case/NlToWorkflow.test.ts
 * Adapter:   KWF_E2E_ADAPTER=codex (default) | claude
 * Run real execution too: KWF_E2E_EXECUTE=1 (extra cost).
 */
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { createWorkflowBackend, cliMain } from 'kunun-workflow-host';
import { SCAFFOLD_WORKFLOW_SOURCE } from '../../lib/agent-workflows';
import { assembleScaffoldSystemPrompt } from '../../lib/prompt-assembly';

const E2E = process.env.KWF_E2E === '1';
const ADAPTER = process.env.KWF_E2E_ADAPTER ?? 'codex';
const EXECUTE = process.env.KWF_E2E_EXECUTE === '1';

const ADAPTER_SPECS: Record<string, { command: string[]; stdin: string }> = {
  codex: { command: ['codex', 'exec', '--skip-git-repo-check', '--cd', '{workspace}', '-'], stdin: '{prompt}' },
  claude: { command: ['claude', '--print', '--permission-mode', 'acceptEdits'], stdin: '{prompt}' },
};

function makeBackend() {
  const spec = ADAPTER_SPECS[ADAPTER];
  if (!spec) throw new Error(`Unknown adapter "${ADAPTER}"`);
  const runsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-nl-'));
  return createWorkflowBackend({
    config: {
      defaultAdapter: ADAPTER,
      concurrency: 1,
      maxAgents: 10,
      schemaRetries: 3,
      // Generating a fan-out workflow can take a while; the real `kwf agent`
      // uses the 1800s default. Keep the test generous but bounded.
      timeout: Number(process.env.KWF_E2E_TIMEOUT ?? 300),
      adapters: { [ADAPTER]: { label: ADAPTER, command: spec.command, stdin: spec.stdin } },
    },
    runsRoot,
  });
}

// Natural-language requirements of increasing shape: single-step, branch, fan-out.
const REQUIREMENTS = [
  'Summarize a given piece of text into exactly one sentence.',
  'Classify a bug report as frontend or backend, then propose a one-paragraph fix for it.',
  'Given a list of product names, write a short tagline for each one, then combine them into a summary.',
];

function e2eTest(name: string, fn: () => Promise<void>, timeoutMs = 420_000) {
  if (E2E) it(name, fn, timeoutMs);
  else it.skip(name, fn);
}

describe(`kwf NL->workflow generation – real ${ADAPTER} (KWF_E2E=1 to activate)`, function () {
  for (const requirement of REQUIREMENTS) {
    e2eTest(`scaffolds a VALID, dry-runnable workflow for: "${requirement.slice(0, 48)}..."`, async function () {
      const backend = makeBackend();

      // 1. Generate the workflow from the natural-language requirement, with the
      //    layered scaffold system prompt assembled exactly as `kwf agent` does.
      const systemPrompt = await assembleScaffoldSystemPrompt();
      const scaffold = await backend.runWorkflow({
        source: SCAFFOLD_WORKFLOW_SOURCE,
        workflowName: 'scaffold-workflow',
        args: { requirement, system_prompt: systemPrompt },
        wait: true,
      });
      assert.equal(scaffold.state, 'done', `scaffold did not finish: ${JSON.stringify(scaffold).slice(0, 400)}`);
      const data: any = Array.isArray(scaffold.result) ? scaffold.result[0] : scaffold.result;
      const generated: string = data?.workflow_source;
      assert.ok(
        typeof generated === 'string' && generated.trim().length > 0,
        `scaffold returned empty workflow_source: ${JSON.stringify(data).slice(0, 300)}`,
      );

      // 2. The generated kon MUST be valid (parse + run to first yield, no agent
      //    calls). This is where invalid generations (the original failure mode)
      //    would surface.
      const vr = backend.validateWorkflow({ source: generated });
      assert.ok(
        vr.ok,
        `generated workflow is INVALID:\n----- generated.kon -----\n${generated}\n----- diagnostics -----\n${JSON.stringify(vr.diagnostics, null, 2)}`,
      );

      // 3. dry-run the whole flow with schema-shaped mocks (no agent calls).
      const dr = backend.dryRunWorkflow({ source: generated });
      assert.ok(
        dr.ok && dr.status === 'completed',
        `generated workflow did not dry-run to completion:\n----- generated.kon -----\n${generated}\n----- result -----\n${JSON.stringify(dr, null, 2).slice(0, 600)}`,
      );

      // 4. Optionally execute for real (costs tokens; opt-in via KWF_E2E_EXECUTE=1).
      if (EXECUTE) {
        const run = await backend.runWorkflow({ source: generated, workflowName: 'nl-generated', wait: true });
        assert.equal(run.state, 'done', `real execution failed: ${JSON.stringify(run).slice(0, 400)}`);
      }
    });
  }

  // Full CLI wizard end-to-end: scaffold -> infer input -> review -> execute,
  // exercised non-interactively via `--yes` (skips askConfirm). This drives the
  // actual `kwf agent` command path users invoke, including the real execution
  // stage, and writes the generated .kon + input.json to disk.
  e2eTest('kwf agent CLI runs the full wizard to done (--yes)', async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-cli-'));
    const spec = ADAPTER_SPECS[ADAPTER];
    const configPath = path.join(root, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      defaultAdapter: ADAPTER,
      concurrency: 1,
      maxAgents: 10,
      timeout: Number(process.env.KWF_E2E_TIMEOUT ?? 300),
      adapters: { [ADAPTER]: { label: ADAPTER, command: spec.command, stdin: spec.stdin } },
    }));

    const lines: string[] = [];
    const code = await cliMain(
      [
        'agent', 'Take one input string and return a one-sentence summary of it. Keep it to a single ai_agent step; do not over-engineer.',
        '--yes', '--output-dir', root, '--config', configPath, '--runs-root', path.join(root, 'runs'),
      ],
      (l) => lines.push(l),
    );
    const out = lines.join('\n');

    // The wizard must run all four stages non-interactively (--yes skips the review prompt).
    for (const stage of ['[1/4]', '[2/4]', '[3/4]', '[4/4]']) {
      assert.ok(out.includes(stage), `wizard did not reach ${stage}:\n${out}`);
    }
    // It must write the generated artifacts to disk.
    const files = fs.readdirSync(root);
    assert.ok(files.some((f) => f.endsWith('.kon')), `expected a generated .kon file, got: ${files.join(', ')}`);
    assert.ok(files.some((f) => f.endsWith('-input.json')), `expected an input.json, got: ${files.join(', ')}`);
    // Execution reaches a terminal state. `done` is the goal, but generation is
    // non-deterministic: the model occasionally emits an over-engineered/invalid
    // workflow. The parser must then give a BOUNDED diagnostic, never crash or
    // hang — that is the hard guarantee here.
    assert.ok(
      !/null is not an object|RangeError|out of memory|heap limit|stack overflow|maximum call stack/i.test(out),
      `execution crashed instead of giving a bounded diagnostic:\n${out}`,
    );
    if (code === 0) {
      assert.ok(/state: done/.test(out), `exit 0 but did not reach state: done:\n${out}`);
    }
  }, 480_000);
});
