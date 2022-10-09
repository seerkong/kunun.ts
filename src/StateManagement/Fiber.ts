import { OpCode } from "OpCode";
import { CfgNodeCursor } from "./CfgNodeCursor";
import { Instruction, InstructionStack } from "./InstructionStack";
import { OperandStack } from "./OperandStack";


export enum FiberState {
  Runnable,    // 等待配置执行
  Running,    // 正在进行中
  Idle,       // 等待指令
  Suspended,  // 挂起，等待唤醒
  Dead,       // 执行完毕待销毁
}

export class Fiber {
  private static nextId = 1;
  public Id: number;
  private parentFiberId = 0;
  private state: FiberState;
  public CurrentEnvId = 0;
  public OperandStack: OperandStack;
  public InstructionStack: InstructionStack;
  // TODO cfg graph id + cfg node id + cfg node cursor
  public CurrentNodeCursor: CfgNodeCursor = null;



  constructor() {
    this.Id = Fiber.nextId;
    Fiber.nextId += 1;
  }

  public static CreateRootFiber(): Fiber {
    let fiber = new Fiber();
    fiber.state = FiberState.Running;
    fiber.InstructionStack = new InstructionStack();
    fiber.OperandStack = new OperandStack();
    return fiber;
  }

  public static CreateSubFiber(parentFiber: Fiber,
    initState: FiberState): Fiber {
    let fiber = new Fiber();
    fiber.parentFiberId = parentFiber.Id;
    fiber.state = initState;
    fiber.CurrentEnvId = parentFiber.CurrentEnvId;
    fiber.OperandStack = new OperandStack();

    return fiber;
  }

  public InitInstructions(initOps: Instruction[]) {
    let instructionStack = new InstructionStack();
    this.InstructionStack = instructionStack;

    for (let i = initOps.length - 1; i >= 0; i--) {
      instructionStack.PushValue(initOps[i]);
    }
  }

  public IsRootFiber() {
    return (this.parentFiberId <= 0);
  }

  public GetParentFiberId(): number {
    return this.parentFiberId;
  }

  public GetState(): FiberState {
    return this.state;
  }

  public SetState(state: FiberState) {
    this.state = state;
  }

  public ChangeEnvById(envId: number) {
    this.CurrentEnvId = envId;
  }

  private _opBatchStack: Instruction[][] = [];

  public OpBatchStart() {
    this._opBatchStack.push([]);
  }

  public AddOp(opCode: OpCode, memo: any = null) {
    let top = this._opBatchStack[this._opBatchStack.length - 1];
    top.push(new Instruction(opCode, this.CurrentEnvId, memo));
  }

  public OpBatchCommit() {
    let opList = this._opBatchStack.pop();
    if (this._opBatchStack.length > 0 && opList.length > 0) {
      // peek
      let top = this._opBatchStack[this._opBatchStack.length - 1];
      // opList 的头部元素追加到top的尾部
      for (let i = 0; i < opList.length; i++) {
        top.push(opList[i]);
      }
    }
    else {
      this.InstructionStack.ReversePushItems(opList);
    }
  }

  public AddOpDirectly(opCode: OpCode, memo: any = null) {
    this.InstructionStack.PushValue(new Instruction(opCode, this.CurrentEnvId, memo));
  }
}
