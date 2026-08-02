import { DispatchContext, InstructionHandler } from 'depa-actor';
import { Env, EnvSnapshot } from 'kunun-core/StateManagement/Env';
import { EnvTree } from 'kunun-core/StateManagement/EnvTree';
import { RuntimeFiber, RuntimeFiberSnapshot, RuntimeFiberStatus } from './RuntimeFiber';
import { RuntimeInstruction, RuntimeInstructionExecLog } from './Instruction';
import { RuntimeClassDefinition, RuntimeObject } from './RuntimeObject';
export type RuntimeHandlerResult = void | {
    stop?: boolean;
    stopReason?: string;
};
export type RuntimeInstructionHandler = InstructionHandler<RuntimeState, RuntimeInstruction, any, any>;
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
    closureValues: {
        [key: string]: any;
    };
    definitionEnvId: number;
}
export declare class RuntimeReturnSignal {
    readonly value: any;
    constructor(value: any);
}
export declare class RuntimeBreakSignal {
}
export declare class RuntimeContinueSignal {
}
export declare class RuntimeContinuationResumeSignal {
    readonly value: any;
    readonly restoreEnvId: number;
    constructor(value: any, restoreEnvId: number);
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
    metadata?: {
        [key: string]: any;
    };
    result?: any;
    error?: any;
}
export interface RuntimeSnapshot {
    version: 1;
    currentFiberId: number;
    envTree: RuntimeEnvTreeSnapshot;
    fibers: RuntimeFiberSnapshot[];
    activeEffectHandlerMaps: RuntimeEffectHandlerMap[];
    namedEffectHandlers: {
        [handlerName: string]: string[];
    };
    resumeFiberTokens: RuntimeResumeFiberToken[];
    controlFrames: RuntimeControlFrame[];
    pendingAbruptCompletion: RuntimeAbruptCompletion;
    pendingWorkflowJobs: RuntimePendingWorkflowJob[];
}
export type RuntimeWorkflowExtensionFixity = 'prefix' | 'infix' | 'function';
export interface RuntimeWorkflowExtensionOptions {
    fixity?: RuntimeWorkflowExtensionFixity;
    arity?: number;
    jobExpansion?: 'single' | 'perArg';
    buildJobs?: (args: any[], sourceNodeId: string, extensionName: string) => RuntimePendingWorkflowJob[];
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
export type RuntimeEffectHandlerMap = {
    [effectName: string]: any;
};
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
export declare class RuntimeState {
    envTree: EnvTree;
    fibers: RuntimeFiber[];
    instructionHistory: RuntimeInstructionExecLog[];
    typedRuntimeContext?: any;
    prototypeResolver?: RuntimePrototypeResolver;
    private instructionHandlers;
    private nodeExpanders;
    private prefixKeywordExpanders;
    private infixKeywordExpanders;
    private hostFunctions;
    private hostFunctionArities;
    private hostFunctionVariadic;
    private effectHandlers;
    private activeEffectHandlerMaps;
    private namedEffectHandlers;
    private workflowExtensions;
    private builtinMethods;
    private ioHost;
    private timerHost;
    private resumeFiberTokens;
    private classDefinitions;
    private controlFrames;
    private pendingAbruptCompletion;
    private pendingWorkflowJobs;
    constructor();
    get currentEnvId(): number;
    createRootFiber(): RuntimeFiber;
    createFiber(parentFiber?: RuntimeFiber, status?: RuntimeFiberStatus): RuntimeFiber;
    getFiberById(fiberId: number): RuntimeFiber;
    getCurrentFiber(): RuntimeFiber;
    switchToFiber(fiberId: number, oldFiberStatus?: RuntimeFiberStatus): RuntimeFiber;
    awakenFibers(fiberIds: number[]): void;
    yieldToParentAndChangeCurrentFiberState(status: RuntimeFiberStatus): RuntimeFiber;
    yieldToFiberAndChangeCurrentFiberState(fiberId: number, status: RuntimeFiberStatus): RuntimeFiber;
    finalizeCurrentFiber(): RuntimeResumeFiberToken;
    getRunnableFiberWithWork(): RuntimeFiber;
    hasLiveFiberWork(): boolean;
    switchToNextRunnableFiberWithWork(): RuntimeFiber;
    currentFiberToIdle(): RuntimeResumeFiberToken;
    suspendCurrentFiber(): RuntimeResumeFiberToken;
    addResumeFiberToken(token: RuntimeResumeFiberToken): void;
    consumeResumeFiberToken(): RuntimeResumeFiberToken;
    getResumeFiberTokenCount(): number;
    consumeAllResumeFiberTokens(): RuntimeResumeFiberToken[];
    pushControlFrame(frame: RuntimeControlFrame): void;
    popControlFrame(): RuntimeControlFrame;
    popControlFramesUntil(kind: string): RuntimeControlFrame[];
    getControlFrames(): RuntimeControlFrame[];
    restoreActiveEffectHandlerMaps(maps: RuntimeEffectHandlerMap[]): void;
    setPendingAbruptCompletion(completion: RuntimeAbruptCompletion): void;
    getPendingAbruptCompletion(): RuntimeAbruptCompletion;
    setPendingWorkflowJobs(jobs: RuntimePendingWorkflowJob[]): void;
    getPendingWorkflowJobs(): RuntimePendingWorkflowJob[];
    clearPendingWorkflowJobs(): void;
    getRootEnv(): Env;
    getGlobalEnv(): Env;
    getCurrentEnv(): Env;
    changeEnvById(envId: number): void;
    diveProcessEnv(name?: string): Env;
    diveLocalEnv(name?: string): Env;
    makeSubLocalEnvUnderEnv(parentEnvId: number, name?: string): Env;
    riseEnv(): Env;
    lookup(key: string): any;
    hasBinding(key: string): boolean;
    define(key: string, obj: any): void;
    defineGlobal(key: string, obj: any): void;
    setVar(key: string, obj: any): void;
    setGlobal(key: string, obj: any): void;
    bindEnvByMap(values: {
        [key: string]: any;
    } | Map<string, any>): void;
    registerClassDefinition(classDef: RuntimeClassDefinition): void;
    getClassDefinition(name: string): RuntimeClassDefinition;
    createLambda(params: string[], body: RuntimeLambdaBodyItem[], name?: string): RuntimeLambdaFunction;
    callRuntimeFunction(fn: RuntimeLambdaFunction | RuntimeHostFunction, args: any[]): any;
    withEffectHandler(name: string, handler: RuntimeEffectHandler, body: () => any): any;
    performEffect(name: string, payload: any): any;
    pushActiveEffectHandlerMap(map: RuntimeEffectHandlerMap): void;
    popActiveEffectHandlerMap(): RuntimeEffectHandlerMap;
    withActiveEffectHandlerMap(map: RuntimeEffectHandlerMap, body: () => any): any;
    getActiveEffectHandler(effectName: string): any;
    getActiveEffectHandlerMap(): RuntimeEffectHandlerMap;
    registerNamedEffectHandler(handlerName: string, effectNames: string[]): void;
    getNamedEffectHandlerEffects(handlerName: string): string[];
    captureContinuation(excludeTopN?: number): RuntimeContinuation;
    restoreContinuation(continuation: RuntimeContinuation, operands?: any[]): void;
    captureSnapshot(options?: {
        strict?: boolean;
    }): RuntimeSnapshot;
    private static assertSnapshotSerializable;
    private buildSnapshot;
    hydrateSnapshot(snapshot: RuntimeSnapshot): void;
    addOpDirectly(opcode: string, memo?: any, comment?: string): void;
    addOpsInOrder(ops: RuntimeInstruction[]): void;
    registerInstructionHandler(opcode: string, handler: RuntimeInstructionHandler): void;
    getInstructionHandler(opcode: string): RuntimeInstructionHandler;
    registerNodeExpander(nodeType: string, expander: RuntimeNodeExpander): void;
    getNodeExpander(nodeType: string): RuntimeNodeExpander;
    registerPrefixKeyword(keyword: string, expander: RuntimeKeywordExpander): void;
    registerInfixKeyword(keyword: string, expander: RuntimeKeywordExpander): void;
    registerWorkflowExtension(name: string, lower?: RuntimeWorkflowExtension, options?: RuntimeWorkflowExtensionOptions): void;
    hasWorkflowExtension(name: string, fixity?: RuntimeWorkflowExtensionFixity): boolean;
    invokeWorkflowExtension(name: string, args: any[], options?: {
        fixity?: RuntimeWorkflowExtensionFixity;
        sourceNodeId?: string;
        sourceNode?: any;
    }): any;
    getPrefixKeywordExpander(keyword: string): RuntimeKeywordExpander;
    getInfixKeywordExpander(keyword: string): RuntimeKeywordExpander;
    registerHostFunction(name: string, fn: RuntimeHostFunction, arity?: number, options?: {
        variadic?: boolean;
    }): void;
    getHostFunction(name: string): RuntimeHostFunction;
    hasHostFunction(name: string): boolean;
    getHostFunctionArity(name: string): number;
    isHostFunctionVariadic(name: string): boolean;
    callHostFunction(name: string, args: any[]): any;
    callHostObjectMethod(target: any, methodName: string, args?: any[]): any;
    applyHostObjectMethod(target: any, methodName: string, args?: any[]): any;
    setIoHost(ioHost: RuntimeIoHost): void;
    getIoHost(): RuntimeIoHost;
    setTimerHost(timerHost: RuntimeTimerHost): void;
    getTimerHost(): RuntimeTimerHost;
    getProperty(target: any, key: string): any;
    setProperty(target: any, key: string, value: any): void;
    callBoundMethod(target: RuntimeObject, methodName: string, args: any[]): any;
    registerBuiltinMethod(typeName: string, methodName: string, method: RuntimeBuiltinMethod): void;
    callBuiltinMethod(target: any, methodName: string, args: any[]): any;
    getSubscript(target: any, key: any): any;
    setSubscript(target: any, key: any, value: any): void;
    setTypedRuntimeContext(context: any): void;
    setPrototypeResolver(resolver: RuntimePrototypeResolver): void;
    resolvePrototype(name: string): any;
    resolveHandler(opcode: string): RuntimeInstructionHandler;
    makeDispatchContext(): DispatchContext<RuntimeState, RuntimeInstruction, any>;
    private snapshotVisibleEnvValues;
    private captureEnvTreeSnapshot;
    private hydrateEnvTreeSnapshot;
    private captureNamedEffectHandlers;
    private defaultWorkflowExtensionLowering;
    private buildPendingWorkflowJobs;
    private createPendingWorkflowJob;
    private clonePendingWorkflowJobs;
    private getBuiltinTypeName;
    private registerDefaultBuiltinMethods;
    private getMapKeys;
    private getMapValues;
    private getMapValue;
    private hasMapKey;
    private removeMapKey;
    private clearMap;
}
