
import { KnNodeType } from "../../Model/KnNodeType";
import { KnSymbol } from "../../Model/KnSymbol";
import { KnNodeHelper } from "../../Util/KnNodeHelper";
import { XnlOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";
import { KnKnot } from "../../Model/KnKnot";

export class TryHandler {
  public static ExpandTry(knState: XnlState, nodeToRun: any) {
    let tryNode = nodeToRun as KnKnot;
    let tryBlock = tryNode.Block;

    let effectHandlerMap = {};
    let continuationMap = {};

    let iter = tryNode.Next;
    while (iter != null) {
      let coreNode = iter.Core;
      if (KnNodeHelper.IsWordStr(coreNode, 'handle')) {
        if (!iter.Next) {
          throw new Error('Expected effect name after handle');
        }
        let effectName = iter.Next.Core;
        let effectNameStr = KnNodeHelper.GetInnerString(effectName);
        if (!iter.Next.Next) {
          throw new Error('Expected effect handler after effect name'); 
        }
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
    knState.AddOp(XnlOpCode.Env_DiveLocalEnv);
    knState.AddOp(XnlOpCode.Ctrl_MakeContExcludeTopNInstruction, 6);
    knState.AddOp(XnlOpCode.Env_SetLocalEnv, '__ContinuationAfterTry');
    knState.AddOp(XnlOpCode.Node_RunNode, effectHandlerMap);
    knState.AddOp(XnlOpCode.Env_SetLocalEnv, '__EffectHandlerMap');
    // knState.AddOp(OpCode.Node_RunNode, continuationMap);
    // knState.AddOp(OpCode.Env_SetLocalEnv, '__ContinuationMap');
    knState.AddOp(XnlOpCode.Node_RunBlock, tryBlock);
    knState.AddOp(XnlOpCode.Env_Rise);
    knState.OpBatchCommit();
  }
}