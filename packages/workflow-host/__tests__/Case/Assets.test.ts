import assert from 'assert';
import fs from 'fs';
import path from 'path';

import {
  listExampleNames,
  loadPromptAsset,
  readConfigExampleAsset,
  readExampleAsset,
  readSkillAsset,
} from 'kunun-workflow-host';

const ROOT = path.join(__dirname, '../../../..');

describe('workflow-host embedded asset layer', function () {
  it('lists exactly the bundled example names from the repository examples directory', function () {
    const expected = fs.readdirSync(path.join(ROOT, 'examples'))
      .filter((file) => file.endsWith('.kon'))
      .map((file) => file.replace('.kon', ''))
      .sort();
    assert.deepEqual([...listExampleNames()].sort(), expected);
  });

  it('reads example sources through the asset layer', async function () {
    const routing = await readExampleAsset('routing');
    assert.ok(routing.includes('ai_workflow'));
    assert.ok(routing.includes('classifyRequest'));
    await assert.rejects(() => readExampleAsset('no-such-example'), /Unknown example/);
  });

  it('reads the skill document and config example through the asset layer', async function () {
    const skill = await readSkillAsset();
    assert.ok(skill.includes('kwf'));
    const config = JSON.parse(await readConfigExampleAsset());
    assert.equal(config.defaultAdapter, 'claude');
  });

  it('loads prompt templates from standalone asset files with placeholders', async function () {
    const correction = await loadPromptAsset('schema-correction');
    assert.ok(correction.includes('did not satisfy the required schema'));
    assert.ok(correction.includes('{errors}'));

    const instruction = await loadPromptAsset('schema-instruction');
    assert.ok(instruction.includes('JSON Schema'));
    assert.ok(instruction.includes('{schema}'));
  });

  it('keeps prompt wording out of bridge source (single-sourced in assets)', function () {
    const bridgeSource = fs.readFileSync(
      path.join(ROOT, 'packages/workflow-host/lib/bridge.ts'), 'utf-8');
    assert.equal(bridgeSource.includes('did not satisfy the required schema'), false);
    assert.equal(bridgeSource.includes('Reply again with corrected JSON only'), false);
    const schemaSource = fs.readFileSync(
      path.join(ROOT, 'packages/workflow-host/lib/schema.ts'), 'utf-8');
    assert.equal(schemaSource.includes('Respond with a single JSON value'), false);
  });
});
