import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  HostConfig,
  createWorkflowBackend,
  readGenerationKernelAsset,
} from 'kunun-workflow-host';
import { assembleScaffoldSystemPrompt } from '../../lib/prompt-assembly';

// The `kwf agent` scaffold injects a system-prompt skill_doc so the generating
// agent learns the Kon DSL. T1.2 fixes a regression: the slimmed SKILL.md no
// longer carries a "## DSL reference" section, so the old slice fell back to
// the navigation entry (no DSL syntax). The scaffold must inject the
// generation kernel (skill/dynamic-workflow/00-cheatsheet.md) instead.
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
  const runsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-scaffold-'));
  return createWorkflowBackend({ config: testConfig(), runsRoot });
}

// A generation kernel injected as a scaffold system prompt must teach the DSL
// node grammar and the load-bearing authoring traps — not just navigate.
function assertCarriesDslAndTraps(doc: string, label: string): void {
  // DSL node syntax: the six ai_* nodes that the generator must emit.
  for (const node of ['ai_workflow', 'ai_agent', 'ai_phase', 'ai_parallel', 'ai_pipeline', 'ai_log']) {
    assert.ok(doc.includes(node), `${label} should carry DSL node syntax: ${node}`);
  }
  // ai_agent config keys it must bind.
  for (const key of ['sys_prompt', 'user_prompt', 'output_schema']) {
    assert.ok(doc.includes(key), `${label} should carry the ai_agent config key: ${key}`);
  }
  // Load-bearing traps that make the difference between bound and silently
  // dropped prompts.
  assert.ok(/camelCase/.test(doc), `${label} should warn about the #name hyphen-as-subtraction trap`);
  assert.ok(doc.includes('"""'), `${label} should cover the triple-quote delimiter trap`);
}

describe('kwf agent scaffold generation kernel', function () {
  it('the asset layer reads the generation kernel cheat-sheet with DSL syntax and traps', async function () {
    const kernel = await readGenerationKernelAsset();
    assertCarriesDslAndTraps(kernel, 'generation kernel asset');
  });

  it('the backend exposes the generation kernel and it is not the navigation SKILL.md', async function () {
    const backend = createBackend();
    const kernel = await backend.getGenerationKernel();
    assertCarriesDslAndTraps(kernel, 'backend generation kernel');

    // The navigation SKILL.md is a thin entry that links into the split manual;
    // it no longer carries DSL grammar. The kernel must not be that document.
    const skill = await backend.getSkill();
    assert.notEqual(kernel, skill, 'generation kernel must not be the navigation SKILL.md');
    // The navigation entry's tell is its relative manual links (e.g. reference/,
    // dynamic-workflow/ markdown links). The kernel carries DSL syntax instead.
    const skillIsNavigation = skill.includes('reference/') && skill.includes('dynamic-workflow/');
    assert.ok(skillIsNavigation, 'precondition: SKILL.md is the slimmed navigation entry');
    assert.ok(!kernel.includes('reference/01-overview.md'),
      'generation kernel should not be the navigation manual index');
  });

  it('the CLI agent branch injects the assembled scaffold system prompt, not a "## DSL reference" slice', function () {
    const cliSource = fs.readFileSync(path.join(__dirname, '../../lib/cli.ts'), 'utf-8');
    // The dead slice logic against the removed "## DSL reference" heading must
    // be gone — that was the original regression's root cause.
    assert.equal(cliSource.includes('## DSL reference'), false,
      'CLI must not slice on the removed "## DSL reference" heading');
    // The scaffold system prompt is now assembled from layered Markdown assets
    // (universal + kwf + scaffold + Kon cheatsheet + scenario index), not a bare
    // generation-kernel injection.
    assert.ok(cliSource.includes('assembleScaffoldSystemPrompt'),
      'CLI agent branch should inject assembleScaffoldSystemPrompt()');
  });

  it('the assembled scaffold system prompt still carries DSL grammar, traps, and the scenario index', async function () {
    const sys = await assembleScaffoldSystemPrompt();
    // The Kon cheatsheet is folded into the assembled prompt, so DSL node syntax
    // and the load-bearing traps must survive the layering.
    assertCarriesDslAndTraps(sys, 'assembled scaffold system prompt');
    // Business-scenario patterns are fetched on demand, so the prompt must point
    // the design agent at `kwf skill show`.
    assert.ok(sys.includes('skill show'),
      'scaffold system prompt should tell the agent to fetch scenarios via `kwf skill show`');
  });
});
