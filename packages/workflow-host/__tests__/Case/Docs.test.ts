import assert from 'assert';
import fs from 'fs';
import path from 'path';

import { listDocNames, readDocAsset } from 'kunun-workflow-host';

const ROOT = path.join(__dirname, '../../../..');

// Every chapter that must be reachable through the embedded asset layer.
const EXPECTED_DOCS = [
  'reference/01-overview-mental-model.md',
  'reference/02-lexical-tokens.md',
  'reference/03-kon-data-format.md',
  'reference/04-strings.md',
  'reference/05-evaluation-model.md',
  'reference/06-builtins-control-flow.md',
  'reference/07-functions-objects.md',
  'reference/08-host-stdlib.md',
  'reference/09-type-system.md',
  'reference/10-effects-and-typed-execution.md',
  'reference/README.md',
  'dynamic-workflow/00-cheatsheet.md',
  'dynamic-workflow/01-overview.md',
  'dynamic-workflow/02-dsl-reference.md',
  'dynamic-workflow/03-authoring-patterns.md',
  'dynamic-workflow/04-running-kwf.md',
  'dynamic-workflow/README.md',
];

describe('workflow-host embedded language-manual asset layer', function () {
  it('lists every reference and dynamic-workflow chapter as a relative path', function () {
    assert.deepEqual([...listDocNames()].sort(), [...EXPECTED_DOCS].sort());
  });

  it('lists exactly the .md files present under skill/reference and skill/dynamic-workflow', function () {
    const collect = (dir: string): string[] => fs.readdirSync(path.join(ROOT, 'skill', dir))
      .filter((file) => file.endsWith('.md'))
      .map((file) => `${dir}/${file}`);
    const expected = [...collect('reference'), ...collect('dynamic-workflow')].sort();
    assert.deepEqual([...listDocNames()].sort(), expected);
  });

  it('reads each chapter byte-for-byte from the repository source', async function () {
    for (const rel of listDocNames()) {
      const expected = fs.readFileSync(path.join(ROOT, 'skill', rel), 'utf-8');
      assert.equal(await readDocAsset(rel), expected, `mismatch for ${rel}`);
    }
  });

  it('rejects an unknown doc path', async function () {
    await assert.rejects(() => readDocAsset('reference/99-nope.md'), /Unknown doc/);
    await assert.rejects(() => readDocAsset('not-a-doc'), /Unknown doc/);
  });
});
