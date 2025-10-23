import { KnNodeType } from "../../Model/KnNodeType";
import { KnNodeHelper } from "../../Util/KnNodeHelper";
import { XnlOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";
import { BlockHandler } from "./BlockHandler";
import { PropertyHandler } from "./PropertyHandler";
import { SubscriptHandler } from "./SubscriptHandler";
import { NodeHandler } from "./NodeHandler";
import { ExtensionRegistry } from "../../ExtensionRegistry";
import { KnKnot, KnTuple } from "../../Model";

export class KnotExprHandler {
  public static ExpandKnotSingleResultSentence(knState: XnlState, nodeToRun: any) {
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.ValStack_PushFrame);
    knState.AddOp(XnlOpCode.Node_IterEvalKnotClause, nodeToRun);
    knState.AddOp(XnlOpCode.ValStack_PopFrameAndPushTopVal);
    knState.OpBatchCommit();
  }

  public static HandleIterEvalKnotClause(knState: XnlState, opContState: Instruction) {
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
      else if (knot.Params != null) {
        let paramTable = knot.Params as KnTuple;
        // curring
        for (let i = 0; i < paramTable.Value.length; i++) {
          knState.AddOp(XnlOpCode.Node_RunNode, paramTable.Value[i]);
        }
        knState.AddOp(XnlOpCode.Ctrl_ApplyToFrameBottom);
      }

    }
    else if (KnNodeHelper.GetType(core) == KnNodeType.Word
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
      knState.AddOp(XnlOpCode.Node_RunNode, core);
      // if (knot.Apply === true) {
      //   // func apply
      //   knState.AddOp(XnlOpCode.Ctrl_ApplyToFrameTop);
      // }
      // else 
      if (knot.Params != null) {
        // func call
        let args = knot.Params as KnTuple;
        for (let i = 0; i < args.Value.length; i++) {
          knState.AddOp(XnlOpCode.Node_RunNode, args[i]);
        }
        knState.AddOp(XnlOpCode.Ctrl_ApplyToFrameBottom);
      }
      else if (knot.Attr != null || knot.Block != null) {
        // TODO
      }

    }

    if (nextKnotClause != null) {
      knState.AddOp(XnlOpCode.Node_IterEvalKnotClause, nextKnotClause);
    }


    knState.OpBatchCommit();
  }
}