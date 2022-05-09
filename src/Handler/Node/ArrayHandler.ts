import { OpCode } from "../../OpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { StateMgr } from "../../StateMgr";
import { NodeHandler } from "./NodeHandler";

export class ArrayHandler {
  public static ExpandOpenArray(stateMgr: StateMgr, nodeToRun: any) {
    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.ValStack_PushFrame);
    for (let item of nodeToRun) {
      stateMgr.AddOp(OpCode.Node_RunNode, item);
    }

    stateMgr.AddOp(OpCode.Node_MakeVector);
    stateMgr.AddOp(OpCode.ValStack_PopFrameAndPushTopVal);
    stateMgr.OpBatchCommit();
  }

  public static RunMakeArray(stateMgr: StateMgr, opContState : Instruction) {
    let evaledNodes = stateMgr.GetCurrentFiber().OperandStack.PeekAndClearFrameAllValues();
    stateMgr.AddOpDirectly(OpCode.ValStack_PushValue, evaledNodes);
  }
}