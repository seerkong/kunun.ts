import { ContinuationHandler } from "../../Handler/ContinuationHandler";
import { OpCode } from "../../OpCode";
import { Env } from "../../StateManagement/Env";
import { Instruction } from "../../StateManagement/InstructionStack";
import { StateMgr } from "../../StateMgr";
import { NodeHelper } from "../../Util/NodeHelper";

export class ForeachHandler {
  public static ExpandForeach(stateMgr: StateMgr, nodeToRun: any) {
    let itemVarName = NodeHelper.GetInnerString(nodeToRun.Next.Core);
    let collectionVarWord = nodeToRun.Next.Next.Next.Core;
    let loopBody = nodeToRun.Next.Next.Next.Body;

    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.ValStack_PushFrame);
    stateMgr.AddOp(OpCode.Env_DiveLocalEnv);
    stateMgr.AddOp(OpCode.Ctrl_MakeContExcludeTopNInstruction, 3);
    stateMgr.AddOp(OpCode.Env_SetLocalEnv, 'break');
    stateMgr.AddOp(OpCode.Node_RunNode, collectionVarWord);
    let iterMemo = {
      Index: 0,
      LoopBody: loopBody,
      ItemVarName: itemVarName
    };
    stateMgr.AddOp(OpCode.Ctrl_IterForEachLoop, iterMemo);
    stateMgr.AddOp(OpCode.Env_Rise);
    stateMgr.AddOp(OpCode.ValStack_PopFrameAndPushTopVal);

    stateMgr.OpBatchCommit();
  }

  public static RunIterForeachLoop(stateMgr: StateMgr, opContState : Instruction) {
    let lastMemo = opContState.Memo;
    let index = lastMemo.Index;
    let loopBody = lastMemo.LoopBody;
    let itemVarName = lastMemo.ItemVarName;
    let collection: any[] = stateMgr.GetCurrentFiber().OperandStack.PeekTop();

    stateMgr.OpBatchStart();
    if (index <= (collection.length - 1)) {
      let currentEnv : Env = stateMgr.GetCurEnv();
      currentEnv.Define(itemVarName, collection[index]);
      stateMgr.AddOp(OpCode.Ctrl_MakeContExcludeTopNInstruction, 3);
      stateMgr.AddOp(OpCode.Env_SetLocalEnv, 'continue');
      stateMgr.AddOp(OpCode.Node_RunBlock, loopBody);
      stateMgr.AddOp(OpCode.ValStack_PopValue);
      stateMgr.AddOp(OpCode.Ctrl_IterForEachLoop, {
        Index: index + 1,
        LoopBody: loopBody,
        ItemVarName: itemVarName
      });
    }
    stateMgr.OpBatchCommit();
  }
}