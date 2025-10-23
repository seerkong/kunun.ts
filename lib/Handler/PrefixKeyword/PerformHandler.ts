
import { KnNodeType } from "../../Model/KnNodeType";
import { KnKnot } from "../../Model/KnKnot";
import { KnSymbol } from "../../Model/KnSymbol";
import { KnNodeHelper } from "../../Util/KnNodeHelper";
import { XnlOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";

export class PerformHandler {
  public static ExpandPerform(knState: XnlState, nodeToRun: any) {
    let performNode = nodeToRun as KnKnot;
    let effectName = performNode.Next?.Core;
    let effectArgs = performNode.Next?.Params?.Value;
    let effectNameStr = KnNodeHelper.GetInnerString(effectName);
    let effectHandlerMap = knState.Lookup('__EffectHandlerMap');
    let effectHandler = effectHandlerMap[effectNameStr];

    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.ValStack_PushFrame);
    knState.AddOp(XnlOpCode.Env_DiveLocalEnv);
    knState.AddOp(XnlOpCode.Ctrl_MakeContExcludeTopNInstruction, (effectArgs?.length ?? 0) + 2);
    if (effectArgs) {
      for (let i = 0; i < effectArgs.length; i++) {
        knState.AddOp(XnlOpCode.Node_RunNode, effectArgs[i]);
      }
    }
    knState.AddOp(XnlOpCode.ValStack_PushValue, effectHandler);
    knState.AddOp(XnlOpCode.Ctrl_ApplyToFrameTop);
    knState.AddOp(XnlOpCode.Env_Rise);
    knState.AddOp(XnlOpCode.ValStack_PopFrameAndPushTopVal);

    knState.OpBatchCommit();
  }
}