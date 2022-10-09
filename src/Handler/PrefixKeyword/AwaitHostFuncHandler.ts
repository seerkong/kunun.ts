import { TableHandler } from "./TableHandler";
import { KnType } from "../../Model/KnType";
import { KnSymbol } from "../../Model/KnSymbol";
import { NodeHelper } from "../../Util/NodeHelper";
import { OpCode } from "../../OpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { StateMgr } from "../../StateMgr";
import { KnKnot } from "../../Model/KnKnot";
import { Fiber, FiberState } from "../../StateManagement/Fiber";
import { ResumeFiberToken } from "../../StateManagement/FiberMgr";
import { KnWord } from "Model/KnWord";


export class AwaitHostFuncHandler {
  public static async EvalHostAsyncFuncHandler(
      hostFuncInstance, evaledArgs, exceptionArgs, exceptionBlock,
      stateMgr: StateMgr, subFiberId: number) {
    let subFiber : Fiber = stateMgr.FiberMgr.GetFiberById(subFiberId);

    let exceptionArgName = (exceptionArgs[0] as KnWord).Value;
    // let isOk = true;
    // let result = null;
    // let error = null;
    try {
      let result = await hostFuncInstance.apply(null, evaledArgs);
      stateMgr.FiberMgr.AddResumeFiberEvent(new ResumeFiberToken(
        subFiber.Id,
        [result]
      ));
    } catch (e) {
      let beforeResumeOps = [];
      beforeResumeOps.push(new Instruction(OpCode.Env_SetLocalEnv, subFiber.CurrentEnvId, exceptionArgName));
      beforeResumeOps.push(new Instruction(OpCode.Node_RunBlock, subFiber.CurrentEnvId, exceptionBlock));

      stateMgr.FiberMgr.AddResumeFiberEvent(new ResumeFiberToken(
        subFiber.Id,
        [e],
        beforeResumeOps
      ));
    }
  }

  public static ExpandAwaitHostFunc(stateMgr: StateMgr, nodeToRun: any) {
    let awaitHostFnNode = nodeToRun as KnKnot;
    let funcName = awaitHostFnNode.Next.Core;
    let args = awaitHostFnNode.Next.Param;
    let exceptionArgs = awaitHostFnNode.Next.Next.Param;
    let exceptionBlock = awaitHostFnNode.Next.Next.Body;

    let currentFiber = stateMgr.GetCurrentFiber();

    
    let subFiber = Fiber.CreateSubFiber(currentFiber, FiberState.Idle);
    
    
    let initSubFiberOps = [];
    initSubFiberOps.push(new Instruction(OpCode.Ctrl_CurrentFiberToSuspended, currentFiber.CurrentEnvId));
    initSubFiberOps.push(new Instruction(OpCode.Node_RunNode, currentFiber.CurrentEnvId, funcName));
    initSubFiberOps.push(new Instruction(OpCode.Node_RunNode, currentFiber.CurrentEnvId, args));
    initSubFiberOps.push(new Instruction(
      OpCode.ValStack_PushValue,
      currentFiber.CurrentEnvId,
      function(hostFuncInstance, evaledArgs) {
        setTimeout(function() {
          AwaitHostFuncHandler.EvalHostAsyncFuncHandler(
            hostFuncInstance, evaledArgs, exceptionArgs, exceptionBlock,
            stateMgr, subFiber.Id
          );
        }, 0);
        return null;
      }
    ));

    initSubFiberOps.push(new Instruction(OpCode.Ctrl_ApplyToFrameTop, currentFiber.CurrentEnvId, null));
    // 执行包装了实际宿主环境的异步函数的setTimeout后, 有个冗余的value，需要Pop
    initSubFiberOps.push(new Instruction(OpCode.ValStack_PopValue, currentFiber.CurrentEnvId));
    // 子fiber睡眠，等待实际宿主环境的异步函数执行完毕后，通过事件机制唤醒
    initSubFiberOps.push(new Instruction(OpCode.Ctrl_CurrentFiberToSuspended, currentFiber.CurrentEnvId));
    

    initSubFiberOps.push(new Instruction(OpCode.YieldToFiberAndChangeCurrentFiberState, currentFiber.CurrentEnvId, {
      YieldToFiberId: currentFiber.Id,
      ChangeCurrentFiberToState: FiberState.Dead
    }));


    
    subFiber.InitInstructions(initSubFiberOps);
    stateMgr.FiberMgr.AddToSuspendedFibersLast(subFiber);

    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.ValStack_PushFrame);
    stateMgr.AddOp(OpCode.YieldToFiberAndChangeCurrentFiberState, {
      YieldToFiberId: subFiber.Id,
      ChangeCurrentFiberToState: FiberState.Suspended
    });
    stateMgr.AddOp(OpCode.ValStack_PopFrameAndPushTopVal);
    stateMgr.OpBatchCommit();

    setTimeout(
      function () {
        console.log("before exec sub fiber, call host async func")
        stateMgr.FiberMgr.AddResumeFiberEvent(new ResumeFiberToken(
          subFiber.Id,
          []
        ));
      },
      0
    );
  }
}