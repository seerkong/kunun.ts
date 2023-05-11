import { KnOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { KnState } from "../../KnState";
import { KnWord } from "../../Model";

// [var ~a 5]
export class DeclareVarHandler {
  public static ExpandDeclareVar(knState: KnState, nodeToRun: any) {
    let varName = (nodeToRun.Core as KnWord).Definition.Value;
    let varExpr = null;
    if (nodeToRun.Next != null) {
      varExpr = nodeToRun.Next.Core;
    }
    
    
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.ValStack_PushFrame);
    knState.AddOp(KnOpCode.Node_RunNode, varExpr);
    knState.AddOp(KnOpCode.ValStack_Duplicate);
    knState.AddOp(KnOpCode.Env_DeclareLocalVar, varName);

    knState.AddOp(KnOpCode.ValStack_PopFrameAndPushTopVal);

    knState.OpBatchCommit();
  }

  public static RunDeclareVar(knState: KnState, opContState : Instruction) {
    let varName = opContState.Memo;
    let varValue = knState.GetCurrentFiber().OperandStack.PopValue();
    let curEnv = knState.GetCurEnv();
    curEnv.Define(varName, varValue);
  }
}