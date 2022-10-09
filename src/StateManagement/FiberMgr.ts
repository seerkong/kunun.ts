import { OpCode } from "../OpCode";
import { Fiber, FiberState } from "./Fiber";
import { Instruction } from "./InstructionStack";

function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}


export class ResumeFiberToken {
  public FiberId: number;
  // public IsUsed: boolean = false;
  public Result: any[];
  public BeforeResumeOps : Instruction[];

  constructor(fiberId, result, beforeResumeOps: Instruction[] = []) {
    this.FiberId = fiberId;
    this.Result = result;
    this.BeforeResumeOps = beforeResumeOps;
  }
}

export class FiberMgr {
  private runnableFibers: Fiber[] = [];
  private idleFibers: Fiber[] = [];
  private suspendedFibers: Fiber[] = [];

  private resumeEventQueue: ResumeFiberToken[] = [];

  constructor() {

  }

  public AddToSuspendedFibersLast(f: Fiber) {
    this.suspendedFibers.push(f);
  }

  public CurrentFiberToIdle(): ResumeFiberToken {
    let fiber: Fiber = this.GetCurrentFiber();
    this.SwitchFiberState(fiber, FiberState.Idle, null);
    // fiber.SetState(FiberState.Idle);

    // this.idleFibers.push(fiber);

    let r = new ResumeFiberToken(fiber.Id, []);
    return r;
  }

  public SuspendCurrentFiber(): ResumeFiberToken {
    let fiber: Fiber = this.GetCurrentFiber();

    this.SwitchFiberState(fiber, FiberState.Suspended, null);

    // fiber.SetState(FiberState.Suspended);

    // this.suspendedFibers.push(fiber);

    let r = new ResumeFiberToken(fiber.Id, []);
    return r;
  }

  public GetFiberByIds(fiberIds: number[]): Map<number, Fiber> {

    let fiberIdSet = new Set();
    for (let i = 0; i < fiberIds.length; i++) {
      fiberIdSet.add(fiberIds[i]);
    }
    let r = new Map<number, Fiber>();
    for (let i = 0; i < this.runnableFibers.length; i++) {
      if (fiberIdSet.has(this.runnableFibers[i].Id)) {
        r.set(this.runnableFibers[i].Id, this.runnableFibers[i]);
      }
    }
    for (let i = 0; i < this.idleFibers.length; i++) {
      if (fiberIdSet.has(this.idleFibers[i].Id)) {
        r.set(this.idleFibers[i].Id, this.idleFibers[i]);
      }
    }
    for (let i = 0; i < this.suspendedFibers.length; i++) {
      if (fiberIdSet.has(this.suspendedFibers[i].Id)) {
        r.set(this.suspendedFibers[i].Id, this.suspendedFibers[i]);
      }
    }
    return r;
  }

  public GetFiberById(fiberId: number): Fiber {
    let fiberIdToDetailMap: Map<number, Fiber> = this.GetFiberByIds([fiberId])
    return fiberIdToDetailMap.get(fiberId);
  }

  public SwitchToFiberById(toFiberId: number, oldFiberToState: FiberState) {
    let toFiber: Fiber = this.GetFiberById(toFiberId);
    if (toFiber == null) {
      throw new Error("switch to a fiber not exist");
    }
    this.SwitchFiberState(toFiber, FiberState.Running, oldFiberToState);
  }

  public SwitchFiberState(toFiber: Fiber, toFiberToState: FiberState, oldFiberToState: FiberState) {
    let currentFiber: Fiber = this.GetCurrentFiber();
    let excludeFiberIds = [];
    excludeFiberIds.push(toFiber.Id);

    if (currentFiber != null && currentFiber.Id !== toFiber.Id) {
      excludeFiberIds.push(currentFiber.Id);
    }

    // 在备选fibers中移除toFiber, 再添加原来运行的fiber

    let excludedFibers: [Fiber[], Fiber[], Fiber[]] = this.ExcludeFibers(excludeFiberIds);
    let updatedRunnableFibers: Fiber[] = excludedFibers[0];
    let updatedIdleFibers: Fiber[] = excludedFibers[1];
    let updatedSuspenedFibers: Fiber[] = excludedFibers[2];

    if (currentFiber !== null && oldFiberToState != null && currentFiber.Id !== toFiber.Id) {
      currentFiber.SetState(oldFiberToState);
      switch (oldFiberToState) {
        case FiberState.Runnable:
        case FiberState.Running:
          updatedRunnableFibers.push(currentFiber);
          break;
        case FiberState.Idle:
          updatedIdleFibers.push(currentFiber);
          break;
        case FiberState.Suspended:
          updatedSuspenedFibers.push(currentFiber);
          break;
        case FiberState.Dead:
        default:
          // DO NOTHING
          break;
      }
    }
    toFiber.SetState(toFiberToState);
    switch (toFiberToState) {
      case FiberState.Runnable:
        updatedRunnableFibers.push(toFiber);
        break;
      case FiberState.Running:
        updatedRunnableFibers.unshift(toFiber);
        break;
      case FiberState.Idle:
        updatedIdleFibers.push(toFiber);
        break;
      case FiberState.Suspended:
        updatedSuspenedFibers.push(toFiber);
        break;
      case FiberState.Dead:
      default:
        // DO NOTHING
        break;
    }

    this.runnableFibers = updatedRunnableFibers;
    this.idleFibers = updatedIdleFibers;
    this.suspendedFibers = updatedSuspenedFibers;

  }



  public FinalizeFiber(fiber: Fiber) {
    if (fiber.IsRootFiber()) {
      return;
    }
    fiber.SetState(FiberState.Dead);

    // TODO 触发 env 垃圾收集
    let excludeFiberIds = [fiber.Id];
    let excludedFibers: [Fiber[], Fiber[], Fiber[]] = this.ExcludeFibers(excludeFiberIds);

    let updatedRunnableFibers: Fiber[] = excludedFibers[0];
    let updatedIdleFibers: Fiber[] = excludedFibers[1];
    let updatedSuspenedFibers: Fiber[] = excludedFibers[2];

    this.runnableFibers = updatedRunnableFibers;
    this.idleFibers = updatedIdleFibers;
    this.suspendedFibers = updatedSuspenedFibers;
  }


  public BatchUpdateFiberState(fiberIds: number[], toState: FiberState) {
    let fiberIdToDetailMap: Map<number, Fiber> = this.GetFiberByIds(fiberIds);
    let excludedFibers: [Fiber[], Fiber[], Fiber[]] = this.ExcludeFibers(fiberIds);

    let updatedRunnableFibers: Fiber[] = excludedFibers[0];
    let updatedIdleFibers: Fiber[] = excludedFibers[1];
    let updatedSuspenedFibers: Fiber[] = excludedFibers[2];


    fiberIdToDetailMap.forEach((fiber, fiberId) => {
      fiber.SetState(toState);
      switch (toState) {
        case FiberState.Runnable:
        case FiberState.Running:
          updatedRunnableFibers.push(fiber);
          break;
        case FiberState.Idle:
          updatedIdleFibers.push(fiber);
          break;
        case FiberState.Suspended:
          updatedSuspenedFibers.push(fiber);
          break;
        case FiberState.Dead:
        default:
          // DO NOTHING
          break;
      }
    })

    this.runnableFibers = updatedRunnableFibers;
    this.idleFibers = updatedIdleFibers;
    this.suspendedFibers = updatedSuspenedFibers;
  }

  private ExcludeFibers(excludeFiberIds: number[]): [Fiber[], Fiber[], Fiber[]] {
    let excludeFiberIdSet = new Set<number>();
    for (let i = 0; i < excludeFiberIds.length; i++) {
      excludeFiberIdSet.add(excludeFiberIds[i]);
    }

    let updatedRunnableFibers: Fiber[] = [];
    for (let i = 0; i < this.runnableFibers.length; i++) {
      if (!excludeFiberIdSet.has(this.runnableFibers[i].Id)) {
        updatedRunnableFibers.push(this.runnableFibers[i]);
      }
    }

    let updatedIdleFibers: Fiber[] = [];
    for (let i = 0; i < this.idleFibers.length; i++) {
      if (!excludeFiberIdSet.has(this.idleFibers[i].Id)) {
        updatedIdleFibers.push(this.idleFibers[i]);
      }
    }

    let updatedSuspenedFibers: Fiber[] = [];
    for (let i = 0; i < this.suspendedFibers.length; i++) {
      if (!excludeFiberIdSet.has(this.suspendedFibers[i].Id)) {
        updatedSuspenedFibers.push(this.suspendedFibers[i]);
      }
    }

    return [updatedRunnableFibers, updatedIdleFibers, updatedSuspenedFibers];
  }

  public AddResumeFiberEvent(resumeToken: ResumeFiberToken) {
    // TODO 验证token是否是被用过了
    this.resumeEventQueue.push(resumeToken);
  }


  public async WaitAndConsumeResumeToken() {
    let maxSleepSeconds = 30;
    let sleepTimeInMillis = 200;
    let maxSleepCount = 1000 * maxSleepSeconds / sleepTimeInMillis;
    let sleepCount = 1;
    while (sleepCount < maxSleepCount && this.resumeEventQueue.length == 0) {
      // console.log('before sleep, sleepCount ' + sleepCount);
      await sleep(200);
      // console.log('after sleep, sleepCount ' + sleepCount);
      sleepCount += 1;
    }
    if (sleepCount >= maxSleepCount) {
      throw new Error("sleep exceed max time")
    }
    let resumeToken: ResumeFiberToken = this.resumeEventQueue.shift();

    let fiber: Fiber = this.GetFiberById(resumeToken.FiberId);

    // 切换fiber, 将current fiber更新为resume fiber, 同时更新状态
    this.SwitchToFiberById(fiber.Id, FiberState.Idle);

    fiber.OperandStack.PushItems(resumeToken.Result);

    // 如果resume前需要执行一些指令，在这里添加
    let beforeResumeOps = resumeToken.BeforeResumeOps;
    fiber.InstructionStack.ReversePushItems(beforeResumeOps);
  }



  public GetRunnableFibers(): Fiber[] {
    return this.runnableFibers;
  }


  public GetAllFibers(): Fiber[] {
    let r: Fiber[] = [];
    for (let i = 0; i < this.runnableFibers.length; i++) {
      r.push(this.runnableFibers[i]);
    }
    for (let i = 0; i < this.idleFibers.length; i++) {
      r.push(this.idleFibers[i]);
    }
    for (let i = 0; i < this.suspendedFibers.length; i++) {
      r.push(this.suspendedFibers[i]);
    }
    return r;
  }

  // 通过遍历的方式找到main fiber
  public GetRootFiber(): Fiber {
    let allFibers: Fiber[] = this.GetAllFibers();
    for (let i = 0; i < allFibers.length; i++) {
      if (allFibers[i].IsRootFiber()) {
        return allFibers[i];
      }
    }
    return null;
  }


  public GetCurrentFiber(): Fiber {
    // TODO 如果当前 runningFibers 为空的情况
    if (this.runnableFibers.length <= 0) {
      return null;
    }
    let currentFiber = this.runnableFibers[0];
    if (currentFiber.GetState() == FiberState.Running) {
      return currentFiber;
    }
    else {
      return null;
    }
  }

  // 如果当前fiber处于运行状态，返回当前fiber
  // 否则，在备选fiber中选择一个执行
  public GetNextActiveFiber(): Fiber {
    if (this.runnableFibers.length == 0) {
      return null;
    }
    let currentFiber: Fiber = this.GetCurrentFiber();


    if (currentFiber != null) {
      let runnableFibersExcludeRootFiber = [];
      for (let i = 0; i < this.runnableFibers.length; i++) {
        let runnableFiber = this.runnableFibers[i];
        if (!runnableFiber.IsRootFiber()) {
          runnableFibersExcludeRootFiber.push(runnableFiber);
        }
      }
      let runnableFiberCountExcludeRootFiber = runnableFibersExcludeRootFiber.length;
      let idleFiberCount = this.idleFibers.length;
      let suspendedFiberCount = this.suspendedFibers.length;
      if (currentFiber.IsRootFiber()) {
        if (currentFiber.InstructionStack.PeekTop().OpCode != OpCode.OpStack_LandSuccess
          || (runnableFiberCountExcludeRootFiber == 0
            && idleFiberCount == 0
            && suspendedFiberCount == 0)
        ) {
          // root fiber还未走到最后的指令，或者只剩下root fiber
          return currentFiber;
        }
        else {
          // root fiber走到了最后一个指令
          currentFiber.SetState(FiberState.Runnable);
          let nextFiber: Fiber = null;
          if (runnableFiberCountExcludeRootFiber > 0) {
            nextFiber = runnableFibersExcludeRootFiber[0];
            nextFiber.SetState(FiberState.Running);
          }
          runnableFibersExcludeRootFiber.push(currentFiber);
          this.runnableFibers = runnableFibersExcludeRootFiber;
          return nextFiber;
        }
      }
      else {
        // 如果当前fiber不是root fiber，继续执行
        return currentFiber;
      }
    }
    else {
      let nextFiber: Fiber = this.runnableFibers[0];
      nextFiber.SetState(FiberState.Running);
      return nextFiber;
    }
  }

  public ResetAllState() {
    this.runnableFibers = [];
    this.idleFibers = [];
    this.suspendedFibers = [];
    this.resumeEventQueue = [];
  }

  public OpBatchStart() {
    this.GetCurrentFiber().OpBatchStart();
  }

  public AddOp(opCode: OpCode, memo: any = null) {
    this.GetCurrentFiber().AddOp(opCode, memo);
  }

  public OpBatchCommit() {
    this.GetCurrentFiber().OpBatchCommit();
  }

  public AddOpDirectly(opCode: OpCode, memo: any = null) {
    this.GetCurrentFiber().AddOpDirectly(opCode, memo);
  }
}