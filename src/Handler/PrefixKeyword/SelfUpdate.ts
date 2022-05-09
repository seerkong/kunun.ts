import { Instruction } from "../../StateManagement/InstructionStack";
import { OpCode } from "../../OpCode";
import { StateMgr } from "../../StateMgr";
import { NodeHelper } from "../../Util/NodeHelper";
import { KnWord } from "../../Model/KnWord";

export class SelfUpdate {
  public static SelfUpdate_PlusOne(stateMgr: StateMgr, nodeToRun: any) {
    let varName = nodeToRun.Next.Core.Value;
    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.Node_RunNode, new KnWord(varName));
    stateMgr.AddOp(OpCode.ValStack_PushValue, 1);
    stateMgr.AddOp(OpCode.Node_RunNode, new KnWord('+'));
    stateMgr.AddOp(OpCode.Ctrl_ApplyToFrameTop);
    stateMgr.AddOp(OpCode.ValStack_Duplicate);
    stateMgr.AddOp(OpCode.Env_SetLocalEnv, varName);
    stateMgr.OpBatchCommit();
  }
  public static SelfUpdate_MinusOne(stateMgr: StateMgr, nodeToRun: any) {
    let varName = nodeToRun.Next.Core.Value;
    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.Node_RunNode, new KnWord(varName));
    stateMgr.AddOp(OpCode.ValStack_PushValue, 1);
    stateMgr.AddOp(OpCode.Node_RunNode, new KnWord('-'));
    stateMgr.AddOp(OpCode.Ctrl_ApplyToFrameTop);
    stateMgr.AddOp(OpCode.ValStack_Duplicate);
    stateMgr.AddOp(OpCode.Env_SetLocalEnv, varName);
    stateMgr.OpBatchCommit();
  }
  public static SelfUpdate_Add(stateMgr: StateMgr, nodeToRun: any) {
    let varName = nodeToRun.Next.Core.Value;
    let varExpr = nodeToRun.Next.Next.Core;
    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.Node_RunNode, new KnWord(varName));
    stateMgr.AddOp(OpCode.Node_RunNode, varExpr);
    stateMgr.AddOp(OpCode.Node_RunNode, new KnWord('+'));
    stateMgr.AddOp(OpCode.Ctrl_ApplyToFrameTop);
    stateMgr.AddOp(OpCode.ValStack_Duplicate);
    stateMgr.AddOp(OpCode.Env_SetLocalEnv, varName);
    stateMgr.OpBatchCommit();
  }
  public static SelfUpdate_Minus(stateMgr: StateMgr, nodeToRun: any) {
    let varName = nodeToRun.Next.Core.Value;
    let varExpr = nodeToRun.Next.Next.Core;
    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.Node_RunNode, new KnWord(varName));
    stateMgr.AddOp(OpCode.Node_RunNode, varExpr);
    stateMgr.AddOp(OpCode.Node_RunNode, new KnWord('-'));
    stateMgr.AddOp(OpCode.Ctrl_ApplyToFrameTop);
    stateMgr.AddOp(OpCode.ValStack_Duplicate);
    stateMgr.AddOp(OpCode.Env_SetLocalEnv, varName);
    stateMgr.OpBatchCommit();
  }
  public static SelfUpdate_Multiply(stateMgr: StateMgr, nodeToRun: any) {
    let varName = nodeToRun.Next.Core.Value;
    let varExpr = nodeToRun.Next.Next.Core;
    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.Node_RunNode, new KnWord(varName));
    stateMgr.AddOp(OpCode.Node_RunNode, varExpr);
    stateMgr.AddOp(OpCode.Node_RunNode, new KnWord('*'));
    stateMgr.AddOp(OpCode.Ctrl_ApplyToFrameTop);
    stateMgr.AddOp(OpCode.ValStack_Duplicate);
    stateMgr.AddOp(OpCode.Env_SetLocalEnv, varName);
    stateMgr.OpBatchCommit();
  }
  public static SelfUpdate_Divide(stateMgr: StateMgr, nodeToRun: any) {
    let varName = nodeToRun.Next.Core.Value;
    let varExpr = nodeToRun.Next.Next.Core;
    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.Node_RunNode, new KnWord(varName));
    stateMgr.AddOp(OpCode.Node_RunNode, varExpr);
    stateMgr.AddOp(OpCode.Node_RunNode, new KnWord('/'));
    stateMgr.AddOp(OpCode.Ctrl_ApplyToFrameTop);
    stateMgr.AddOp(OpCode.ValStack_Duplicate);
    stateMgr.AddOp(OpCode.Env_SetLocalEnv, varName);
    stateMgr.OpBatchCommit();
  }
}