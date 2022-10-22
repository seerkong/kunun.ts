import { KnOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { KnState } from "../../KnState";

// (var a 5)
export class DeclareVarHandler {
  public static ExpandDeclareVar(knState: KnState, nodeToRun: any) {
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.ValStack_PushFrame);
    let varName = nodeToRun.Next.Core.Value;
    let varExpr = null;
    if (nodeToRun.Next.Next != null) {
      varExpr = nodeToRun.Next.Next.Core;
    }
    knState.AddOp(KnOpCode.Node_RunNode, varExpr);
    knState.AddOp(KnOpCode.Env_DeclareLocalVar, varName);

    knState.AddOp(KnOpCode.ValStack_PopFrameAndPushTopVal);

    knState.OpBatchCommit();
  }

  public static RunDeclareVar(knState: KnState, opContState : Instruction) {
    let varName = opContState.Memo;
    let varValue = knState.GetCurrentFiber().OperandStack.PeekTop();
    let curEnv = knState.GetCurEnv();
    curEnv.Define(varName, varValue);
  }
}