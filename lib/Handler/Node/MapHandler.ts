import { XnlOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";

export class MapHandler {
  public static ExpandOpenMap(knState: XnlState, nodeToRun: any) {
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.ValStack_PushFrame);
    for (let key in nodeToRun) {
      knState.AddOp(XnlOpCode.Node_RunNode, key);
      knState.AddOp(XnlOpCode.Node_RunNode, nodeToRun[key]);
    }

    knState.AddOp(XnlOpCode.Node_MakeMap);
    knState.AddOp(XnlOpCode.ValStack_PopFrameAndPushTopVal);
    knState.OpBatchCommit();
  }

  public static RunMakeMap(knState: XnlState, opContState : Instruction) {
    let evaledNodes = knState.GetCurrentFiber().OperandStack.PeekAndClearFrameAllValues();
    let result = {};
    for (let i = 0; i < evaledNodes.length; i = i + 2) {
      let key = evaledNodes[i];
      let val = evaledNodes[i + 1];
      result[key] = val;
    }
    knState.AddOpDirectly(XnlOpCode.ValStack_PushValue, result);
  }
}