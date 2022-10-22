import { KnOperandStack } from "../Model/KnOperandStack";
import { NodeHelper } from "../Util/NodeHelper";
import { Instruction } from "../StateManagement/InstructionStack";
import { KnState } from "../KnState";

export class ValueStackHandler {
  public static RunPushFrame(knState: KnState, opContState : Instruction) {
    knState.GetCurrentFiber().OperandStack.PushFrame();
  }

  public static RunPushValue(knState: KnState, opContState : Instruction) {
    knState.GetCurrentFiber().OperandStack.PushValue(opContState.Memo);
  }

  public static RunPopValue(knState: KnState, opContState : Instruction) {
    knState.GetCurrentFiber().OperandStack.PopValue();
  }

  public static RunDuplicate(knState: KnState, opContState : Instruction) {
    let lastVal = knState.GetCurrentFiber().OperandStack.PeekTop();
    knState.GetCurrentFiber().OperandStack.PushValue(lastVal);
  }

  public static RunPopFrameAndPushTopVal(knState: KnState, opContState : Instruction) {
    knState.GetCurrentFiber().OperandStack.PopFrameAndPushTopVal();
  }

  public static RunPopFrameIgnoreResult(knState: KnState, opContState : Instruction) {
    knState.GetCurrentFiber().OperandStack.PopFrameAllValues();
  }
}