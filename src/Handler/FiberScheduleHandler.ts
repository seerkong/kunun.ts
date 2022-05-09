import { FiberState } from "../StateManagement/Fiber";
import { Instruction, InstructionStack } from "../StateManagement/InstructionStack";
import { StateMgr } from "../StateMgr";

export class FiberScheduleHandler {
  public static RunCurrentFiberToIdle(stateMgr: StateMgr, opContState : Instruction) {
    stateMgr.FiberMgr.CurrentFiberToIdle();
  }

  public static RunCurrentFiberToSuspended(stateMgr: StateMgr, opContState : Instruction) {
    stateMgr.FiberMgr.SuspendCurrentFiber();
  }

  public static RunAwakenMultiFibers(stateMgr: StateMgr, opContState : Instruction) {
    let globalEnv = stateMgr.GetGlobalEnv();
    let fiberIds = opContState.Memo;
    stateMgr.FiberMgr.BatchUpdateFiberState(fiberIds, FiberState.Runnable);
  }

  // memo 需要有  ChangeCurrentFiberToState 字段
  public static RunYieldToParentAndChangeCurrentFiberState(stateMgr: StateMgr, opContState : Instruction) {
    let currentFiber = stateMgr.GetCurrentFiber();
    let parentFiberId = currentFiber.GetParentFiberId();
    // 挂起当前流程，继续执行父fiber流程
    stateMgr.FiberMgr.SwitchToFiberById(parentFiberId, opContState.Memo.ChangeCurrentFiberToState);
  }

  // memo 需要有 YieldToFiberId , ChangeCurrentFiberToState 字段
  // 会将当前 operand stack中的value, push到目标 fiber的 operand stack中
  public static RunYieldToFiberAndChangeCurrentFiberState(stateMgr: StateMgr, opContState : Instruction) {
    let toFiberId = opContState.Memo.YieldToFiberId;
    // let toFiberState = opContState.Memo.ChangeToFiberToState;
    let currentToState = opContState.Memo.ChangeCurrentFiberToState;
    // 原fiber 的传参
    let stackValues = stateMgr.GetCurrentFiber().OperandStack.PopFrameAllValues();

    // 挂起当前流程，继续执行父fiber流程
    stateMgr.FiberMgr.SwitchToFiberById(toFiberId, currentToState);
    // 传参给新fiber
    stateMgr.GetCurrentFiber().OperandStack.PushItems(stackValues)
  }


  public static RunFinalizeFiber(stateMgr: StateMgr, opContState : Instruction) {
    let currentFiber = stateMgr.GetCurrentFiber();
    // 挂起当前流程，由调度算法决定下一个指令执行哪一个fiber
    stateMgr.FiberMgr.SwitchFiberState(currentFiber, FiberState.Dead, null);
  }

}