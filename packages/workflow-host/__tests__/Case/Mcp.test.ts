import assert from 'assert';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { HostConfig, createKwfTools, createWorkflowBackend } from 'kunun-workflow-host';

const FIXTURES = path.join(__dirname, '../fixtures');
const BIN = path.join(__dirname, '../../bin/kwf.ts');

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
  const runsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-mcp-'));
  return createWorkflowBackend({ config: testConfig(), runsRoot });
}

function parseToolText(result: any): any {
  assert.equal(result.content[0].type, 'text');
  return JSON.parse(result.content[0].text);
}

describe('kwf MCP tools', function () {
  it('exposes the full kwf_ tool set over the shared backend', function () {
    const tools = createKwfTools(createBackend());
    const names = tools.map((tool) => tool.name);
    assert.ok(names.length >= 11, `expected >= 11 tools, got ${names.length}`);
    for (const name of names) {
      assert.ok(name.startsWith('kwf_'), `tool name should be kwf_ prefixed: ${name}`);
    }
    for (const required of [
      'kwf_run_workflow', 'kwf_validate_workflow', 'kwf_dry_run_workflow',
      'kwf_run_status', 'kwf_run_events', 'kwf_run_result',
      'kwf_pause_run', 'kwf_resume_run', 'kwf_stop_run', 'kwf_list_runs',
      'kwf_list_examples', 'kwf_get_example', 'kwf_get_skill',
      'kwf_list_docs', 'kwf_get_doc', 'kwf_search_docs',
    ]) {
      assert.ok(names.includes(required), `missing tool: ${required}`);
    }
  });

  it('runs a workflow and reads its result through tool handlers', async function () {
    const backend = createBackend();
    const tools = createKwfTools(backend);
    const runTool = tools.find((tool) => tool.name === 'kwf_run_workflow')!;
    const resultTool = tools.find((tool) => tool.name === 'kwf_run_result')!;

    const outcome = parseToolText(await runTool.handler({
      source: '(var x (ai_agent #d :{ sys_prompt = "s" user_prompt = "ECHO:via-mcp" })) x',
      workflow_name: 'mcp-demo',
      wait: true,
    }));
    assert.equal(outcome.state, 'done');
    assert.equal(outcome.result, 'via-mcp');

    const result = parseToolText(await resultTool.handler({ run_id: outcome.runId }));
    assert.equal(result, 'via-mcp');
  });

  it('validate/dry-run tools match the CLI JSON shape and set isError from result.ok', async function () {
    const tools = createKwfTools(createBackend());
    const validateTool = tools.find((tool) => tool.name === 'kwf_validate_workflow')!;
    const dryRunTool = tools.find((tool) => tool.name === 'kwf_dry_run_workflow')!;

    const valid = await validateTool.handler({
      source: '(var d (ai_parallel #fan :{ input = ["a" "b"] item = it }'
        + ' :[ (ai_agent #w :{ sys_prompt = "s" user_prompt = "p \\(it)" }) ])) d',
    });
    const validResult = JSON.parse(valid.content[0].text);
    assert.equal(validResult.ok, true);
    assert.equal(validResult.status, 'yielded');
    assert.equal(validResult.firstYield.jobCount, 2);
    assert.notEqual(valid.isError, true);

    const invalid = await validateTool.handler({ source: '(ai_agent #broken :{ ' });
    assert.equal(JSON.parse(invalid.content[0].text).ok, false);
    assert.equal(invalid.isError, true);

    const dry = await dryRunTool.handler({
      source: '(var x (ai_agent #d :{ sys_prompt = "s" user_prompt = "p" })) x',
    });
    const dryResult = JSON.parse(dry.content[0].text);
    assert.equal(dryResult.ok, true);
    assert.equal(dryResult.status, 'completed');
    assert.notEqual(dry.isError, true);
  });

  it('exposes examples and skill through tools', async function () {
    const tools = createKwfTools(createBackend());
    const examples = parseToolText(await tools.find((tool) => tool.name === 'kwf_list_examples')!.handler({}));
    assert.ok(examples.includes('routing'));

    const example = await tools.find((tool) => tool.name === 'kwf_get_example')!.handler({ name: 'routing' });
    assert.ok(example.content[0].text.includes('ai_workflow'));

    const skill = await tools.find((tool) => tool.name === 'kwf_get_skill')!.handler({});
    assert.ok(skill.content[0].text.includes('kunun dynamic workflows'));
  });
});

describe('kwf docs MCP tools', function () {
  it('exposes the three docs tools, each callable over the shared backend', function () {
    const tools = createKwfTools(createBackend());
    const names = tools.map((tool) => tool.name);
    for (const required of ['kwf_list_docs', 'kwf_get_doc', 'kwf_search_docs']) {
      const tool = tools.find((t) => t.name === required);
      assert.ok(tool != null, `missing tool: ${required}`);
      assert.equal(typeof tool!.handler, 'function');
    }
  });

  it('kwf_list_docs returns the same chapter list as the backend / docs CLI', async function () {
    const backend = createBackend();
    const tools = createKwfTools(backend);
    const listed = parseToolText(await tools.find((tool) => tool.name === 'kwf_list_docs')!.handler({}));
    assert.deepEqual(listed, backend.listDocs());
    assert.ok(listed.includes('reference/01-overview-mental-model.md'));
  });

  it('kwf_get_doc reads a chapter identical to backend.getDoc', async function () {
    const backend = createBackend();
    const tools = createKwfTools(backend);
    const docPath = backend.listDocs()[0];
    const result = await tools.find((tool) => tool.name === 'kwf_get_doc')!.handler({ path: docPath });
    assert.equal(result.content[0].type, 'text');
    assert.equal(result.content[0].text, await backend.getDoc(docPath));
    assert.notEqual(result.isError, true);
  });

  it('kwf_get_doc reports an unknown path with isError=true', async function () {
    const tools = createKwfTools(createBackend());
    const result = await tools.find((tool) => tool.name === 'kwf_get_doc')!.handler({ path: 'reference/does-not-exist.md' });
    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.includes('Unknown doc'));
  });

  it('kwf_search_docs returns hits matching backend.searchDocs', async function () {
    const backend = createBackend();
    const tools = createKwfTools(backend);
    const keyword = 'workflow';
    const hits = parseToolText(await tools.find((tool) => tool.name === 'kwf_search_docs')!.handler({ keyword }));
    assert.deepEqual(hits, await backend.searchDocs(keyword));
    assert.ok(hits.length > 0);
    for (const hit of hits) {
      assert.equal(typeof hit.path, 'string');
      assert.equal(typeof hit.line, 'number');
      assert.equal(typeof hit.snippet, 'string');
    }
  });
});

describe('kwf mcp stdio server', function () {
  it('answers initialize, tools/list and tools/call over stdio with a clean stdout', async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-mcp-stdio-'));
    const configPath = path.join(root, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(testConfig()));

    const child = spawn('bun', [BIN, 'mcp', 'stdio', '--config', configPath, '--runs-root', path.join(root, 'runs')], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const stdoutChunks: Buffer[] = [];
    child.stdout.on('data', (chunk) => stdoutChunks.push(Buffer.from(chunk)));

    const send = (message: any) => child.stdin.write(`${JSON.stringify(message)}\n`);
    send({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'kwf-test', version: '0.0.0' } },
    });
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'kwf_list_examples', arguments: {} } });

    const responses = new Map<number, any>();
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('mcp stdio timed out')), 15000);
      child.stdout.on('data', () => {
        const lines = Buffer.concat(stdoutChunks).toString('utf-8').split('\n').filter((line) => line.trim() !== '');
        for (const line of lines) {
          try {
            const message = JSON.parse(line);
            if (message.id != null) {
              responses.set(message.id, message);
            }
          } catch {
            clearTimeout(timer);
            reject(new Error(`non-JSON output on MCP stdout: ${line.slice(0, 120)}`));
            return;
          }
        }
        if (responses.has(1) && responses.has(2) && responses.has(3)) {
          clearTimeout(timer);
          resolve();
        }
      });
    }).finally(() => child.kill());

    assert.equal(responses.get(1).result.serverInfo.name, 'kwf');
    const toolNames = responses.get(2).result.tools.map((tool: any) => tool.name);
    assert.ok(toolNames.includes('kwf_run_workflow'));
    assert.ok(toolNames.includes('kwf_get_skill'));
    const callText = responses.get(3).result.content[0].text;
    assert.ok(JSON.parse(callText).includes('routing'));
  });
});
