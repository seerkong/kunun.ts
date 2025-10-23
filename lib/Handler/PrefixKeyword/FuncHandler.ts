import { KnHostFunction } from '../../Model/KnHostFunction';
import { XnlOpCode } from "../../KnOpCode";
import { Env } from "../../StateManagement/Env";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";
import { KnNodeHelper } from "../../Util/KnNodeHelper";
import { KnNodeType } from "../../Model/KnNodeType"
import { KnLambdaFunction } from "../../Model/KnLambdaFunction";
import { EnvTreeHandler } from '../EnvTreeHandler';
import { KnCompositeFunctionBase } from '../../Model/KnCompositeFunctionBase';
import { KnContinuation } from "../../Model/KnContinuation";
import { ContinuationHandler } from '../../Handler/ContinuationHandler';
import { KnKnot } from '../../Model';

// define func name: (func name [arg1, arg2, ...] funcbody)
// anonymous: (func [arg1, arg2, ...] funcbody)
export class FuncHandler {
  public static ExpandDeclareFunc(knState: XnlState, nodeToRun: KnKnot) {
    let funcName : string|null = null;
    let paramWordArr = [];
    let funcBody: any[] | null = null;

    if (nodeToRun.Core != null && KnNodeHelper.GetType(nodeToRun.Core.Definition) == KnNodeType.Word) {
      funcName = KnNodeHelper.GetInnerString(nodeToRun.Core.Definition);
    }

    paramWordArr = nodeToRun.Params?.Value ?? [];
    funcBody = nodeToRun.Block ?? null;
    
    // let paramWordStrArr = []
    // for (let paramWord of paramWordArr) {
    //   paramWordStrArr.push(NodeHelper.GetInnerString(paramWord))
    // }
    let curEnv = knState.GetCurEnv();
    let func = new KnLambdaFunction(paramWordArr, funcBody, curEnv, funcName ?? undefined);
    if (funcName) {
      curEnv.Define(funcName, func);
    }
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.ValStack_PushValue, func);
    
    knState.OpBatchCommit();
  }

  // 对函数名和函数参数求值
  public static ExpandEvalFuncArgs(knState: XnlState, nodeToRun: any) {
    let funcName = KnNodeHelper.GetInnerString(nodeToRun.Core);
    let args = nodeToRun.Param;
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.ValStack_PushFrame);
    for (let i = 0; i < args.length; i++) {
      knState.AddOp(XnlOpCode.Node_RunNode, args[i]);
    }
    knState.AddOp(XnlOpCode.Node_RunNode, funcName);
    knState.AddOp(XnlOpCode.Ctrl_ApplyToFrameTop);
    knState.AddOp(XnlOpCode.ValStack_PopFrameAndPushTopVal);
    knState.OpBatchCommit(); 
  }

  public static RunApplyToFrameTop(knState: XnlState, opContState : Instruction) {
    let func = knState.GetCurrentFiber().OperandStack.PopValue();
    let args = knState.GetCurrentFiber().OperandStack.PeekAndClearFrameAllValues();
    let funcType = KnNodeHelper.GetType(func);
    
    if (KnNodeHelper.IsFunctionType(funcType)) {
      let lambdaFunc = func as KnCompositeFunctionBase;
      if (lambdaFunc.Arity > args.length) {
        // 参数不足，不执行函数
        throw new Error("argument count not match")
      }
    }
    FuncHandler.RunApplyToFunc(knState, func, args);
  }

  public static RunApplyToFrameBottom(knState: XnlState, opContState : Instruction) {
    let args = knState.GetCurrentFiber().OperandStack.PeekAndClearFrameAllValues();
    let func = args.shift();
    let funcType = KnNodeHelper.GetType(func);
    
    if (KnNodeHelper.IsFunctionType(funcType)) {
      let lambdaFunc = func as KnCompositeFunctionBase;
      if (lambdaFunc.Arity > args.length) {
        // 参数不足，不执行函数
        knState.GetCurrentFiber().OperandStack.PushValue(func);
        knState.GetCurrentFiber().OperandStack.PushItems(args);
        return;
      }
    }
    FuncHandler.RunApplyToFunc(knState, func, args);
  }

  public static RunApplyToFunc(knState: XnlState, func, args) {
    let funcType = KnNodeHelper.GetType(func);
    if (KnNodeHelper.IsFunctionType(funcType)) {
      let compositeFunc = func as KnCompositeFunctionBase;
      let paramTable = compositeFunc.ParamTuple;
      let childEnv = EnvTreeHandler.RunDiveProcessEnv(knState, null);

      let argArity = compositeFunc.Arity;
      if (compositeFunc.VaryLengthParamPositiType == 0) {
        for (let i  = 0; i < argArity; i++) {
          childEnv.Define(paramTable[i].Value, args[i]);
        }
      }
      else if (compositeFunc.VaryLengthParamPositiType > 0) {
        
        for (let i  = 0; i < argArity; i++) {
          childEnv.Define(paramTable[i].Value, args[i]);
        }
        const restArgs = args.slice(argArity);
        childEnv.Define(paramTable[paramTable.length - 1].Value, restArgs);
      }
      else {
        for (let i  = 0; i < argArity; i++) {
          let argIndex = paramTable.length - 1 - i;
          childEnv.Define(paramTable[argIndex].Value, args[argIndex]);
        }
        let fixedArgMostRightIndex = paramTable.length - 1 - argArity;
        const restArgs = args.slice(0, fixedArgMostRightIndex);
        childEnv.Define(paramTable[0].Value, restArgs);
      }

      knState.OpBatchStart();
      knState.AddOp(XnlOpCode.Ctrl_MakeContExcludeTopNInstruction, 2);
      knState.AddOp(XnlOpCode.Env_SetLocalEnv, 'return');
      knState.AddOp(XnlOpCode.Node_RunBlock, compositeFunc.FuncBody);
      knState.AddOp(XnlOpCode.Env_Rise);
      knState.OpBatchCommit(); 
    }
    else if (funcType === KnNodeType.Continuation) {
      ContinuationHandler.RestoreContinuationAppendOperandStack(knState, func as KnContinuation, args);
    }
    else if (funcType === KnNodeType.HostSyncFunc) {
      let hostFunc = func as KnHostFunction;
      let applyResult = hostFunc.Func.apply(null, [args]);
      knState.GetCurrentFiber().OperandStack.PushValue(applyResult);
    }
    else {
      let applyResult = func.apply(null, args);
      knState.GetCurrentFiber().OperandStack.PushValue(applyResult);
    }
  }
}