import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  HostConfig,
  createWorkflowBackend,
  dryRunWorkflowSource,
  mockValueFromSchema,
  validateWorkflowSource,
} from 'kunun-workflow-host';

// An adapter whose command writes a sentinel file the moment it is spawned.
// validate/dry-run must never reach this command, so the sentinel must stay
// absent after either capability runs.
function sentinelConfig(sentinel: string): HostConfig {
  return {
    defaultAdapter: 'sentinel',
    concurrency: 4,
    maxAgents: 100,
    schemaRetries: 2,
    timeout: 30,
    adapters: {
      sentinel: {
        label: 'Sentinel',
        command: ['sh', '-c', `echo dispatched > ${sentinel}; echo '{}'`],
        stdin: '{prompt}',
      },
    },
  };
}

function createBackend(sentinel: string) {
  const runsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-validation-'));
  return createWorkflowBackend({ config: sentinelConfig(sentinel), runsRoot });
}

const PARALLEL_WORKFLOW = `
  (var drafts (ai_parallel #fan
    :{ input = ["a" "b"] item = it }
    :[ (ai_agent #worker :{ sys_prompt = "s" user_prompt = "draft \\(it)" }) ]))
  drafts
`;

const ROUTING_WORKFLOW = `
  (var classification (ai_agent #classify :{
    sys_prompt = "classifier"
    user_prompt = "classify"
    output_schema = {
      type = "object"
      properties = { category = {type = "string"} }
      required = ["category"]
    }
  }))
  (var answer (if (:== (classification.:category) "frontend")
    :[ (ai_agent #fe :{ sys_prompt = "fe" user_prompt = "front" }) ]
    else :[ (ai_agent #gen :{ sys_prompt = "gen" user_prompt = "general" }) ]))
  [classification answer]
`;

describe('workflow validation module', function () {
  it('mockValueFromSchema builds schema-shaped values, falling back to a string', function () {
    assert.deepEqual(
      mockValueFromSchema({ type: 'object', properties: { n: { type: 'number' }, ok: { type: 'boolean' } } }, 'job'),
      { n: 0, ok: false },
    );
    assert.deepEqual(mockValueFromSchema({ type: 'array', items: { type: 'string' }, minItems: 2 }, 'job').length, 2);
    assert.equal(mockValueFromSchema({ enum: ['x', 'y'] }, 'job'), 'x');
    assert.equal(mockValueFromSchema(null, 'job'), 'dry-run:job');
  });

  it('validateWorkflowSource summarizes the first yield without dispatching agents', function () {
    const result = validateWorkflowSource({ source: PARALLEL_WORKFLOW, workflowName: 'fan' });
    assert.equal(result.ok, true);
    assert.equal(result.status, 'yielded');
    assert.equal(result.workflowName, 'fan');
    assert.equal(result.firstYield?.effect, 'ai_parallel');
    assert.equal(result.firstYield?.jobCount, 2);
    assert.equal(result.diagnostics.length, 0);
  });

  it('validateWorkflowSource reports a diagnostic for invalid source', function () {
    const result = validateWorkflowSource({ source: '(ai_agent #broken :{ ', workflowName: 'broken' });
    assert.equal(result.ok, false);
    assert.equal(result.status, 'error');
    assert.ok(result.diagnostics.length >= 1);
  });

  it('dryRunWorkflowSource generates schema-shaped mocks and reaches completion', function () {
    const result = dryRunWorkflowSource({ source: ROUTING_WORKFLOW, workflowName: 'routing' });
    assert.equal(result.ok, true);
    assert.equal(result.status, 'completed');
    // two yields: classify, then the branch agent
    assert.equal(result.yields.length, 2);
    assert.ok(Array.isArray(result.resultPreview));
    assert.equal(typeof result.resultPreview[0].category, 'string');
  });

  it('dryRunWorkflowSource stops with a diagnostic when max-yields is exceeded', function () {
    const result = dryRunWorkflowSource({ source: ROUTING_WORKFLOW, workflowName: 'routing', maxYields: 1 });
    assert.equal(result.ok, false);
    assert.equal(result.status, 'max-yields');
    assert.ok(result.diagnostics.some((d) => /max-yields/i.test(d.message)));
  });

  it('redacts prompts by default and exposes them with showPrompts', function () {
    const longPrompt = 'X'.repeat(400);
    const source = `(ai_agent #d :{ sys_prompt = "s" user_prompt = "${longPrompt}" }) 1`;

    const redacted = validateWorkflowSource({ source, workflowName: 'p' });
    const redactedJob = redacted.firstYield!.jobs[0];
    assert.ok(redactedJob.promptPreview!.length < longPrompt.length);
    assert.equal(redactedJob.prompt, undefined);

    const shown = validateWorkflowSource({ source, workflowName: 'p', showPrompts: true });
    assert.ok(shown.firstYield!.jobs[0].prompt!.includes(longPrompt));
  });
});

describe('workflow backend validate/dry-run', function () {
  it('validateWorkflow never spawns the agent adapter subprocess', function () {
    const sentinel = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-sentinel-')), 'flag');
    const backend = createBackend(sentinel);
    const result = backend.validateWorkflow({ source: PARALLEL_WORKFLOW, workflowName: 'fan' });
    assert.equal(result.ok, true);
    assert.equal(result.status, 'yielded');
    assert.equal(fs.existsSync(sentinel), false, 'no adapter subprocess should be spawned during validate');
  });

  it('dryRunWorkflow never spawns the agent adapter subprocess', function () {
    const sentinel = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-sentinel-')), 'flag');
    const backend = createBackend(sentinel);
    const result = backend.dryRunWorkflow({ source: ROUTING_WORKFLOW, workflowName: 'routing' });
    assert.equal(result.ok, true);
    assert.equal(result.status, 'completed');
    assert.equal(fs.existsSync(sentinel), false, 'no adapter subprocess should be spawned during dry-run');
  });

  it('resolves scriptPath and derives the workflow name from the filename', function () {
    const sentinel = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-sentinel-')), 'flag');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-script-'));
    const scriptPath = path.join(dir, 'pipeline.kon');
    fs.writeFileSync(scriptPath, PARALLEL_WORKFLOW);
    const backend = createBackend(sentinel);
    const result = backend.validateWorkflow({ scriptPath });
    assert.equal(result.workflowName, 'pipeline');
    assert.equal(result.ok, true);
  });
});
