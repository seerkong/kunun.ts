import { KnType } from "../../Model/KnType";
import { NodeHelper } from "../../Util/NodeHelper";
import { OpCode } from "../../OpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { StateMgr } from "../../StateMgr";
import { BlockHandler } from "./BlockHandler";
import { PropertyHandler } from "./PropertyHandler";
import { SubscriptHandler } from "./SubscriptHandler";
import { NodeHandler } from "./NodeHandler";
import { ExtensionRegistry } from "../../ExtensionRegistry";

export class KnotExprHandler {
  public static ExpandKnotSingleResultSentence(stateMgr: StateMgr, nodeToRun: any) {
    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.ValStack_PushFrame);
    stateMgr.AddOp(OpCode.Node_IterEvalKnotClause, nodeToRun);
    stateMgr.AddOp(OpCode.ValStack_PopFrameAndPushTopVal);
    stateMgr.OpBatchCommit();
  }

  public static HandleIterEvalKnotClause(stateMgr: StateMgr, opContState: Instruction) {
    let knot = opContState.Memo;
    let core = knot.Core;

    stateMgr.OpBatchStart();
    if (core == null) {

      if (knot.Body != null) {
        // as a block
        BlockHandler.ExpandBlock(stateMgr, knot.Body)
      }
      else if (knot.Param != null) {
        // curring
        for (let i = 0; i < knot.Param.length; i++) {
          stateMgr.AddOp(OpCode.Node_RunNode, knot.Param[i]);
        }
        stateMgr.AddOp(OpCode.Ctrl_ApplyToFrameBottom);
      }

    }
    else if (NodeHelper.GetType(core) == KnType.Word
      && ExtensionRegistry.IsInfixKeyWord(core.Value)
    ) {
      let keyWordStr = core.Value;
      let instructionExpander = ExtensionRegistry.GetInfixKeywordExpander(keyWordStr);
      instructionExpander.apply(null, [stateMgr, knot]);
    }
    else {
      stateMgr.AddOp(OpCode.Node_RunNode, core);
      if (knot.DoApply === true) {
        // func apply
        stateMgr.AddOp(OpCode.Ctrl_ApplyToFrameTop);
      }
      else if (knot.Param != null) {
        // func call
        let args = knot.Param;
        for (let i = 0; i < args.length; i++) {
          stateMgr.AddOp(OpCode.Node_RunNode, args[i]);
        }
        stateMgr.AddOp(OpCode.Ctrl_ApplyToFrameBottom);
      }
      else if (knot.Header != null || knot.Body != null) {
        stateMgr.AddOp(OpCode.Node_RunNode, knot.Header);
        stateMgr.AddOp(OpCode.Node_RunNode, knot.Body);
        stateMgr.AddOp(OpCode.Ctrl_ApplyMapVectorToBuilder);
      }

    }

    if (knot.Next != null) {
      stateMgr.AddOp(OpCode.Node_IterEvalKnotClause, knot.Next);
    }


    stateMgr.OpBatchCommit();
  }
}