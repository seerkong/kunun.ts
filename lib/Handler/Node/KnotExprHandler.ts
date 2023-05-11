import { KnNodeType } from "../../Model/KnType";
import { NodeHelper } from "../../Util/NodeHelper";
import { KnOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { KnState } from "../../KnState";
import { BlockHandler } from "./BlockHandler";
import { PropertyHandler } from "./PropertyHandler";
import { SubscriptHandler } from "./SubscriptHandler";
import { NodeHandler } from "./NodeHandler";
import { ExtensionRegistry } from "../../ExtensionRegistry";
import { KnKnot } from "../../Model";

export class KnotExprHandler {
  public static ExpandKnotSingleResultSentence(knState: KnState, nodeToRun: any) {
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.ValStack_PushFrame);
    knState.AddOp(KnOpCode.Node_IterEvalKnotClause, nodeToRun);
    knState.AddOp(KnOpCode.ValStack_PopFrameAndPushTopVal);
    knState.OpBatchCommit();
  }

  public static HandleIterEvalKnotClause(knState: KnState, opContState: Instruction) {
    let knot : KnKnot = opContState.Memo;
    let core = knot.Core;
    let nextKnotClause = null;
    if (knot.Next != null) {
      nextKnotClause = knot.Next;
    }

    knState.OpBatchStart();
    if (core == null) {

      if (knot.Block != null) {
        // as a block
        BlockHandler.ExpandBlock(knState, knot.Block)
      }
      else if (knot.Param != null) {
        // curring
        for (let i = 0; i < knot.Param.length; i++) {
          knState.AddOp(KnOpCode.Node_RunNode, knot.Param[i]);
        }
        knState.AddOp(KnOpCode.Ctrl_ApplyToFrameBottom);
      }

    }
    else if (NodeHelper.GetType(core) == KnNodeType.KnWord
      && ExtensionRegistry.IsInfixKeyWord(core.Value)
    ) {
      let keyWordStr = core.Value;
      let instructionExpander = ExtensionRegistry.GetInfixKeywordExpander(keyWordStr);
      let infixKnotCount = instructionExpander.apply(null, [knState, knot]);
      let iter = nextKnotClause;
      for (let i = 1; i < infixKnotCount; i++) {
        iter = iter.Next;
      }
      nextKnotClause = iter;
    }
    else {
      knState.AddOp(KnOpCode.Node_RunNode, core);
      if (knot.SegmentStop === true) {
        // func apply
        knState.AddOp(KnOpCode.Ctrl_ApplyToFrameTop);
      }
      else if (knot.Param != null) {
        // func call
        let args = knot.Param;
        for (let i = 0; i < args.length; i++) {
          knState.AddOp(KnOpCode.Node_RunNode, args[i]);
        }
        knState.AddOp(KnOpCode.Ctrl_ApplyToFrameBottom);
      }
      else if (knot.Attr != null || knot.Block != null) {
        // TODO
      }

    }

    if (nextKnotClause != null) {
      knState.AddOp(KnOpCode.Node_IterEvalKnotClause, nextKnotClause);
    }


    knState.OpBatchCommit();
  }
}