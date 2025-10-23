import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { cliMain } from 'kunun-workflow-host';

const FIXTURES = path.join(__dirname, '../fixtures');

function collector(): { lines: string[]; log: (line: string) => void } {
  const lines: string[] = [];
  return { lines, log: (line) => lines.push(line) };
}

function exampleAdapterConfig(root: string): string {
  const configPath = path.join(root, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify({
    defaultAdapter: 'example',
    timeout: 30,
    adapters: {
      example: { label: 'Example mock', command: ['bun', path.join(FIXTURES, 'example-agent.ts')], stdin: '{prompt}' },
    },
  }));
  return configPath;
}

describe('kwf examples and skill commands', function () {
  it('lists the bundled example names', async function () {
    const { lines, log } = collector();
    const code = await cliMain(['examples'], log);
    assert.equal(code, 0);
    const expected = fs.readdirSync(path.join(__dirname, '../../../../examples'))
      .filter((file) => file.endsWith('.kon'))
      .map((file) => file.replace('.kon', ''))
      .sort();
    assert.deepEqual(lines.join('\n').trim().split('\n').sort(), expected);
  });

  it('shows a bundled example source', async function () {
    const { lines, log } = collector();
    const code = await cliMain(['examples', 'show', 'routing'], log);
    assert.equal(code, 0);
    assert.ok(lines.join('\n').includes('ai_workflow'));
  });

  it('exports examples and the exported workflow runs to completion', async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-examples-cli-'));
    const exportDir = path.join(root, 'out');
    const { lines, log } = collector();
    const code = await cliMain(['examples', 'export', exportDir], log);
    assert.equal(code, 0);
    const exported = fs.readdirSync(exportDir).filter((file) => file.endsWith('.kon'));
    assert.equal(exported.length >= 5, true);

    const configPath = exampleAdapterConfig(root);
    const runLines = collector();
    const runCode = await cliMain([
      'run', path.join(exportDir, 'routing.kon'),
      '--wait', '--config', configPath, '--runs-root', path.join(root, 'runs'),
    ], runLines.log);
    assert.equal(runCode, 0);
    assert.ok(runLines.lines.join('\n').includes('done'));
  });

  it('prints the skill document', async function () {
    const { lines, log } = collector();
    const code = await cliMain(['skill'], log);
    assert.equal(code, 0);
    assert.ok(lines.join('\n').includes('kunun dynamic workflows'));
  });
});
