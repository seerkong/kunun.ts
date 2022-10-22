import { BlockHandler } from './Handler/Node/BlockHandler';
import { FuncHandler } from './Handler/PrefixKeyword/FuncHandler';
import { KnState } from "./KnState";
import { ConditionHandler } from './Handler/PrefixKeyword/ConditionHandler';
import { DeclareVarHandler } from './Handler/PrefixKeyword/DeclareVarHandler';
import { SetEnvHandler } from './Handler/PrefixKeyword/SetEnvHandler';
import { IfElseHandler } from './Handler/PrefixKeyword/IfElseHandler';
import { ForeachHandler } from './Handler/PrefixKeyword/ForeachHandler';
import { KnOpCode } from './KnOpCode';
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

export class ExtensionRegistry {
  private static InstructionHandlerMap : {[ k : string] : (knState: KnState, opContState : Instruction) => void } = {
    [KnOpCode.ValStack_PushFrame] : ValueStackHandler.RunPushFrame,
    [KnOpCode.ValStack_PushValue] : ValueStackHandler.RunPushValue,
    [KnOpCode.ValStack_PopValue] : ValueStackHandler.RunPopValue,
    [KnOpCode.ValStack_Duplicate] : ValueStackHandler.RunDuplicate,
    [KnOpCode.ValStack_PopFrameAndPushTopVal] : ValueStackHandler.RunPopFrameAndPushTopVal,
    [KnOpCode.ValStack_PopFrameIgnoreResult] : ValueStackHandler.RunPopFrameIgnoreResult,
    
    [KnOpCode.Env_DiveProcessEnv] : EnvTreeHandler.RunDiveProcessEnv,
    [KnOpCode.Env_DiveLocalEnv] : EnvTreeHandler.RunDiveLocalEnv,
    [KnOpCode.Env_Rise] : EnvTreeHandler.RunRise,
    [KnOpCode.Env_ChangeEnvById] : EnvTreeHandler.RunChangeEnvById,
    [KnOpCode.Env_DeclareGlobalVar] : DeclareVarHandler.RunDeclareVar,
    [KnOpCode.Env_DeclareLocalVar] : DeclareVarHandler.RunDeclareVar,
    [KnOpCode.Env_SetLocalEnv] : SetEnvHandler.RunSetEnv,
    [KnOpCode.Env_SetGlobalEnv] : SetEnvHandler.RunSetEnv,
    [KnOpCode.Env_BindEnvByMap] : EnvTreeHandler.RunBindEnvByMap,
    
    [KnOpCode.Ctrl_ApplyToFrameTop] : FuncHandler.RunApplyToFrameTop,
    [KnOpCode.Ctrl_ApplyToFrameBottom] : FuncHandler.RunApplyToFrameBottom,
    [KnOpCode.Ctrl_Jump] : OpStackHandler.RunJump,
    [KnOpCode.Ctrl_JumpIfFalse] : OpStackHandler.RunJumpIfFalse,
    [KnOpCode.Ctrl_IterConditionPairs] : ConditionHandler.RunConditionPair,
    [KnOpCode.Ctrl_IterForEachLoop] : ForeachHandler.RunIterForeachLoop,
    [KnOpCode.Ctrl_IterForLoop] : ForLoopHandler.RunIterForLoop,
    [KnOpCode.Ctrl_MakeContExcludeTopNInstruction] : ContinuationHandler.RunMakeContExcludeTopNInstruction,
    
    [KnOpCode.Ctrl_CurrentFiberToIdle] : FiberScheduleHandler.RunCurrentFiberToIdle,
    [KnOpCode.Ctrl_CurrentFiberToSuspended] : FiberScheduleHandler.RunCurrentFiberToSuspended,
    [KnOpCode.Ctrl_AwakenMultiFibers] : FiberScheduleHandler.RunAwakenMultiFibers,
    [KnOpCode.YieldToParentAndChangeCurrentFiberState] : FiberScheduleHandler.RunYieldToParentAndChangeCurrentFiberState,
    [KnOpCode.YieldToFiberAndChangeCurrentFiberState] : FiberScheduleHandler.RunYieldToFiberAndChangeCurrentFiberState,
    [KnOpCode.Ctrl_FinalizeFiber] : FiberScheduleHandler.RunFinalizeFiber,

    [KnOpCode.Node_RunNode] : NodeHandler.RunNode,
    [KnOpCode.Node_RunLastVal] : NodeHandler.RunLastVal,
    [KnOpCode.Node_MakeVector] : ArrayHandler.RunMakeArray,
    [KnOpCode.Node_MakeMap] : MapHandler.RunMakeMap,
    [KnOpCode.Node_IterOpenKnotNode] : OpenKnotDataHandler.HandleIterOpenKnotNode,
    [KnOpCode.Node_MakeKnotNode] : OpenKnotDataHandler.HandleMakeKnotNode,
    [KnOpCode.Node_MakeKnotChain] : OpenKnotDataHandler.MakeKnotChain,
    [KnOpCode.Node_IterEvalKnotClause] : KnotExprHandler.HandleIterEvalKnotClause,
    [KnOpCode.Node_RunBlock] : BlockHandler.RunBlock,
    [KnOpCode.Node_RunGetProperty] : PropertyHandler.RunGetProperty,
    [KnOpCode.Node_RunSetProperty] : PropertyHandler.RunSetProperty,
    [KnOpCode.Node_RunGetSubscript] : SubscriptHandler.RunGetSubscript,
    [KnOpCode.Node_RunSetSubscript] : SubscriptHandler.RunSetSubscript,
    [KnOpCode.Node_MakeUnquote] : null,
  };

  private static PrefixKeyWordExpanderMap: { [key: string]: (knState: KnState, nodeToRun: any) => any } = {
    'do': function(knState: KnState, nodeToRun: KnKnot) : any {
      BlockHandler.ExpandBlock(knState, nodeToRun.Block)
    },
    'main': function(knState: KnState, nodeToRun: KnKnot) : any {
      BlockHandler.ExpandBlock(knState, nodeToRun.Block)
    },
    'func': function(knState: KnState, nodeToRun: any) : any {
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
    '++': SelfUpdate.SelfUpdate_PlusOne,
    '--': SelfUpdate.SelfUpdate_MinusOne,
    '+=': SelfUpdate.SelfUpdate_Add,
    '-=': SelfUpdate.SelfUpdate_Minus,
    '*=': SelfUpdate.SelfUpdate_Multiply,
    '/=': SelfUpdate.SelfUpdate_Divide
  }

  private static InfixKeyWordExpanderMap: { [key: string]: (knState: KnState, nodeToRun: any) => any } = {
    '=': ObjectAssignHandler.ExpandObjectAssign,
    'save_operands': SaveOperandValuesHandler.ExpandSaveStack,
  }

  public static GetInstructionHandler(name: string) : (knState: KnState, opContState : Instruction) => void {
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