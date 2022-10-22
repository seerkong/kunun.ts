import { KnOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { KnState } from "../../KnState";
import { NodeHelper } from "../../Util/NodeHelper";
import { KnKnot } from "../../Model";

export class IfElseHandler {
  public static ExpandIfElse(knState: KnState, nodeToRun: KnKnot) {
    
    let exprAndBlockPairs = [];
    let conditionExpr = nodeToRun.Next.Core;
    let ifTrueBranch = nodeToRun.Next.Block;
    let ifFalseBranch = null;
    if (nodeToRun.Next.Next != null) {
      ifFalseBranch = nodeToRun.Next.Next.Block;
    }
    exprAndBlockPairs.push({
      Expr: conditionExpr,  // condition expr
      Block: ifTrueBranch,  // condition true block
    });
    
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.ValStack_PushFrame);
    knState.AddOp(KnOpCode.Ctrl_IterConditionPairs, {
      ExprAndBlockPairs: exprAndBlockPairs,
      PairIdx: 0,
      FallbackBlock: ifFalseBranch
    });

    knState.AddOp(KnOpCode.ValStack_PopFrameAndPushTopVal);

    knState.OpBatchCommit();
  }
}