import { FiberState } from "../StateManagement/Fiber";
import { Instruction, InstructionStack } from "../StateManagement/InstructionStack";
import XnlState from "../KnState";

export class FiberScheduleHandler {
  public static RunCurrentFiberToIdle(knState: XnlState, opContState : Instruction) {
    knState.FiberMgr.CurrentFiberToIdle();
  }

  public static RunCurrentFiberToSuspended(knState: XnlState, opContState : Instruction) {
    knState.FiberMgr.SuspendCurrentFiber();
  }

  public static RunAwakenMultiFibers(knState: XnlState, opContState : Instruction) {
    let fiberIds = opContState.Memo;
    knState.FiberMgr.BatchUpdateFiberState(fiberIds, FiberState.Runnable);
  }

  // memo 需要有  ChangeCurrentFiberToState 字段
  public static RunYieldToParentAndChangeCurrentFiberState(knState: XnlState, opContState : Instruction) {
    let currentFiber = knState.GetCurrentFiber();
    let parentFiberId = currentFiber.GetParentFiberId();
    // 挂起当前流程，继续执行父fiber流程
    knState.FiberMgr.SwitchFiber(parentFiberId, opContState.Memo.ChangeCurrentFiberToState);
  }

  // memo 需要有 YieldToFiberId , ChangeCurrentFiberToState 字段
  // 会将当前 operand stack中的value, push到目标 fiber的 operand stack中
  public static RunYieldToFiberAndChangeCurrentFiberState(knState: XnlState, opContState : Instruction) {
    let toFiberId = opContState.Memo.YieldToFiberId;
    // let toFiberState = opContState.Memo.ChangeToFiberToState;
    let currentToState = opContState.Memo.ChangeCurrentFiberToState;
    // 原fiber 的传参
    let stackValues = knState.GetCurrentFiber().OperandStack.PopFrameAllValues();

    // 挂起当前流程，继续执行父fiber流程
    knState.FiberMgr.SwitchFiber(toFiberId, currentToState);
    // 传参给新fiber
    knState.GetCurrentFiber().OperandStack.PushItems(stackValues)
  }


  public static RunFinalizeFiber(knState: XnlState, opContState : Instruction) {
    let currentFiber = knState.GetCurrentFiber();
    // 挂起当前流程，由调度算法决定下一个指令执行哪一个fiber
    knState.FiberMgr.SwitchFiberState(currentFiber, FiberState.Dead, null);
  }

}