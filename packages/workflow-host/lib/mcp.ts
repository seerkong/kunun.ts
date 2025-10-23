import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { WorkflowBackend } from './backend';

export interface KwfToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export interface KwfToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodRawShape;
  handler: (input: any) => Promise<KwfToolResult>;
}

function jsonResult(value: any, isError?: boolean): KwfToolResult {
  const result: KwfToolResult = { content: [{ type: 'text', text: JSON.stringify(value ?? null, null, 2) }] };
  if (isError != null) {
    result.isError = isError;
  }
  return result;
}

function textResult(text: string): { content: Array<{ type: 'text'; text: string }> } {
  return { content: [{ type: 'text', text }] };
}

// One tool per backend operation: the MCP surface and the CLI subcommands are
// two thin views over the same WorkflowBackend.
export function createKwfTools(backend: WorkflowBackend): KwfToolDefinition[] {
  return [
    {
      name: 'kwf_run_workflow',
      title: 'Run kunun workflow',
      description: 'Run a kunun Kon-DSL workflow from inline source or a .kon file path. '
        + 'With wait=true the call blocks until the run completes and returns its result; '
        + 'otherwise a detached worker continues in the background.',
      inputSchema: {
        source: z.string().optional().describe('Inline Kon DSL workflow source'),
        script_path: z.string().optional().describe('Path to a .kon workflow file'),
        workflow_name: z.string().optional(),
        args: z.record(z.any()).optional().describe('Input data exposed to the workflow as `args`'),
        wait: z.boolean().optional().default(false),
      },
      handler: async (input) => jsonResult(await backend.runWorkflow({
        source: input.source,
        scriptPath: input.script_path,
        workflowName: input.workflow_name,
        args: input.args,
        wait: input.wait === true,
      })),
    },
    {
      name: 'kwf_validate_workflow',
      title: 'Validate kunun workflow',
      description: 'Parse a kunun Kon-DSL workflow and execute it to the first yield boundary or '
        + 'completion WITHOUT dispatching any agent. Accepts inline source or a .kon file path. '
        + 'Returns ok, status, diagnostics, and a summary of the first yield (effect + per-job info). '
        + 'Prompts are truncated unless show_prompts is true.',
      inputSchema: {
        source: z.string().optional().describe('Inline Kon DSL workflow source'),
        script_path: z.string().optional().describe('Path to a .kon workflow file'),
        args: z.record(z.any()).optional().describe('Input data exposed to the workflow as `args`'),
        show_prompts: z.boolean().optional().default(false).describe('Include full prompt text in job summaries'),
      },
      handler: async (input) => {
        const result = backend.validateWorkflow({
          source: input.source,
          scriptPath: input.script_path,
          args: input.args,
          showPrompts: input.show_prompts === true,
        });
        return jsonResult(result, !result.ok);
      },
    },
    {
      name: 'kwf_dry_run_workflow',
      title: 'Dry-run kunun workflow',
      description: 'Simulate a kunun Kon-DSL workflow through repeated yield/resume cycles WITHOUT '
        + 'dispatching any agent: each yield is summarized and fed schema-shaped mock results so the '
        + 'workflow can progress. Accepts inline source or a .kon file path, an optional max_yields '
        + 'limit, and show_prompts. Returns ok, status, all yield summaries, and the final result.',
      inputSchema: {
        source: z.string().optional().describe('Inline Kon DSL workflow source'),
        script_path: z.string().optional().describe('Path to a .kon workflow file'),
        args: z.record(z.any()).optional().describe('Input data exposed to the workflow as `args`'),
        max_yields: z.number().optional().describe('Stop after this many yields (default 64)'),
        show_prompts: z.boolean().optional().default(false).describe('Include full prompt text in job summaries'),
      },
      handler: async (input) => {
        const result = backend.dryRunWorkflow({
          source: input.source,
          scriptPath: input.script_path,
          args: input.args,
          maxYields: input.max_yields,
          showPrompts: input.show_prompts === true,
        });
        return jsonResult(result, !result.ok);
      },
    },
    {
      name: 'kwf_run_status',
      title: 'Get run status',
      description: 'Read the status of a workflow run.',
      inputSchema: { run_id: z.string() },
      handler: async (input) => jsonResult(backend.getStatus(input.run_id)),
    },
    {
      name: 'kwf_run_events',
      title: 'Get run events',
      description: 'Read the event log (JSONL) of a workflow run.',
      inputSchema: { run_id: z.string() },
      handler: async (input) => jsonResult(backend.getEvents(input.run_id)),
    },
    {
      name: 'kwf_run_result',
      title: 'Get run result',
      description: 'Read the final result of a completed workflow run.',
      inputSchema: { run_id: z.string() },
      handler: async (input) => jsonResult(backend.getResult(input.run_id)),
    },
    {
      name: 'kwf_pause_run',
      title: 'Pause run',
      description: 'Request a pause at the next yield boundary (checkpoint stays on disk).',
      inputSchema: { run_id: z.string() },
      handler: async (input) => {
        backend.requestPause(input.run_id);
        return jsonResult({ runId: input.run_id, requested: 'pause' });
      },
    },
    {
      name: 'kwf_resume_run',
      title: 'Resume run',
      description: 'Resume a paused, stopped, or crashed run from its checkpoint. '
        + 'With wait=true the call blocks until the run finishes.',
      inputSchema: { run_id: z.string(), wait: z.boolean().optional().default(false) },
      handler: async (input) => jsonResult(await backend.resumeRun(input.run_id, input.wait === true)),
    },
    {
      name: 'kwf_stop_run',
      title: 'Stop run',
      description: 'Request a stop at the next yield boundary.',
      inputSchema: { run_id: z.string() },
      handler: async (input) => {
        backend.requestStop(input.run_id);
        return jsonResult({ runId: input.run_id, requested: 'stop' });
      },
    },
    {
      name: 'kwf_list_runs',
      title: 'List runs',
      description: 'List known workflow run ids.',
      inputSchema: {},
      handler: async () => jsonResult(backend.listRuns()),
    },
    {
      name: 'kwf_list_examples',
      title: 'List bundled examples',
      description: 'List the bundled example workflow names.',
      inputSchema: {},
      handler: async () => jsonResult(backend.listExamples()),
    },
    {
      name: 'kwf_get_example',
      title: 'Get bundled example',
      description: 'Read the Kon DSL source of a bundled example workflow.',
      inputSchema: { name: z.string() },
      handler: async (input) => textResult(await backend.getExample(input.name)),
    },
    {
      name: 'kwf_get_skill',
      title: 'Get workflow authoring skill',
      description: 'Read the workflow-authoring skill document (Kon DSL reference and CLI usage).',
      inputSchema: {},
      handler: async () => textResult(await backend.getSkill()),
    },
    {
      name: 'kwf_list_docs',
      title: 'List language manual chapters',
      description: 'List the relative chapter paths of the embedded kunun language manual.',
      inputSchema: {},
      handler: async () => jsonResult(backend.listDocs()),
    },
    {
      name: 'kwf_get_doc',
      title: 'Get language manual chapter',
      description: 'Read a single chapter of the embedded kunun language manual by its relative path '
        + '(e.g. "reference/03-kon-data-format.md").',
      inputSchema: { path: z.string().describe('Relative chapter path from kwf_list_docs') },
      handler: async (input) => {
        try {
          return textResult(await backend.getDoc(input.path));
        } catch (err) {
          return jsonResult({ error: err instanceof Error ? err.message : String(err) }, true);
        }
      },
    },
    {
      name: 'kwf_search_docs',
      title: 'Search the language manual',
      description: 'Substring-search the embedded kunun language manual, returning per-line hits '
        + '(chapter path, 1-based line number, and the matching line as context).',
      inputSchema: { keyword: z.string().describe('Substring to search for across all chapters') },
      handler: async (input) => jsonResult(await backend.searchDocs(input.keyword)),
    },
  ];
}

export function createKwfMcpServer(backend: WorkflowBackend): McpServer {
  const server = new McpServer({ name: 'kwf', version: '1.0.0' });
  for (const tool of createKwfTools(backend)) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema as any,
      },
      async (input: any) => tool.handler(input),
    );
  }
  return server;
}

export async function startStdioMcpServer(backend: WorkflowBackend): Promise<void> {
  const server = createKwfMcpServer(backend);
  const transport = new StdioServerTransport();
  // stdio carries JSON-RPC only; diagnostics must go to stderr.
  process.stderr.write('kwf MCP stdio server starting\n');
  await server.connect(transport);
  await new Promise<void>(() => undefined);
}
