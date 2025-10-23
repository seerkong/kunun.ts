import {
  DispatchContext,
  InstructionHandler,
} from 'depa-actor';

import { Env, EnvSnapshot } from 'kunun-core/StateManagement/Env';
import { EnvTree } from 'kunun-core/StateManagement/EnvTree';
import { FlowVarEnvType } from 'kunun-core/StateManagement/FlowVarEnvType';
import { RuntimeFiber, RuntimeFiberSnapshot, RuntimeFiberStatus } from './RuntimeFiber';
import { RuntimeInstruction, RuntimeInstructionExecLog } from './Instruction';
import { RuntimeClassDefinition, RuntimeObject } from './RuntimeObject';

export type RuntimeHandlerResult = void | {
  stop?: boolean;
  stopReason?: string;
};

export type RuntimeInstructionHandler = InstructionHandler<
  RuntimeState,
  RuntimeInstruction,
  any,
  any
>;

export type RuntimeNodeExpander = (runtime: RuntimeState, nodeToRun: any) => void;
export type RuntimeKeywordExpander = (runtime: RuntimeState, nodeToRun: any) => void;
export type RuntimeHostFunction = (...args: any[]) => any;
export type RuntimePrototypeResolver = (name: string) => any;
export type RuntimeLambdaBodyItem = any | ((runtime: RuntimeState) => any);

export interface RuntimeLambdaFunction {
  kind: 'RuntimeLambdaFunction';
  name?: string;
  params: string[];
  body: RuntimeLambdaBodyItem[];
  closureValues: { [key: string]: any };
  definitionEnvId: number;
}

export class RuntimeReturnSignal {
  public constructor(public readonly value: any) {
  }
}

export class RuntimeBreakSignal {
}

export class RuntimeContinueSignal {
}

export class RuntimeContinuationResumeSignal {
  public constructor(
    public readonly value: any,
    public readonly restoreEnvId: number,
  ) {
  }
}

export interface RuntimeContinuation {
  currentEnvId: number;
  operandItems: any[];
  operandFrameBottoms: number[];
  instructionItems: RuntimeInstruction[];
  instructionFrameBottoms: number[];
  activeEffectHandlerMaps: RuntimeEffectHandlerMap[];
}

export interface RuntimeResumeFiberToken {
  fiberId: number;
  result?: any[];
  beforeResumeOps?: RuntimeInstruction[];
}

export interface RuntimeEnvTreeSnapshot {
  entryEnvId: number;
  envs: EnvSnapshot[];
}

export type RuntimeControlFrame = {
  kind: string;
  frameId?: string;
  envId?: number;
  [key: string]: any;
};

export interface RuntimeAbruptCompletion {
  kind: 'return' | 'throw' | 'break' | 'continue' | string;
  targetFrameId?: string;
  value?: any;
}

export interface RuntimePendingWorkflowJob {
  id: string;
  extensionName: string;
  sourceNodeId: string;
  path: string;
  status: 'pending' | 'completed' | 'failed' | string;
  args?: any[];
  metadata?: { [key: string]: any };
  result?: any;
  error?: any;
}

export interface RuntimeSnapshot {
  version: 1;
  currentFiberId: number;
  envTree: RuntimeEnvTreeSnapshot;
  fibers: RuntimeFiberSnapshot[];
  activeEffectHandlerMaps: RuntimeEffectHandlerMap[];
  namedEffectHandlers: { [handlerName: string]: string[] };
  resumeFiberTokens: RuntimeResumeFiberToken[];
  controlFrames: RuntimeControlFrame[];
  pendingAbruptCompletion: RuntimeAbruptCompletion;
  pendingWorkflowJobs: RuntimePendingWorkflowJob[];
}

export type RuntimeWorkflowExtensionFixity = 'prefix' | 'infix' | 'function';

export interface RuntimeWorkflowExtensionOptions {
  fixity?: RuntimeWorkflowExtensionFixity;
  arity?: number;
  // Explicit, domain-neutral job expansion for the default lowering:
  // 'single' (default) emits one job carrying all args; 'perArg' emits one
  // job per arg with item:<i> paths; buildJobs takes full control.
  jobExpansion?: 'single' | 'perArg';
  buildJobs?: (
    args: any[],
    sourceNodeId: string,
    extensionName: string,
  ) => RuntimePendingWorkflowJob[];
}

export interface RuntimeWorkflowExtensionArgs {
  runtime: RuntimeState;
  name: string;
  fixity: RuntimeWorkflowExtensionFixity;
  args: any[];
  sourceNodeId: string;
  sourceNode?: any;
  checkpoint: RuntimeSnapshot;
}

export type RuntimeWorkflowExtension = (args: RuntimeWorkflowExtensionArgs) => any;

export interface RuntimeWorkflowEffect {
  kind: 'RuntimeWorkflowEffect';
  name: string;
  fixity: RuntimeWorkflowExtensionFixity;
  args: any[];
  sourceNodeId: string;
  pendingJobs: RuntimePendingWorkflowJob[];
  checkpoint: RuntimeSnapshot;
}

export type RuntimeEffectHandler = (payload: any, runtime: RuntimeState) => any;
export type RuntimeEffectHandlerMap = { [effectName: string]: any };
export type RuntimeBuiltinMethod = (target: any, args: any[], runtime: RuntimeState) => any;
export interface RuntimeIoHost {
  write?: (text: string) => void;
  writeLine?: (text: string) => void;
  readLine?: () => string;
}

export interface RuntimeTimerHost {
  setTimeout?: (handler: () => void, timeout: number) => any;
  clearTimeout?: (handle: any) => void;
  setInterval?: (handler: () => void, interval: number) => any;
  clearInterval?: (handle: any) => void;
}

export class RuntimeState {
  public envTree = new EnvTree();
  public fibers: RuntimeFiber[] = [];
  public instructionHistory: RuntimeInstructionExecLog[] = [];
  public typedRuntimeContext?: any;
  public prototypeResolver?: RuntimePrototypeResolver;

  private instructionHandlers: { [opcode: string]: RuntimeInstructionHandler } = {};
  private nodeExpanders: { [nodeType: string]: RuntimeNodeExpander } = {};
  private prefixKeywordExpanders: { [keyword: string]: RuntimeKeywordExpander } = {};
  private infixKeywordExpanders: { [keyword: string]: RuntimeKeywordExpander } = {};
  private hostFunctions: { [name: string]: RuntimeHostFunction } = {};
  private hostFunctionArities: { [name: string]: number } = {};
  private hostFunctionVariadic: { [name: string]: boolean } = {};
  private effectHandlers: Array<{ name: string; handler: RuntimeEffectHandler }> = [];
  private activeEffectHandlerMaps: RuntimeEffectHandlerMap[] = [];
  private namedEffectHandlers: { [handlerName: string]: string[] } = {};
  private workflowExtensions: {
    [name: string]: {
      lower: RuntimeWorkflowExtension;
      options: RuntimeWorkflowExtensionOptions;
    };
  } = {};
  private builtinMethods: { [typeName: string]: { [methodName: string]: RuntimeBuiltinMethod } } = {};
  private ioHost: RuntimeIoHost = {};
  private timerHost: RuntimeTimerHost = {
    setTimeout: (handler, timeout) => setTimeout(handler, timeout),
    clearTimeout: (handle) => clearTimeout(handle),
    setInterval: (handler, interval) => setInterval(handler, interval),
    clearInterval: (handle) => clearInterval(handle),
  };
  private resumeFiberTokens: RuntimeResumeFiberToken[] = [];
  private classDefinitions: { [name: string]: RuntimeClassDefinition } = {};
  private controlFrames: RuntimeControlFrame[] = [];
  private pendingAbruptCompletion: RuntimeAbruptCompletion = null;
  private pendingWorkflowJobs: RuntimePendingWorkflowJob[] = [];

  public constructor() {
    const buildInEnv = Env.CreateBuildInEnv();
    this.envTree.AddVertex(buildInEnv);
    this.envTree.SetEntryVertexId(buildInEnv.Id);

    const globalEnv = Env.CreateGlobalEnv(buildInEnv);
    this.envTree.AddVertex(globalEnv);
    this.envTree.AddEdge(buildInEnv.GetVertexId(), globalEnv.GetVertexId());

    this.registerDefaultBuiltinMethods();
    this.createRootFiber();
  }

  public get currentEnvId(): number {
    return this.getCurrentFiber().currentEnvId;
  }

  public createRootFiber(): RuntimeFiber {
    const fiber = RuntimeFiber.CreateRootFiber(this.getGlobalEnv().Id);
    this.fibers = [fiber];
    return fiber;
  }

  public createFiber(
    parentFiber: RuntimeFiber = this.getCurrentFiber(),
    status: RuntimeFiberStatus = RuntimeFiberStatus.Runnable,
  ): RuntimeFiber {
    const fiber = new RuntimeFiber();
    fiber.parentFiberId = parentFiber.id;
    fiber.currentEnvId = parentFiber.currentEnvId;
    fiber.status = status;
    this.fibers.push(fiber);
    return fiber;
  }

  public getFiberById(fiberId: number): RuntimeFiber {
    return this.fibers.find((fiber) => fiber.id === fiberId) ?? null;
  }

  public getCurrentFiber(): RuntimeFiber {
    const running = this.fibers.find((fiber) => fiber.status === RuntimeFiberStatus.Running);
    if (running != null) {
      return running;
    }
    const runnable = this.fibers.find((fiber) => fiber.status === RuntimeFiberStatus.Runnable);
    if (runnable != null) {
      runnable.status = RuntimeFiberStatus.Running;
      return runnable;
    }
    return this.fibers[0];
  }

  public switchToFiber(fiberId: number, oldFiberStatus: RuntimeFiberStatus = RuntimeFiberStatus.Runnable): RuntimeFiber {
    const current = this.getCurrentFiber();
    const next = this.getFiberById(fiberId);
    if (next == null) {
      throw new Error(`Fiber not found: ${fiberId}`);
    }
    if (current != null && current.id !== next.id) {
      current.status = oldFiberStatus;
    }
    next.status = RuntimeFiberStatus.Running;
    return next;
  }

  public awakenFibers(fiberIds: number[]): void {
    for (const fiberId of fiberIds) {
      const fiber = this.getFiberById(fiberId);
      if (fiber != null && fiber.status !== RuntimeFiberStatus.Dead) {
        fiber.status = RuntimeFiberStatus.Runnable;
      }
    }
  }

  public yieldToParentAndChangeCurrentFiberState(status: RuntimeFiberStatus): RuntimeFiber {
    const current = this.getCurrentFiber();
    if (current.parentFiberId == null || current.parentFiberId === 0) {
      current.status = status;
      return current;
    }
    return this.switchToFiber(current.parentFiberId, status);
  }

  public yieldToFiberAndChangeCurrentFiberState(fiberId: number, status: RuntimeFiberStatus): RuntimeFiber {
    const current = this.getCurrentFiber();
    const values = current.operandStack.popFrameAllValues();
    const next = this.switchToFiber(fiberId, status);
    for (const value of values) {
      next.operandStack.push(value);
    }
    return next;
  }

  public finalizeCurrentFiber(): RuntimeResumeFiberToken {
    const fiber = this.getCurrentFiber();
    fiber.status = RuntimeFiberStatus.Dead;
    return { fiberId: fiber.id };
  }

  public getRunnableFiberWithWork(): RuntimeFiber {
    return this.fibers.find((fiber) =>
      (fiber.status === RuntimeFiberStatus.Running || fiber.status === RuntimeFiberStatus.Runnable)
      && fiber.instructionStack.peek() != null
    ) ?? null;
  }

  public hasLiveFiberWork(): boolean {
    return this.fibers.some((fiber) =>
      fiber.status !== RuntimeFiberStatus.Dead
      && fiber.instructionStack.peek() != null
    );
  }

  public switchToNextRunnableFiberWithWork(): RuntimeFiber {
    const next = this.getRunnableFiberWithWork();
    if (next == null) {
      return null;
    }
    for (const fiber of this.fibers) {
      if (fiber.status === RuntimeFiberStatus.Running && fiber.id !== next.id) {
        fiber.status = RuntimeFiberStatus.Runnable;
      }
    }
    next.status = RuntimeFiberStatus.Running;
    return next;
  }

  public currentFiberToIdle(): RuntimeResumeFiberToken {
    const fiber = this.getCurrentFiber();
    fiber.status = RuntimeFiberStatus.Idle;
    return { fiberId: fiber.id };
  }

  public suspendCurrentFiber(): RuntimeResumeFiberToken {
    const fiber = this.getCurrentFiber();
    fiber.status = RuntimeFiberStatus.Suspended;
    return { fiberId: fiber.id };
  }

  public addResumeFiberToken(token: RuntimeResumeFiberToken): void {
    this.resumeFiberTokens.push(token);
  }

  public consumeResumeFiberToken(): RuntimeResumeFiberToken {
    const token = this.resumeFiberTokens.shift();
    if (token == null) {
      return null;
    }
    const fiber = this.getFiberById(token.fiberId);
    if (fiber == null) {
      throw new Error(`Resume fiber not found: ${token.fiberId}`);
    }
    for (let i = (token.beforeResumeOps?.length ?? 0) - 1; i >= 0; i--) {
      fiber.instructionStack.push(token.beforeResumeOps[i]);
    }
    for (const value of token.result ?? []) {
      fiber.operandStack.push(value);
    }
    fiber.status = RuntimeFiberStatus.Runnable;
    return token;
  }

  public getResumeFiberTokenCount(): number {
    return this.resumeFiberTokens.length;
  }

  public consumeAllResumeFiberTokens(): RuntimeResumeFiberToken[] {
    const tokens: RuntimeResumeFiberToken[] = [];
    while (this.getResumeFiberTokenCount() > 0) {
      tokens.push(this.consumeResumeFiberToken());
    }
    return tokens;
  }

  public pushControlFrame(frame: RuntimeControlFrame): void {
    this.controlFrames.push({ ...frame });
  }

  public popControlFrame(): RuntimeControlFrame {
    return this.controlFrames.pop() ?? null;
  }

  public popControlFramesUntil(kind: string): RuntimeControlFrame[] {
    const popped: RuntimeControlFrame[] = [];
    while (this.controlFrames.length > 0) {
      const frame = this.popControlFrame();
      popped.push(frame);
      if (frame.kind === kind) {
        return popped;
      }
    }
    return popped;
  }

  public getControlFrames(): RuntimeControlFrame[] {
    return this.controlFrames.map((frame) => ({ ...frame }));
  }

  public restoreActiveEffectHandlerMaps(maps: RuntimeEffectHandlerMap[]): void {
    this.activeEffectHandlerMaps = (maps ?? []).map((map) => ({ ...map }));
  }

  public setPendingAbruptCompletion(completion: RuntimeAbruptCompletion): void {
    this.pendingAbruptCompletion = completion == null ? null : { ...completion };
  }

  public getPendingAbruptCompletion(): RuntimeAbruptCompletion {
    return this.pendingAbruptCompletion == null ? null : { ...this.pendingAbruptCompletion };
  }

  public setPendingWorkflowJobs(jobs: RuntimePendingWorkflowJob[]): void {
    this.pendingWorkflowJobs = this.clonePendingWorkflowJobs(jobs);
  }

  public getPendingWorkflowJobs(): RuntimePendingWorkflowJob[] {
    return this.clonePendingWorkflowJobs(this.pendingWorkflowJobs);
  }

  public clearPendingWorkflowJobs(): void {
    this.pendingWorkflowJobs = [];
  }

  public getRootEnv(): Env {
    return this.envTree.GetEntryVertex();
  }

  public getGlobalEnv(): Env {
    const rootEnv = this.getRootEnv();
    const envSetUnderRoot = this.envTree.GetNextVertexDetails(rootEnv.GetVertexId());
    for (const item of envSetUnderRoot) {
      if (item.EnvType === FlowVarEnvType.Global) {
        return item;
      }
    }
    return rootEnv;
  }

  public getCurrentEnv(): Env {
    return this.envTree.GetVertexDetail(this.currentEnvId);
  }

  public changeEnvById(envId: number): void {
    const env = this.envTree.GetVertexDetail(envId);
    if (env == null) {
      throw new Error(`Env not found: ${envId}`);
    }
    this.getCurrentFiber().currentEnvId = envId;
  }

  public diveProcessEnv(name = 'process'): Env {
    const env = Env.CreateProcessEnv(this.getCurrentEnv());
    this.envTree.AddVertex(env);
    this.envTree.AddEdge(this.getCurrentEnv().GetVertexId(), env.GetVertexId());
    this.changeEnvById(env.Id);
    return env;
  }

  public diveLocalEnv(name = 'local'): Env {
    const env = Env.CreateLocalEnv(this.getCurrentEnv());
    this.envTree.AddVertex(env);
    this.envTree.AddEdge(this.getCurrentEnv().GetVertexId(), env.GetVertexId());
    this.changeEnvById(env.Id);
    return env;
  }

  public makeSubLocalEnvUnderEnv(parentEnvId: number, name = 'local'): Env {
    const parent = this.envTree.GetVertexDetail(parentEnvId);
    if (parent == null) {
      throw new Error(`Parent env not found: ${parentEnvId}`);
    }
    const env = Env.CreateLocalEnv(parent);
    this.envTree.AddVertex(env);
    this.envTree.AddEdge(parent.GetVertexId(), env.GetVertexId());
    this.changeEnvById(env.Id);
    return env;
  }

  public riseEnv(): Env {
    const parent = this.envTree.GetParentEnv(this.currentEnvId);
    if (parent == null) {
      throw new Error('Cannot rise from root env');
    }
    this.changeEnvById(parent.Id);
    return parent;
  }

  public lookup(key: string): any {
    const declareEnv = this.envTree.LookupDeclareEnv(this.getCurrentEnv(), key);
    return declareEnv.Lookup(key);
  }

  // True iff `key` is actually declared in some env on the current chain.
  // LookupDeclareEnv falls back to the current env when nothing declares the
  // key, so ContainsVar there is false for a never-declared name. This is the
  // one predicate that distinguishes "unbound" from "bound to null/undefined"
  // — `lookup` returns undefined for both. Used by the D8 unbound-name check.
  public hasBinding(key: string): boolean {
    const declareEnv = this.envTree.LookupDeclareEnv(this.getCurrentEnv(), key);
    return declareEnv.ContainsVar(key);
  }

  public define(key: string, obj: any): void {
    this.getCurrentEnv().Define(key, obj);
  }

  public defineGlobal(key: string, obj: any): void {
    this.getGlobalEnv().Define(key, obj);
  }

  public setVar(key: string, obj: any): void {
    const declareEnv = this.envTree.LookupDeclareEnv(this.getCurrentEnv(), key);
    declareEnv.Define(key, obj);
  }

  public setGlobal(key: string, obj: any): void {
    this.getGlobalEnv().Define(key, obj);
  }

  public bindEnvByMap(values: { [key: string]: any } | Map<string, any>): void {
    if (values instanceof Map) {
      for (const [key, value] of values.entries()) {
        this.define(String(key), value);
      }
      return;
    }
    for (const [key, value] of Object.entries(values)) {
      this.define(key, value);
    }
  }

  public registerClassDefinition(classDef: RuntimeClassDefinition): void {
    this.classDefinitions[classDef.name] = classDef;
    this.define(classDef.name, classDef);
  }

  public getClassDefinition(name: string): RuntimeClassDefinition {
    return this.classDefinitions[name] ?? null;
  }

  public createLambda(params: string[], body: RuntimeLambdaBodyItem[], name?: string): RuntimeLambdaFunction {
    return {
      kind: 'RuntimeLambdaFunction',
      name,
      params,
      body,
      closureValues: this.snapshotVisibleEnvValues(),
      definitionEnvId: this.currentEnvId,
    };
  }

  public callRuntimeFunction(fn: RuntimeLambdaFunction | RuntimeHostFunction, args: any[]): any {
    if (typeof fn === 'function') {
      return fn(...args);
    }
    const previousFiber = this.getCurrentFiber();
    const previousEnvId = previousFiber.currentEnvId;
    const localEnv = Env.CreateLocalEnv(this.getCurrentEnv());
    this.envTree.AddVertex(localEnv);
    this.envTree.AddEdge(previousEnvId, localEnv.GetVertexId());
    previousFiber.currentEnvId = localEnv.Id;
    let restoreEnvId = previousEnvId;
    try {
      for (const [key, value] of Object.entries(fn.closureValues)) {
        localEnv.Define(key, value);
      }
      for (let i = 0; i < fn.params.length; i++) {
        localEnv.Define(fn.params[i], args[i]);
      }
      let result = null;
      for (const item of fn.body) {
        try {
          result = typeof item === 'function' ? item(this) : item;
        } catch (error) {
          if (error instanceof RuntimeReturnSignal) {
            return error.value;
          }
          if (error instanceof RuntimeContinuationResumeSignal) {
            restoreEnvId = error.restoreEnvId;
            return error.value;
          }
          throw error;
        }
      }
      return result;
    } finally {
      previousFiber.currentEnvId = restoreEnvId;
    }
  }

  public withEffectHandler(name: string, handler: RuntimeEffectHandler, body: () => any): any {
    this.effectHandlers.push({ name, handler });
    try {
      return body();
    } finally {
      this.effectHandlers.pop();
    }
  }

  public performEffect(name: string, payload: any): any {
    for (let i = this.effectHandlers.length - 1; i >= 0; i--) {
      const item = this.effectHandlers[i];
      if (item.name === name) {
        return item.handler(payload, this);
      }
    }
    return payload;
  }

  public pushActiveEffectHandlerMap(map: RuntimeEffectHandlerMap): void {
    this.activeEffectHandlerMaps.push({ ...map });
  }

  public popActiveEffectHandlerMap(): RuntimeEffectHandlerMap {
    return this.activeEffectHandlerMaps.pop() ?? null;
  }

  public withActiveEffectHandlerMap(map: RuntimeEffectHandlerMap, body: () => any): any {
    this.pushActiveEffectHandlerMap(map);
    try {
      return body();
    } finally {
      this.popActiveEffectHandlerMap();
    }
  }

  public getActiveEffectHandler(effectName: string): any {
    for (let i = this.activeEffectHandlerMaps.length - 1; i >= 0; i--) {
      const handler = this.activeEffectHandlerMaps[i][effectName];
      if (handler != null) {
        return handler;
      }
    }
    return null;
  }

  public getActiveEffectHandlerMap(): RuntimeEffectHandlerMap {
    return Object.assign({}, ...this.activeEffectHandlerMaps);
  }

  public registerNamedEffectHandler(handlerName: string, effectNames: string[]): void {
    this.namedEffectHandlers[handlerName] = [...effectNames];
  }

  public getNamedEffectHandlerEffects(handlerName: string): string[] {
    return [...(this.namedEffectHandlers[handlerName] ?? [])];
  }

  public captureContinuation(excludeTopN = 0): RuntimeContinuation {
    const fiber = this.getCurrentFiber();
    const operandSnapshot = fiber.operandStack.snapshot();
    const instructionSnapshot = fiber.instructionStack.snapshot();
    const instructionItems = instructionSnapshot.items.slice(
      0,
      Math.max(instructionSnapshot.items.length - excludeTopN, 0),
    );
    return {
      currentEnvId: fiber.currentEnvId,
      operandItems: [...operandSnapshot.items],
      operandFrameBottoms: [...operandSnapshot.frameBottoms],
      instructionItems,
      instructionFrameBottoms: instructionSnapshot.frameBottoms.filter((frameBottom) => frameBottom <= instructionItems.length),
      activeEffectHandlerMaps: this.activeEffectHandlerMaps.map((map) => ({ ...map })),
    };
  }

  public restoreContinuation(continuation: RuntimeContinuation, operands: any[] = []): void {
    const fiber = this.getCurrentFiber();
    this.changeEnvById(continuation.currentEnvId);
    fiber.operandStack.loadSnapshot({
      items: [...continuation.operandItems],
      frameBottoms: [...continuation.operandFrameBottoms],
    });
    fiber.instructionStack.loadSnapshot({
      items: [...continuation.instructionItems],
      frameBottoms: [...continuation.instructionFrameBottoms],
    });
    this.activeEffectHandlerMaps = continuation.activeEffectHandlerMaps.map((map) => ({ ...map }));
    for (const operand of operands) {
      fiber.operandStack.push(operand);
    }
  }

  public captureSnapshot(options: { strict?: boolean } = {}): RuntimeSnapshot {
    const snapshot = this.buildSnapshot();
    if (options.strict === true) {
      RuntimeState.assertSnapshotSerializable(snapshot);
    }
    return snapshot;
  }

  private static assertSnapshotSerializable(value: any, path = 'snapshot', seen = new Set<any>()): void {
    if (value == null) {
      return;
    }
    const valueType = typeof value;
    if (valueType === 'function') {
      throw new Error(`Snapshot value at ${path} is not JSON-serializable: function`);
    }
    if (valueType === 'bigint' || valueType === 'symbol') {
      throw new Error(`Snapshot value at ${path} is not JSON-serializable: ${valueType}`);
    }
    if (valueType !== 'object') {
      return;
    }
    if (seen.has(value)) {
      throw new Error(`Snapshot value at ${path} contains a circular reference`);
    }
    seen.add(value);
    try {
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          RuntimeState.assertSnapshotSerializable(value[i], `${path}[${i}]`, seen);
        }
        return;
      }
      for (const [key, child] of Object.entries(value)) {
        RuntimeState.assertSnapshotSerializable(child, `${path}.${key}`, seen);
      }
    } finally {
      seen.delete(value);
    }
  }

  private buildSnapshot(): RuntimeSnapshot {
    const currentFiber = this.getCurrentFiber();
    return {
      version: 1,
      currentFiberId: currentFiber.id,
      envTree: this.captureEnvTreeSnapshot(),
      fibers: this.fibers.map((fiber) => fiber.toSnapshot()),
      activeEffectHandlerMaps: this.activeEffectHandlerMaps.map((map) => ({ ...map })),
      namedEffectHandlers: this.captureNamedEffectHandlers(),
      resumeFiberTokens: this.resumeFiberTokens.map((token) => ({
        fiberId: token.fiberId,
        result: token.result == null ? undefined : [...token.result],
        beforeResumeOps: token.beforeResumeOps == null ? undefined : [...token.beforeResumeOps],
      })),
      controlFrames: this.getControlFrames(),
      pendingAbruptCompletion: this.getPendingAbruptCompletion(),
      pendingWorkflowJobs: this.getPendingWorkflowJobs(),
    };
  }

  public hydrateSnapshot(snapshot: RuntimeSnapshot): void {
    if (snapshot.version !== 1) {
      throw new Error(`Unsupported runtime snapshot version: ${snapshot.version}`);
    }
    this.envTree = this.hydrateEnvTreeSnapshot(snapshot.envTree);
    this.fibers = snapshot.fibers.map((fiberSnapshot) => RuntimeFiber.FromSnapshot(fiberSnapshot));
    if (this.getFiberById(snapshot.currentFiberId) == null) {
      throw new Error(`Snapshot current fiber not found: ${snapshot.currentFiberId}`);
    }
    for (const fiber of this.fibers) {
      if (fiber.status === RuntimeFiberStatus.Running && fiber.id !== snapshot.currentFiberId) {
        fiber.status = RuntimeFiberStatus.Runnable;
      }
    }
    this.getFiberById(snapshot.currentFiberId).status = RuntimeFiberStatus.Running;
    this.activeEffectHandlerMaps = snapshot.activeEffectHandlerMaps.map((map) => ({ ...map }));
    this.namedEffectHandlers = {};
    for (const [handlerName, effectNames] of Object.entries(snapshot.namedEffectHandlers ?? {})) {
      this.namedEffectHandlers[handlerName] = [...effectNames];
    }
    this.resumeFiberTokens = (snapshot.resumeFiberTokens ?? []).map((token) => ({
      fiberId: token.fiberId,
      result: token.result == null ? undefined : [...token.result],
      beforeResumeOps: token.beforeResumeOps == null ? undefined : [...token.beforeResumeOps],
    }));
    this.controlFrames = (snapshot.controlFrames ?? []).map((frame) => ({ ...frame }));
    this.pendingAbruptCompletion = snapshot.pendingAbruptCompletion == null
      ? null
      : { ...snapshot.pendingAbruptCompletion };
    this.pendingWorkflowJobs = this.clonePendingWorkflowJobs(snapshot.pendingWorkflowJobs ?? []);
  }

  public addOpDirectly(opcode: string, memo: any = null, comment?: string): void {
    this.getCurrentFiber().instructionStack.push({
      opcode,
      memo,
      comment,
    });
  }

  public addOpsInOrder(ops: RuntimeInstruction[]): void {
    const fiber = this.getCurrentFiber();
    for (let i = ops.length - 1; i >= 0; i--) {
      const op = ops[i];
      fiber.instructionStack.push({ ...op });
    }
  }

  public registerInstructionHandler(opcode: string, handler: RuntimeInstructionHandler): void {
    this.instructionHandlers[opcode] = handler;
  }

  public getInstructionHandler(opcode: string): RuntimeInstructionHandler {
    return this.instructionHandlers[opcode];
  }

  public registerNodeExpander(nodeType: string, expander: RuntimeNodeExpander): void {
    this.nodeExpanders[nodeType] = expander;
  }

  public getNodeExpander(nodeType: string): RuntimeNodeExpander {
    return this.nodeExpanders[nodeType];
  }

  public registerPrefixKeyword(keyword: string, expander: RuntimeKeywordExpander): void {
    this.prefixKeywordExpanders[keyword] = expander;
  }

  public registerInfixKeyword(keyword: string, expander: RuntimeKeywordExpander): void {
    this.infixKeywordExpanders[keyword] = expander;
  }

  public registerWorkflowExtension(
    name: string,
    lower: RuntimeWorkflowExtension = (args) => this.defaultWorkflowExtensionLowering(args),
    options: RuntimeWorkflowExtensionOptions = {},
  ): void {
    const fixity = options.fixity ?? 'prefix';
    this.workflowExtensions[name] = {
      lower,
      options: { ...options, fixity },
    };
    if (fixity === 'function') {
      this.registerHostFunction(
        name,
        (...args: any[]) => this.invokeWorkflowExtension(name, args, {
          fixity,
          sourceNodeId: `function:${name}`,
        }),
        options.arity ?? lower.length,
      );
    }
  }

  public hasWorkflowExtension(name: string, fixity?: RuntimeWorkflowExtensionFixity): boolean {
    const extension = this.workflowExtensions[name];
    if (extension == null) {
      return false;
    }
    return fixity == null || extension.options.fixity === fixity;
  }

  public invokeWorkflowExtension(
    name: string,
    args: any[],
    options: {
      fixity?: RuntimeWorkflowExtensionFixity;
      sourceNodeId?: string;
      sourceNode?: any;
    } = {},
  ): any {
    const extension = this.workflowExtensions[name];
    if (extension == null) {
      throw new Error(`Workflow extension not found: ${name}`);
    }
    const fixity = options.fixity ?? extension.options.fixity ?? 'prefix';
    return extension.lower({
      runtime: this,
      name,
      fixity,
      args,
      sourceNodeId: options.sourceNodeId ?? `${fixity}:${name}`,
      sourceNode: options.sourceNode,
      checkpoint: this.captureSnapshot(),
    });
  }

  public getPrefixKeywordExpander(keyword: string): RuntimeKeywordExpander {
    return this.prefixKeywordExpanders[keyword];
  }

  public getInfixKeywordExpander(keyword: string): RuntimeKeywordExpander {
    return this.infixKeywordExpanders[keyword];
  }

  public registerHostFunction(
    name: string,
    fn: RuntimeHostFunction,
    arity: number = fn.length,
    options: { variadic?: boolean } = {},
  ): void {
    this.hostFunctions[name] = fn;
    this.hostFunctionArities[name] = arity;
    this.hostFunctionVariadic[name] = options.variadic === true;
  }

  public getHostFunction(name: string): RuntimeHostFunction {
    return this.hostFunctions[name];
  }

  public hasHostFunction(name: string): boolean {
    return this.hostFunctions[name] != null;
  }

  public getHostFunctionArity(name: string): number {
    return this.hostFunctionArities[name] ?? this.getHostFunction(name)?.length ?? 0;
  }

  public isHostFunctionVariadic(name: string): boolean {
    return this.hostFunctionVariadic[name] === true;
  }

  public callHostFunction(name: string, args: any[]): any {
    const fn = this.getHostFunction(name);
    if (fn == null) {
      throw new Error(`Host function not found: ${name}`);
    }
    return fn(...args);
  }

  public callHostObjectMethod(target: any, methodName: string, args: any[] = []): any {
    if (target == null) {
      throw new Error(`Cannot call method ${methodName} on null target`);
    }
    const method = target[methodName];
    if (typeof method !== 'function') {
      throw new Error(`Host method not found: ${methodName}`);
    }
    return method.apply(target, args);
  }

  public applyHostObjectMethod(target: any, methodName: string, args: any[] = []): any {
    return this.callHostObjectMethod(target, methodName, args);
  }

  public setIoHost(ioHost: RuntimeIoHost): void {
    this.ioHost = ioHost;
  }

  public getIoHost(): RuntimeIoHost {
    return this.ioHost;
  }

  public setTimerHost(timerHost: RuntimeTimerHost): void {
    this.timerHost = { ...this.timerHost, ...timerHost };
  }

  public getTimerHost(): RuntimeTimerHost {
    return this.timerHost;
  }

  public getProperty(target: any, key: string): any {
    if (target == null) {
      return null;
    }
    if (target instanceof RuntimeObject) {
      return target.getProperty(key);
    }
    return target[key];
  }

  public setProperty(target: any, key: string, value: any): void {
    if (target == null) {
      throw new Error(`Cannot set property ${key} on null target`);
    }
    if (target instanceof RuntimeObject) {
      target.setProperty(key, value);
      return;
    }
    target[key] = value;
  }

  public callBoundMethod(target: RuntimeObject, methodName: string, args: any[]): any {
    const method = target.getMethod(methodName);
    if (method == null) {
      throw new Error(`Method not found: ${methodName}`);
    }
    return this.callRuntimeFunction(method, [target, ...args]);
  }

  public registerBuiltinMethod(typeName: string, methodName: string, method: RuntimeBuiltinMethod): void {
    this.builtinMethods[typeName] ??= {};
    this.builtinMethods[typeName][methodName] = method;
  }

  public callBuiltinMethod(target: any, methodName: string, args: any[]): any {
    const typeName = this.getBuiltinTypeName(target);
    const method = this.builtinMethods[typeName]?.[methodName];
    if (method == null) {
      throw new Error(`Builtin method not found: ${typeName}.${methodName}`);
    }
    return method(target, args, this);
  }

  public getSubscript(target: any, key: any): any {
    if (target == null) {
      return null;
    }
    return target[key];
  }

  public setSubscript(target: any, key: any, value: any): void {
    if (target == null) {
      throw new Error(`Cannot set subscript ${key} on null target`);
    }
    target[key] = value;
  }

  public setTypedRuntimeContext(context: any): void {
    this.typedRuntimeContext = context;
  }

  public setPrototypeResolver(resolver: RuntimePrototypeResolver): void {
    this.prototypeResolver = resolver;
  }

  public resolvePrototype(name: string): any {
    if (this.prototypeResolver == null) {
      return null;
    }
    return this.prototypeResolver(name);
  }

  public resolveHandler(opcode: string): RuntimeInstructionHandler {
    return this.getInstructionHandler(opcode);
  }

  public makeDispatchContext(): DispatchContext<RuntimeState, RuntimeInstruction, any> {
    const fiber = this.getCurrentFiber();
    return {
      runtime: this,
      instructionStack: fiber.instructionStack,
      operandStack: fiber.operandStack,
    };
  }

  private snapshotVisibleEnvValues(): { [key: string]: any } {
    const values: { [key: string]: any } = {};
    const visibleEnvs = this.envTree.GetAllVertexDetailsFromEntryToVertex(this.currentEnvId, true);
    for (const env of visibleEnvs) {
      for (const [key, value] of env.Variables.entries()) {
        values[String(key)] = value;
      }
    }
    return values;
  }

  private captureEnvTreeSnapshot(): RuntimeEnvTreeSnapshot {
    const envs: EnvSnapshot[] = [];
    for (const env of this.envTree.GetVertexesIncludeUnreachable()) {
      envs.push(env.ToSnapshot(this.envTree.GetParentEnv(env.Id)?.Id ?? 0));
    }
    envs.sort((left, right) => left.id - right.id);
    return {
      entryEnvId: this.envTree.GetEntryVertexId(),
      envs,
    };
  }

  private hydrateEnvTreeSnapshot(snapshot: RuntimeEnvTreeSnapshot): EnvTree {
    const envTree = new EnvTree();
    const envById = new Map<number, Env>();
    for (const envSnapshot of snapshot.envs ?? []) {
      const env = Env.CreateFromSnapshot(envSnapshot);
      envById.set(env.Id, env);
      envTree.AddVertex(env);
    }
    for (const envSnapshot of snapshot.envs ?? []) {
      const env = envById.get(envSnapshot.id);
      const parent = envSnapshot.parentEnvId === 0 ? null : envById.get(envSnapshot.parentEnvId);
      env.ParentEnv = parent;
      if (parent != null) {
        envTree.AddEdge(parent.Id, env.Id);
      }
    }
    envTree.SetEntryVertexId(snapshot.entryEnvId);
    return envTree;
  }

  private captureNamedEffectHandlers(): { [handlerName: string]: string[] } {
    const result: { [handlerName: string]: string[] } = {};
    for (const [handlerName, effectNames] of Object.entries(this.namedEffectHandlers)) {
      result[handlerName] = [...effectNames];
    }
    return result;
  }

  private defaultWorkflowExtensionLowering(args: RuntimeWorkflowExtensionArgs): RuntimeWorkflowEffect {
    const pendingJobs = this.buildPendingWorkflowJobs(args.name, args.sourceNodeId, args.args);
    this.setPendingWorkflowJobs(pendingJobs);
    const checkpoint = this.captureSnapshot();
    return {
      kind: 'RuntimeWorkflowEffect',
      name: args.name,
      fixity: args.fixity,
      args: [...args.args],
      sourceNodeId: args.sourceNodeId,
      pendingJobs,
      checkpoint,
    };
  }

  private buildPendingWorkflowJobs(
    extensionName: string,
    sourceNodeId: string,
    args: any[],
  ): RuntimePendingWorkflowJob[] {
    const options = this.workflowExtensions[extensionName]?.options ?? {};
    if (options.buildJobs != null) {
      return this.clonePendingWorkflowJobs(options.buildJobs(args, sourceNodeId, extensionName));
    }
    if (options.jobExpansion === 'perArg') {
      return args.map((arg, index) => this.createPendingWorkflowJob(
        extensionName,
        sourceNodeId,
        `${sourceNodeId}/item:${index}`,
        [arg],
        { itemIndex: index },
      ));
    }
    return [
      this.createPendingWorkflowJob(
        extensionName,
        sourceNodeId,
        `${sourceNodeId}/job:0`,
        args,
        { itemIndex: 0 },
      ),
    ];
  }

  private createPendingWorkflowJob(
    extensionName: string,
    sourceNodeId: string,
    path: string,
    args: any[],
    metadata: { [key: string]: any },
  ): RuntimePendingWorkflowJob {
    return {
      id: `${extensionName}:${path}`,
      extensionName,
      sourceNodeId,
      path,
      status: 'pending',
      args: [...args],
      metadata: { ...metadata },
    };
  }

  private clonePendingWorkflowJobs(jobs: RuntimePendingWorkflowJob[]): RuntimePendingWorkflowJob[] {
    return (jobs ?? []).map((job) => ({
      ...job,
      args: job.args == null ? undefined : [...job.args],
      metadata: job.metadata == null ? undefined : { ...job.metadata },
    }));
  }

  private getBuiltinTypeName(target: any): string {
    if (Array.isArray(target)) {
      return 'Array';
    }
    if (target instanceof Map) {
      return 'Map';
    }
    if (target != null && typeof target === 'object') {
      return 'Map';
    }
    return typeof target;
  }

  private registerDefaultBuiltinMethods(): void {
    this.registerBuiltinMethod('Array', 'Count', (target) => target.length);
    this.registerBuiltinMethod('Array', 'Length', (target) => target.length);
    this.registerBuiltinMethod('Array', 'Get', (target, args) => target[args[0]]);
    this.registerBuiltinMethod('Array', 'Push', (target, args) => target.push(args[0]));
    this.registerBuiltinMethod('Array', 'Pop', (target) => target.pop());
    this.registerBuiltinMethod('Array', 'Unshift', (target, args) => target.unshift(args[0]));
    this.registerBuiltinMethod('Array', 'Shift', (target) => target.shift());
    this.registerBuiltinMethod('Array', 'Top', (target) => target[target.length - 1] ?? null);
    this.registerBuiltinMethod('Array', 'IsEmpty', (target) => target.length === 0);

    this.registerBuiltinMethod('Map', 'Count', (target) => this.getMapKeys(target).length);
    this.registerBuiltinMethod('Map', 'Get', (target, args) => this.getMapValue(target, args[0]));
    this.registerBuiltinMethod('Map', 'ContainsKey', (target, args) => this.hasMapKey(target, args[0]));
    this.registerBuiltinMethod('Map', 'Keys', (target) => this.getMapKeys(target));
    this.registerBuiltinMethod('Map', 'Values', (target) => this.getMapValues(target));
    this.registerBuiltinMethod('Map', 'IsEmpty', (target) => this.getMapKeys(target).length === 0);
    this.registerBuiltinMethod('Map', 'Remove', (target, args) => this.removeMapKey(target, args[0]));
    this.registerBuiltinMethod('Map', 'Clear', (target) => this.clearMap(target));
  }

  private getMapKeys(target: any): string[] {
    return target instanceof Map ? Array.from(target.keys()).map(String) : Object.keys(target);
  }

  private getMapValues(target: any): any[] {
    return target instanceof Map ? Array.from(target.values()) : Object.values(target);
  }

  private getMapValue(target: any, key: any): any {
    return target instanceof Map ? target.get(key) : target[key];
  }

  private hasMapKey(target: any, key: any): boolean {
    return target instanceof Map ? target.has(key) : Object.prototype.hasOwnProperty.call(target, key);
  }

  private removeMapKey(target: any, key: any): boolean {
    if (target instanceof Map) {
      return target.delete(key);
    }
    const exists = this.hasMapKey(target, key);
    delete target[key];
    return exists;
  }

  private clearMap(target: any): number {
    if (target instanceof Map) {
      target.clear();
      return 0;
    }
    for (const key of Object.keys(target)) {
      delete target[key];
    }
    return 0;
  }
}
