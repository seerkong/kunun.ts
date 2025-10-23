import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { AdapterConfig } from './config';

export interface AdapterRunOptions {
  workspace?: string;
  model?: string;
  timeoutSeconds: number;
  // Fill the `{sandbox}` / `{approval}` command placeholders (codex -s / -c
  // approval_policy=). Default to codex's defaults when unset.
  sandbox?: string;
  approval?: string;
}

export interface AdapterRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function expandPlaceholders(parts: string[], values: { [key: string]: string }): string[] {
  return parts.map((part) => part.replace(/\{(\w+)\}/g, (whole, key) => values[key] ?? whole));
}

// Runs one agent CLI subprocess. The prompt travels via stdin when the adapter
// declares stdin: '{prompt}', via a temp file for '{prompt_file}' templates,
// or inline for '{prompt}' placeholders in the command itself.
export async function runAdapterCommand(
  adapter: AdapterConfig,
  prompt: string,
  options: AdapterRunOptions,
): Promise<AdapterRunResult> {
  let promptFile: string | null = null;
  if (adapter.command.some((part) => part.includes('{prompt_file}'))) {
    promptFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kwf-prompt-')), 'prompt.txt');
    fs.writeFileSync(promptFile, prompt);
  }

  const values: { [key: string]: string } = {
    workspace: options.workspace ?? process.cwd(),
    prompt,
    prompt_file: promptFile ?? '',
    sandbox: options.sandbox ?? 'read-only',
    approval: options.approval ?? 'on-request',
  };
  let command = expandPlaceholders(adapter.command, values);
  if (options.model != null && adapter.flags?.model != null) {
    command = [...command, ...adapter.flags.model, options.model];
  }

  return new Promise<AdapterRunResult>((resolve, reject) => {
    const child = spawn(command[0], command.slice(1), {
      cwd: options.workspace ?? process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Agent adapter timed out after ${options.timeoutSeconds}s`));
    }, options.timeoutSeconds * 1000);

    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (promptFile != null) {
        fs.rmSync(path.dirname(promptFile), { recursive: true, force: true });
      }
      resolve({
        stdout: Buffer.concat(stdout).toString('utf-8'),
        stderr: Buffer.concat(stderr).toString('utf-8'),
        exitCode: code ?? -1,
      });
    });

    if (adapter.stdin === '{prompt}') {
      child.stdin.write(prompt);
    }
    child.stdin.end();
  });
}
