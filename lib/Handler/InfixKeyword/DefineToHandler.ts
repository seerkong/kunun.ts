import { XnlOpCode } from "../../KnOpCode";
import XnlState from "../../KnState";
import { KnKnot, KnWord } from "../../Model";

export class DefineToHandler {
  public static ExpandDefineTo(knState: XnlState, nodeToRun: any) : number {
    let varName = (nodeToRun as KnKnot).Selector;
    
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.ValStack_Duplicate);
    knState.AddOp(XnlOpCode.Env_DeclareLocalVar, varName);
    knState.OpBatchCommit();
    return 1;
  }

}