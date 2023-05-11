import { KnOpCode } from "../../KnOpCode";
import { KnState } from "../../KnState";
import { KnWord } from "../../Model";

export class LogicalAndHandler {
  public static ExpandAnd(knState: KnState, nodeToRun: any) : number {
    let top = knState.OperandStack.length > 0
        ? knState.OperandStack[knState.OperandStack.length - 1] : null;
    let other = nodeToRun.Next.Core;
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.ValStack_PopValue);
    if (!top) {
        knState.AddOp(KnOpCode.ValStack_PushValue, false);
    }
    else {
        knState.AddOp(KnOpCode.Node_RunNode, other);
        knState.AddOp(KnOpCode.ValStack_IsTopValTrue);
    }
    knState.OpBatchCommit();
    return 2;
  }

}