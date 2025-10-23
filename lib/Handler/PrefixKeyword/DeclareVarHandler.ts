import { XnlOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";
import { KnWord } from "../../Model";

// [var a 5]
export class DeclareVarHandler {
  public static ExpandDeclareVar(knState: XnlState, nodeToRun: any) {
    let varName = (nodeToRun.Next.Core as KnWord).Value;
    let varExpr = null;
    if (nodeToRun.Next.Next != null) {
      varExpr = nodeToRun.Next.Next.Core;
    }
    
    
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.ValStack_PushFrame);
    knState.AddOp(XnlOpCode.Node_RunNode, varExpr);
    knState.AddOp(XnlOpCode.ValStack_Duplicate);
    knState.AddOp(XnlOpCode.Env_DeclareLocalVar, varName);

    knState.AddOp(XnlOpCode.ValStack_PopFrameAndPushTopVal);

    knState.OpBatchCommit();
  }

  public static RunDeclareVar(knState: XnlState, opContState : Instruction) {
    let varName = opContState.Memo;
    let varValue = knState.GetCurrentFiber().OperandStack.PopValue();
    let curEnv = knState.GetCurEnv();
    curEnv.Define(varName, varValue);
  }
}