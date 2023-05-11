import { KnOpCode } from "../../KnOpCode";
import { KnState } from "../../KnState";
import { KnWord } from "../../Model";

export class DefineToHandler {
  public static ExpandDefineTo(knState: KnState, nodeToRun: any) : number {
    let varName = (nodeToRun.Core as KnWord).Definition.Value;
    
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.ValStack_Duplicate);
    knState.AddOp(KnOpCode.Env_DeclareLocalVar, varName);
    knState.OpBatchCommit();
    return 1;
  }

}