import { Instruction } from "../../StateManagement/InstructionStack";
import { XnlOpCode } from "../../KnOpCode";
import XnlState from "../../KnState";
import { KnNodeHelper } from "../../Util/KnNodeHelper";
import { KnWord } from "../../Model/KnWord";

export class SelfUpdate {
  public static SelfUpdate_PlusOne(knState: XnlState, nodeToRun: any) {
    let varName = nodeToRun.Next.Core.Value;
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.Node_RunNode, new KnWord(varName));
    knState.AddOp(XnlOpCode.ValStack_PushValue, 1);
    knState.AddOp(XnlOpCode.Node_RunNode, new KnWord('+'));
    knState.AddOp(XnlOpCode.Ctrl_ApplyToFrameTop);
    knState.AddOp(XnlOpCode.ValStack_Duplicate);
    knState.AddOp(XnlOpCode.Env_SetLocalEnv, varName);
    knState.OpBatchCommit();
  }
  public static SelfUpdate_MinusOne(knState: XnlState, nodeToRun: any) {
    let varName = nodeToRun.Next.Core.Value;
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.Node_RunNode, new KnWord(varName));
    knState.AddOp(XnlOpCode.ValStack_PushValue, 1);
    knState.AddOp(XnlOpCode.Node_RunNode, new KnWord('-'));
    knState.AddOp(XnlOpCode.Ctrl_ApplyToFrameTop);
    knState.AddOp(XnlOpCode.ValStack_Duplicate);
    knState.AddOp(XnlOpCode.Env_SetLocalEnv, varName);
    knState.OpBatchCommit();
  }
  public static SelfUpdate_Add(knState: XnlState, nodeToRun: any) {
    let varName = nodeToRun.Next.Core.Value;
    let varExpr = nodeToRun.Next.Next.Core;
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.Node_RunNode, new KnWord(varName));
    knState.AddOp(XnlOpCode.Node_RunNode, varExpr);
    knState.AddOp(XnlOpCode.Node_RunNode, new KnWord('+'));
    knState.AddOp(XnlOpCode.Ctrl_ApplyToFrameTop);
    knState.AddOp(XnlOpCode.ValStack_Duplicate);
    knState.AddOp(XnlOpCode.Env_SetLocalEnv, varName);
    knState.OpBatchCommit();
  }
  public static SelfUpdate_Minus(knState: XnlState, nodeToRun: any) {
    let varName = nodeToRun.Next.Core.Value;
    let varExpr = nodeToRun.Next.Next.Core;
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.Node_RunNode, new KnWord(varName));
    knState.AddOp(XnlOpCode.Node_RunNode, varExpr);
    knState.AddOp(XnlOpCode.Node_RunNode, new KnWord('-'));
    knState.AddOp(XnlOpCode.Ctrl_ApplyToFrameTop);
    knState.AddOp(XnlOpCode.ValStack_Duplicate);
    knState.AddOp(XnlOpCode.Env_SetLocalEnv, varName);
    knState.OpBatchCommit();
  }
  public static SelfUpdate_Multiply(knState: XnlState, nodeToRun: any) {
    let varName = nodeToRun.Next.Core.Value;
    let varExpr = nodeToRun.Next.Next.Core;
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.Node_RunNode, new KnWord(varName));
    knState.AddOp(XnlOpCode.Node_RunNode, varExpr);
    knState.AddOp(XnlOpCode.Node_RunNode, new KnWord('*'));
    knState.AddOp(XnlOpCode.Ctrl_ApplyToFrameTop);
    knState.AddOp(XnlOpCode.ValStack_Duplicate);
    knState.AddOp(XnlOpCode.Env_SetLocalEnv, varName);
    knState.OpBatchCommit();
  }
  public static SelfUpdate_Divide(knState: XnlState, nodeToRun: any) {
    let varName = nodeToRun.Next.Core.Value;
    let varExpr = nodeToRun.Next.Next.Core;
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.Node_RunNode, new KnWord(varName));
    knState.AddOp(XnlOpCode.Node_RunNode, varExpr);
    knState.AddOp(XnlOpCode.Node_RunNode, new KnWord('/'));
    knState.AddOp(XnlOpCode.Ctrl_ApplyToFrameTop);
    knState.AddOp(XnlOpCode.ValStack_Duplicate);
    knState.AddOp(XnlOpCode.Env_SetLocalEnv, varName);
    knState.OpBatchCommit();
  }
}