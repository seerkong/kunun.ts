
import { KnNodeType } from "../../Model/KnNodeType";
import { KnSymbol } from "../../Model/KnSymbol";
import { KnNodeHelper } from "../../Util/KnNodeHelper";
import { XnlOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";
import { KnKnot } from "../../Model/KnKnot";
import { Fiber, FiberState } from "../../StateManagement/Fiber";
import { ResumeFiberToken } from "../../StateManagement/FiberMgr";
import { KnWord } from "../../Model/KnWord";


export class AwaitHostFuncHandler {
  public static async EvalHostAsyncFuncHandler(
      hostFuncInstance, evaledArgs, exceptionArgs, exceptionBlock,
      knState: XnlState, subFiberId: number) {
    let subFiber : Fiber = knState.FiberMgr.GetFiberById(subFiberId);

    let exceptionArgName = (exceptionArgs[0] as KnWord).Value;
    // let isOk = true;
    // let result = null;
    // let error = null;
    try {
      let result = await hostFuncInstance.apply(null, evaledArgs);
      knState.FiberMgr.AddResumeFiberEvent(new ResumeFiberToken(
        subFiber.Id,
        [result]
      ));
    } catch (e) {
      let beforeResumeOps: Instruction[] = [];
      beforeResumeOps.push(new Instruction(XnlOpCode.Env_SetLocalEnv, subFiber.CurrentEnvId, exceptionArgName));
      beforeResumeOps.push(new Instruction(XnlOpCode.Node_RunBlock, subFiber.CurrentEnvId, exceptionBlock));

      knState.FiberMgr.AddResumeFiberEvent(new ResumeFiberToken(
        subFiber.Id,
        [e],
        beforeResumeOps
      ));
    }
  }

  public static ExpandAwaitHostFunc(knState: XnlState, nodeToRun: any) {
    let awaitHostFnNode = nodeToRun as KnKnot;
    let funcName = awaitHostFnNode.Next?.Core;
    let args = awaitHostFnNode.Next?.Params;
    let exceptionArgs = awaitHostFnNode.Next?.Next?.Params;
    let exceptionBlock = awaitHostFnNode.Next?.Next?.Block;

    let currentFiber = knState.GetCurrentFiber();

    
    let subFiber = Fiber.CreateSubFiber(currentFiber, FiberState.Idle);
    
    
    let initSubFiberOps: Instruction[] = [];
    initSubFiberOps.push(new Instruction(XnlOpCode.Ctrl_CurrentFiberToSuspended, currentFiber.CurrentEnvId));
    initSubFiberOps.push(new Instruction(XnlOpCode.Node_RunNode, currentFiber.CurrentEnvId, funcName));
    initSubFiberOps.push(new Instruction(XnlOpCode.Node_RunNode, currentFiber.CurrentEnvId, args));
    initSubFiberOps.push(new Instruction(
      XnlOpCode.ValStack_PushValue,
      currentFiber.CurrentEnvId,
      function(hostFuncInstance, evaledArgs) {
        setTimeout(function() {
          AwaitHostFuncHandler.EvalHostAsyncFuncHandler(
            hostFuncInstance, evaledArgs, exceptionArgs, exceptionBlock,
            knState, subFiber.Id
          );
        }, 0);
        return null;
      }
    ));

    initSubFiberOps.push(new Instruction(XnlOpCode.Ctrl_ApplyToFrameTop, currentFiber.CurrentEnvId, null));
    // 执行包装了实际宿主环境的异步函数的setTimeout后, 有个冗余的value，需要Pop
    initSubFiberOps.push(new Instruction(XnlOpCode.ValStack_PopValue, currentFiber.CurrentEnvId));
    // 子fiber睡眠，等待实际宿主环境的异步函数执行完毕后，通过事件机制唤醒
    initSubFiberOps.push(new Instruction(XnlOpCode.Ctrl_CurrentFiberToSuspended, currentFiber.CurrentEnvId));
    

    initSubFiberOps.push(new Instruction(XnlOpCode.YieldToFiberAndChangeCurrentFiberState, currentFiber.CurrentEnvId, {
      YieldToFiberId: currentFiber.Id,
      ChangeCurrentFiberToState: FiberState.Dead
    }));


    
    subFiber.InitInstructions(initSubFiberOps);
    knState.FiberMgr.AddToSuspendedFibersLast(subFiber);

    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.ValStack_PushFrame);
    knState.AddOp(XnlOpCode.YieldToFiberAndChangeCurrentFiberState, {
      YieldToFiberId: subFiber.Id,
      ChangeCurrentFiberToState: FiberState.Suspended
    });
    knState.AddOp(XnlOpCode.ValStack_PopFrameAndPushTopVal);
    knState.OpBatchCommit();

    setTimeout(
      function () {
        console.log("before exec sub fiber, call host async func")
        knState.FiberMgr.AddResumeFiberEvent(new ResumeFiberToken(
          subFiber.Id,
          []
        ));
      },
      0
    );
  }
}