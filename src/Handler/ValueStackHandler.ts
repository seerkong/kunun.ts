import { KnOperandStack } from "../Model/KnOperandStack";
import { NodeHelper } from "Util/NodeHelper";
import { Instruction } from "../StateManagement/InstructionStack";
import { StateMgr } from "../StateMgr";

export class ValueStackHandler {
  public static RunPushFrame(stateMgr: StateMgr, opContState : Instruction) {
    stateMgr.GetCurrentFiber().OperandStack.PushFrame();
  }

  public static RunPushValue(stateMgr: StateMgr, opContState : Instruction) {
    stateMgr.GetCurrentFiber().OperandStack.PushValue(opContState.Memo);
  }

  public static RunPopValue(stateMgr: StateMgr, opContState : Instruction) {
    stateMgr.GetCurrentFiber().OperandStack.PopValue();
  }

  public static RunDuplicate(stateMgr: StateMgr, opContState : Instruction) {
    let lastVal = stateMgr.GetCurrentFiber().OperandStack.PeekTop();
    stateMgr.GetCurrentFiber().OperandStack.PushValue(lastVal);
  }

  public static RunPopFrameAndPushTopVal(stateMgr: StateMgr, opContState : Instruction) {
    stateMgr.GetCurrentFiber().OperandStack.PopFrameAndPushTopVal();
  }

  public static RunPopFrameIgnoreResult(stateMgr: StateMgr, opContState : Instruction) {
    stateMgr.GetCurrentFiber().OperandStack.PopFrameAllValues();
  }
}