import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  HostConfig,
  RunStore,
  SchemaValidationFailed,
  defaultConfig,
  executeRun,
  extractJsonCandidates,
  loadConfig,
  parseJsonReply,
  runAdapterCommand,
  runJob,
  startRunInStore,
  validateAgainstSchema,
} from 'kunun-workflow-host';

const MOCK_CMD = ['bun', path.join(__dirname, '../fixtures/mock-agent.ts')];

function mockConfig(overrides: Partial<HostConfig> = {}): HostConfig {
  return {
    ...defaultConfig(),
    defaultAdapter: 'mock',
    schemaRetries: 2,
    timeout: 30,
    adapters: { mock: { label: 'Mock', command: MOCK_CMD, stdin: '{prompt}' } },
    ...overrides,
  };
}

describe('workflow-host adapter layer', function () {
  it('loads custom adapters from a config file without code changes', function () {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-config-'));
    const file = path.join(dir, 'kwf.config.json');
    fs.writeFileSync(file, JSON.stringify({
      defaultAdapter: 'my_agent',
      adapters: {
        my_agent: { label: 'Mine', command: ['my-agent', '--cwd', '{workspace}'], stdin: '{prompt}' },
      },
    }));

    const config = loadConfig(file);
    assert.equal(config.defaultAdapter, 'my_agent');
    assert.deepEqual(config.adapters.my_agent.command, ['my-agent', '--cwd', '{workspace}']);
    // builtin adapters survive the merge
    assert.ok(config.adapters.claude != null);
  });

  it('expands {prompt} via stdin and returns stdout', async function () {
    const result = await runAdapterCommand(
      { command: MOCK_CMD, stdin: '{prompt}' },
      'ECHO:hello-adapter',
      { timeoutSeconds: 30 },
    );
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout.trim(), 'hello-adapter');
  });

  it('records an option_unmapped event instead of silently dropping unmapped call options', async function () {
    const events: any[] = [];
    const job = {
      id: 'ai_agent:test/job:model',
      args: [{ name: 'modelful', userPrompt: 'ECHO:hi', model: 'super-model' }],
    };

    // the mock adapter declares no flags.model mapping
    const value = await runJob(job, mockConfig(), (event) => events.push(event));

    assert.equal(value, 'hi');
    const unmapped = events.filter((event) => event.type === 'option_unmapped');
    assert.equal(unmapped.length, 1);
    assert.equal(unmapped[0].option, 'model');
    assert.equal(unmapped[0].value, 'super-model');
  });

  it('honors per-call adapter and model overrides written in the DSL (as documented in SKILL.md)', async function () {
    // 'alt' prints which adapter ran plus the model injected through flags.model
    const config = mockConfig({
      adapters: {
        mock: { label: 'Mock', command: MOCK_CMD, stdin: '{prompt}' },
        alt: {
          label: 'Alt',
          command: ['bun', '-e', 'console.log("alt-agent model=" + (process.argv[1] ?? "none"))'],
          flags: { model: ['--'] },
        },
      },
    });
    const store = new RunStore(fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-override-')));
    const source = `
      (var viaDefault (ai_agent #plain :{ user_prompt = "ECHO:via-default" }))
      (var viaAlt (ai_agent #routed :{
        user_prompt = "ignored by alt"
        adapter = "alt"
        model = "fancy-model"
      }))
      [viaDefault viaAlt]
    `;
    const runId = startRunInStore(store, { workflowName: 'override', scriptPath: '<inline>', source });

    const status = await executeRun(store, runId, config);

    assert.equal(status.state, 'done');
    const [viaDefault, viaAlt] = store.readResult(runId);
    assert.equal(viaDefault, 'via-default');
    assert.equal(viaAlt, 'alt-agent model=fancy-model');
  });

  it('expands {prompt_file} into a readable temp file path', async function () {
    const catLike = ['bun', '-e', 'console.log(require("fs").readFileSync(process.argv[1], "utf-8"))', '{prompt_file}'];
    const result = await runAdapterCommand(
      { command: catLike },
      'from-a-file',
      { timeoutSeconds: 30 },
    );
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout.trim(), 'from-a-file');
  });
});

describe('workflow-host schema bridge', function () {
  it('extracts JSON from fenced blocks ahead of loose text', function () {
    const candidates = extractJsonCandidates('noise {"a":1} noise\n```json\n{"b":2}\n```');
    assert.deepEqual(JSON.parse(candidates[0]), { b: 2 });
    assert.deepEqual(parseJsonReply('reply:\n```json\n{"b":2}\n```'), { b: 2 });
  });

  it('validates objects, arrays, and required properties', function () {
    const schema = {
      type: 'object',
      required: ['items'],
      properties: { items: { type: 'array', minItems: 2, items: { type: 'string' } } },
    };
    assert.deepEqual(validateAgainstSchema({ items: ['a', 'b'] }, schema), []);
    assert.ok(validateAgainstSchema({}, schema).some((e) => e.includes('missing required')));
    assert.ok(validateAgainstSchema({ items: ['a'] }, schema).some((e) => e.includes('at least 2')));
    assert.ok(validateAgainstSchema({ items: ['a', 3] }, schema).some((e) => e.includes('expected string')));
  });

  it('retries with validation feedback until the agent returns conforming JSON', async function () {
    const events: any[] = [];
    const job = {
      id: 'ai_agent:test/job:0',
      args: [{ name: 'fixer', sysPrompt: 's', userPrompt: 'NEED_CORRECTION_JSON' }],
      metadata: { outputSchema: { type: 'object', required: ['fixed'] } },
    };

    const value = await runJob(job, mockConfig(), (event) => events.push(event));

    assert.deepEqual(value, { fixed: true });
    const retryEvents = events.filter((event) => event.type === 'schema_retry');
    assert.equal(retryEvents.length, 1);
    assert.ok(String(retryEvents[0].errors[0]).length > 0);
  });

  it('throws SchemaValidationFailed when retries are exhausted', async function () {
    const job = {
      id: 'ai_agent:test/job:1',
      args: [{ name: 'never', sysPrompt: 's', userPrompt: 'ECHO:not json ever' }],
      metadata: { outputSchema: { type: 'object', required: ['x'] } },
    };

    await assert.rejects(
      () => runJob(job, mockConfig({ schemaRetries: 1 })),
      (error: any) => error instanceof SchemaValidationFailed,
    );
  });

  it('honors process-level retry metadata before giving up', async function () {
    const events: any[] = [];
    const job = {
      id: 'ai_agent:test/job:2',
      args: [{ name: 'fragile', sysPrompt: 's', userPrompt: 'FAIL' }],
      metadata: { retry: 2 },
    };

    await assert.rejects(() => runJob(job, mockConfig(), (event) => events.push(event)));
    assert.equal(events.filter((event) => event.type === 'agent_retry').length, 2);
  });
});
