import { ContinuationHandler } from "../../Handler/ContinuationHandler";
import { XnlOpCode } from "../../KnOpCode";
import { Env } from "../../StateManagement/Env";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";
import { KnNodeHelper } from "../../Util/KnNodeHelper";
import { KnKnot } from "../../Model";

export class ForeachHandler {
  public static ExpandForeach(knState: XnlState, nodeToRun: KnKnot) {
    if (!nodeToRun.Next) {
      throw new Error('Invalid foreach syntax: missing item variable name');
    }
    let itemVarName = KnNodeHelper.GetInnerString(nodeToRun.Next.Core);
    
    if (!nodeToRun.Next.Next?.Next) {
      throw new Error('Invalid foreach syntax: missing collection variable');
    }
    let collectionVarWord = nodeToRun.Next.Next.Next.Core;
    let loopBody = nodeToRun.Next.Next.Next.Block;

    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.ValStack_PushFrame);
    knState.AddOp(XnlOpCode.Env_DiveLocalEnv);
    knState.AddOp(XnlOpCode.Ctrl_MakeContExcludeTopNInstruction, 3);
    knState.AddOp(XnlOpCode.Env_SetLocalEnv, 'break');
    knState.AddOp(XnlOpCode.Node_RunNode, collectionVarWord);
    let iterMemo = {
      Index: 0,
      LoopBody: loopBody,
      ItemVarName: itemVarName
    };
    knState.AddOp(XnlOpCode.Ctrl_IterForEachLoop, iterMemo);
    knState.AddOp(XnlOpCode.Env_Rise);
    knState.AddOp(XnlOpCode.ValStack_PopFrameAndPushTopVal);

    knState.OpBatchCommit();
  }

  public static RunIterForeachLoop(knState: XnlState, opContState : Instruction) {
    let lastMemo = opContState.Memo;
    let index = lastMemo.Index;
    let loopBody = lastMemo.LoopBody;
    let itemVarName = lastMemo.ItemVarName;
    let collection: any[] = knState.GetCurrentFiber().OperandStack.PeekTop();

    knState.OpBatchStart();
    if (index <= (collection.length - 1)) {
      let currentEnv : Env = knState.GetCurEnv();
      currentEnv.Define(itemVarName, collection[index]);
      knState.AddOp(XnlOpCode.Ctrl_MakeContExcludeTopNInstruction, 3);
      knState.AddOp(XnlOpCode.Env_SetLocalEnv, 'continue');
      knState.AddOp(XnlOpCode.Node_RunBlock, loopBody);
      knState.AddOp(XnlOpCode.ValStack_PopValue);
      knState.AddOp(XnlOpCode.Ctrl_IterForEachLoop, {
        Index: index + 1,
        LoopBody: loopBody,
        ItemVarName: itemVarName
      });
    }
    knState.OpBatchCommit();
  }
}