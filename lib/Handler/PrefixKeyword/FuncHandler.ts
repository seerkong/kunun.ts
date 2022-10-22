import { KnHostFunction } from '../../Model/KnHostFunction';
import { KnOpCode } from "../../KnOpCode";
import { Env } from "../../StateManagement/Env";
import { Instruction } from "../../StateManagement/InstructionStack";
import { KnState } from "../../KnState";
import { NodeHelper } from "../../Util/NodeHelper";
import { KnNodeType } from "../../Model/KnType"
import { KnLambdaFunction } from "../../Model/KnLambdaFunction";
import { EnvTreeHandler } from '../EnvTreeHandler';
import { KnCompositeFunctionBase } from '../../Model/KnFunctionBase';
import { KnContinuation } from "../../Model/KnContinuation";
import { ContinuationHandler } from '../../Handler/ContinuationHandler';
import { KnKnot } from '../../Model';

// define func name: (func name [arg1, arg2, ...] funcbody)
// anonymous: (func [arg1, arg2, ...] funcbody)
export class FuncHandler {
  public static ExpandDeclareFunc(knState: KnState, nodeToRun: KnKnot) {
    let funcName = null;
    let paramWordArr = [];
    let funcBody = null;

    if (nodeToRun.Next != null && NodeHelper.GetType(nodeToRun.Next.Core) == KnNodeType.KnWord) {
      funcName = NodeHelper.GetInnerString(nodeToRun.Next.Core);
      paramWordArr = nodeToRun.Next.Param;
      funcBody = nodeToRun.Next.Block;
    }
    else {
      paramWordArr = nodeToRun.Param;
      funcBody = nodeToRun.Block;
    }
    
    // let paramWordStrArr = []
    // for (let paramWord of paramWordArr) {
    //   paramWordStrArr.push(NodeHelper.GetInnerString(paramWord))
    // }
    let curEnv = knState.GetCurEnv();
    let func = new KnLambdaFunction(paramWordArr, funcBody, curEnv, funcName);
    if (funcName) {
      curEnv.Define(funcName, func);
    }
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.ValStack_PushValue, func);
    
    knState.OpBatchCommit();
  }

  // 对函数名和函数参数求值
  public static ExpandEvalFuncArgs(knState: KnState, nodeToRun: any) {
    let funcName = NodeHelper.GetInnerString(nodeToRun.Core);
    let args = nodeToRun.Param;
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.ValStack_PushFrame);
    for (let i = 0; i < args.length; i++) {
      knState.AddOp(KnOpCode.Node_RunNode, args[i]);
    }
    knState.AddOp(KnOpCode.Node_RunNode, funcName);
    knState.AddOp(KnOpCode.Ctrl_ApplyToFrameTop);
    knState.AddOp(KnOpCode.ValStack_PopFrameAndPushTopVal);
    knState.OpBatchCommit(); 
  }

  public static RunApplyToFrameTop(knState: KnState, opContState : Instruction) {
    let func = knState.GetCurrentFiber().OperandStack.PopValue();
    let args = knState.GetCurrentFiber().OperandStack.PeekAndClearFrameAllValues();
    let funcType = NodeHelper.GetType(func);
    
    if (NodeHelper.IsFunctionType(funcType)) {
      let lambdaFunc = func as KnCompositeFunctionBase;
      if (lambdaFunc.Arity > args.length) {
        // 参数不足，不执行函数
        throw new Error("argument count not match")
      }
    }
    FuncHandler.RunApplyToFunc(knState, func, args);
  }

  public static RunApplyToFrameBottom(knState: KnState, opContState : Instruction) {
    let args = knState.GetCurrentFiber().OperandStack.PeekAndClearFrameAllValues();
    let func = args.shift();
    let funcType = NodeHelper.GetType(func);
    
    if (NodeHelper.IsFunctionType(funcType)) {
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

  public static RunApplyToFunc(knState: KnState, func, args) {
    let funcType = NodeHelper.GetType(func);
    if (NodeHelper.IsFunctionType(funcType)) {
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
        let restArgs = [];
        for (let i = argArity; i < args.length; i++) {
          restArgs.push(args[i]);
        }
        childEnv.Define(paramTable[paramTable.length - 1].Value, restArgs);
      }
      else {
        for (let i  = 0; i < argArity; i++) {
          let argIndex = paramTable.length - 1 - i;
          childEnv.Define(paramTable[argIndex].Value, args[argIndex]);
        }
        let fixedArgMostRightIndex = paramTable.length - 1 - argArity;
        let restArgs = [];
        for (let i = 0; i < fixedArgMostRightIndex; i+= 1) {
          restArgs.push(args[i]);
        }
        childEnv.Define(paramTable[0].Value, restArgs);
      }

      knState.OpBatchStart();
      knState.AddOp(KnOpCode.Ctrl_MakeContExcludeTopNInstruction, 2);
      knState.AddOp(KnOpCode.Env_SetLocalEnv, 'return');
      knState.AddOp(KnOpCode.Node_RunBlock, compositeFunc.FuncBody);
      knState.AddOp(KnOpCode.Env_Rise);
      knState.OpBatchCommit(); 
    }
    else if (funcType === KnNodeType.KnContinuation) {
      ContinuationHandler.RestoreContinuationAppendOperandStack(knState, func as KnContinuation, args);
    }
    else if (funcType === KnNodeType.KnHostFunc) {
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