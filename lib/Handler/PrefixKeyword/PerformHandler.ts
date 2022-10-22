import { TableHandler } from "./TableHandler";
import { KnNodeType } from "../../Model/KnType";
import { KnKnot } from "../../Model/KnKnot";
import { KnSymbol } from "../../Model/KnSymbol";
import { NodeHelper } from "../../Util/NodeHelper";
import { KnOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { KnState } from "../../KnState";

export class PerformHandler {
  public static ExpandPerform(knState: KnState, nodeToRun: any) {
    let performNode = nodeToRun as KnKnot;
    let effectName = performNode.Next.Core;
    let effectArgs = performNode.Next.Param;
    let effectNameStr = NodeHelper.GetInnerString(effectName);
    let effectHandlerMap = knState.Lookup('__EffectHandlerMap');
    let effectHandler = effectHandlerMap[effectNameStr];

    knState.OpBatchStart();
    knState.AddOp(KnOpCode.ValStack_PushFrame);
    knState.AddOp(KnOpCode.Env_DiveLocalEnv);
    knState.AddOp(KnOpCode.Ctrl_MakeContExcludeTopNInstruction, effectArgs.length + 2);
    for (let i = 0; i < effectArgs.length; i++) {
      knState.AddOp(KnOpCode.Node_RunNode, effectArgs[i]);
    }
    knState.AddOp(KnOpCode.ValStack_PushValue, effectHandler);
    knState.AddOp(KnOpCode.Ctrl_ApplyToFrameTop);
    knState.AddOp(KnOpCode.Env_Rise);
    knState.AddOp(KnOpCode.ValStack_PopFrameAndPushTopVal);

    knState.OpBatchCommit();
  }
}