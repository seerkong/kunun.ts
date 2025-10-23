
import { KnNodeType } from "../../Model/KnNodeType";
import { KnSymbol } from "../../Model/KnSymbol";
import { KnNodeHelper } from "../../Util/KnNodeHelper";
import { XnlOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";
import { KnKnot } from "../../Model/KnKnot";
import { Fiber, FiberState } from "../../StateManagement/Fiber";
import { ResumeFiberToken } from "../../StateManagement/FiberMgr";

export class WaitTimeoutHandler {
  public static ExpandWaitTimeout(knState: XnlState, nodeToRun: any) {
    let waitTimeoutNode = nodeToRun as KnKnot;
    let triggerHandler = waitTimeoutNode.Next?.Core;
    let timeoutInMilis = waitTimeoutNode.Next?.Next?.Core;

    let currentFiber = knState.GetCurrentFiber();

    let initSubFiberOps = [
      new Instruction(XnlOpCode.Ctrl_CurrentFiberToSuspended, currentFiber.CurrentEnvId),
      new Instruction(XnlOpCode.Node_RunNode, currentFiber.CurrentEnvId, triggerHandler),
      new Instruction(XnlOpCode.Ctrl_ApplyToFrameTop, currentFiber.CurrentEnvId, null),
      new Instruction(XnlOpCode.YieldToFiberAndChangeCurrentFiberState, currentFiber.CurrentEnvId, {
        YieldToFiberId: currentFiber.Id,
        ChangeCurrentFiberToState: FiberState.Dead
      }),
    ];
    let subFiber = Fiber.CreateSubFiber(currentFiber, FiberState.Idle);
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