import { OpCode } from "../../OpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { StateMgr } from "../../StateMgr";
import { NodeHelper } from "../../Util/NodeHelper";

export class ConditionHandler {
  public static ExpandCondition(stateMgr: StateMgr, nodeToRun: any) {
    let iter = nodeToRun.Next;
    let exprAndBlockPairs = [];
    let fallbackBlock = null;
    while (iter != null) {
      let clauseCore = iter.Core;
      if (NodeHelper.GetInnerString(clauseCore) === "else") {
        fallbackBlock = iter.Body;
      }
      else {
        exprAndBlockPairs.push({
          Expr: iter.Core,  // condition expr
          Block: iter.Body,  // condition true block
        });
      }
      iter = iter.Next;
    }
    
    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.ValStack_PushFrame);
    stateMgr.AddOp(OpCode.Ctrl_IterConditionPairs, {
      ExprAndBlockPairs: exprAndBlockPairs,
      PairIdx: 0,
      FallbackBlock: fallbackBlock
    });

    stateMgr.AddOp(OpCode.ValStack_PopFrameAndPushTopVal);

    stateMgr.OpBatchCommit();
  }

  public static RunConditionPair(stateMgr: StateMgr, opContState : Instruction) {
    let lastContMemo = opContState.Memo;
    let exprAndBlockPairs : any[] = lastContMemo.ExprAndBlockPairs;
    let pairIdx = lastContMemo.PairIdx;
    let fallbackBlock = lastContMemo.FallbackBlock;
    let condition = exprAndBlockPairs[pairIdx].Expr;
    let ifTrueClause = exprAndBlockPairs[pairIdx].Block;

    let curOpStackTopIdx = stateMgr.GetCurrentFiber().InstructionStack.GetCurTopIdx();

    stateMgr.OpBatchStart();
    // eval condition
    stateMgr.AddOp(OpCode.Node_RunNode, condition);
    // 如果条件判断失败，调到下个条件判断，或者是else分支
    stateMgr.AddOp(OpCode.Ctrl_JumpIfFalse, curOpStackTopIdx + 1);
    // 如果条件判断成功，运行对应的判断成功的分支后，跳转到curOpStackTopIdx,即ValStack_PopFrameAndPushTopVal
    stateMgr.AddOp(OpCode.Node_RunBlock, ifTrueClause);
    stateMgr.AddOp(OpCode.Ctrl_Jump, curOpStackTopIdx);

    // 如果条件判断失败，会执行下面的指令之一
    if (pairIdx < (exprAndBlockPairs.length - 1)) {
      lastContMemo.PairIdx = pairIdx + 1;
      stateMgr.AddOp(OpCode.Ctrl_IterConditionPairs, lastContMemo);
    }
    else {
      stateMgr.AddOp(OpCode.Node_RunBlock, fallbackBlock);
    }
    stateMgr.OpBatchCommit();    
  }
}