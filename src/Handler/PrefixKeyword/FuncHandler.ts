import { KnHostFunction } from '../../Model/KnHostFunction';
import { OpCode } from "../../OpCode";
import { Env } from "../../StateManagement/Env";
import { Instruction } from "../../StateManagement/InstructionStack";
import { StateMgr } from "../../StateMgr";
import { NodeHelper } from "../../Util/NodeHelper";
import { KnType } from "../../Model/KnType"
import { KnLambdaFunction } from "../../Model/KnLambdaFunction";
import { EnvTreeHandler } from '../EnvTreeHandler';
import { KnFunctionBase } from '../../Model/KnFunctionBase';
import { KnContinuation } from "../../Model/KnContinuation";
import { ContinuationHandler } from '../../Handler/ContinuationHandler';

// define func name: (func name [arg1, arg2, ...] funcbody)
// anonymous: (func [arg1, arg2, ...] funcbody)
export class FuncHandler {
  public static ExpandDeclareFunc(stateMgr: StateMgr, nodeToRun: any) {
    let funcName = null;
    let paramWordArr = [];
    let funcBody = null;

    if (nodeToRun.Next != null && NodeHelper.GetType(nodeToRun.Next.Core) == KnType.Word) {
      funcName = NodeHelper.GetInnerString(nodeToRun.Next.Core);
      paramWordArr = nodeToRun.Next.Param;
      funcBody = nodeToRun.Next.Body;
    }
    else {
      paramWordArr = nodeToRun.Param;
      funcBody = nodeToRun.Body;
    }
    
    // let paramWordStrArr = []
    // for (let paramWord of paramWordArr) {
    //   paramWordStrArr.push(NodeHelper.GetInnerString(paramWord))
    // }
    let curEnv = stateMgr.GetCurEnv();
    let func = new KnLambdaFunction(paramWordArr, funcBody, curEnv, funcName);
    if (funcName) {
      curEnv.Define(funcName, func);
    }
    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.ValStack_PushValue, func);
    
    stateMgr.OpBatchCommit();
  }

  // 对函数名和函数参数求值
  public static ExpandEvalFuncArgs(stateMgr: StateMgr, nodeToRun: any) {
    let funcName = NodeHelper.GetInnerString(nodeToRun.Core);
    let args = nodeToRun.Param;
    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.ValStack_PushFrame);
    for (let i = 0; i < args.length; i++) {
      stateMgr.AddOp(OpCode.Node_RunNode, args[i]);
    }
    stateMgr.AddOp(OpCode.Node_RunNode, funcName);
    stateMgr.AddOp(OpCode.Ctrl_ApplyToFrameTop);
    stateMgr.AddOp(OpCode.ValStack_PopFrameAndPushTopVal);
    stateMgr.OpBatchCommit(); 
  }

  public static RunApplyToFrameTop(stateMgr: StateMgr, opContState : Instruction) {
    let func = stateMgr.GetCurrentFiber().OperandStack.PopValue();
    let args = stateMgr.GetCurrentFiber().OperandStack.PeekAndClearFrameAllValues();
    // let funcType = NodeHelper.GetType(func);
    
    // if (NodeHelper.IsFunctionType(funcType)) {
    //   let lambdaFunc = func as KnFunctionBase;
    //   if (lambdaFunc.Arity > args.length) {
    //     // 参数不足，不执行函数
    //     stateMgr.GetCurrentFiber().OperandStack.PushItems(args);
    //     stateMgr.GetCurrentFiber().OperandStack.PushValue(func);
    //     return;
    //   }
    // }
    FuncHandler.RunApplyToFunc(stateMgr, func, args);
  }

  public static RunApplyToFrameBottom(stateMgr: StateMgr, opContState : Instruction) {
    let args = stateMgr.GetCurrentFiber().OperandStack.PeekAndClearFrameAllValues();
    let func = args.shift();
    let funcType = NodeHelper.GetType(func);
    
    if (NodeHelper.IsFunctionType(funcType)) {
      let lambdaFunc = func as KnFunctionBase;
      if (lambdaFunc.Arity > args.length) {
        // 参数不足，不执行函数
        stateMgr.GetCurrentFiber().OperandStack.PushValue(func);
        stateMgr.GetCurrentFiber().OperandStack.PushItems(args);
        return;
      }
    }
    FuncHandler.RunApplyToFunc(stateMgr, func, args);
  }

  public static RunApplyToFunc(stateMgr: StateMgr, func, args) {
    let funcType = NodeHelper.GetType(func);
    if (NodeHelper.IsFunctionType(funcType)) {
      let lambdaFunc = func as KnFunctionBase;
      let paramTable = lambdaFunc.ParamTuple;
      let childEnv = EnvTreeHandler.RunDiveProcessEnv(stateMgr, null);

      let argArity = lambdaFunc.Arity;
      if (lambdaFunc.VaryLengthParamPositiType == 0) {
        for (let i  = 0; i < argArity; i++) {
          childEnv.Define(paramTable[i].Value, args[i]);
        }
      }
      else if (lambdaFunc.VaryLengthParamPositiType > 0) {
        
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

      stateMgr.OpBatchStart();
      stateMgr.AddOp(OpCode.Ctrl_MakeContExcludeTopNInstruction, 2);
      stateMgr.AddOp(OpCode.Env_SetLocalEnv, 'return');
      stateMgr.AddOp(OpCode.Node_RunBlock, lambdaFunc.Body);
      stateMgr.AddOp(OpCode.Env_Rise);
      stateMgr.OpBatchCommit(); 
    }
    else if (funcType === KnType.Continuation) {
      ContinuationHandler.RestoreContinuationAppendOperandStack(stateMgr, func as KnContinuation, args);
    }
    else if (funcType === KnType.HostFunc) {
      let hostFunc = func as KnHostFunction;
      let applyResult = hostFunc.Func.apply(null, [args]);
      stateMgr.GetCurrentFiber().OperandStack.PushValue(applyResult);
    }
    else {
      let applyResult = func.apply(null, args);
      stateMgr.GetCurrentFiber().OperandStack.PushValue(applyResult);
    }
  }
}