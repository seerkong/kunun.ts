import { loadPromptAsset } from './assets';
import { AdapterConfig, HostConfig } from './config';
import { runAdapterCommand } from './runner';
import { parseJsonReply, validateAgainstSchema } from './schema';

export interface WorkflowJobLike {
  id: string;
  args?: any[];
  metadata?: { [key: string]: any };
}

export class SchemaValidationFailed extends Error {
  public constructor(jobId: string, errors: string[]) {
    super(`Job ${jobId} reply did not satisfy its output schema: ${errors.join('; ')}`);
  }
}

function resolveAdapter(config: HostConfig, name?: string): AdapterConfig {
  const adapterName = name ?? config.defaultAdapter;
  const adapter = config.adapters[adapterName];
  if (adapter == null) {
    throw new Error(`Agent adapter not configured: ${adapterName}`);
  }
  return adapter;
}

interface PromptTemplates {
  schemaInstruction: string;
  schemaCorrection: string;
}

async function loadPromptTemplates(): Promise<PromptTemplates> {
  const [schemaInstruction, schemaCorrection] = await Promise.all([
    loadPromptAsset('schema-instruction'),
    loadPromptAsset('schema-correction'),
  ]);
  return { schemaInstruction, schemaCorrection };
}

function buildPrompt(
  request: any,
  schema: any,
  correctionErrors: string[] | null,
  templates: PromptTemplates,
): string {
  const sections: string[] = [];
  if (request?.sysPrompt != null) {
    sections.push(String(request.sysPrompt));
  }
  if (request?.userPrompt != null) {
    sections.push(String(request.userPrompt));
  }
  if (schema != null) {
    sections.push(templates.schemaInstruction
      .replace('{schema}', JSON.stringify(schema, null, 2))
      .trimEnd());
  }
  if (correctionErrors != null) {
    sections.push(templates.schemaCorrection
      .replace('{errors}', correctionErrors.map((error) => `- ${error}`).join('\n'))
      .trimEnd());
  }
  return sections.join('\n\n');
}

// Executes one workflow job: adapter subprocess + optional schema-validated
// JSON reply with correction-feedback retries. Process-level retries honor
// the job's retry metadata from the DSL.
export async function runJob(
  job: WorkflowJobLike,
  config: HostConfig,
  onEvent: (event: { [key: string]: any }) => void = () => undefined,
): Promise<any> {
  const request = job.args?.[0] ?? {};
  const adapter = resolveAdapter(config, request.adapter);
  const schema = job.metadata?.outputSchema ?? request.outputSchema ?? null;
  const timeoutSeconds = Number(job.metadata?.timeout ?? adapter.timeout ?? config.timeout);
  const processRetries = Number(job.metadata?.retry ?? 0);
  const schemaAttempts = Math.max(1, config.schemaRetries + 1);

  // Call options without a native adapter mapping are recorded as events
  // instead of being silently dropped (spec: agent-adapter-layer).
  if (request.model != null && adapter.flags?.model == null) {
    onEvent({ type: 'option_unmapped', jobId: job.id, option: 'model', value: request.model });
  }

  const templates = await loadPromptTemplates();
  let correctionErrors: string[] | null = null;
  for (let schemaAttempt = 1; schemaAttempt <= schemaAttempts; schemaAttempt++) {
    const prompt = buildPrompt(request, schema, correctionErrors, templates);

    let reply: string | null = null;
    let lastFailure: Error | null = null;
    for (let attempt = 0; attempt <= processRetries; attempt++) {
      try {
        const run = await runAdapterCommand(adapter, prompt, {
          timeoutSeconds,
          model: request.model,
          sandbox: request.sandbox ?? config.sandbox,
          approval: request.approval ?? config.approval,
        });
        if (run.exitCode !== 0) {
          throw new Error(`Agent adapter exited with code ${run.exitCode}: ${run.stderr.trim().slice(0, 400)}`);
        }
        reply = run.stdout.trim();
        break;
      } catch (error: any) {
        lastFailure = error;
        if (attempt < processRetries) {
          onEvent({ type: 'agent_retry', jobId: job.id, attempt: attempt + 1, error: String(error?.message ?? error) });
        }
      }
    }
    if (reply == null) {
      throw lastFailure ?? new Error(`Agent adapter failed for job ${job.id}`);
    }

    if (schema == null) {
      return reply;
    }
    let parsed: any;
    try {
      parsed = parseJsonReply(reply);
    } catch (error: any) {
      correctionErrors = [String(error?.message ?? error)];
      onEvent({ type: 'schema_retry', jobId: job.id, attempt: schemaAttempt, errors: correctionErrors });
      continue;
    }
    const errors = validateAgainstSchema(parsed, schema);
    if (errors.length === 0) {
      return parsed;
    }
    correctionErrors = errors;
    onEvent({ type: 'schema_retry', jobId: job.id, attempt: schemaAttempt, errors });
  }
  throw new SchemaValidationFailed(job.id, correctionErrors ?? []);
}
