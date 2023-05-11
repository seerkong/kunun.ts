import { KnOpCode } from "../KnOpCode";
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
  private RunnableFibers: Fiber[] = [];
  private IdleFibers: Fiber[] = [];
  private SuspendedFibers: Fiber[] = [];

  private ResumeEventQueue: ResumeFiberToken[] = [];

  constructor() {

  }

  public Copy() : FiberMgr {
    let r = new FiberMgr();
    for (let i = 0; i < this.RunnableFibers.length; i++) {
      let f = this.RunnableFibers[i].Copy();
      r.RunnableFibers.push(f);
    }
    for (let i = 0; i < this.IdleFibers.length; i++) {
      let f = this.IdleFibers[i].Copy();
      r.IdleFibers.push(f);
    }
    for (let i = 0; i < this.SuspendedFibers.length; i++) {
      let f = this.SuspendedFibers[i].Copy();
      r.SuspendedFibers.push(f);
    }
    r.ResumeEventQueue = [];
    return r;
  }

  public AddToSuspendedFibersLast(f: Fiber) {
    this.SuspendedFibers.push(f);
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
    for (let i = 0; i < this.RunnableFibers.length; i++) {
      if (fiberIdSet.has(this.RunnableFibers[i].Id)) {
        r.set(this.RunnableFibers[i].Id, this.RunnableFibers[i]);
      }
    }
    for (let i = 0; i < this.IdleFibers.length; i++) {
      if (fiberIdSet.has(this.IdleFibers[i].Id)) {
        r.set(this.IdleFibers[i].Id, this.IdleFibers[i]);
      }
    }
    for (let i = 0; i < this.SuspendedFibers.length; i++) {
      if (fiberIdSet.has(this.SuspendedFibers[i].Id)) {
        r.set(this.SuspendedFibers[i].Id, this.SuspendedFibers[i]);
      }
    }
    return r;
  }

  public GetFiberById(fiberId: number): Fiber {
    let fiberIdToDetailMap: Map<number, Fiber> = this.GetFiberByIds([fiberId])
    return fiberIdToDetailMap.get(fiberId);
  }

  public SwitchFiber(toFiberId: number, oldFiberToState: FiberState) {
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
    let updatedSuspendedFibers: Fiber[] = excludedFibers[2];

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
          updatedSuspendedFibers.push(currentFiber);
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
        updatedSuspendedFibers.push(toFiber);
        break;
      case FiberState.Dead:
      default:
        // DO NOTHING
        break;
    }

    this.RunnableFibers = updatedRunnableFibers;
    this.IdleFibers = updatedIdleFibers;
    this.SuspendedFibers = updatedSuspendedFibers;

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

    this.RunnableFibers = updatedRunnableFibers;
    this.IdleFibers = updatedIdleFibers;
    this.SuspendedFibers = updatedSuspenedFibers;
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

    this.RunnableFibers = updatedRunnableFibers;
    this.IdleFibers = updatedIdleFibers;
    this.SuspendedFibers = updatedSuspenedFibers;
  }

  private ExcludeFibers(excludeFiberIds: number[]): [Fiber[], Fiber[], Fiber[]] {
    let excludeFiberIdSet = new Set<number>();
    for (let i = 0; i < excludeFiberIds.length; i++) {
      excludeFiberIdSet.add(excludeFiberIds[i]);
    }

    let updatedRunnableFibers: Fiber[] = [];
    for (let i = 0; i < this.RunnableFibers.length; i++) {
      if (!excludeFiberIdSet.has(this.RunnableFibers[i].Id)) {
        updatedRunnableFibers.push(this.RunnableFibers[i]);
      }
    }

    let updatedIdleFibers: Fiber[] = [];
    for (let i = 0; i < this.IdleFibers.length; i++) {
      if (!excludeFiberIdSet.has(this.IdleFibers[i].Id)) {
        updatedIdleFibers.push(this.IdleFibers[i]);
      }
    }

    let updatedSuspenedFibers: Fiber[] = [];
    for (let i = 0; i < this.SuspendedFibers.length; i++) {
      if (!excludeFiberIdSet.has(this.SuspendedFibers[i].Id)) {
        updatedSuspenedFibers.push(this.SuspendedFibers[i]);
      }
    }

    return [updatedRunnableFibers, updatedIdleFibers, updatedSuspenedFibers];
  }

  public AddResumeFiberEvent(resumeToken: ResumeFiberToken) {
    // TODO 验证token是否是被用过了
    this.ResumeEventQueue.push(resumeToken);
  }


  public async WaitAndConsumeResumeTokenAsync() {
    let maxSleepSeconds = 30;
    let sleepTimeInMillis = 200;
    let maxSleepCount = 1000 * maxSleepSeconds / sleepTimeInMillis;
    let sleepCount = 1;
    while (sleepCount < maxSleepCount && this.ResumeEventQueue.length == 0) {
      // console.log('before sleep, sleepCount ' + sleepCount);
      await sleep(200);
      // console.log('after sleep, sleepCount ' + sleepCount);
      sleepCount += 1;
    }
    if (sleepCount >= maxSleepCount) {
      throw new Error("sleep exceed max time")
    }
    let resumeFiberToken: ResumeFiberToken = this.ResumeEventQueue.shift();

    let fiber: Fiber = this.GetFiberById(resumeFiberToken.FiberId);

    // 切换fiber, 将current fiber更新为resume fiber, 同时更新状态
    this.SwitchFiber(fiber.Id, FiberState.Idle);

    fiber.OperandStack.PushItems(resumeFiberToken.Result);

    // 如果resume前需要执行一些指令，在这里添加
    let beforeResumeOps = resumeFiberToken.BeforeResumeOps;
    fiber.InstructionStack.ReversePushItems(beforeResumeOps);
  }

  public WaitAndConsumeResumeTokenSync() {
    if (this.ResumeEventQueue.length == 0) {
      return;
    }
    let resumeFiberToken: ResumeFiberToken = this.ResumeEventQueue.shift();

    let fiber: Fiber = this.GetFiberById(resumeFiberToken.FiberId);

    // 切换fiber, 将current fiber更新为resume fiber, 同时更新状态
    this.SwitchFiber(fiber.Id, FiberState.Idle);

    fiber.OperandStack.PushItems(resumeFiberToken.Result);

    // 如果resume前需要执行一些指令，在这里添加
    let beforeResumeOps = resumeFiberToken.BeforeResumeOps;
    fiber.InstructionStack.ReversePushItems(beforeResumeOps);
  }



  public GetRunnableFibers(): Fiber[] {
    return this.RunnableFibers;
  }


  public GetAllFibers(): Fiber[] {
    let r: Fiber[] = [];
    for (let i = 0; i < this.RunnableFibers.length; i++) {
      r.push(this.RunnableFibers[i]);
    }
    for (let i = 0; i < this.IdleFibers.length; i++) {
      r.push(this.IdleFibers[i]);
    }
    for (let i = 0; i < this.SuspendedFibers.length; i++) {
      r.push(this.SuspendedFibers[i]);
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
    if (this.RunnableFibers.length <= 0) {
      return null;
    }
    let currentFiber = this.RunnableFibers[0];
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
    if (this.RunnableFibers.length == 0) {
      return null;
    }
    let currentFiber: Fiber = this.GetCurrentFiber();


    if (currentFiber != null) {
      let runnableFibersExcludeRootFiber = [];
      for (let i = 0; i < this.RunnableFibers.length; i++) {
        let runnableFiber = this.RunnableFibers[i];
        if (!runnableFiber.IsRootFiber()) {
          runnableFibersExcludeRootFiber.push(runnableFiber);
        }
      }
      let runnableFiberCountExcludeRootFiber = runnableFibersExcludeRootFiber.length;
      let idleFiberCount = this.IdleFibers.length;
      let suspendedFiberCount = this.SuspendedFibers.length;
      if (currentFiber.IsRootFiber()) {
        if (currentFiber.InstructionStack.PeekTop().OpCode != KnOpCode.OpStack_LandSuccess
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
          this.RunnableFibers = runnableFibersExcludeRootFiber;
          return nextFiber;
        }
      }
      else {
        // 如果当前fiber不是root fiber，继续执行
        return currentFiber;
      }
    }
    else {
      let nextFiber: Fiber = this.RunnableFibers[0];
      nextFiber.SetState(FiberState.Running);
      return nextFiber;
    }
  }

  public ResetAllState() {
    this.RunnableFibers = [];
    this.IdleFibers = [];
    this.SuspendedFibers = [];
    this.ResumeEventQueue = [];
  }

  public OpBatchStart() {
    this.GetCurrentFiber().OpBatchStart();
  }

  public AddOp(opCode: KnOpCode, memo: any = null) {
    this.GetCurrentFiber().AddOp(opCode, memo);
  }

  public OpBatchCommit() {
    this.GetCurrentFiber().OpBatchCommit();
  }

  public AddOpDirectly(opCode: KnOpCode, memo: any = null) {
    this.GetCurrentFiber().AddOpDirectly(opCode, memo);
  }
}