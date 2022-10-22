import { KnOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { KnState } from "../../KnState";

export class MapHandler {
  public static ExpandOpenMap(knState: KnState, nodeToRun: any) {
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.ValStack_PushFrame);
    for (let key in nodeToRun) {
      knState.AddOp(KnOpCode.Node_RunNode, key);
      knState.AddOp(KnOpCode.Node_RunNode, nodeToRun[key]);
    }

    knState.AddOp(KnOpCode.Node_MakeMap);
    knState.AddOp(KnOpCode.ValStack_PopFrameAndPushTopVal);
    knState.OpBatchCommit();
  }

  public static RunMakeMap(knState: KnState, opContState : Instruction) {
    let evaledNodes = knState.GetCurrentFiber().OperandStack.PeekAndClearFrameAllValues();
    let result = {};
    for (let i = 0; i < evaledNodes.length; i = i + 2) {
      let key = evaledNodes[i];
      let val = evaledNodes[i + 1];
      result[key] = val;
    }
    knState.AddOpDirectly(KnOpCode.ValStack_PushValue, result);
  }
}