import fs from 'fs';
import os from 'os';
import path from 'path';

export interface AdapterConfig {
  label?: string;
  command: string[];
  // '{prompt}' to pass the prompt via stdin; omit to pass nothing on stdin
  stdin?: string;
  timeout?: number;
  flags?: { [option: string]: string[] };
}

export interface HostConfig {
  defaultAdapter: string;
  concurrency: number;
  maxAgents: number;
  schemaRetries: number;
  // seconds per agent subprocess unless the job metadata overrides it
  timeout: number;
  // Defaults for the `{sandbox}` / `{approval}` command placeholders (codex
  // `-s` / `-c approval_policy=`). Default to codex's own defaults. Overridable
  // from the CLI (`-s`/`--sandbox`, `-a`/`--approval`) or per-agent in the DSL.
  sandbox?: string;
  approval?: string;
  runsRoot?: string;
  adapters: { [name: string]: AdapterConfig };
}

export const BUILTIN_ADAPTERS: { [name: string]: AdapterConfig } = {
  claude: {
    label: 'Claude Code',
    command: ['claude', '--print', '--permission-mode', 'acceptEdits'],
    stdin: '{prompt}',
    flags: { model: ['--model'] },
  },
  codex: {
    // `-s {sandbox}` mirrors codex's `--sandbox`; codex `exec` has no `-a`, so the
    // approval policy is applied via `-c approval_policy=` (equivalent to the
    // top-level `-a`). Both default to codex's defaults and are overridable from
    // the kwf CLI (`-s`/`--sandbox`, `-a`/`--approval`) or job/config.
    label: 'Codex CLI',
    command: ['codex', 'exec', '-s', '{sandbox}', '-c', 'approval_policy={approval}', '--skip-git-repo-check', '--cd', '{workspace}', '-'],
    stdin: '{prompt}',
    flags: { model: ['--model'] },
  },
  gemini: {
    label: 'Gemini CLI',
    command: ['gemini', '--prompt', '{prompt}'],
    flags: { model: ['--model'] },
  },
};

export function defaultConfig(): HostConfig {
  const cpuBound = Math.max(1, (os.cpus()?.length ?? 4) - 2);
  return {
    defaultAdapter: 'claude',
    concurrency: Math.min(16, cpuBound),
    maxAgents: 1000,
    schemaRetries: 2,
    timeout: 1800,
    // codex defaults: read-only sandbox, on-request approval.
    sandbox: 'read-only',
    approval: 'on-request',
    runsRoot: path.join(os.homedir(), '.kwf', 'runs'),
    adapters: { ...BUILTIN_ADAPTERS },
  };
}

export function loadConfig(explicitPath?: string): HostConfig {
  const base = defaultConfig();
  const candidates = [
    explicitPath,
    process.env.KWF_CONFIG,
    path.join(process.cwd(), 'kwf.config.json'),
    path.join(os.homedir(), '.config', 'kwf', 'config.json'),
  ].filter((candidate): candidate is string => candidate != null);

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) {
      if (candidate === explicitPath) {
        throw new Error(`Workflow host config not found: ${candidate}`);
      }
      continue;
    }
    const loaded = JSON.parse(fs.readFileSync(candidate, 'utf-8'));
    return {
      ...base,
      ...loaded,
      adapters: { ...base.adapters, ...(loaded.adapters ?? {}) },
    };
  }
  return base;
}
