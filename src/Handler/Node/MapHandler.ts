import { OpCode } from "../../OpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { StateMgr } from "../../StateMgr";

export class MapHandler {
  public static ExpandOpenMap(stateMgr: StateMgr, nodeToRun: any) {
    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.ValStack_PushFrame);
    for (let key in nodeToRun) {
      stateMgr.AddOp(OpCode.Node_RunNode, key);
      stateMgr.AddOp(OpCode.Node_RunNode, nodeToRun[key]);
    }

    stateMgr.AddOp(OpCode.Node_MakeMap);
    stateMgr.AddOp(OpCode.ValStack_PopFrameAndPushTopVal);
    stateMgr.OpBatchCommit();
  }

  public static RunMakeMap(stateMgr: StateMgr, opContState : Instruction) {
    let evaledNodes = stateMgr.GetCurrentFiber().OperandStack.PeekAndClearFrameAllValues();
    let result = {};
    for (let i = 0; i < evaledNodes.length; i = i + 2) {
      let key = evaledNodes[i];
      let val = evaledNodes[i + 1];
      result[key] = val;
    }
    stateMgr.AddOpDirectly(OpCode.ValStack_PushValue, result);
  }
}