import { KnKnot } from "../../Model/KnKnot";
import { XnlOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";
import { ArrayHandler } from "./ArrayHandler";
import { MapHandler } from "./MapHandler";
import { NodeHandler } from "./NodeHandler";

export class OpenKnotDataHandler {
  public static ExpandKnotData(knState: XnlState, nodeToRun: any) {
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.ValStack_PushFrame);
    knState.AddOp(XnlOpCode.Node_IterOpenKnotNode, nodeToRun);
    knState.AddOp(XnlOpCode.Node_MakeKnotChain);
    knState.AddOp(XnlOpCode.ValStack_PopFrameAndPushTopVal);

    knState.OpBatchCommit();
  }

  public static HandleIterOpenKnotNode(knState: XnlState, opContState : Instruction) {
    let knot : KnKnot = opContState.Memo;
    if (knot == null) {
      return;
    }
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.ValStack_PushFrame);
    knState.AddOp(XnlOpCode.ValStack_PushValue, knot.Core);
    ArrayHandler.ExpandOpenArray(knState, knot.Params);
    MapHandler.ExpandOpenMap(knState, knot.Attr);
    ArrayHandler.ExpandOpenArray(knState, knot.Block);
    knState.AddOp(XnlOpCode.Node_MakeKnotNode);
    knState.AddOp(XnlOpCode.ValStack_PopFrameAndPushTopVal);

    if (knot.Next != null) {
      knState.AddOp(XnlOpCode.Node_IterOpenKnotNode, knot.Next);
    }

    knState.OpBatchCommit();
  }

  public static HandleMakeKnotNode(knState: XnlState, opContState : Instruction) {
    let evaledNodes = knState.GetCurrentFiber().OperandStack.PeekAndClearFrameAllValues();
    let result = new KnKnot({
      Core: evaledNodes[0],
      Params: evaledNodes[1],
      Attr: evaledNodes[2],
      Block: evaledNodes[3],
      Next: null
    });
    knState.GetCurrentFiber().OperandStack.PushValue(result);
  }

  public static MakeKnotChain(knState: XnlState, opContState : Instruction) {
    let evaledNodes = knState.GetCurrentFiber().OperandStack.PeekAndClearFrameAllValues();
    let result : KnKnot = KnKnot.MakeByNodes(evaledNodes);
    knState.GetCurrentFiber().OperandStack.PushValue(result);
  }
}