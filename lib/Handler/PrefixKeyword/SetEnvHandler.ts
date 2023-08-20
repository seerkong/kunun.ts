import { KnOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { KnState } from "../../KnState";
import { KnWord } from "../../Model";

export class SetEnvHandler {
  public static ExpandSetEnv(knState: KnState, nodeToRun: any) {
    let varName = (nodeToRun.Next.Core as KnWord).Value;
    let varExpr = nodeToRun.Next.Next.Core;
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.ValStack_PushFrame);
    knState.AddOp(KnOpCode.Node_RunNode, varExpr);
    knState.AddOp(KnOpCode.ValStack_Duplicate);
    knState.AddOp(KnOpCode.Env_SetLocalEnv, varName);

    knState.AddOp(KnOpCode.ValStack_PopFrameAndPushTopVal);

    knState.OpBatchCommit();
  }

  public static RunSetEnv(knState: KnState, opContState: Instruction) {
    let varName = opContState.Memo;
    let varValue = knState.GetCurrentFiber().OperandStack.PopValue();
    knState.SetVar(varName, varValue);
  }
}