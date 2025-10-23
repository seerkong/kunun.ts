import { XnlOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";
import { KnWord } from "../../Model";

export class SetEnvHandler {
  public static ExpandSetEnv(knState: XnlState, nodeToRun: any) {
    let varName = (nodeToRun.Next.Core as KnWord).Value;
    let varExpr = nodeToRun.Next.Next.Core;
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.ValStack_PushFrame);
    knState.AddOp(XnlOpCode.Node_RunNode, varExpr);
    knState.AddOp(XnlOpCode.ValStack_Duplicate);
    knState.AddOp(XnlOpCode.Env_SetLocalEnv, varName);

    knState.AddOp(XnlOpCode.ValStack_PopFrameAndPushTopVal);

    knState.OpBatchCommit();
  }

  public static RunSetEnv(knState: XnlState, opContState: Instruction) {
    let varName = opContState.Memo;
    let varValue = knState.GetCurrentFiber().OperandStack.PopValue();
    knState.SetVar(varName, varValue);
  }
}