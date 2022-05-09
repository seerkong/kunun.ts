import { TableHandler } from "./TableHandler";
import { KnType } from "../../Model/KnType";
import { KnSymbol } from "../../Model/KnSymbol";
import { NodeHelper } from "../../Util/NodeHelper";
import { OpCode } from "../../OpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { StateMgr } from "../../StateMgr";
import { KnKnot } from "../../Model/KnKnot";

export class TryHandler {
  public static ExpandTry(stateMgr: StateMgr, nodeToRun: any) {
    let tryNode = nodeToRun as KnKnot;
    let tryBlock = tryNode.Body;

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

    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.Env_DiveLocalEnv);
    stateMgr.AddOp(OpCode.Ctrl_MakeContExcludeTopNInstruction, 6);
    stateMgr.AddOp(OpCode.Env_SetLocalEnv, '__ContinuationAfterTry');
    stateMgr.AddOp(OpCode.Node_RunNode, effectHandlerMap);
    stateMgr.AddOp(OpCode.Env_SetLocalEnv, '__EffectHandlerMap');
    // stateMgr.AddOp(OpCode.Node_RunNode, continuationMap);
    // stateMgr.AddOp(OpCode.Env_SetLocalEnv, '__ContinuationMap');
    stateMgr.AddOp(OpCode.Node_RunBlock, tryBlock);
    stateMgr.AddOp(OpCode.Env_Rise);
    stateMgr.OpBatchCommit();
  }
}