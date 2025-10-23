import assert from 'assert';

import { cliMain } from 'kunun-workflow-host';

async function cli(args: string[]): Promise<{ code: number; lines: string[] }> {
  const lines: string[] = [];
  const code = await cliMain(args, (line) => lines.push(line));
  return { code, lines };
}

describe('workflow-host CLI docs subcommand', function () {
  it('docs list prints every chapter path and exits 0', async function () {
    const { code, lines } = await cli(['docs', 'list']);
    assert.equal(code, 0);
    // The list mirrors the embedded manual's relative chapter paths.
    assert.ok(lines.includes('reference/01-overview-mental-model.md'));
    assert.ok(lines.includes('dynamic-workflow/02-dsl-reference.md'));
    assert.ok(lines.length >= 10, `expected the full chapter set, got ${lines.length} lines`);
  });

  it('docs (default subcommand) lists chapters', async function () {
    const { code, lines } = await cli(['docs']);
    assert.equal(code, 0);
    assert.ok(lines.includes('reference/01-overview-mental-model.md'));
  });

  it('docs show <path> prints the chapter content and exits 0', async function () {
    const { code, lines } = await cli(['docs', 'show', 'reference/01-overview-mental-model.md']);
    assert.equal(code, 0);
    const text = lines.join('\n');
    assert.ok(text.trim().length > 0, 'chapter content should be printed');
  });

  it('docs show with an unknown path errors and exits non-zero', async function () {
    const { code, lines } = await cli(['docs', 'show', 'reference/does-not-exist.md']);
    assert.notEqual(code, 0);
    const text = lines.join('\n');
    assert.ok(/unknown/i.test(text), `expected an error message mentioning the unknown path, got: ${text}`);
    assert.ok(text.includes('reference/does-not-exist.md'));
  });

  it('docs show without a path prints usage and exits non-zero', async function () {
    const { code, lines } = await cli(['docs', 'show']);
    assert.notEqual(code, 0);
    assert.ok(lines.join('\n').includes('docs show'));
  });

  it('docs search <kw> returns hits with path and context, exits 0', async function () {
    const { code, lines } = await cli(['docs', 'search', 'kunun']);
    assert.equal(code, 0);
    const text = lines.join('\n');
    assert.ok(lines.length >= 1, 'expected at least one hit');
    // Each hit line carries the chapter path it was found in.
    assert.ok(/\.md/.test(text), `hits should reference a chapter path, got: ${text}`);
    assert.ok(/kunun/.test(text), `hits should include the matched line context, got: ${text}`);
  });

  it('docs search without a keyword prints usage and exits non-zero', async function () {
    const { code, lines } = await cli(['docs', 'search']);
    assert.notEqual(code, 0);
    assert.ok(lines.join('\n').includes('docs search'));
  });

  it('docs with an unknown subcommand prints usage and exits non-zero', async function () {
    const { code, lines } = await cli(['docs', 'bogus']);
    assert.notEqual(code, 0);
    assert.ok(lines.join('\n').includes('docs'));
  });
});
