import { TableHandler } from "./TableHandler";
import { KnNodeType } from "../../Model/KnType";
import { KnSymbol } from "../../Model/KnSymbol";
import { NodeHelper } from "../../Util/NodeHelper";
import { KnOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { KnState } from "../../KnState";
import { KnKnot } from "../../Model/KnKnot";
import { Fiber, FiberState } from "../../StateManagement/Fiber";
import { ResumeFiberToken } from "../../StateManagement/FiberMgr";

export class WaitTimeoutHandler {
  public static ExpandWaitTimeout(knState: KnState, nodeToRun: any) {
    let waitTimeoutNode = nodeToRun as KnKnot;
    let triggerHandler = waitTimeoutNode.Next.Core;
    let timeoutInMilis = waitTimeoutNode.Next.Next.Core;

    let currentFiber = knState.GetCurrentFiber();

    let initSubFiberOps = [
      new Instruction(KnOpCode.Ctrl_CurrentFiberToSuspended, currentFiber.CurrentEnvId),
      new Instruction(KnOpCode.Node_RunNode, currentFiber.CurrentEnvId, triggerHandler),
      new Instruction(KnOpCode.Ctrl_ApplyToFrameTop, currentFiber.CurrentEnvId, null),
      new Instruction(KnOpCode.YieldToFiberAndChangeCurrentFiberState, currentFiber.CurrentEnvId, {
        YieldToFiberId: currentFiber.Id,
        ChangeCurrentFiberToState: FiberState.Dead
      }),
    ];
    let subFiber = Fiber.CreateSubFiber(currentFiber, FiberState.Idle);
    subFiber.InitInstructions(initSubFiberOps);
    knState.FiberMgr.AddToSuspendedFibersLast(subFiber);

    knState.OpBatchStart();
    knState.AddOp(KnOpCode.ValStack_PushFrame);
    knState.AddOp(KnOpCode.YieldToFiberAndChangeCurrentFiberState, {
      YieldToFiberId: subFiber.Id,
      ChangeCurrentFiberToState: FiberState.Suspended
    });
    knState.AddOp(KnOpCode.ValStack_PopFrameAndPushTopVal);
    knState.OpBatchCommit();

    setTimeout(
      function() {
        // console.log("host setTimeout triggered")
        knState.FiberMgr.AddResumeFiberEvent(new ResumeFiberToken(
          subFiber.Id,
          []
        ));
      },
      timeoutInMilis
    );
  }
}