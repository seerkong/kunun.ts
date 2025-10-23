import fs from 'fs';
import path from 'path';
import { createInterface } from 'readline';

import { WorkflowBackend, createWorkflowBackend } from './backend';
import { loadConfig } from './config';
import { DryRunWorkflowResult, ValidateWorkflowResult } from './validation';
import { INFER_INPUT_SOURCE, SCAFFOLD_WORKFLOW_SOURCE } from './agent-workflows';
import { assembleInferSystemPrompt, assembleScaffoldSystemPrompt } from './prompt-assembly';

interface CliOptions {
  positional: string[];
  flags: { [name: string]: string | boolean };
}

function parseArgs(argv: string[]): CliOptions {
  const positional: string[] = [];
  const flags: { [name: string]: string | boolean } = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const name = arg.slice(2);
      const next = argv[i + 1];
      if (next != null && !next.startsWith('-')) {
        flags[name] = next;
        i += 1;
      } else {
        flags[name] = true;
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      // Short flags, e.g. -s <sandbox> / -a <approval>.
      const name = arg.slice(1);
      const next = argv[i + 1];
      if (next != null && !next.startsWith('-')) {
        flags[name] = next;
        i += 1;
      } else {
        flags[name] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

// keep in sync with packages/workflow-host/package.json "version"
const KWF_VERSION = '1.0.1';

const USAGE = `kwf <command>

Commands:
  agent "<requirement>" [--output-dir <dir>]
                            generate a workflow definition, review it, then execute — one wizard step
  run <file.kon> [--args <json>] [--wait] [--name <workflow>] [--config <path>] [--runs-root <dir>]
  validate <file.kon> [--args <json>] [--json] [--show-prompts]
                            parse + execute to the first yield/completion, no agent calls
  dry-run <file.kon> [--args <json>] [--max-yields <n>] [--json] [--show-prompts]
                            simulate the workflow with schema-shaped mock results, no agent calls
  status <runId>            show run status
  logs <runId>              print the event log
  result <runId>            print the final result
  pause <runId>             request a pause at the next yield boundary
  resume <runId> [--wait]   resume a paused/interrupted run
  stop <runId>              request a stop at the next yield boundary
  list                      list runs
  examples [list|show <name>|export <dir>]   bundled example workflows
  docs [list|show <path>|search <kw>]        embedded kunun language manual
  skill [list|show <name>]  workflow-authoring skill doc, or business-scenario skills
  mcp stdio                 start the stdio MCP server
  version                   print the kwf version
`;

function printYield(summary: { effect: string; jobCount: number; jobs: any[] }, log: (line: string) => void): void {
  log(`  yield: ${summary.effect} (${summary.jobCount} job${summary.jobCount === 1 ? '' : 's'})`);
  for (const job of summary.jobs) {
    const name = job.label ?? job.name ?? job.id;
    const schema = job.hasOutputSchema ? ' [schema]' : '';
    log(`    - ${name}${schema}${job.promptPreview != null ? `: ${job.promptPreview}` : ''}`);
  }
}

function printValidate(result: ValidateWorkflowResult, log: (line: string) => void): void {
  log(`workflow: ${result.workflowName}`);
  log(`status: ${result.status} (${result.ok ? 'ok' : 'failed'})`);
  for (const diag of result.diagnostics) {
    log(`  diagnostic: ${diag.message}`);
  }
  if (result.firstYield != null) {
    printYield(result.firstYield, log);
  }
  if (result.resultPreview !== undefined) {
    log(`result: ${JSON.stringify(result.resultPreview)}`);
  }
}

function printDryRun(result: DryRunWorkflowResult, log: (line: string) => void): void {
  log(`workflow: ${result.workflowName}`);
  log(`status: ${result.status} (${result.ok ? 'ok' : 'failed'})`);
  log(`yields: ${result.yields.length}`);
  for (const summary of result.yields) {
    printYield(summary, log);
  }
  for (const diag of result.diagnostics) {
    log(`  diagnostic: ${diag.message}`);
  }
  if (result.resultPreview !== undefined) {
    log(`result: ${JSON.stringify(result.resultPreview)}`);
  }
}

export async function cliMain(argv: string[], log: (line: string) => void = console.log): Promise<number> {
  const { positional, flags } = parseArgs(argv);
  const command = positional[0];
  if (flags.version === true || command === 'version') {
    log(KWF_VERSION);
    return 0;
  }
  const configPath = typeof flags.config === 'string' ? String(flags.config) : undefined;
  const config = loadConfig(configPath);
  // CLI overrides for the codex adapter's sandbox / approval (codex -s / -c
  // approval_policy=). `-s danger-full-access` enables full read/write + network
  // (use only inside an externally-sandboxed env like the Finch cap).
  const sandboxFlag = flags.sandbox ?? flags.s;
  if (typeof sandboxFlag === 'string') config.sandbox = sandboxFlag;
  const approvalFlag = flags.approval ?? flags.a;
  if (typeof approvalFlag === 'string') config.approval = approvalFlag;
  const runsRoot = typeof flags['runs-root'] === 'string' ? String(flags['runs-root']) : undefined;
  const backend: WorkflowBackend = createWorkflowBackend({ config, configPath, runsRoot });

  switch (command) {
    case 'run': {
      const scriptPath = positional[1];
      if (scriptPath == null) {
        log(USAGE);
        return 1;
      }
      const args = typeof flags.args === 'string' ? JSON.parse(String(flags.args)) : undefined;
      const workflowName = typeof flags.name === 'string' ? String(flags.name) : undefined;
      const outcome = await backend.runWorkflow({
        scriptPath,
        workflowName,
        args,
        wait: flags.wait === true,
      });
      log(`run: ${outcome.runId}`);
      if (flags.wait === true) {
        log(`state: ${outcome.state}`);
        if (outcome.state === 'done') {
          log(JSON.stringify(outcome.result, null, 2));
          return 0;
        }
        if (outcome.state === 'failed') {
          log(`error: ${outcome.error}`);
          return 1;
        }
      }
      return 0;
    }
    case 'validate':
    case 'dry-run': {
      const scriptPath = positional[1];
      if (scriptPath == null) {
        log(USAGE);
        return 2;
      }
      let args: any;
      try {
        args = typeof flags.args === 'string' ? JSON.parse(String(flags.args)) : undefined;
      } catch {
        log('error: --args must be valid JSON');
        return 2;
      }
      const showPrompts = flags['show-prompts'] === true;
      const asJson = flags.json === true;
      if (command === 'validate') {
        const result = backend.validateWorkflow({ scriptPath, args, showPrompts });
        if (asJson) {
          log(JSON.stringify(result, null, 2));
        } else {
          printValidate(result, log);
        }
        return result.ok ? 0 : 1;
      }
      let maxYields: number | undefined;
      if (flags['max-yields'] != null) {
        maxYields = Number(flags['max-yields']);
        if (!Number.isFinite(maxYields) || maxYields <= 0) {
          log('error: --max-yields must be a positive number');
          return 2;
        }
      }
      const result = backend.dryRunWorkflow({ scriptPath, args, showPrompts, maxYields });
      if (asJson) {
        log(JSON.stringify(result, null, 2));
      } else {
        printDryRun(result, log);
      }
      return result.ok ? 0 : 1;
    }
    case '__worker': {
      const runId = positional[1];
      const { state } = await backend.resumeRun(runId, true);
      return state === 'failed' ? 1 : 0;
    }
    case 'status': {
      log(JSON.stringify(backend.getStatus(positional[1]), null, 2));
      return 0;
    }
    case 'logs': {
      for (const event of backend.getEvents(positional[1])) {
        log(JSON.stringify(event));
      }
      return 0;
    }
    case 'result': {
      log(JSON.stringify(backend.getResult(positional[1]), null, 2));
      return 0;
    }
    case 'pause': {
      backend.requestPause(positional[1]);
      log(`pause requested: ${positional[1]}`);
      return 0;
    }
    case 'stop': {
      backend.requestStop(positional[1]);
      log(`stop requested: ${positional[1]}`);
      return 0;
    }
    case 'resume': {
      const runId = positional[1];
      const { state } = await backend.resumeRun(runId, flags.wait === true);
      if (flags.wait === true) {
        log(`state: ${state}`);
        return state === 'failed' ? 1 : 0;
      }
      log(`resume requested: ${runId}`);
      return 0;
    }
    case 'list': {
      for (const runId of backend.listRuns()) {
        log(runId);
      }
      return 0;
    }
    case 'examples': {
      const sub = positional[1] ?? 'list';
      if (sub === 'list') {
        for (const name of backend.listExamples()) {
          log(name);
        }
        return 0;
      }
      if (sub === 'show') {
        const name = positional[2];
        if (name == null) {
          log('usage: kwf examples show <name>');
          return 1;
        }
        log(await backend.getExample(name));
        return 0;
      }
      if (sub === 'export') {
        const targetDir = positional[2] ?? '.';
        const written = await backend.exportExamples(targetDir);
        log(`exported ${written.length} examples to ${targetDir}`);
        return 0;
      }
      log('usage: kwf examples [list|show <name>|export <dir>]');
      return 1;
    }
    case 'docs': {
      const sub = positional[1] ?? 'list';
      if (sub === 'list') {
        for (const docPath of backend.listDocs()) {
          log(docPath);
        }
        return 0;
      }
      if (sub === 'show') {
        const docPath = positional[2];
        if (docPath == null) {
          log('usage: kwf docs show <path>');
          return 1;
        }
        try {
          log(await backend.getDoc(docPath));
        } catch (err) {
          log(`error: ${err instanceof Error ? err.message : String(err)}`);
          return 1;
        }
        return 0;
      }
      if (sub === 'search') {
        const keyword = positional[2];
        if (keyword == null) {
          log('usage: kwf docs search <kw>');
          return 1;
        }
        for (const hit of await backend.searchDocs(keyword)) {
          log(`${hit.path}:${hit.line}: ${hit.snippet}`);
        }
        return 0;
      }
      log('usage: kwf docs [list|show <path>|search <kw>]');
      return 1;
    }
    case 'skill': {
      // No sub-command: the navigation SKILL.md (backward compatible).
      // `list` / `show <name>`: business-scenario skills fetched on demand by
      // the scaffold design agent (progressive disclosure).
      const sub = positional[1];
      if (sub == null) {
        log(await backend.getSkill());
        return 0;
      }
      if (sub === 'list') {
        for (const name of backend.listScenarios()) {
          log(name);
        }
        return 0;
      }
      if (sub === 'show') {
        const name = positional[2];
        if (name == null) {
          log('usage: kwf skill show <name>');
          return 1;
        }
        try {
          log(await backend.getScenario(name));
        } catch (err) {
          log(`error: ${err instanceof Error ? err.message : String(err)}`);
          return 1;
        }
        return 0;
      }
      log('usage: kwf skill [list | show <name>]');
      return 1;
    }
    case 'mcp': {
      const sub = positional[1];
      if (sub !== 'stdio') {
        log('usage: kwf mcp stdio');
        return 1;
      }
      const { startStdioMcpServer } = await import('./mcp');
      await startStdioMcpServer(backend);
      return 0;
    }
    case 'agent': {
      // kwf agent "<requirement>" [--output-dir <dir>]
      //
      // 1. Run SCAFFOLD_WORKFLOW_SOURCE to generate a .kon workflow definition.
      //    The design system prompt is assembled from layered Markdown assets
      //    (universal + kwf + scaffold + Kon cheatsheet + scenario index) and
      //    injected via the system_prompt arg; concrete business-scenario
      //    patterns are fetched on demand by the agent via `kwf skill show`.
      // 2. Run INFER_INPUT_SOURCE to map the requirement onto the workflow's :input.
      // 3. Write both files, show them, wait for confirmation.
      // 4. Execute the generated workflow.
      const requirement = positional.slice(1).join(' ').trim();
      if (!requirement) {
        log('usage: kwf agent "<requirement>" [--output-dir <dir>] [--config <path>] [--yes]');
        log('  Generate a workflow definition, review it, then execute — in one wizard step.');
        log('  --yes  skip the interactive review and execute immediately (CI / scripts).');
        return 2;
      }
      const outputDir = typeof flags['output-dir'] === 'string'
        ? path.resolve(flags['output-dir'])
        : process.cwd();
      fs.mkdirSync(outputDir, { recursive: true });

      // Stage 1: scaffold — generate the .kon workflow definition.
      log('[1/4] Generating workflow definition...');
      // The scaffold system prompt is assembled from layered Markdown assets
      // (universal + kwf + scaffold + Kon cheatsheet + scenario index) — see
      // prompt-assembly.ts. Concrete business-scenario patterns are NOT inlined;
      // the design agent fetches the fitting one on demand via `kwf skill show`.
      const scaffoldSystemPrompt = await assembleScaffoldSystemPrompt();
      const scaffoldOutcome = await backend.runWorkflow({
        source: SCAFFOLD_WORKFLOW_SOURCE,
        workflowName: 'scaffold-workflow',
        args: { requirement, system_prompt: scaffoldSystemPrompt },
        wait: true,
      });
      if (scaffoldOutcome.state !== 'done') {
        log(`error: scaffold failed — ${scaffoldOutcome.error ?? 'unknown'}`);
        return 1;
      }
      // :output = [scaffold] wraps the result in a single-element array.
      const scaffoldData = Array.isArray(scaffoldOutcome.result)
        ? scaffoldOutcome.result[0]
        : scaffoldOutcome.result;
      const { workflow_source, workflow_name, description } = (scaffoldData ?? {}) as any;
      if (typeof workflow_source !== 'string' || !workflow_source.trim()) {
        log('error: scaffold returned empty workflow_source');
        return 1;
      }
      const safeName = (typeof workflow_name === 'string' && workflow_name.trim())
        ? workflow_name.trim().replace(/[^a-z0-9-]/gi, '-').toLowerCase()
        : 'generated-workflow';

      // Write .kon file.
      const konPath = path.join(outputDir, `${safeName}.kon`);
      fs.writeFileSync(konPath, workflow_source);
      log(`       workflow: ${konPath}`);
      if (description) log(`       ${description}`);

      // Quick validate (no adapter calls) — surface parse errors early.
      const vr = backend.validateWorkflow({ scriptPath: konPath });
      if (!vr.ok) {
        log(`       warning: validate issues: ${vr.diagnostics.map((d) => d.message).join('; ')}`);
      }

      // Stage 2: infer input — map the requirement onto the workflow's :input.
      log('[2/4] Inferring workflow input parameters...');
      const inferSystemPrompt = await assembleInferSystemPrompt();
      const inferOutcome = await backend.runWorkflow({
        source: INFER_INPUT_SOURCE,
        workflowName: 'infer-workflow-input',
        args: { requirement, workflow_source, system_prompt: inferSystemPrompt },
        wait: true,
      });
      if (inferOutcome.state !== 'done') {
        log(`error: input inference failed — ${inferOutcome.error ?? 'unknown'}`);
        return 1;
      }
      const inferData = Array.isArray(inferOutcome.result)
        ? inferOutcome.result[0]
        : inferOutcome.result;
      const { args: inferredArgs, explanation } = (inferData ?? {}) as any;
      const safeArgs = inferredArgs != null && typeof inferredArgs === 'object' ? inferredArgs : {};

      // Write input JSON file.
      const inputPath = path.join(outputDir, `${safeName}-input.json`);
      fs.writeFileSync(inputPath, JSON.stringify(safeArgs, null, 2));
      log(`       input:    ${inputPath}`);
      if (explanation) log(`       ${explanation}`);

      // Stage 3: show files and ask for confirmation.
      log(`\n[3/4] Review generated files\n`);
      log(`--- ${path.basename(konPath)} ---`);
      log(workflow_source.trimEnd());
      log(`---\n`);
      log(`--- ${path.basename(inputPath)} ---`);
      log(JSON.stringify(safeArgs, null, 2));
      log(`---\n`);

      // `--yes` skips the interactive review (for CI / scripts / e2e tests).
      const confirmed = flags.yes === true || await askConfirm('Execute this workflow? [Enter to confirm, n to cancel]: ');
      if (!confirmed) {
        log('cancelled — files remain on disk for manual editing.');
        return 0;
      }

      // Stage 4: execute.
      log('[4/4] Running workflow...');
      const runOutcome = await backend.runWorkflow({
        scriptPath: konPath,
        args: safeArgs,
        wait: true,
      });
      log(`run:   ${runOutcome.runId}`);
      log(`state: ${runOutcome.state}`);
      if (runOutcome.state === 'done') {
        log(typeof runOutcome.result === 'string'
          ? runOutcome.result
          : JSON.stringify(runOutcome.result, null, 2));
        return 0;
      }
      if (runOutcome.error) log(`error: ${runOutcome.error}`);
      return 1;
    }
    default:
      log(USAGE);
      return command == null ? 0 : 1;
  }
}

async function askConfirm(prompt: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() !== 'n');
    });
  });
}
