import { ContinuationHandler } from "../../Handler/ContinuationHandler";
import { KnOpCode } from "../../KnOpCode";
import { Env } from "../../StateManagement/Env";
import { Instruction } from "../../StateManagement/InstructionStack";
import { KnState } from "../../KnState";
import { NodeHelper } from "../../Util/NodeHelper";
import { KnKnot } from "../../Model";

export class ForeachHandler {
  public static ExpandForeach(knState: KnState, nodeToRun: KnKnot) {
    let itemVarName = NodeHelper.GetInnerString(nodeToRun.Next.Core);
    let collectionVarWord = nodeToRun.Next.Next.Next.Core;
    let loopBody = nodeToRun.Next.Next.Next.Body;

    knState.OpBatchStart();
    knState.AddOp(KnOpCode.ValStack_PushFrame);
    knState.AddOp(KnOpCode.Env_DiveLocalEnv);
    knState.AddOp(KnOpCode.Ctrl_MakeContExcludeTopNInstruction, 3);
    knState.AddOp(KnOpCode.Env_SetLocalEnv, 'break');
    knState.AddOp(KnOpCode.Node_RunNode, collectionVarWord);
    let iterMemo = {
      Index: 0,
      LoopBody: loopBody,
      ItemVarName: itemVarName
    };
    knState.AddOp(KnOpCode.Ctrl_IterForEachLoop, iterMemo);
    knState.AddOp(KnOpCode.Env_Rise);
    knState.AddOp(KnOpCode.ValStack_PopFrameAndPushTopVal);

    knState.OpBatchCommit();
  }

  public static RunIterForeachLoop(knState: KnState, opContState : Instruction) {
    let lastMemo = opContState.Memo;
    let index = lastMemo.Index;
    let loopBody = lastMemo.LoopBody;
    let itemVarName = lastMemo.ItemVarName;
    let collection: any[] = knState.GetCurrentFiber().OperandStack.PeekTop();

    knState.OpBatchStart();
    if (index <= (collection.length - 1)) {
      let currentEnv : Env = knState.GetCurEnv();
      currentEnv.Define(itemVarName, collection[index]);
      knState.AddOp(KnOpCode.Ctrl_MakeContExcludeTopNInstruction, 3);
      knState.AddOp(KnOpCode.Env_SetLocalEnv, 'continue');
      knState.AddOp(KnOpCode.Node_RunBlock, loopBody);
      knState.AddOp(KnOpCode.ValStack_PopValue);
      knState.AddOp(KnOpCode.Ctrl_IterForEachLoop, {
        Index: index + 1,
        LoopBody: loopBody,
        ItemVarName: itemVarName
      });
    }
    knState.OpBatchCommit();
  }
}