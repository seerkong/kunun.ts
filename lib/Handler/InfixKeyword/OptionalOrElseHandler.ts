import { XnlOpCode } from "../../KnOpCode";
import XnlState from "../../KnState";
import { KnWord } from "../../Model";

export class OptionalOrElseHandler {
  public static ExpandOrElse(knState: XnlState, nodeToRun: any) : number {
    let top = knState.OperandStack.length > 0
        ? knState.OperandStack[knState.OperandStack.length - 1] : null;
    let other = nodeToRun.Next.Core;
    knState.OpBatchStart();
    if (!top) {
        knState.AddOp(XnlOpCode.ValStack_PopValue);
        knState.AddOp(XnlOpCode.Node_RunNode, other);     
    }
    knState.OpBatchCommit();
    return 2;
  }

}