import { XnlOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";
import { KnNodeHelper } from "../../Util/KnNodeHelper";
import { KnKnot } from "../../Model";

export class IfElseHandler {
  public static ExpandIfElse(knState: XnlState, nodeToRun: KnKnot) {
    let exprAndBlockPairs: { Expr: any; Block: any[] | undefined }[] = [];
    let conditionExpr = nodeToRun.Next?.Core;
    let ifTrueBranch = nodeToRun.Next?.Block;
    let ifFalseBranch : any[] | null = null;
    if (nodeToRun.Next?.Next != null) {
      ifFalseBranch = nodeToRun.Next?.Next?.Block ?? null;
    }
    exprAndBlockPairs.push({
      Expr: conditionExpr,  // condition expr
      Block: ifTrueBranch,  // condition true block
    });
    
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.ValStack_PushFrame);
    knState.AddOp(XnlOpCode.Ctrl_IterConditionPairs, {
      ExprAndBlockPairs: exprAndBlockPairs,
      PairIdx: 0,
      FallbackBlock: ifFalseBranch
    });

    knState.AddOp(XnlOpCode.ValStack_PopFrameAndPushTopVal);

    knState.OpBatchCommit();
  }
}