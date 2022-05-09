import { TableHandler } from "./TableHandler";
import { KnType } from "../../Model/KnType";
import { KnKnot } from "../../Model/KnKnot";
import { KnSymbol } from "../../Model/KnSymbol";
import { NodeHelper } from "../../Util/NodeHelper";
import { OpCode } from "../../OpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { StateMgr } from "../../StateMgr";

export class PerformHandler {
  public static ExpandPerform(stateMgr: StateMgr, nodeToRun: any) {
    let performNode = nodeToRun as KnKnot;
    let effectName = performNode.Next.Core;
    let effectArgs = performNode.Next.Param;
    let effectNameStr = NodeHelper.GetInnerString(effectName);
    let effectHandlerMap = stateMgr.Lookup('__EffectHandlerMap');
    let effecthandler = effectHandlerMap[effectNameStr];

    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.ValStack_PushFrame);
    stateMgr.AddOp(OpCode.Env_DiveLocalEnv);
    stateMgr.AddOp(OpCode.Ctrl_MakeContExcludeTopNInstruction, effectArgs.length + 2);
    for (let i = 0; i < effectArgs.length; i++) {
      stateMgr.AddOp(OpCode.Node_RunNode, effectArgs[i]);
    }
    stateMgr.AddOp(OpCode.ValStack_PushValue, effecthandler);
    stateMgr.AddOp(OpCode.Ctrl_ApplyToFrameTop);
    stateMgr.AddOp(OpCode.Env_Rise);
    stateMgr.AddOp(OpCode.ValStack_PopFrameAndPushTopVal);

    stateMgr.OpBatchCommit();
  }
}