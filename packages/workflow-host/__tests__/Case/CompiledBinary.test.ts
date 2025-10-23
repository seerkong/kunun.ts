import assert from 'assert';
import { execFileSync, execSync, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const ROOT = path.join(__dirname, '../../../..');
const BINARY = path.join(ROOT, 'dist-bin/kwf');
const FIXTURES = path.join(__dirname, '../fixtures');

function run(args: string[], cwd: string): string {
  return execFileSync(BINARY, args, { cwd, encoding: 'utf-8' });
}

describe('compiled kwf single executable', function () {
  let work: string;

  it('builds the self-contained binary', function () {
    execSync('bun run build:bin', { cwd: ROOT, stdio: 'pipe' });
    assert.ok(fs.existsSync(BINARY));
    work = fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-bin-'));
  }, 120000);

  it('serves embedded examples and skill outside the repository', function () {
    const exportDir = path.join(work, 'out');
    const listed = run(['examples'], work).trim().split('\n');
    assert.ok(listed.includes('routing'));

    run(['examples', 'export', exportDir], work);
    const exported = fs.readdirSync(exportDir).filter((file) => file.endsWith('.kon'));
    assert.ok(exported.length >= 5);

    const skill = run(['skill'], work);
    assert.ok(skill.includes('kunun dynamic workflows'));
  }, 30000);

  it('serves the embedded language manual outside the repository', function () {
    const listed = run(['docs', 'list'], work).trim().split('\n');
    assert.ok(listed.includes('reference/README.md'));
    assert.ok(listed.includes('dynamic-workflow/00-cheatsheet.md'));

    const chapter = run(['docs', 'show', 'reference/README.md'], work);
    assert.ok(chapter.includes('kunun 语言手册'));
  }, 30000);

  it('runs an exported example to completion with --wait', function () {
    const configPath = path.join(work, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      defaultAdapter: 'example',
      timeout: 30,
      adapters: {
        example: { label: 'Example mock', command: ['bun', path.join(FIXTURES, 'example-agent.ts')], stdin: '{prompt}' },
      },
    }));
    const output = run([
      'run', path.join(work, 'out/routing.kon'),
      '--wait', '--config', configPath, '--runs-root', path.join(work, 'runs'),
    ], work);
    assert.ok(output.includes('state: done'));
    assert.ok(output.includes('frontend'));
  }, 60000);

  it('validates and dry-runs an exported example with no agent calls or config', function () {
    const routing = path.join(work, 'out/routing.kon');

    const validateOut = run(['validate', routing, '--json'], work);
    const validate = JSON.parse(validateOut);
    assert.equal(validate.ok, true);
    assert.equal(validate.status, 'yielded');
    assert.ok(validate.firstYield.jobCount >= 1);

    const dryRunOut = run(['dry-run', routing, '--json'], work);
    const dryRun = JSON.parse(dryRunOut);
    assert.equal(dryRun.ok, true);
    assert.equal(dryRun.status, 'completed');
    assert.ok(dryRun.yields.length >= 1);
  }, 30000);

  it('re-enters the compiled binary for detached background workers', async function () {
    const configPath = path.join(work, 'config.json');
    const runsRoot = path.join(work, 'runs-bg');
    const started = run([
      'run', path.join(work, 'out/fan-out-reduce.kon'),
      '--config', configPath, '--runs-root', runsRoot,
    ], work);
    const runId = started.match(/run: (\S+)/)![1];

    let state = '';
    for (let i = 0; i < 60; i++) {
      const status = JSON.parse(run(['status', runId, '--runs-root', runsRoot], work));
      state = status.state;
      if (state === 'done' || state === 'failed') {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert.equal(state, 'done');
  }, 60000);

  it('answers an MCP initialize handshake from the compiled binary', async function () {
    const child = spawn(BINARY, ['mcp', 'stdio', '--runs-root', path.join(work, 'runs-mcp')], {
      cwd: work,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const chunks: Buffer[] = [];
    child.stdout.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    child.stdin.write(`${JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'bin-test', version: '0' } },
    })}\n`);

    const response: any = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('compiled mcp stdio timed out')), 15000);
      child.stdout.on('data', () => {
        for (const line of Buffer.concat(chunks).toString('utf-8').split('\n')) {
          if (line.trim() === '') {
            continue;
          }
          const message = JSON.parse(line);
          if (message.id === 1) {
            clearTimeout(timer);
            resolve(message);
            return;
          }
        }
      });
    }).finally(() => child.kill());

    assert.equal(response.result.serverInfo.name, 'kwf');
  }, 30000);
});
