import { BlockHandler } from './Handler/Node/BlockHandler';
import { FuncHandler } from './Handler/PrefixKeyword/FuncHandler';
import XnlState from "./KnState";
import { ConditionHandler } from './Handler/PrefixKeyword/ConditionHandler';
import { DeclareVarHandler } from './Handler/PrefixKeyword/DeclareVarHandler';
import { SetEnvHandler } from './Handler/PrefixKeyword/SetEnvHandler';
import { IfElseHandler } from './Handler/PrefixKeyword/IfElseHandler';
import { ForeachHandler } from './Handler/PrefixKeyword/ForeachHandler';
import { XnlOpCode } from './KnOpCode';
import { Instruction } from './StateManagement/InstructionStack';
import { OpStackHandler } from './Handler/OpStackHandler';
import { SelfUpdate } from './Handler/PrefixKeyword/SelfUpdate';
import { TableHandler } from './Handler/PrefixKeyword/TableHandler';
import { ObjectAssignHandler } from './Handler/InfixKeyword/ObjectAssignHandler';
import { ForLoopHandler } from './Handler/PrefixKeyword/ForLoopHandler';
import { TryHandler } from './Handler/PrefixKeyword/TryHandler';
import { PerformHandler } from './Handler/PrefixKeyword/PerformHandler';
import { NodeHandler } from "./Handler/Node/NodeHandler";
import { ValueStackHandler } from "./Handler/ValueStackHandler";
import { ArrayHandler } from './Handler/Node/ArrayHandler';
import { HostFunctions } from './HostSupport/HostFunctions';
import { OpenKnotDataHandler } from './Handler/Node/OpenKnotDataHandler';
import { KnotExprHandler } from './Handler/Node/KnotExprHandler';
import { SubscriptHandler } from './Handler/Node/SubscriptHandler';
import { PropertyHandler } from './Handler/Node/PropertyHandler';
import { ContinuationHandler } from './Handler/ContinuationHandler';
import { MapHandler } from './Handler/Node/MapHandler';
import { EnvTreeHandler } from './Handler/EnvTreeHandler';
import { FiberScheduleHandler } from './Handler/FiberScheduleHandler';
import { WaitTimeoutHandler } from './Handler/PrefixKeyword/WaitTimeoutHandler';
import { SetIntervalHandler } from './Handler/PrefixKeyword/SetInterval';
import { SaveOperandValuesHandler } from './Handler/InfixKeyword/SaveOperandValuesHandler';
import { AwaitHostFuncHandler } from './Handler/PrefixKeyword/AwaitHostFuncHandler';
import { KnKnot } from './Model';
import { SetToHandler } from './Handler/InfixKeyword/SetToHandler';
import { DefineToHandler } from './Handler/InfixKeyword/DefineToHandler';
import { LogicalAndHandler } from './Handler/InfixKeyword/LogicalAndHandler';
import { LogicalOrHandler } from './Handler/InfixKeyword/LogicalOrHandler';
import { OptionalOrElseHandler } from './Handler/InfixKeyword/OptionalOrElseHandler';
import { JsCallHandler } from './Handler/PrefixKeyword/JsCallHandler';
import { JsApplyHandler } from './Handler/PrefixKeyword/JsApplyHandler';

export class ExtensionRegistry {
  private static InstructionHandlerMap : {[ k : string] : (knState: XnlState, opContState : Instruction) => void } = {
    [XnlOpCode.ValStack_PushFrame] : ValueStackHandler.RunPushFrame,
    [XnlOpCode.ValStack_PushValue] : ValueStackHandler.RunPushValue,
    [XnlOpCode.ValStack_PopValue] : ValueStackHandler.RunPopValue,
    [XnlOpCode.ValStack_Duplicate] : ValueStackHandler.RunDuplicate,
    [XnlOpCode.ValStack_PopFrameAndPushTopVal] : ValueStackHandler.RunPopFrameAndPushTopVal,
    [XnlOpCode.ValStack_PopFrameIgnoreResult] : ValueStackHandler.RunPopFrameIgnoreResult,
    [XnlOpCode.ValStack_IsTopValTrue] : ValueStackHandler.RunIsTopValTrue,
    
    [XnlOpCode.Env_DiveProcessEnv] : EnvTreeHandler.RunDiveProcessEnv,
    [XnlOpCode.Env_DiveLocalEnv] : EnvTreeHandler.RunDiveLocalEnv,
    [XnlOpCode.Env_Rise] : EnvTreeHandler.RunRise,
    [XnlOpCode.Env_ChangeEnvById] : EnvTreeHandler.RunChangeEnvById,
    [XnlOpCode.Env_DeclareGlobalVar] : DeclareVarHandler.RunDeclareVar,
    [XnlOpCode.Env_DeclareLocalVar] : DeclareVarHandler.RunDeclareVar,
    [XnlOpCode.Env_SetLocalEnv] : SetEnvHandler.RunSetEnv,
    [XnlOpCode.Env_SetGlobalEnv] : SetEnvHandler.RunSetEnv,
    [XnlOpCode.Env_BindEnvByMap] : EnvTreeHandler.RunBindEnvByMap,
    
    [XnlOpCode.Ctrl_ApplyToFrameTop] : FuncHandler.RunApplyToFrameTop,
    [XnlOpCode.Ctrl_ApplyToFrameBottom] : FuncHandler.RunApplyToFrameBottom,
    [XnlOpCode.Ctrl_Jump] : OpStackHandler.RunJump,
    [XnlOpCode.Ctrl_JumpIfFalse] : OpStackHandler.RunJumpIfFalse,
    [XnlOpCode.Ctrl_IterConditionPairs] : ConditionHandler.RunConditionPair,
    [XnlOpCode.Ctrl_IterForEachLoop] : ForeachHandler.RunIterForeachLoop,
    [XnlOpCode.Ctrl_IterForLoop] : ForLoopHandler.RunIterForLoop,
    [XnlOpCode.Ctrl_MakeContExcludeTopNInstruction] : ContinuationHandler.RunMakeContExcludeTopNInstruction,
    [XnlOpCode.Ctrl_JsCall] : JsCallHandler.RunJsCall,
    [XnlOpCode.Ctrl_JsApply] : JsApplyHandler.RunJsApply,

    [XnlOpCode.Ctrl_CurrentFiberToIdle] : FiberScheduleHandler.RunCurrentFiberToIdle,
    [XnlOpCode.Ctrl_CurrentFiberToSuspended] : FiberScheduleHandler.RunCurrentFiberToSuspended,
    [XnlOpCode.Ctrl_AwakenMultiFibers] : FiberScheduleHandler.RunAwakenMultiFibers,
    [XnlOpCode.YieldToParentAndChangeCurrentFiberState] : FiberScheduleHandler.RunYieldToParentAndChangeCurrentFiberState,
    [XnlOpCode.YieldToFiberAndChangeCurrentFiberState] : FiberScheduleHandler.RunYieldToFiberAndChangeCurrentFiberState,
    [XnlOpCode.Ctrl_FinalizeFiber] : FiberScheduleHandler.RunFinalizeFiber,

    [XnlOpCode.Node_RunNode] : NodeHandler.RunNode,
    [XnlOpCode.Node_RunLastVal] : NodeHandler.RunLastVal,
    [XnlOpCode.Node_MakeVector] : ArrayHandler.RunMakeArray,
    [XnlOpCode.Node_MakeMap] : MapHandler.RunMakeMap,
    [XnlOpCode.Node_IterOpenKnotNode] : OpenKnotDataHandler.HandleIterOpenKnotNode,
    [XnlOpCode.Node_MakeKnotNode] : OpenKnotDataHandler.HandleMakeKnotNode,
    [XnlOpCode.Node_MakeKnotChain] : OpenKnotDataHandler.MakeKnotChain,
    [XnlOpCode.Node_IterEvalKnotClause] : KnotExprHandler.HandleIterEvalKnotClause,
    [XnlOpCode.Node_RunBlock] : BlockHandler.RunBlock,
    [XnlOpCode.Node_RunGetProperty] : PropertyHandler.RunGetProperty,
    [XnlOpCode.Node_RunSetProperty] : PropertyHandler.RunSetProperty,
    [XnlOpCode.Node_RunGetSubscript] : SubscriptHandler.RunGetSubscript,
    [XnlOpCode.Node_RunSetSubscript] : SubscriptHandler.RunSetSubscript,
    [XnlOpCode.Node_RunMakeSubscript] : SubscriptHandler.RunMakeSubscript,
    [XnlOpCode.Node_MakeUnquote] : null,
  };

  private static PrefixKeyWordExpanderMap: { [key: string]: (knState: XnlState, nodeToRun: any) => any } = {
    'do': function(knState: XnlState, nodeToRun: KnKnot) : any {
      BlockHandler.ExpandBlock(knState, nodeToRun.Block)
    },
    'main': function(knState: XnlState, nodeToRun: KnKnot) : any {
      BlockHandler.ExpandBlock(knState, nodeToRun.Block)
    },
    'func': function(knState: XnlState, nodeToRun: any) : any {
      FuncHandler.ExpandDeclareFunc(knState, nodeToRun)
    },
    'cond': ConditionHandler.ExpandCondition,
    'if': IfElseHandler.ExpandIfElse,
    'var': DeclareVarHandler.ExpandDeclareVar,
    'set': SetEnvHandler.ExpandSetEnv,
    'try': TryHandler.ExpandTry,
    'perform': PerformHandler.ExpandPerform,
    'set_timeout': WaitTimeoutHandler.ExpandWaitTimeout,
    'set_interval': SetIntervalHandler.ExpandSetInterval,
    'await_host_fn': AwaitHostFuncHandler.ExpandAwaitHostFunc,
    'foreach': ForeachHandler.ExpandForeach,
    'for': ForLoopHandler.ExpandForLoop,
    'table': TableHandler.ExpandDeclareTable,
    'js_call': JsCallHandler.ExpandJsCall,
    'js_apply': JsApplyHandler.ExpandJsApply,
    '++': SelfUpdate.SelfUpdate_PlusOne,
    '--': SelfUpdate.SelfUpdate_MinusOne,
    '+=': SelfUpdate.SelfUpdate_Add,
    '-=': SelfUpdate.SelfUpdate_Minus,
    '*=': SelfUpdate.SelfUpdate_Multiply,
    '/=': SelfUpdate.SelfUpdate_Divide
  }

  private static InfixKeyWordExpanderMap: { [key: string]: (knState: XnlState, nodeToRun: any) => any } = {
    '=': ObjectAssignHandler.ExpandObjectAssign,
    'save_operands': SaveOperandValuesHandler.ExpandSaveStack,
    'def_to': DefineToHandler.ExpandDefineTo,
    'set_to': SetToHandler.ExpandSetTo,
    'and': LogicalAndHandler.ExpandAnd,
    'or': LogicalOrHandler.ExpandOr,
    'or_else': OptionalOrElseHandler.ExpandOrElse,
  }

  public static GetInstructionHandler(name: string) : (knState: XnlState, opContState : Instruction) => void {
    return ExtensionRegistry.InstructionHandlerMap[name];
  }

  public static IsPrefixKeyWord(name : string) {
    return ExtensionRegistry.PrefixKeyWordExpanderMap[name] != null
  }

  public static IsInfixKeyWord(name : string) {
    return ExtensionRegistry.InfixKeyWordExpanderMap[name] != null
  }

  public static GetPrefixKeywordExpander(name: string) {
    return ExtensionRegistry.PrefixKeyWordExpanderMap[name];
  }
  
  public static GetInfixKeywordExpander(name: string) {
    return ExtensionRegistry.InfixKeyWordExpanderMap[name];
  }
}