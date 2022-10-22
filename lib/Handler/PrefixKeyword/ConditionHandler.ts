import { KnOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { KnState } from "../../KnState";
import { NodeHelper } from "../../Util/NodeHelper";
import { KnKnot } from "../../Model";

export class ConditionHandler {
  public static ExpandCondition(knState: KnState, nodeToRun: any) {
    let iter : KnKnot = nodeToRun.Next;
    let exprAndBlockPairs = [];
    let fallbackBlock = null;
    while (iter != null) {
      let clauseCore = iter.Core;
      if (NodeHelper.GetInnerString(clauseCore) === "else") {
        fallbackBlock = iter.Block;
      }
      else {
        exprAndBlockPairs.push({
          Expr: iter.Core,  // condition expr
          Block: iter.Block,  // condition true block
        });
      }
      iter = iter.Next;
    }
    
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.ValStack_PushFrame);
    knState.AddOp(KnOpCode.Ctrl_IterConditionPairs, {
      ExprAndBlockPairs: exprAndBlockPairs,
      PairIdx: 0,
      FallbackBlock: fallbackBlock
    });

    knState.AddOp(KnOpCode.ValStack_PopFrameAndPushTopVal);

    knState.OpBatchCommit();
  }

  public static RunConditionPair(knState: KnState, opContState : Instruction) {
    let lastContMemo = opContState.Memo;
    let exprAndBlockPairs : any[] = lastContMemo.ExprAndBlockPairs;
    let pairIdx = lastContMemo.PairIdx;
    let fallbackBlock = lastContMemo.FallbackBlock;
    let condition = exprAndBlockPairs[pairIdx].Expr;
    let ifTrueClause = exprAndBlockPairs[pairIdx].Block;

    let curOpStackTopIdx = knState.GetCurrentFiber().InstructionStack.GetCurTopIdx();

    knState.OpBatchStart();
    // eval condition
    knState.AddOp(KnOpCode.Node_RunNode, condition);
    // 如果条件判断失败，调到下个条件判断，或者是else分支
    knState.AddOp(KnOpCode.Ctrl_JumpIfFalse, curOpStackTopIdx + 1);
    // 如果条件判断成功，运行对应的判断成功的分支后，跳转到curOpStackTopIdx,即ValStack_PopFrameAndPushTopVal
    knState.AddOp(KnOpCode.Node_RunBlock, ifTrueClause);
    knState.AddOp(KnOpCode.Ctrl_Jump, curOpStackTopIdx);

    // 如果条件判断失败，会执行下面的指令之一
    if (pairIdx < (exprAndBlockPairs.length - 1)) {
      lastContMemo.PairIdx = pairIdx + 1;
      knState.AddOp(KnOpCode.Ctrl_IterConditionPairs, lastContMemo);
    }
    else {
      knState.AddOp(KnOpCode.Node_RunBlock, fallbackBlock);
    }
    knState.OpBatchCommit();    
  }
}