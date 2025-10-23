import assert from 'assert';
import fs from 'fs';
import path from 'path';

import { dryRunWorkflowSource } from 'kunun-workflow-host';

// The cheat-sheet is the generation kernel injected into the kwf agent
// scaffold: a compact, trap-aware, correct-by-construction reference. These
// tests guard the two acceptance criteria — it covers all six nodes + their
// config keys + the load-bearing traps, its embedded example dry-runs clean,
// and it stays inside the scaffold injection budget (~8KB).
const ROOT = path.join(__dirname, '../../../..');
const CHEATSHEET_PATH = path.join(ROOT, 'skill/dynamic-workflow/00-cheatsheet.md');

function readCheatsheet(): string {
  return fs.readFileSync(CHEATSHEET_PATH, 'utf-8');
}

// The end-to-end example is fenced and bracketed by stable RUNNABLE markers so
// it can be extracted and executed verbatim — no model is called.
function extractRunnableExample(doc: string): string {
  const match = doc.match(/<!-- RUNNABLE:start -->\s*```kon\n([\s\S]*?)```\s*<!-- RUNNABLE:end -->/);
  assert.ok(match, 'cheat-sheet must wrap its runnable example in RUNNABLE:start/end markers around a ```kon fence');
  return match![1];
}

describe('dynamic-workflow generation cheat-sheet', function () {
  it('exists and stays within the scaffold injection budget (~8KB)', function () {
    assert.ok(fs.existsSync(CHEATSHEET_PATH), '00-cheatsheet.md should exist');
    const bytes = Buffer.byteLength(readCheatsheet(), 'utf-8');
    assert.ok(bytes <= 8 * 1024, `cheat-sheet should be <= 8KB, got ${bytes} bytes`);
  });

  it('documents all six ai_* nodes plus the pipeline stage form', function () {
    const doc = readCheatsheet();
    for (const node of ['ai_workflow', 'ai_phase', 'ai_agent', 'ai_parallel', 'ai_pipeline', 'ai_log']) {
      assert.ok(doc.includes(node), `cheat-sheet should document ${node}`);
    }
    assert.ok(/\bstage\b/.test(doc), 'cheat-sheet should document the pipeline stage form');
  });

  it('lists every ai_agent config key and the parallel/pipeline binding keys', function () {
    const doc = readCheatsheet();
    for (const key of ['label', 'sys_prompt', 'user_prompt', 'output_schema', 'retry', 'timeout', 'adapter', 'model']) {
      assert.ok(doc.includes(key), `cheat-sheet should document the ai_agent config key: ${key}`);
    }
    for (const key of ['input', 'item', 'index', 'value']) {
      assert.ok(doc.includes(key), `cheat-sheet should document the binding key: ${key}`);
    }
  });

  it('documents the :input / :output mechanism including the array wrapping rule', function () {
    const doc = readCheatsheet();
    assert.ok(doc.includes(':input'), 'cheat-sheet should document :input');
    assert.ok(doc.includes(':output'), 'cheat-sheet should document :output');
    assert.ok(/数组/.test(doc), 'cheat-sheet should explain :output wraps into an array');
  });

  it('warns about every load-bearing authoring trap', function () {
    const doc = readCheatsheet();
    // hyphen in #name is parsed as subtraction -> use camelCase
    assert.ok(/camelCase/.test(doc), 'cheat-sheet should warn that #name hyphens are subtraction and to use camelCase');
    // ai_agent must be inside ai_phase to yield (scaffold convention)
    assert.ok(/ai_phase/.test(doc), 'cheat-sheet should reference the ai_phase yield convention');
    // triple-quote delimiter must be alone on its line / indentation rule
    assert.ok(/"""/.test(doc), 'cheat-sheet should cover the triple-quote delimiter rules');
    // field-access results need output_schema
    assert.ok(/output_schema/.test(doc), 'cheat-sheet should require output_schema for field access');
    // line comments are // not ;
    assert.ok(doc.includes('//'), 'cheat-sheet should state line comments use //');
  });

  it('embeds an end-to-end example that dry-runs to completion without calling a model', function () {
    const example = extractRunnableExample(readCheatsheet());
    const result = dryRunWorkflowSource({ source: example, workflowName: 'cheatsheet-example' });
    assert.equal(result.ok, true, `embedded example should dry-run ok: ${JSON.stringify(result.diagnostics)}`);
    assert.equal(result.status, 'completed', 'embedded example should reach completion');
    assert.ok(result.diagnostics.length === 0, 'embedded example should produce no diagnostics');
    // it should be a real fan-out-or-routing-level example: more than one yield
    assert.ok(result.yields.length >= 2, 'embedded example should exercise multiple agent dispatches');
    // every dispatched job must carry a prompt preview (guards the #name hyphen trap)
    for (const yld of result.yields) {
      for (const job of yld.jobs) {
        assert.ok(job.promptPreview && job.promptPreview.length > 0,
          `every job should have a prompt preview (job ${job.name})`);
      }
    }
  });
});
