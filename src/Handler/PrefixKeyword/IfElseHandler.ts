import { OpCode } from "../../OpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { StateMgr } from "../../StateMgr";
import { NodeHelper } from "../../Util/NodeHelper";

export class IfElseHandler {
  public static ExpandIfElse(stateMgr: StateMgr, nodeToRun: any) {
    
    let exprAndBlockPairs = [];
    let conditionExpr = nodeToRun.Next.Core;
    let ifTrueBranch = nodeToRun.Next.Body;
    let ifFalseBranch = null;
    if (nodeToRun.Next.Next != null) {
      ifFalseBranch = nodeToRun.Next.Next.Body;
    }
    exprAndBlockPairs.push({
      Expr: conditionExpr,  // condition expr
      Block: ifTrueBranch,  // condition true block
    });
    
    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.ValStack_PushFrame);
    stateMgr.AddOp(OpCode.Ctrl_IterConditionPairs, {
      ExprAndBlockPairs: exprAndBlockPairs,
      PairIdx: 0,
      FallbackBlock: ifFalseBranch
    });

    stateMgr.AddOp(OpCode.ValStack_PopFrameAndPushTopVal);

    stateMgr.OpBatchCommit();
  }
}