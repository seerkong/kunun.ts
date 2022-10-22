import { KnOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { KnState } from "../../KnState";
import { NodeHandler } from "./NodeHandler";

export class ArrayHandler {
  public static ExpandOpenArray(knState: KnState, nodeToRun: any) {
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.ValStack_PushFrame);
    for (let item of nodeToRun) {
      knState.AddOp(KnOpCode.Node_RunNode, item);
    }

    knState.AddOp(KnOpCode.Node_MakeVector);
    knState.AddOp(KnOpCode.ValStack_PopFrameAndPushTopVal);
    knState.OpBatchCommit();
  }

  public static RunMakeArray(knState: KnState, opContState : Instruction) {
    let evaledNodes = knState.GetCurrentFiber().OperandStack.PeekAndClearFrameAllValues();
    knState.AddOpDirectly(KnOpCode.ValStack_PushValue, evaledNodes);
  }
}