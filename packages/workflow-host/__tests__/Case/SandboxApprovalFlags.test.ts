import assert from 'assert';

import { runAdapterCommand, BUILTIN_ADAPTERS, defaultConfig } from 'kunun-workflow-host';

// The codex adapter exposes `-s` (sandbox) and an approval policy as command
// placeholders, defaulting to codex's own defaults and overridable from the kwf
// CLI (`-s`/`--sandbox`, `-a`/`--approval`) or per-agent/config. codex `exec`
// has no `-a`, so approval is applied via `-c approval_policy=`.
describe('codex adapter sandbox/approval flags', function () {
  it('codex builtin command carries {sandbox} and {approval} placeholders', function () {
    const cmd = BUILTIN_ADAPTERS.codex.command;
    assert.ok(cmd.includes('-s'), `expected -s in: ${cmd.join(' ')}`);
    assert.ok(cmd.includes('{sandbox}'), `expected {sandbox} in: ${cmd.join(' ')}`);
    assert.ok(cmd.some((c) => c.includes('approval_policy={approval}')), `expected approval_policy={approval} in: ${cmd.join(' ')}`);
  });

  it('defaults mirror codex defaults (read-only / on-request)', function () {
    const cfg = defaultConfig();
    assert.equal(cfg.sandbox, 'read-only');
    assert.equal(cfg.approval, 'on-request');
  });

  it('fills sandbox/approval placeholders from run options', async function () {
    const r = await runAdapterCommand(
      { command: ['echo', '-s', '{sandbox}', 'approval_policy={approval}'], stdin: '{prompt}' },
      'hi',
      { timeoutSeconds: 10, sandbox: 'danger-full-access', approval: 'never' },
    );
    assert.ok(r.stdout.includes('-s danger-full-access'), `stdout: ${r.stdout}`);
    assert.ok(r.stdout.includes('approval_policy=never'), `stdout: ${r.stdout}`);
  });

  it('falls back to codex defaults when sandbox/approval are unset', async function () {
    const r = await runAdapterCommand(
      { command: ['echo', '{sandbox}', '{approval}'] },
      'hi',
      { timeoutSeconds: 10 },
    );
    assert.ok(r.stdout.includes('read-only'), `stdout: ${r.stdout}`);
    assert.ok(r.stdout.includes('on-request'), `stdout: ${r.stdout}`);
  });
});
