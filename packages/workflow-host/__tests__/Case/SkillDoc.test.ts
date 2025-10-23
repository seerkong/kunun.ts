import assert from 'assert';
import fs from 'fs';
import path from 'path';

import { loadConfig } from 'kunun-workflow-host';

const ROOT = path.join(__dirname, '../../../..');
const SKILL_PATH = path.join(ROOT, 'skill/SKILL.md');

describe('workflow-host skill documentation consistency', function () {
  it('is a navigation entry whose manual links resolve to real docs', function () {
    // SKILL.md was slimmed to a navigation entry + kwf cheat-sheet; the full
    // language manual lives in skill/reference/ and the workflow guide in
    // skill/dynamic-workflow/. Assert it points into both and that every
    // relative .md link it carries resolves on disk.
    const skill = fs.readFileSync(SKILL_PATH, 'utf-8');
    assert.ok(skill.includes('reference/'), 'SKILL.md should link to the language reference manual');
    assert.ok(skill.includes('dynamic-workflow/'), 'SKILL.md should link to the dynamic-workflow guide');

    const links = [...skill.matchAll(/\]\(([^)]+\.md)\)/g)].map((match) => match[1].split('#')[0]);
    assert.ok(links.length >= 5, 'SKILL.md should link into the split manual');
    for (const link of new Set(links)) {
      assert.ok(fs.existsSync(path.join(ROOT, 'skill', link)), `SKILL.md manual link should resolve: ${link}`);
    }
  });

  it('only documents CLI commands that the CLI actually implements', function () {
    const skill = fs.readFileSync(SKILL_PATH, 'utf-8');
    const cli = fs.readFileSync(path.join(ROOT, 'packages/workflow-host/lib/cli.ts'), 'utf-8');
    const documented = [...skill.matchAll(/kwf\.ts ([\w-]+)/g)].map((match) => match[1]);

    assert.ok(documented.length >= 8, 'skill should document the command set');
    for (const command of new Set(documented)) {
      assert.ok(cli.includes(`case '${command}'`), `documented command not implemented: ${command}`);
    }
  });

  it('documents the validate and dry-run commands and their MCP tools', function () {
    const skill = fs.readFileSync(SKILL_PATH, 'utf-8');
    const documented = [...skill.matchAll(/kwf\.ts ([\w-]+)/g)].map((match) => match[1]);
    assert.ok(documented.includes('validate'), 'SKILL.md should document the validate command');
    assert.ok(documented.includes('dry-run'), 'SKILL.md should document the dry-run command');
    assert.ok(skill.includes('kwf_validate_workflow'), 'SKILL.md should mention kwf_validate_workflow');
    assert.ok(skill.includes('kwf_dry_run_workflow'), 'SKILL.md should mention kwf_dry_run_workflow');
  });

  it('references every bundled example by filename', function () {
    const skill = fs.readFileSync(SKILL_PATH, 'utf-8');
    const files = fs.readdirSync(path.join(ROOT, 'examples')).filter((file) => file.endsWith('.kon'));
    for (const file of files) {
      assert.ok(skill.includes(file), `SKILL.md should mention ${file}`);
    }
  });

  it('ships a config example that loadConfig accepts', function () {
    const config = loadConfig(path.join(ROOT, 'skill/kwf.config.example.json'));
    assert.equal(config.defaultAdapter, 'claude');
    assert.ok(config.adapters.my_agent != null);
    assert.ok(Array.isArray(config.adapters.my_agent.command));
  });
});
