import { Instruction } from "../../StateManagement/InstructionStack";
import { KnOpCode } from "../../KnOpCode";
import { KnState } from "../../KnState";
import { NodeHelper } from "../../Util/NodeHelper";
import { KnWord } from "../../Model/KnWord";

export class SelfUpdate {
  public static SelfUpdate_PlusOne(knState: KnState, nodeToRun: any) {
    let varName = nodeToRun.Next.Core.Value;
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.Node_RunNode, new KnWord(varName));
    knState.AddOp(KnOpCode.ValStack_PushValue, 1);
    knState.AddOp(KnOpCode.Node_RunNode, new KnWord('+'));
    knState.AddOp(KnOpCode.Ctrl_ApplyToFrameTop);
    knState.AddOp(KnOpCode.ValStack_Duplicate);
    knState.AddOp(KnOpCode.Env_SetLocalEnv, varName);
    knState.OpBatchCommit();
  }
  public static SelfUpdate_MinusOne(knState: KnState, nodeToRun: any) {
    let varName = nodeToRun.Next.Core.Value;
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.Node_RunNode, new KnWord(varName));
    knState.AddOp(KnOpCode.ValStack_PushValue, 1);
    knState.AddOp(KnOpCode.Node_RunNode, new KnWord('-'));
    knState.AddOp(KnOpCode.Ctrl_ApplyToFrameTop);
    knState.AddOp(KnOpCode.ValStack_Duplicate);
    knState.AddOp(KnOpCode.Env_SetLocalEnv, varName);
    knState.OpBatchCommit();
  }
  public static SelfUpdate_Add(knState: KnState, nodeToRun: any) {
    let varName = nodeToRun.Next.Core.Value;
    let varExpr = nodeToRun.Next.Next.Core;
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.Node_RunNode, new KnWord(varName));
    knState.AddOp(KnOpCode.Node_RunNode, varExpr);
    knState.AddOp(KnOpCode.Node_RunNode, new KnWord('+'));
    knState.AddOp(KnOpCode.Ctrl_ApplyToFrameTop);
    knState.AddOp(KnOpCode.ValStack_Duplicate);
    knState.AddOp(KnOpCode.Env_SetLocalEnv, varName);
    knState.OpBatchCommit();
  }
  public static SelfUpdate_Minus(knState: KnState, nodeToRun: any) {
    let varName = nodeToRun.Next.Core.Value;
    let varExpr = nodeToRun.Next.Next.Core;
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.Node_RunNode, new KnWord(varName));
    knState.AddOp(KnOpCode.Node_RunNode, varExpr);
    knState.AddOp(KnOpCode.Node_RunNode, new KnWord('-'));
    knState.AddOp(KnOpCode.Ctrl_ApplyToFrameTop);
    knState.AddOp(KnOpCode.ValStack_Duplicate);
    knState.AddOp(KnOpCode.Env_SetLocalEnv, varName);
    knState.OpBatchCommit();
  }
  public static SelfUpdate_Multiply(knState: KnState, nodeToRun: any) {
    let varName = nodeToRun.Next.Core.Value;
    let varExpr = nodeToRun.Next.Next.Core;
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.Node_RunNode, new KnWord(varName));
    knState.AddOp(KnOpCode.Node_RunNode, varExpr);
    knState.AddOp(KnOpCode.Node_RunNode, new KnWord('*'));
    knState.AddOp(KnOpCode.Ctrl_ApplyToFrameTop);
    knState.AddOp(KnOpCode.ValStack_Duplicate);
    knState.AddOp(KnOpCode.Env_SetLocalEnv, varName);
    knState.OpBatchCommit();
  }
  public static SelfUpdate_Divide(knState: KnState, nodeToRun: any) {
    let varName = nodeToRun.Next.Core.Value;
    let varExpr = nodeToRun.Next.Next.Core;
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.Node_RunNode, new KnWord(varName));
    knState.AddOp(KnOpCode.Node_RunNode, varExpr);
    knState.AddOp(KnOpCode.Node_RunNode, new KnWord('/'));
    knState.AddOp(KnOpCode.Ctrl_ApplyToFrameTop);
    knState.AddOp(KnOpCode.ValStack_Duplicate);
    knState.AddOp(KnOpCode.Env_SetLocalEnv, varName);
    knState.OpBatchCommit();
  }
}