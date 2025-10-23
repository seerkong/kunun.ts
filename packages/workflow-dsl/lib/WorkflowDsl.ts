import { KnKnot, KnNodeType, KnWord } from 'kunun-core';
import { KnNodeHelper } from 'kunun-core/Util/KnNodeHelper';
import {
  RuntimeInterpreter,
  RuntimeOpCode,
  RuntimePendingWorkflowJob,
  RuntimeSnapshot,
  RuntimeState,
  RuntimeWorkflowEffect,
} from 'kunun-runtime';

export interface WorkflowDslEvent {
  type: 'workflow' | 'phase' | 'log' | 'parallel' | 'pipeline' | 'dispatch';
  workflow?: string;
  phase?: string;
  name?: string;
  message?: string;
  inputLength?: number;
}

export interface WorkflowAgentRequest {
  name: string;
  label?: any;
  sysPrompt?: any;
  userPrompt?: any;
  outputSchema?: any;
  retry?: any;
  timeout?: any;
  // per-call host overrides consumed by the workflow-host bridge
  adapter?: any;
  model?: any;
  // binding context attached by ai_parallel / ai_pipeline lowering
  item?: any;
  itemIndex?: number;
  stageName?: string;
  stageIndex?: number;
}

export interface WorkflowJobResult {
  status: 'completed' | 'failed';
  value?: any;
  error?: any;
}

export type WorkflowRunOutcome =
  | { status: 'yielded'; effect: RuntimeWorkflowEffect }
  | { status: 'completed'; result: any };

const PIPELINE_STAGE_OPCODE = 'WorkflowDsl_PipelineStage';
const WORKFLOW_OUTPUT_OPCODE = 'WorkflowDsl_Output';

const dslEvents = new WeakMap<RuntimeState, WorkflowDslEvent[]>();
const captureModes = new WeakMap<RuntimeState, { active: boolean }>();

export function GetWorkflowDslEvents(runtime: RuntimeState): WorkflowDslEvent[] {
  return dslEvents.get(runtime) ?? [];
}

export function ClearWorkflowDslEvents(runtime: RuntimeState): void {
  dslEvents.set(runtime, []);
}

function recordEvent(runtime: RuntimeState, event: WorkflowDslEvent): void {
  const events = dslEvents.get(runtime);
  if (events == null) {
    dslEvents.set(runtime, [event]);
    return;
  }
  events.push(event);
}

function wordName(node: any): string {
  if (node instanceof KnWord) {
    return node.Value;
  }
  return node?.Value ?? String(node);
}

function bindingName(node: any, fallback: string): string {
  if (node == null) {
    return fallback;
  }
  if (KnNodeHelper.GetType(node) === KnNodeType.Word) {
    return wordName(node);
  }
  if (typeof node === 'string') {
    return node;
  }
  throw new Error(`Unsupported workflow binding name: ${String(node)}`);
}

function evaluateValue(runtime: RuntimeState, value: any): any {
  const nodeType = KnNodeHelper.GetType(value);
  if (nodeType !== KnNodeType.UnorderedMap && nodeType !== undefined && nodeType !== null) {
    return RuntimeInterpreter.EvaluateNode(runtime, value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => evaluateValue(runtime, item));
  }
  if (value != null && typeof value === 'object') {
    const result: { [key: string]: any } = {};
    for (const [key, child] of Object.entries(value)) {
      if (key === '_Type') {
        continue;
      }
      result[key] = evaluateValue(runtime, child);
    }
    return result;
  }
  return value;
}

function withLocalBindings(runtime: RuntimeState, bindings: { [key: string]: any }, run: () => any): any {
  runtime.diveLocalEnv('workflow-binding');
  try {
    for (const [key, value] of Object.entries(bindings)) {
      runtime.define(key, value);
    }
    return run();
  } finally {
    runtime.riseEnv();
  }
}

function isCapturing(runtime: RuntimeState): boolean {
  return captureModes.get(runtime)?.active === true;
}

// Dispatch sequence stored in the global env so it persists through
// checkpoints: the same DSL node executed again (e.g. inside a loop) gets a
// new sourceNodeId, keeping job ids unique across yields while staying
// deterministic when the same checkpoint is hydrated again.
const DISPATCH_SEQ_KEY = '__workflowDispatchSeq';

function nextDispatchSeq(runtime: RuntimeState): number {
  let current = 0;
  try {
    const value = runtime.lookup(DISPATCH_SEQ_KEY);
    if (typeof value === 'number') {
      current = value;
    }
  } catch (_error) {
    // not defined yet
  }
  const next = current + 1;
  runtime.defineGlobal(DISPATCH_SEQ_KEY, next);
  return next;
}

function withRequestCapture<T>(runtime: RuntimeState, run: () => T): T {
  const mode = captureModes.get(runtime) ?? { active: false };
  if (mode.active) {
    throw new Error('Nested ai_parallel/ai_pipeline request capture is not supported');
  }
  captureModes.set(runtime, { active: true });
  try {
    return run();
  } finally {
    captureModes.set(runtime, { active: false });
  }
}

function buildAgentRequest(runtime: RuntimeState, knot: KnKnot): WorkflowAgentRequest {
  const conf: any = knot.Conf ?? {};
  const request: WorkflowAgentRequest = {
    name: wordName(knot.Name),
  };
  if (conf.label != null) {
    request.label = evaluateValue(runtime, conf.label);
  }
  if (conf.sys_prompt != null) {
    request.sysPrompt = evaluateValue(runtime, conf.sys_prompt);
  }
  if (conf.user_prompt != null) {
    request.userPrompt = evaluateValue(runtime, conf.user_prompt);
  }
  if (conf.output_schema != null) {
    request.outputSchema = evaluateValue(runtime, conf.output_schema);
  }
  if (conf.retry != null) {
    request.retry = evaluateValue(runtime, conf.retry);
  }
  if (conf.timeout != null) {
    request.timeout = evaluateValue(runtime, conf.timeout);
  }
  if (conf.adapter != null) {
    request.adapter = evaluateValue(runtime, conf.adapter);
  }
  if (conf.model != null) {
    request.model = evaluateValue(runtime, conf.model);
  }
  return request;
}

const REQUEST_METADATA_KEYS: Array<keyof WorkflowAgentRequest> = [
  'label', 'retry', 'timeout', 'outputSchema', 'item', 'itemIndex', 'stageName', 'stageIndex',
];

function requestMetadata(request: WorkflowAgentRequest): { [key: string]: any } {
  const metadata: { [key: string]: any } = { itemIndex: 0 };
  for (const key of REQUEST_METADATA_KEYS) {
    if (request[key] !== undefined) {
      metadata[key] = request[key];
    }
  }
  return metadata;
}

function createDslJob(
  extensionName: string,
  sourceNodeId: string,
  path: string,
  request: WorkflowAgentRequest,
): RuntimePendingWorkflowJob {
  return {
    id: `${extensionName}:${path}`,
    extensionName,
    sourceNodeId,
    path,
    status: 'pending',
    args: [request],
    metadata: requestMetadata(request),
  };
}

function buildDslJobs(
  extensionName: string,
  sourceNodeId: string,
  requests: WorkflowAgentRequest[],
): RuntimePendingWorkflowJob[] {
  if (extensionName === 'ai_agent') {
    return [createDslJob(extensionName, sourceNodeId, `${sourceNodeId}/job:0`, requests[0])];
  }
  return requests.map((request, index) => createDslJob(
    extensionName,
    sourceNodeId,
    `${sourceNodeId}/item:${request.itemIndex ?? index}`,
    request,
  ));
}

function dslWorkflowLowering(runtime: RuntimeState) {
  return ({ name, fixity, args, sourceNodeId }: any): RuntimeWorkflowEffect => {
    const jobs = buildDslJobs(name, sourceNodeId, args);
    runtime.setPendingWorkflowJobs(jobs);
    const checkpoint = runtime.captureSnapshot();
    return {
      kind: 'RuntimeWorkflowEffect',
      name,
      fixity,
      args: [...args],
      sourceNodeId,
      pendingJobs: jobs,
      checkpoint,
    } as RuntimeWorkflowEffect;
  };
}

function captureStageRequests(
  runtime: RuntimeState,
  body: any[],
  bindings: { [key: string]: any },
): WorkflowAgentRequest {
  return withRequestCapture(runtime, () => withLocalBindings(
    runtime,
    bindings,
    () => RuntimeInterpreter.ExecBlockWithRuntimeSync(runtime, body ?? []),
  ));
}

interface PipelineStageMemo {
  name: string;
  stages: Array<{ stageName: string; body: any[] }>;
  items: any[];
  itemName: string;
  valueName: string;
  indexName: string;
  stageIndex: number;
}

export function EnableWorkflowDsl(runtime: RuntimeState): void {
  if (dslEvents.get(runtime) == null) {
    dslEvents.set(runtime, []);
  }

  for (const name of ['ai_agent', 'ai_parallel', 'ai_pipeline']) {
    runtime.registerWorkflowExtension(name, dslWorkflowLowering(runtime));
  }

  runtime.registerInstructionHandler(WORKFLOW_OUTPUT_OPCODE, ({ runtime: rt, instruction, operandStack }) => {
    operandStack.pop();
    const outputNodes: any[] = instruction.memo?.outputNodes ?? [];
    operandStack.push(outputNodes.map((node) => RuntimeInterpreter.EvaluateNode(rt, node)));
  });

  runtime.registerInstructionHandler(PIPELINE_STAGE_OPCODE, ({ runtime: rt, instruction, operandStack }) => {
    const memo: PipelineStageMemo = instruction.memo;
    let values: any[];
    if (memo.stageIndex === 0) {
      values = [...memo.items];
    } else {
      const injected = operandStack.pop();
      values = Array.isArray(injected) ? injected : [injected];
    }
    if (memo.stageIndex >= memo.stages.length || memo.items.length === 0) {
      operandStack.push(values);
      return;
    }
    const stage = memo.stages[memo.stageIndex];
    const requests = memo.items.map((item, index) => {
      const request = captureStageRequests(rt, stage.body, {
        [memo.itemName]: item,
        [memo.valueName]: values[index],
        [memo.indexName]: index,
      });
      return {
        ...request,
        item,
        itemIndex: index,
        stageName: stage.stageName,
        stageIndex: memo.stageIndex,
      };
    });
    const sourceNodeId = `prefix:ai_pipeline:${memo.name}@${nextDispatchSeq(rt)}/stage:${stage.stageName}`;
    rt.addOpsInOrder([
      {
        opcode: RuntimeOpCode.WorkflowDispatch,
        memo: { name: 'ai_pipeline', fixity: 'prefix', args: requests, sourceNodeId },
      },
      {
        opcode: PIPELINE_STAGE_OPCODE,
        memo: { ...memo, stageIndex: memo.stageIndex + 1 },
      },
    ]);
  });

  runtime.registerPrefixKeyword('ai_workflow', (rt, { knot }: { knot: KnKnot }) => {
    const workflow = wordName(knot.Name);
    const input = knot.NamedConf?.input == null ? {} : evaluateValue(rt, knot.NamedConf.input);
    for (const [key, value] of Object.entries(input)) {
      rt.define(key, value);
    }
    recordEvent(rt, { type: 'workflow', workflow });
    rt.addOpsInOrder([
      { opcode: RuntimeOpCode.RunBlock, memo: knot.Body ?? [] },
      { opcode: WORKFLOW_OUTPUT_OPCODE, memo: { outputNodes: knot.Sections?.output ?? [] } },
    ]);
  });

  runtime.registerPrefixKeyword('ai_phase', (rt, { knot }: { knot: KnKnot }) => {
    recordEvent(rt, { type: 'phase', phase: wordName(knot.Name) });
    rt.addOpDirectly(RuntimeOpCode.RunBlock, knot.Body ?? []);
  });

  runtime.registerPrefixKeyword('ai_log', (rt, { knot }: { knot: KnKnot }) => {
    const message = evaluateValue(rt, (knot.Conf as any)?.message);
    recordEvent(rt, { type: 'log', name: wordName(knot.Name), message: String(message) });
    rt.addOpDirectly(RuntimeOpCode.PushValue, message);
  });

  runtime.registerPrefixKeyword('ai_agent', (rt, { knot }: { knot: KnKnot }) => {
    const request = buildAgentRequest(rt, knot);
    if (isCapturing(rt)) {
      rt.addOpDirectly(RuntimeOpCode.PushValue, request);
      return;
    }
    recordEvent(rt, { type: 'dispatch', name: request.name });
    rt.addOpDirectly(RuntimeOpCode.WorkflowDispatch, {
      name: 'ai_agent',
      fixity: 'prefix',
      args: [request],
      sourceNodeId: `prefix:ai_agent:${request.name}@${nextDispatchSeq(rt)}`,
    });
  });

  runtime.registerPrefixKeyword('ai_parallel', (rt, { knot }: { knot: KnKnot }) => {
    const conf: any = knot.Conf ?? {};
    const name = wordName(knot.Name);
    const input = evaluateValue(rt, conf.input);
    const items = Array.isArray(input) ? input : [];
    const itemName = bindingName(conf.item, 'item');
    const indexName = bindingName(conf.index, 'index');
    recordEvent(rt, { type: 'parallel', name, inputLength: items.length });
    if (items.length === 0) {
      rt.addOpDirectly(RuntimeOpCode.PushValue, []);
      return;
    }
    const requests = items.map((item, index) => {
      const request = captureStageRequests(rt, knot.Body ?? [], {
        [itemName]: item,
        [indexName]: index,
      });
      return { ...request, item, itemIndex: index };
    });
    rt.addOpDirectly(RuntimeOpCode.WorkflowDispatch, {
      name: 'ai_parallel',
      fixity: 'prefix',
      args: requests,
      sourceNodeId: `prefix:ai_parallel:${name}@${nextDispatchSeq(rt)}`,
    });
  });

  runtime.registerPrefixKeyword('ai_pipeline', (rt, { knot }: { knot: KnKnot }) => {
    const conf: any = knot.Conf ?? {};
    const name = wordName(knot.Name);
    const input = evaluateValue(rt, conf.input);
    const items = Array.isArray(input) ? input : [];
    const stages = (knot.Body ?? []).map((stageNode: any) => ({
      stageName: wordName((stageNode as KnKnot).Name),
      body: (stageNode as KnKnot).Body ?? [],
    }));
    recordEvent(rt, { type: 'pipeline', name, inputLength: items.length });
    rt.addOpDirectly(PIPELINE_STAGE_OPCODE, {
      name,
      stages,
      items,
      itemName: bindingName(conf.item, 'item'),
      valueName: bindingName(conf.value, 'value'),
      indexName: bindingName(conf.index, 'index'),
      stageIndex: 0,
    } as PipelineStageMemo);
  });
}

function continueWorkflowSync(runtime: RuntimeState): WorkflowRunOutcome {
  const result = RuntimeInterpreter.DispatchUntilStop(runtime);
  if (result.stopReason === 'yield_requested') {
    return { status: 'yielded', effect: result.effects[0] };
  }
  const operandStack = runtime.getCurrentFiber().operandStack;
  const items = operandStack.snapshot().items;
  return { status: 'completed', result: items.length > 0 ? items[items.length - 1] : undefined };
}

export function RunWorkflowSync(runtime: RuntimeState, source: string): WorkflowRunOutcome {
  const nodesToRun = RuntimeInterpreter.ParseSourceBlock(source);
  runtime.addOpDirectly(RuntimeOpCode.RunBlock, nodesToRun);
  return continueWorkflowSync(runtime);
}

export function ResumeWorkflowSync(
  runtime: RuntimeState,
  checkpoint: RuntimeSnapshot,
  results: { [jobId: string]: WorkflowJobResult } = {},
): WorkflowRunOutcome {
  runtime.hydrateSnapshot(checkpoint);
  const jobs = runtime.getPendingWorkflowJobs();
  if (jobs.length > 0) {
    const values: any[] = [];
    let failure: { job: RuntimePendingWorkflowJob; error: any } | null = null;
    for (const job of jobs) {
      const jobResult = results[job.id];
      if (jobResult == null) {
        throw new Error(`Missing result for workflow job: ${job.id}`);
      }
      if (jobResult.status === 'failed') {
        failure = failure ?? { job, error: jobResult.error };
      } else {
        values.push(jobResult.value);
      }
    }
    runtime.setPendingWorkflowJobs([]);
    if (failure != null) {
      const exceptionFrame = [...runtime.getControlFrames()].reverse()
        .find((frame) => frame.kind === 'exception');
      const message = String(failure.error?.message ?? failure.error);
      if (exceptionFrame == null) {
        throw new Error(`Workflow job failed: ${failure.job.id}: ${message}`);
      }
      runtime.setPendingAbruptCompletion({
        kind: 'throw',
        targetFrameId: exceptionFrame.frameId,
        value: { message, jobId: failure.job.id },
      });
    } else {
      runtime.getCurrentFiber().operandStack.push(jobs.length === 1 ? values[0] : values);
    }
  }
  return continueWorkflowSync(runtime);
}
