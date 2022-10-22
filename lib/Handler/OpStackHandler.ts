import { NodeHelper } from "../Util/NodeHelper";
import { Instruction } from "../StateManagement/InstructionStack";
import { KnState } from "../knState";

export class OpStackHandler {
  public static RunPop(knState: KnState, opContState : Instruction) {
    knState.GetCurrentFiber().InstructionStack.PopValue();
  }

  public static RunSwapLeft2Left3(knState: KnState, opContState : Instruction) {
    // 此时 SwapLeft2Left3 指令已经被pop，curOpStackTopIdx 是SwapLeft2Left3的下一个
    let curOpStackTopIdx = knState.GetCurrentFiber().InstructionStack.GetCurTopIdx();
    knState.GetCurrentFiber().InstructionStack.SwapByIndex(curOpStackTopIdx - 1, curOpStackTopIdx - 2);
  }

  public static RunJump(knState: KnState, opContState : Instruction) {
    let jumpToIdx = opContState.Memo;
    knState.GetCurrentFiber().InstructionStack.JumpTo(jumpToIdx);
  }

  public static RunJumpIfFalse(knState: KnState, opContState : Instruction) {
    let jumpToIdx = opContState.Memo;
    let lastVal = knState.GetCurrentFiber().OperandStack.PopValue();
    let boolVal = NodeHelper.ToBoolean(lastVal);
    if (!boolVal) {
      knState.GetCurrentFiber().InstructionStack.JumpTo(jumpToIdx);
    }
  }
}