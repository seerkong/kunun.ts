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

export class SetIntervalHandler {
  public static ExpandSetInterval(stateMgr: StateMgr, nodeToRun: any) {
    let setIntervalNode = nodeToRun as KnKnot;
    let triggerHandler = setIntervalNode.Next.Core;
    let intervalInMilis = setIntervalNode.Next.Next.Core;

    let currentFiber = stateMgr.GetCurrentFiber();
    

    let setIntervalResult = setInterval(
      function() {
        // console.log("host set interval triggered");
        let initSubFiberOps = [
          new Instruction(OpCode.Node_RunNode, currentFiber.CurrentEnvId, triggerHandler),
          new Instruction(OpCode.Ctrl_ApplyToFrameTop, currentFiber.CurrentEnvId, triggerHandler),
          new Instruction(OpCode.Ctrl_FinalizeFiber, currentFiber.CurrentEnvId),
        ];
        let subFiber = Fiber.CreateSubFiber(currentFiber, FiberState.Idle);
        subFiber.InitInstructions(initSubFiberOps);
        
        stateMgr.FiberMgr.AddToSuspendedFibersLast(subFiber);

        stateMgr.FiberMgr.AddResumeFiberEvent(new ResumeFiberToken(
          subFiber.Id,
          []
        ));
      },
      intervalInMilis
    );


    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.ValStack_PushValue, setIntervalResult);
    stateMgr.OpBatchCommit();
  }
}