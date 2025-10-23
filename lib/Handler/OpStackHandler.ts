import { KnNodeHelper } from "../Util/KnNodeHelper";
import { Instruction } from "../StateManagement/InstructionStack";
import XnlState from "../KnState";

export class OpStackHandler {
  public static RunPop(knState: XnlState, opContState : Instruction) {
    knState.GetCurrentFiber().InstructionStack.PopValue();
  }

  public static RunSwapLeft2Left3(knState: XnlState, opContState : Instruction) {
    // 此时 SwapLeft2Left3 指令已经被pop，curOpStackTopIdx 是SwapLeft2Left3的下一个
    let curOpStackTopIdx = knState.GetCurrentFiber().InstructionStack.GetCurTopIdx();
    knState.GetCurrentFiber().InstructionStack.SwapByIndex(curOpStackTopIdx - 1, curOpStackTopIdx - 2);
  }

  public static RunJump(knState: XnlState, opContState : Instruction) {
    let jumpToIdx = opContState.Memo;
    knState.GetCurrentFiber().InstructionStack.JumpTo(jumpToIdx);
  }

  public static RunJumpIfFalse(knState: XnlState, opContState : Instruction) {
    let jumpToIdx = opContState.Memo;
    let lastVal = knState.GetCurrentFiber().OperandStack.PopValue();
    let boolVal = KnNodeHelper.ToBoolean(lastVal);
    if (!boolVal) {
      knState.GetCurrentFiber().InstructionStack.JumpTo(jumpToIdx);
    }
  }
}