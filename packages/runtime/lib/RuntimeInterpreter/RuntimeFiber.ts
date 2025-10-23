import { createInstructionStack, createOperandStack, InstructionStack, OperandStack } from 'depa-actor';

import { RuntimeInstruction } from './Instruction';

export enum RuntimeFiberStatus {
  Runnable = 'Runnable',
  Running = 'Running',
  Idle = 'Idle',
  Suspended = 'Suspended',
  Dead = 'Dead',
}

export interface RuntimeFiberSnapshot {
  id: number;
  parentFiberId: number;
  status: RuntimeFiberStatus;
  currentEnvId: number;
  instructionStack: {
    items: RuntimeInstruction[];
    frameBottoms: number[];
  };
  operandStack: {
    items: any[];
    frameBottoms: number[];
  };
}

export class RuntimeFiber {
  private static nextId = 1;

  public readonly id: number;
  public parentFiberId = 0;
  public status: RuntimeFiberStatus = RuntimeFiberStatus.Runnable;
  public currentEnvId = 0;
  public instructionStack: InstructionStack<RuntimeInstruction>;
  public operandStack: OperandStack<any>;

  public constructor(id?: number) {
    this.id = id ?? RuntimeFiber.nextId;
    RuntimeFiber.nextId = Math.max(RuntimeFiber.nextId, this.id + 1);
    this.instructionStack = createInstructionStack<RuntimeInstruction>();
    this.operandStack = createOperandStack<any>();
    this.operandStack.pushFrame();
  }

  public static CreateRootFiber(currentEnvId: number): RuntimeFiber {
    const fiber = new RuntimeFiber();
    fiber.status = RuntimeFiberStatus.Running;
    fiber.currentEnvId = currentEnvId;
    return fiber;
  }

  public static FromSnapshot(snapshot: RuntimeFiberSnapshot): RuntimeFiber {
    const fiber = new RuntimeFiber(snapshot.id);
    fiber.parentFiberId = snapshot.parentFiberId;
    fiber.status = snapshot.status;
    fiber.currentEnvId = snapshot.currentEnvId;
    fiber.instructionStack.loadSnapshot(snapshot.instructionStack);
    fiber.operandStack.loadSnapshot(snapshot.operandStack);
    return fiber;
  }

  public toSnapshot(): RuntimeFiberSnapshot {
    return {
      id: this.id,
      parentFiberId: this.parentFiberId,
      status: this.status,
      currentEnvId: this.currentEnvId,
      instructionStack: this.instructionStack.snapshot(),
      operandStack: this.operandStack.snapshot(),
    };
  }
}
