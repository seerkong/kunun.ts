import { TableHandler } from "./TableHandler";
import { KnNodeType } from "../../Model/KnType";
import { KnSymbol } from "../../Model/KnSymbol";
import { NodeHelper } from "../../Util/NodeHelper";
import { KnOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { KnState } from "../../KnState";
import { KnKnot } from "../../Model/KnKnot";

export class TryHandler {
  public static ExpandTry(knState: KnState, nodeToRun: any) {
    let tryNode = nodeToRun as KnKnot;
    let tryBlock = tryNode.Block;

    let effectHandlerMap = {};
    let continuationMap = {};

    let iter = tryNode.Next;
    while (iter != null) {
      let coreNode = iter.Core;
      if (NodeHelper.IsWordStr(coreNode, 'handle')) {
        let effectName = iter.Next.Core;
        let effectNameStr = NodeHelper.GetInnerString(effectName);
        let effectHandlerName = iter.Next.Next.Core;
        effectHandlerMap[effectNameStr] = effectHandlerName;
        // continuationMap[effectNameStr] = NodeHelper.Ukn;

        iter = iter.Next.Next.Next;
      }
      else {
        break;
      }
    }

    knState.OpBatchStart();
    knState.AddOp(KnOpCode.Env_DiveLocalEnv);
    knState.AddOp(KnOpCode.Ctrl_MakeContExcludeTopNInstruction, 6);
    knState.AddOp(KnOpCode.Env_SetLocalEnv, '__ContinuationAfterTry');
    knState.AddOp(KnOpCode.Node_RunNode, effectHandlerMap);
    knState.AddOp(KnOpCode.Env_SetLocalEnv, '__EffectHandlerMap');
    // knState.AddOp(OpCode.Node_RunNode, continuationMap);
    // knState.AddOp(OpCode.Env_SetLocalEnv, '__ContinuationMap');
    knState.AddOp(KnOpCode.Node_RunBlock, tryBlock);
    knState.AddOp(KnOpCode.Env_Rise);
    knState.OpBatchCommit();
  }
}