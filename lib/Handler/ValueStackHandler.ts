import { KnOperandStack } from "../Model/KnOperandStack";
import { KnNodeHelper } from "../Util/KnNodeHelper";
import { Instruction } from "../StateManagement/InstructionStack";
import XnlState from "../KnState";

export class ValueStackHandler {
  public static RunPushFrame(knState: XnlState, opContState : Instruction) {
    knState.GetCurrentFiber().OperandStack.PushFrame();
  }

  public static RunPushValue(knState: XnlState, opContState : Instruction) {
    knState.GetCurrentFiber().OperandStack.PushValue(opContState.Memo);
  }

  public static RunPopValue(knState: XnlState, opContState : Instruction) {
    knState.GetCurrentFiber().OperandStack.PopValue();
  }

  public static RunDuplicate(knState: XnlState, opContState : Instruction) {
    let lastVal = knState.GetCurrentFiber().OperandStack.PeekTop();
    knState.GetCurrentFiber().OperandStack.PushValue(lastVal);
  }

  public static RunPopFrameAndPushTopVal(knState: XnlState, opContState : Instruction) {
    knState.GetCurrentFiber().OperandStack.PopFrameAndPushTopVal();
  }

  public static RunPopFrameIgnoreResult(knState: XnlState, opContState : Instruction) {
    knState.GetCurrentFiber().OperandStack.PopFrameAllValues();
  }

  public static RunIsTopValTrue(knState: XnlState, opContState : Instruction) {
    let lastVal = knState.GetCurrentFiber().OperandStack.PopValue();
    if (lastVal) {
      knState.GetCurrentFiber().OperandStack.PushValue(true);
    }
    else {
      knState.GetCurrentFiber().OperandStack.PushValue(false);
    }
  }
}