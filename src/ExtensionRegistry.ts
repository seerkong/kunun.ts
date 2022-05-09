import { BlockHandler } from './Handler/Node/BlockHandler';
import { FuncHandler } from './Handler/PrefixKeyword/FuncHandler';
import { StateMgr } from "./StateMgr";
import { ConditionHandler } from './Handler/PrefixKeyword/ConditionHandler';
import { DeclareVarHandler } from './Handler/PrefixKeyword/DeclareVarHandler';
import { SetEnvHandler } from './Handler/PrefixKeyword/SetEnvHandler';
import { IfElseHandler } from './Handler/PrefixKeyword/IfElseHandler';
import { ForeachHandler } from './Handler/PrefixKeyword/ForeachHandler';
import { OpCode } from './OpCode';
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

export class ExtensionRegistry {
  private static InstructionHandlerMap : {[ k : string] : (stateMgr: StateMgr, opContState : Instruction) => void } = {
    [OpCode.OpStack_Pop] : OpStackHandler.RunPop,
    [OpCode.OpStack_RemoveNextNext] : OpStackHandler.RunRemoveNextNext,
    [OpCode.ValStack_PushFrame] : ValueStackHandler.RunPushFrame,
    [OpCode.ValStack_PushValue] : ValueStackHandler.RunPushValue,
    [OpCode.ValStack_PopValue] : ValueStackHandler.RunPopValue,
    [OpCode.ValStack_Duplicate] : ValueStackHandler.RunDuplicate,
    [OpCode.ValStack_PopFrameAndPushTopVal] : ValueStackHandler.RunPopFrameAndPushTopVal,
    [OpCode.ValStack_PopFrameIgnoreResult] : ValueStackHandler.RunPopFrameIgnoreResult,
    
    [OpCode.Env_DiveProcessEnv] : EnvTreeHandler.RunDiveProcessEnv,
    [OpCode.Env_DiveLocalEnv] : EnvTreeHandler.RunDiveLocalEnv,
    [OpCode.Env_Rise] : EnvTreeHandler.RunRise,
    [OpCode.Env_ChangeEnvById] : EnvTreeHandler.RunChangeEnvById,
    [OpCode.Env_DeclareGlobalVar] : DeclareVarHandler.RunDeclareVar,
    [OpCode.Env_DeclareLocalVar] : DeclareVarHandler.RunDeclareVar,
    [OpCode.Env_SetLocalEnv] : SetEnvHandler.RunSetEnv,
    [OpCode.Env_SetGlobalEnv] : SetEnvHandler.RunSetEnv,
    [OpCode.Env_BindEnvByMap] : EnvTreeHandler.RunBindEnvByMap,
    
    [OpCode.Ctrl_ApplyToFrameTop] : FuncHandler.RunApplyToFrameTop,
    [OpCode.Ctrl_ApplyToFrameBottom] : FuncHandler.RunApplyToFrameBottom,
    [OpCode.Ctrl_ApplyMapVectorToBuilder] : null,
    [OpCode.Ctrl_Jump] : OpStackHandler.RunJump,
    [OpCode.Ctrl_JumpIfFalse] : OpStackHandler.RunJumpIfFalse,
    [OpCode.Ctrl_IterConditionPairs] : ConditionHandler.RunConditionPair,
    [OpCode.Ctrl_IterForEachLoop] : ForeachHandler.RunIterForeachLoop,
    [OpCode.Ctrl_IterForLoop] : ForLoopHandler.RunIterForLoop,
    [OpCode.Ctrl_MakeContExcludeTopNInstruction] : ContinuationHandler.RunMakeContExcludeTopNInstruction,
    
    [OpCode.Ctrl_CurrentFiberToIdle] : FiberScheduleHandler.RunCurrentFiberToIdle,
    [OpCode.Ctrl_CurrentFiberToSuspended] : FiberScheduleHandler.RunCurrentFiberToSuspended,
    [OpCode.Ctrl_AwakenMultiFibers] : FiberScheduleHandler.RunAwakenMultiFibers,
    [OpCode.YieldToParentAndChangeCurrentFiberState] : FiberScheduleHandler.RunYieldToParentAndChangeCurrentFiberState,
    [OpCode.YieldToFiberAndChangeCurrentFiberState] : FiberScheduleHandler.RunYieldToFiberAndChangeCurrentFiberState,
    [OpCode.Ctrl_FinalizeFiber] : FiberScheduleHandler.RunFinalizeFiber,

    [OpCode.Node_RunNode] : NodeHandler.RunNode,
    [OpCode.Node_RunLastVal] : NodeHandler.RunLastVal,
    [OpCode.Node_MakeVector] : ArrayHandler.RunMakeArray,
    [OpCode.Node_MakeMap] : MapHandler.RunMakeMap,
    [OpCode.Node_IterOpenKnotNode] : OpenKnotDataHandler.HandleIterOpenKnotNode,
    [OpCode.Node_MakeKnotNode] : OpenKnotDataHandler.HandleMakeKnotNode,
    [OpCode.Node_MakeKnotChain] : OpenKnotDataHandler.MakeKnotChain,
    [OpCode.Node_IterEvalKnotClause] : KnotExprHandler.HandleIterEvalKnotClause,
    [OpCode.Node_RunBlock] : BlockHandler.RunBlock,
    [OpCode.Node_RunGetProperty] : PropertyHandler.RunGetProperty,
    [OpCode.Node_RunSetProperty] : PropertyHandler.RunSetProperty,
    [OpCode.Node_RunGetSubscript] : SubscriptHandler.RunGetSuscript,
    [OpCode.Node_RunSetSubscript] : SubscriptHandler.RunSetSuscript,
    [OpCode.Node_MakeUnquote] : null,
  };

  private static PrefixKeyWordExpanderMap: { [key: string]: (stateMgr: StateMgr, nodeToRun: any) => any } = {
    'do': function(stateMgr: StateMgr, nodeToRun: any) : any {
      BlockHandler.ExpandBlock(stateMgr, nodeToRun.Body)
    },
    'main': function(stateMgr: StateMgr, nodeToRun: any) : any {
      BlockHandler.ExpandBlock(stateMgr, nodeToRun.Body)
    },
    'func': function(stateMgr: StateMgr, nodeToRun: any) : any {
      FuncHandler.ExpandDeclareFunc(stateMgr, nodeToRun)
    },
    'cond': ConditionHandler.ExpandCondition,
    'if': IfElseHandler.ExpandIfElse,
    'var': DeclareVarHandler.ExpandDeclareVar,
    'set': SetEnvHandler.ExpandSetEnv,
    'try': TryHandler.ExpandTry,
    'perform': PerformHandler.ExpandPerform,
    'wait_timeout': WaitTimeoutHandler.ExpandWaitTimeout,
    'set_interval': SetIntervalHandler.ExpandSetInterval,
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

  private static InfixKeyWordExpanderMap: { [key: string]: (stateMgr: StateMgr, nodeToRun: any) => any } = {
    '=': ObjectAssignHandler.ExpandObjectAssign,
    'save_operands': SaveOperandValuesHandler.ExpandSaveStack,
  }

  public static GetInstructionHandler(name: string) : (stateMgr: StateMgr, opContState : Instruction) => void {
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