import { KernelInstruction } from 'depa-actor';
export declare const RuntimeOpCode: {
    readonly LandSuccess: "Runtime_LandSuccess";
    readonly LandFail: "Runtime_LandFail";
    readonly RunNode: "Node_RunNode";
    readonly RunBlock: "Node_RunBlock";
    readonly MakeArray: "Node_MakeArray";
    readonly MakeMap: "Node_MakeMap";
    readonly ExpandChain: "Node_ExpandChain";
    readonly ChainStep: "Node_ChainStep";
    readonly RunLastVal: "Node_RunLastVal";
    readonly IterEvalChainNode: "Node_IterEvalChainNode";
    readonly ApplyToFrameTop: "Ctrl_ApplyToFrameTop";
    readonly ApplyToFrameBottom: "Ctrl_ApplyToFrameBottom";
    readonly ApplyCallable: "Ctrl_ApplyCallable";
    readonly CompleteFunctionCall: "Ctrl_CompleteFunctionCall";
    readonly ReturnFromFunction: "Ctrl_ReturnFromFunction";
    readonly MakeContExcludeTopNInstruction: "Ctrl_MakeContExcludeTopNInstruction";
    readonly CaptureContinuation: "Ctrl_CaptureContinuation";
    readonly InvokeWorkflowExtension: "Workflow_InvokeExtension";
    readonly Jump: "Ctrl_Jump";
    readonly JumpIfFalse: "Ctrl_JumpIfFalse";
    readonly IterConditionPairs: "Ctrl_IterConditionPairs";
    readonly SelectConditionBranch: "Ctrl_SelectConditionBranch";
    readonly IterForEachLoop: "Ctrl_IterForEachLoop";
    readonly IterForLoop: "Ctrl_IterForLoop";
    readonly IterForLoopAfterCondition: "Ctrl_IterForLoopAfterCondition";
    readonly ReturnOperands: "Ctrl_ReturnOperands";
    readonly RunGetProperty: "Node_RunGetProperty";
    readonly RunSetProperty: "Node_RunSetProperty";
    readonly RunGetSubscript: "Node_RunGetSubscript";
    readonly RunSetSubscript: "Node_RunSetSubscript";
    readonly CallInstance: "Ctrl_CallInstance";
    readonly ApplyLogicalOperator: "Ctrl_ApplyLogicalOperator";
    readonly BuildInterpolatedString: "String_BuildInterpolated";
    readonly PushValue: "ValStack_PushValue";
    readonly Duplicate: "ValStack_Duplicate";
    readonly SwapTop: "ValStack_SwapTop";
    readonly CollectTopN: "ValStack_CollectTopN";
    readonly WorkflowDispatch: "Workflow_Dispatch";
};
export type RuntimeOpCodeValue = typeof RuntimeOpCode[keyof typeof RuntimeOpCode] | string;
export interface RuntimeInstruction<TMemo = any> extends KernelInstruction<RuntimeOpCodeValue, TMemo> {
    envId?: number;
    comment?: string;
}
export interface RuntimeInstructionExecLog {
    fiberId: number;
    instruction: RuntimeInstruction;
}
