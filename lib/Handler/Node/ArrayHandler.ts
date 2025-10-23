import { XnlOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";
import { NodeHandler } from "./NodeHandler";

export class ArrayHandler {
  public static ExpandOpenArray(knState: XnlState, nodeToRun: any) {
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.ValStack_PushFrame);
    for (let item of nodeToRun) {
      knState.AddOp(XnlOpCode.Node_RunNode, item);
    }

    knState.AddOp(XnlOpCode.Node_MakeVector);
    knState.AddOp(XnlOpCode.ValStack_PopFrameAndPushTopVal);
    knState.OpBatchCommit();
  }

  public static RunMakeArray(knState: XnlState, opContState : Instruction) {
    let evaledNodes = knState.GetCurrentFiber().OperandStack.PeekAndClearFrameAllValues();
    knState.AddOpDirectly(XnlOpCode.ValStack_PushValue, evaledNodes);
  }
}