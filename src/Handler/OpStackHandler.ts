import { NodeHelper } from "../Util/NodeHelper";
import { Instruction } from "../StateManagement/InstructionStack";
import { StateMgr } from "../StateMgr";

export class OpStackHandler {
  public static RunPop(stateMgr: StateMgr, opContState : Instruction) {
    stateMgr.GetCurrentFiber().InstructionStack.PopValue();
  }

  public static RunRemoveNextNext(stateMgr: StateMgr, opContState : Instruction) {
    let top = stateMgr.GetCurrentFiber().InstructionStack.PopValue();
    stateMgr.GetCurrentFiber().InstructionStack.PopValue();
    stateMgr.GetCurrentFiber().InstructionStack.PushValue(top);
  }

  public static RunSwapLeft2Left3(stateMgr: StateMgr, opContState : Instruction) {
    // 此时 SwapLeft2Left3 指令已经被pop，curOpStackTopIdx 是SwapLeft2Left3的下一个
    let curOpStackTopIdx = stateMgr.GetCurrentFiber().InstructionStack.GetCurTopIdx();
    stateMgr.GetCurrentFiber().InstructionStack.SwapByIndex(curOpStackTopIdx - 1, curOpStackTopIdx - 2);
  }

  public static RunJump(stateMgr: StateMgr, opContState : Instruction) {
    let jumpToIdx = opContState.Memo;
    stateMgr.GetCurrentFiber().InstructionStack.JumpTo(jumpToIdx);
  }

  public static RunJumpIfFalse(stateMgr: StateMgr, opContState : Instruction) {
    let jumpToIdx = opContState.Memo;
    let lastVal = stateMgr.GetCurrentFiber().OperandStack.PopValue();
    let boolVal = NodeHelper.ToBoolean(lastVal);
    if (!boolVal) {
      stateMgr.GetCurrentFiber().InstructionStack.JumpTo(jumpToIdx);
    }
  }
}