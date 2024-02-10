import { KnKnot } from "../../Model/KnKnot";
import { KnOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { KnState } from "../../KnState";
import { ArrayHandler } from "./ArrayHandler";
import { MapHandler } from "./MapHandler";
import { NodeHandler } from "./NodeHandler";

export class OpenKnotDataHandler {
  public static ExpandKnotData(knState: KnState, nodeToRun: any) {
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.ValStack_PushFrame);
    knState.AddOp(KnOpCode.Node_IterOpenKnotNode, nodeToRun);
    knState.AddOp(KnOpCode.Node_MakeKnotChain);
    knState.AddOp(KnOpCode.ValStack_PopFrameAndPushTopVal);

    knState.OpBatchCommit();
  }

  public static HandleIterOpenKnotNode(knState: KnState, opContState : Instruction) {
    let knot : KnKnot = opContState.Memo;
    if (knot == null) {
      return;
    }
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.ValStack_PushFrame);
    knState.AddOp(KnOpCode.ValStack_PushValue, knot.Core);
    ArrayHandler.ExpandOpenArray(knState, knot.Param);
    MapHandler.ExpandOpenMap(knState, knot.Attr);
    ArrayHandler.ExpandOpenArray(knState, knot.Body);
    knState.AddOp(KnOpCode.Node_MakeKnotNode);
    knState.AddOp(KnOpCode.ValStack_PopFrameAndPushTopVal);

    if (knot.Next != null) {
      knState.AddOp(KnOpCode.Node_IterOpenKnotNode, knot.Next);
    }

    knState.OpBatchCommit();
  }

  public static HandleMakeKnotNode(knState: KnState, opContState : Instruction) {
    let evaledNodes = knState.GetCurrentFiber().OperandStack.PeekAndClearFrameAllValues();
    let result = new KnKnot({
      Core: evaledNodes[0],
      Param: evaledNodes[1],
      Attr: evaledNodes[2],
      Body: evaledNodes[3],
      Next: null
    });
    knState.GetCurrentFiber().OperandStack.PushValue(result);
  }

  public static MakeKnotChain(knState: KnState, opContState : Instruction) {
    let evaledNodes = knState.GetCurrentFiber().OperandStack.PeekAndClearFrameAllValues();
    let result : KnKnot = KnKnot.MakeByNodes(evaledNodes);
    result.IsData = true;
    knState.GetCurrentFiber().OperandStack.PushValue(result);
  }
}