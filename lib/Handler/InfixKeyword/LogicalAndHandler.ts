import { XnlOpCode } from "../../KnOpCode";
import XnlState from "../../KnState";
import { KnWord } from "../../Model";

export class LogicalAndHandler {
  public static ExpandAnd(knState: XnlState, nodeToRun: any) : number {
    let top = knState.OperandStack.length > 0
        ? knState.OperandStack[knState.OperandStack.length - 1] : null;
    let other = nodeToRun.Next.Core;
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.ValStack_PopValue);
    if (!top) {
        knState.AddOp(XnlOpCode.ValStack_PushValue, false);
    }
    else {
        knState.AddOp(XnlOpCode.Node_RunNode, other);
        knState.AddOp(XnlOpCode.ValStack_IsTopValTrue);
    }
    knState.OpBatchCommit();
    return 2;
  }

}