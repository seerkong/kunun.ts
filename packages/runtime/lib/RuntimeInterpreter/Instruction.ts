import { KernelInstruction } from 'depa-actor';

export const RuntimeOpCode = {
  LandSuccess: 'Runtime_LandSuccess',
  LandFail: 'Runtime_LandFail',
  RunNode: 'Node_RunNode',
  RunBlock: 'Node_RunBlock',
  MakeArray: 'Node_MakeArray',
  MakeMap: 'Node_MakeMap',
  ExpandChain: 'Node_ExpandChain',
  ChainStep: 'Node_ChainStep',
  RunLastVal: 'Node_RunLastVal',
  IterEvalChainNode: 'Node_IterEvalChainNode',
  ApplyToFrameTop: 'Ctrl_ApplyToFrameTop',
  ApplyToFrameBottom: 'Ctrl_ApplyToFrameBottom',
  ApplyCallable: 'Ctrl_ApplyCallable',
  CompleteFunctionCall: 'Ctrl_CompleteFunctionCall',
  ReturnFromFunction: 'Ctrl_ReturnFromFunction',
  MakeContExcludeTopNInstruction: 'Ctrl_MakeContExcludeTopNInstruction',
  CaptureContinuation: 'Ctrl_CaptureContinuation',
  InvokeWorkflowExtension: 'Workflow_InvokeExtension',
  Jump: 'Ctrl_Jump',
  JumpIfFalse: 'Ctrl_JumpIfFalse',
  IterConditionPairs: 'Ctrl_IterConditionPairs',
  SelectConditionBranch: 'Ctrl_SelectConditionBranch',
  IterForEachLoop: 'Ctrl_IterForEachLoop',
  IterForLoop: 'Ctrl_IterForLoop',
  IterForLoopAfterCondition: 'Ctrl_IterForLoopAfterCondition',
  ReturnOperands: 'Ctrl_ReturnOperands',
  RunGetProperty: 'Node_RunGetProperty',
  RunSetProperty: 'Node_RunSetProperty',
  RunGetSubscript: 'Node_RunGetSubscript',
  RunSetSubscript: 'Node_RunSetSubscript',
  CallInstance: 'Ctrl_CallInstance',
  ApplyLogicalOperator: 'Ctrl_ApplyLogicalOperator',
  BuildInterpolatedString: 'String_BuildInterpolated',
  PushValue: 'ValStack_PushValue',
  Duplicate: 'ValStack_Duplicate',
  SwapTop: 'ValStack_SwapTop',
  CollectTopN: 'ValStack_CollectTopN',
  WorkflowDispatch: 'Workflow_Dispatch',
} as const;

export type RuntimeOpCodeValue = typeof RuntimeOpCode[keyof typeof RuntimeOpCode] | string;

export interface RuntimeInstruction<TMemo = any> extends KernelInstruction<RuntimeOpCodeValue, TMemo> {
  envId?: number;
  comment?: string;
}

export interface RuntimeInstructionExecLog {
  fiberId: number;
  instruction: RuntimeInstruction;
}
