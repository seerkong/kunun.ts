import { RuntimeInterpreter, RuntimePendingWorkflowJob, RuntimeState, RuntimeWorkflowEffect } from 'kunun-runtime';
import {
  EnableWorkflowDsl,
  ResumeWorkflowSync,
  RunWorkflowSync,
  WorkflowJobResult,
  WorkflowRunOutcome,
} from 'kunun-workflow-dsl';

// Shared validate/dry-run business logic. Both capabilities re-use the
// workflow DSL execution engine but deliberately bypass the host bridge so no
// agent adapter subprocess is ever spawned: validate stops at the first yield
// or completion, dry-run injects schema-shaped mock results and resumes.

const PROMPT_PREVIEW_LIMIT = 160;
const DEFAULT_MAX_YIELDS = 64;

export interface WorkflowDiagnostic {
  severity: 'error';
  message: string;
}

export interface WorkflowJobSummary {
  id: string;
  name?: string;
  label?: string;
  adapter?: string;
  model?: string;
  retry?: number;
  timeout?: number;
  hasOutputSchema: boolean;
  promptPreview?: string;
  // Full prompt text, only populated when showPrompts is requested.
  prompt?: string;
}

export interface WorkflowYieldSummary {
  effect: string;
  fixity: string;
  sourceNodeId: string;
  jobCount: number;
  jobs: WorkflowJobSummary[];
}

export interface ValidateWorkflowResult {
  ok: boolean;
  status: 'yielded' | 'completed' | 'error';
  workflowName: string;
  diagnostics: WorkflowDiagnostic[];
  firstYield?: WorkflowYieldSummary;
  resultPreview?: any;
}

export interface DryRunWorkflowResult {
  ok: boolean;
  status: 'completed' | 'max-yields' | 'failed' | 'error';
  workflowName: string;
  diagnostics: WorkflowDiagnostic[];
  yields: WorkflowYieldSummary[];
  resultPreview?: any;
}

export interface ValidateWorkflowSourceInput {
  source: string;
  workflowName?: string;
  args?: any;
  showPrompts?: boolean;
}

export interface DryRunWorkflowSourceInput extends ValidateWorkflowSourceInput {
  maxYields?: number;
}

function createValidationRuntime(args: any): RuntimeState {
  const runtime = RuntimeInterpreter.CreateRuntime();
  EnableWorkflowDsl(runtime);
  runtime.defineGlobal('args', args ?? null);
  return runtime;
}

function diagnostic(error: any): WorkflowDiagnostic {
  return { severity: 'error', message: String(error?.message ?? error) };
}

function jobRequest(job: RuntimePendingWorkflowJob): any {
  return job.args?.[0] ?? {};
}

function jobPromptText(request: any): string {
  const sections: string[] = [];
  if (request?.sysPrompt != null) {
    sections.push(String(request.sysPrompt));
  }
  if (request?.userPrompt != null) {
    sections.push(String(request.userPrompt));
  }
  return sections.join('\n\n');
}

function jobLabel(job: RuntimePendingWorkflowJob): string {
  const request = jobRequest(job);
  return request.name ?? request.label ?? job.metadata?.label ?? job.id;
}

function summarizeJob(job: RuntimePendingWorkflowJob, showPrompts: boolean): WorkflowJobSummary {
  const request = jobRequest(job);
  const schema = job.metadata?.outputSchema ?? request.outputSchema ?? null;
  const prompt = jobPromptText(request);
  const summary: WorkflowJobSummary = {
    id: job.id,
    name: request.name,
    label: request.label ?? job.metadata?.label,
    adapter: request.adapter,
    model: request.model,
    retry: request.retry ?? job.metadata?.retry,
    timeout: request.timeout ?? job.metadata?.timeout,
    hasOutputSchema: schema != null,
  };
  if (prompt.length > 0) {
    summary.promptPreview = prompt.length > PROMPT_PREVIEW_LIMIT
      ? `${prompt.slice(0, PROMPT_PREVIEW_LIMIT)}…`
      : prompt;
    if (showPrompts) {
      summary.prompt = prompt;
    }
  }
  return summary;
}

function summarizeEffect(effect: RuntimeWorkflowEffect, showPrompts: boolean): WorkflowYieldSummary {
  const jobs = effect.pendingJobs ?? [];
  return {
    effect: effect.name,
    fixity: effect.fixity,
    sourceNodeId: effect.sourceNodeId,
    jobCount: jobs.length,
    jobs: jobs.map((job) => summarizeJob(job, showPrompts)),
  };
}

// Deterministic mock value shaped by an output_schema so downstream field
// reads (e.g. `(result.:field)`) can keep executing. Falls back to a labelled
// string when no schema or an unknown type is present.
export function mockValueFromSchema(schema: any, fallbackLabel: string): any {
  if (schema == null || typeof schema !== 'object') {
    return `dry-run:${fallbackLabel}`;
  }
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0];
  }
  switch (schema.type) {
    case 'object': {
      const value: { [key: string]: any } = {};
      for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
        value[key] = mockValueFromSchema(childSchema, `${fallbackLabel}.${key}`);
      }
      return value;
    }
    case 'array': {
      const count = Math.max(1, schema.minItems ?? 1);
      const items: any[] = [];
      for (let index = 0; index < count; index++) {
        items.push(mockValueFromSchema(schema.items, `${fallbackLabel}[${index}]`));
      }
      return items;
    }
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    case 'string':
      return `dry-run:${fallbackLabel}`;
    default:
      return `dry-run:${fallbackLabel}`;
  }
}

function mockJobResult(job: RuntimePendingWorkflowJob): WorkflowJobResult {
  const request = jobRequest(job);
  const schema = job.metadata?.outputSchema ?? request.outputSchema ?? null;
  return { status: 'completed', value: mockValueFromSchema(schema, jobLabel(job)) };
}

export function validateWorkflowSource(input: ValidateWorkflowSourceInput): ValidateWorkflowResult {
  const workflowName = input.workflowName ?? 'workflow';
  const showPrompts = input.showPrompts === true;
  const runtime = createValidationRuntime(input.args);

  let outcome: WorkflowRunOutcome;
  try {
    outcome = RunWorkflowSync(runtime, input.source);
  } catch (error: any) {
    return { ok: false, status: 'error', workflowName, diagnostics: [diagnostic(error)] };
  }

  if (outcome.status === 'yielded') {
    return {
      ok: true,
      status: 'yielded',
      workflowName,
      diagnostics: [],
      firstYield: summarizeEffect(outcome.effect, showPrompts),
    };
  }
  return {
    ok: true,
    status: 'completed',
    workflowName,
    diagnostics: [],
    resultPreview: outcome.result,
  };
}

export function dryRunWorkflowSource(input: DryRunWorkflowSourceInput): DryRunWorkflowResult {
  const workflowName = input.workflowName ?? 'workflow';
  const showPrompts = input.showPrompts === true;
  const maxYields = input.maxYields ?? DEFAULT_MAX_YIELDS;
  const runtime = createValidationRuntime(input.args);
  const yields: WorkflowYieldSummary[] = [];

  let outcome: WorkflowRunOutcome;
  try {
    outcome = RunWorkflowSync(runtime, input.source);
  } catch (error: any) {
    return { ok: false, status: 'error', workflowName, diagnostics: [diagnostic(error)], yields };
  }

  let yieldCount = 0;
  while (outcome.status === 'yielded') {
    yieldCount += 1;
    if (yieldCount > maxYields) {
      return {
        ok: false,
        status: 'max-yields',
        workflowName,
        diagnostics: [{ severity: 'error', message: `dry-run reached the max-yields limit (${maxYields})` }],
        yields,
      };
    }
    const effect = outcome.effect;
    yields.push(summarizeEffect(effect, showPrompts));

    const results: { [jobId: string]: WorkflowJobResult } = {};
    for (const job of effect.pendingJobs ?? []) {
      results[job.id] = mockJobResult(job);
    }
    try {
      outcome = ResumeWorkflowSync(runtime, effect.checkpoint, results);
    } catch (error: any) {
      return { ok: false, status: 'failed', workflowName, diagnostics: [diagnostic(error)], yields };
    }
  }

  return {
    ok: true,
    status: 'completed',
    workflowName,
    diagnostics: [],
    yields,
    resultPreview: outcome.result,
  };
}
