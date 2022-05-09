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

export class WaitTimeoutHandler {
  public static ExpandWaitTimeout(stateMgr: StateMgr, nodeToRun: any) {
    let waitTimeoutNode = nodeToRun as KnKnot;
    let triggerHandler = waitTimeoutNode.Next.Core;
    let timeoutInMilis = waitTimeoutNode.Next.Next.Core;

    let currentFiber = stateMgr.GetCurrentFiber();

    let initSubFiberOps = [
      new Instruction(OpCode.Ctrl_CurrentFiberToSuspended, currentFiber.CurrentEnvId),
      new Instruction(OpCode.Node_RunNode, currentFiber.CurrentEnvId, triggerHandler),
      new Instruction(OpCode.Ctrl_ApplyToFrameTop, currentFiber.CurrentEnvId, triggerHandler),
      new Instruction(OpCode.YieldToFiberAndChangeCurrentFiberState, currentFiber.CurrentEnvId, {
        YieldToFiberId: currentFiber.Id,
        ChangeCurrentFiberToState: FiberState.Dead
      }),
    ];
    let subFiber = Fiber.CreateSubFiber(currentFiber, FiberState.Idle, initSubFiberOps);
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
      function() {
        // console.log("host setTimeout triggered")
        stateMgr.FiberMgr.AddResumeFiberEvent(new ResumeFiberToken(
          subFiber.Id,
          []
        ));
      },
      timeoutInMilis
    );
  }
}