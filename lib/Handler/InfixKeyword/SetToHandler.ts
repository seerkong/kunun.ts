import { XnlOpCode } from "../../KnOpCode";
import XnlState from "../../KnState";
import { KnKnot, KnWord } from "../../Model";

export class SetToHandler {
  public static ExpandSetTo(knState: XnlState, nodeToRun: any) : number{
    let varName = (nodeToRun as KnKnot).Selector;
    
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.ValStack_Duplicate);
    knState.AddOp(XnlOpCode.Env_SetLocalEnv, varName);
    knState.OpBatchCommit();
    return 1;
  }

}