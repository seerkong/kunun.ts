import { KnOpCode } from "../../KnOpCode";
import { KnState } from "../../KnState";
import { KnWord } from "../../Model";

export class OptionalOrElseHandler {
  public static ExpandOrElse(knState: KnState, nodeToRun: any) : number {
    let top = knState.OperandStack.length > 0
        ? knState.OperandStack[knState.OperandStack.length - 1] : null;
    let other = nodeToRun.Next.Core;
    knState.OpBatchStart();
    if (!top) {
        knState.AddOp(KnOpCode.ValStack_PopValue);
        knState.AddOp(KnOpCode.Node_RunNode, other);     
    }
    knState.OpBatchCommit();
    return 2;
  }

}