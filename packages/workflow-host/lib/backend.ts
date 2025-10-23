import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

import {
  listDocNames,
  listExampleNames,
  listScenarioNames,
  readDocAsset,
  readExampleAsset,
  readGenerationKernelAsset,
  readSkillAsset,
} from './assets';
import { getScenarioText } from './prompt-assembly';
import { HostConfig } from './config';
import { executeRun, startRunInStore } from './driver';
import { RunStatus, RunStore } from './store';
import {
  DryRunWorkflowResult,
  ValidateWorkflowResult,
  dryRunWorkflowSource,
  validateWorkflowSource,
} from './validation';

export interface RunWorkflowInput {
  source?: string;
  scriptPath?: string;
  workflowName?: string;
  args?: any;
  wait?: boolean;
}

export interface ValidateWorkflowInput {
  source?: string;
  scriptPath?: string;
  workflowName?: string;
  args?: any;
  showPrompts?: boolean;
}

export interface DryRunWorkflowInput extends ValidateWorkflowInput {
  maxYields?: number;
}

export interface RunWorkflowOutcome {
  runId: string;
  state: string;
  result?: any;
  error?: string;
}

// One match from searchDocs: the chapter path, the 1-based line number of the
// hit, and that line's text (trimmed) as surrounding context.
export interface DocSearchHit {
  path: string;
  line: number;
  snippet: string;
}

// Single business surface shared by the CLI commands and the MCP tools, so
// both interfaces stay thin and behaviorally identical.
export interface WorkflowBackend {
  runWorkflow(input: RunWorkflowInput): Promise<RunWorkflowOutcome>;
  validateWorkflow(input: ValidateWorkflowInput): ValidateWorkflowResult;
  dryRunWorkflow(input: DryRunWorkflowInput): DryRunWorkflowResult;
  resumeRun(runId: string, wait?: boolean): Promise<{ runId: string; state: string }>;
  getStatus(runId: string): RunStatus;
  getEvents(runId: string): any[];
  getResult(runId: string): any;
  getError(runId: string): { message: string } | null;
  requestPause(runId: string): void;
  requestStop(runId: string): void;
  listRuns(): string[];
  listExamples(): string[];
  getExample(name: string): Promise<string>;
  exportExamples(targetDir: string): Promise<string[]>;
  getSkill(): Promise<string>;
  // The generation kernel cheat-sheet injected into the `kwf agent` scaffold as
  // its system prompt — DSL grammar + traps, not the navigation SKILL.md.
  getGenerationKernel(): Promise<string>;
  // Embedded kunun language manual: relative chapter paths, single-chapter
  // reads, and a substring search returning per-line context.
  listDocs(): string[];
  getDoc(path: string): Promise<string>;
  searchDocs(keyword: string): Promise<DocSearchHit[]>;
  // Business-scenario skills fetched on demand by `kwf skill list|show <name>`
  // (progressive disclosure for the scaffold design agent).
  listScenarios(): string[];
  getScenario(name: string): Promise<string>;
  readonly store: RunStore;
}

export interface WorkflowBackendOptions {
  config: HostConfig;
  runsRoot?: string;
  configPath?: string;
}

// Inside a `bun build --compile` binary, the entry module lives on the
// embedded bunfs and process.execPath is the kwf binary itself, so the worker
// re-enters without a script path. Note: __dirname is rewritten to the
// build-machine source path at bundle time, so detection must use the
// runtime value Bun.main.
const IS_COMPILED_BINARY = typeof Bun !== 'undefined'
  && String(Bun.main ?? '').startsWith('/$bunfs');

function spawnDetachedWorker(store: RunStore, runId: string, configPath?: string): void {
  const workerArgs = [
    ...(IS_COMPILED_BINARY ? [] : [path.join(__dirname, '../bin/kwf.ts')]),
    '__worker',
    runId,
    '--runs-root',
    store.root,
  ];
  if (configPath != null) {
    workerArgs.push('--config', configPath);
  }
  const logFd = fs.openSync(path.join(store.root, runId, 'worker.log'), 'a');
  const child = spawn(process.execPath, workerArgs, {
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  child.unref();
  fs.closeSync(logFd);
}

// Resolves an inline source or a .kon file path into source text plus a
// derived workflow name, shared by run/validate/dry-run so all three name a
// file-backed workflow the same way.
function resolveWorkflowSource(
  input: { source?: string; scriptPath?: string; workflowName?: string },
): { source: string; workflowName: string } {
  let source = input.source;
  let scriptPath = input.scriptPath;
  if (source == null) {
    if (scriptPath == null) {
      throw new Error('requires source or scriptPath');
    }
    source = fs.readFileSync(scriptPath, 'utf-8');
    scriptPath = path.resolve(scriptPath);
  }
  const workflowName = input.workflowName
    ?? (scriptPath != null ? path.basename(scriptPath).replace(/\.[^.]+$/, '') : 'workflow');
  return { source, workflowName };
}

export function createWorkflowBackend(options: WorkflowBackendOptions): WorkflowBackend {
  const { config, configPath } = options;
  const root = options.runsRoot ?? config.runsRoot ?? path.join(process.cwd(), '.kwf', 'runs');
  const store = new RunStore(root);

  return {
    store,

    async runWorkflow(input: RunWorkflowInput): Promise<RunWorkflowOutcome> {
      let source = input.source;
      let scriptPath = input.scriptPath;
      if (source == null) {
        if (scriptPath == null) {
          throw new Error('runWorkflow requires source or scriptPath');
        }
        source = fs.readFileSync(scriptPath, 'utf-8');
        scriptPath = path.resolve(scriptPath);
      }
      const workflowName = input.workflowName
        ?? (scriptPath != null ? path.basename(scriptPath).replace(/\.[^.]+$/, '') : 'workflow');
      const runId = startRunInStore(store, {
        workflowName,
        scriptPath: scriptPath ?? '<inline>',
        source,
        args: input.args,
      });
      if (input.wait === true) {
        const status = await executeRun(store, runId, config);
        return {
          runId,
          state: status.state,
          result: status.state === 'done' ? store.readResult(runId) : undefined,
          error: status.state === 'failed' ? store.readError(runId)?.message : undefined,
        };
      }
      spawnDetachedWorker(store, runId, configPath);
      return { runId, state: store.readStatus(runId).state };
    },

    validateWorkflow(input: ValidateWorkflowInput): ValidateWorkflowResult {
      const { source, workflowName } = resolveWorkflowSource(input);
      return validateWorkflowSource({
        source,
        workflowName,
        args: input.args,
        showPrompts: input.showPrompts === true,
      });
    },

    dryRunWorkflow(input: DryRunWorkflowInput): DryRunWorkflowResult {
      const { source, workflowName } = resolveWorkflowSource(input);
      return dryRunWorkflowSource({
        source,
        workflowName,
        args: input.args,
        showPrompts: input.showPrompts === true,
        maxYields: input.maxYields,
      });
    },

    async resumeRun(runId: string, wait?: boolean): Promise<{ runId: string; state: string }> {
      store.clearControl(runId);
      if (wait === true) {
        const status = await executeRun(store, runId, config);
        return { runId, state: status.state };
      }
      spawnDetachedWorker(store, runId, configPath);
      return { runId, state: store.readStatus(runId).state };
    },

    getStatus: (runId) => store.readStatus(runId),
    getEvents: (runId) => store.readEvents(runId),
    getResult: (runId) => store.readResult(runId),
    getError: (runId) => store.readError(runId),
    requestPause: (runId) => store.writeControl(runId, 'pause'),
    requestStop: (runId) => store.writeControl(runId, 'stop'),
    listRuns: () => store.listRuns(),
    listExamples: () => listExampleNames(),
    getExample: (name) => readExampleAsset(name),

    async exportExamples(targetDir: string): Promise<string[]> {
      fs.mkdirSync(targetDir, { recursive: true });
      const written: string[] = [];
      for (const name of listExampleNames()) {
        const filePath = path.join(targetDir, `${name}.kon`);
        fs.writeFileSync(filePath, await readExampleAsset(name));
        written.push(filePath);
      }
      return written;
    },

    getSkill: () => readSkillAsset(),
    getGenerationKernel: () => readGenerationKernelAsset(),

    listDocs: () => listDocNames(),
    getDoc: (docPath) => readDocAsset(docPath),

    listScenarios: () => listScenarioNames(),
    getScenario: (name) => getScenarioText(name),

    async searchDocs(keyword: string): Promise<DocSearchHit[]> {
      const hits: DocSearchHit[] = [];
      for (const docPath of listDocNames()) {
        const text = await readDocAsset(docPath);
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(keyword)) {
            hits.push({ path: docPath, line: i + 1, snippet: lines[i].trim() });
          }
        }
      }
      return hits;
    },
  };
}
