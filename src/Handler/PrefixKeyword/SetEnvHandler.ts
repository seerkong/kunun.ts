import { OpCode } from "../../OpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { StateMgr } from "../../StateMgr";

export class SetEnvHandler {
  public static ExpandSetEnv(stateMgr: StateMgr, nodeToRun: any) {
    
    let varName = nodeToRun.Next.Core.Value;
    let varExpr = nodeToRun.Next.Next.Core;
    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.ValStack_PushFrame);
    stateMgr.AddOp(OpCode.Node_RunNode, varExpr);
    stateMgr.AddOp(OpCode.ValStack_Duplicate);
    stateMgr.AddOp(OpCode.Env_SetLocalEnv, varName);

    stateMgr.AddOp(OpCode.ValStack_PopFrameAndPushTopVal);

    stateMgr.OpBatchCommit();
  }

  public static RunSetEnv(stateMgr: StateMgr, opContState: Instruction) {
    let varName = opContState.Memo;
    let varValue = stateMgr.GetCurrentFiber().OperandStack.PopValue();
    stateMgr.SetVar(varName, varValue);
  }
}