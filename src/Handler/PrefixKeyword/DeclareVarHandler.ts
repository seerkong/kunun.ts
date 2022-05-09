import { OpCode } from "../../OpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { StateMgr } from "../../StateMgr";

// (var a 5)
export class DeclareVarHandler {
  public static ExpandDeclareVar(stateMgr: StateMgr, nodeToRun: any) {
    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.ValStack_PushFrame);
    let varName = nodeToRun.Next.Core.Value;
    let varExpr = null;
    if (nodeToRun.Next.Next != null) {
      varExpr = nodeToRun.Next.Next.Core;
    }
    stateMgr.AddOp(OpCode.Node_RunNode, varExpr);
    stateMgr.AddOp(OpCode.Env_DeclareLocalVar, varName);

    stateMgr.AddOp(OpCode.ValStack_PopFrameAndPushTopVal);

    stateMgr.OpBatchCommit();
  }

  public static RunDeclareVar(stateMgr: StateMgr, opContState : Instruction) {
    let varName = opContState.Memo;
    let varValue = stateMgr.GetCurrentFiber().OperandStack.PeekTop();
    let curEnv = stateMgr.GetCurEnv();
    curEnv.Define(varName, varValue);
  }
}