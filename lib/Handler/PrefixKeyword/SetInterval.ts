import { TableHandler } from "./TableHandler";
import { KnNodeType } from "../../Model/KnNodeType";
import { KnSymbol } from "../../Model/KnSymbol";
import { KnNodeHelper } from "../../Util/KnNodeHelper";
import { XnlOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";
import { KnKnot } from "../../Model/KnKnot";
import { Fiber, FiberState } from "../../StateManagement/Fiber";
import { ResumeFiberToken } from "../../StateManagement/FiberMgr";

export class SetIntervalHandler {
  public static ExpandSetInterval(knState: XnlState, nodeToRun: any) {
    let setIntervalNode = nodeToRun as KnKnot;
    let triggerHandler = setIntervalNode.Next?.Core;
    let intervalInMilis = setIntervalNode.Next?.Next?.Core;

    let currentFiber = knState.GetCurrentFiber();

    let setIntervalResult = setInterval(
      function() {
        // console.log("host set interval triggered");
        let initSubFiberOps = [
          new Instruction(XnlOpCode.Node_RunNode, currentFiber.CurrentEnvId, triggerHandler),
          new Instruction(XnlOpCode.Ctrl_ApplyToFrameTop, currentFiber.CurrentEnvId, triggerHandler),
          new Instruction(XnlOpCode.Ctrl_FinalizeFiber, currentFiber.CurrentEnvId),
        ];
        let subFiber = Fiber.CreateSubFiber(currentFiber, FiberState.Idle);
        subFiber.InitInstructions(initSubFiberOps);
        
        knState.FiberMgr.AddToSuspendedFibersLast(subFiber);

        knState.FiberMgr.AddResumeFiberEvent(new ResumeFiberToken(
          subFiber.Id,
          []
        ));
      },
      intervalInMilis
    );


    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.ValStack_PushValue, setIntervalResult);
    knState.OpBatchCommit();
  }
}