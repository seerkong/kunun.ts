import { InstructionStack, OperandStack } from 'depa-actor';
import { RuntimeInstruction } from './Instruction';
export declare enum RuntimeFiberStatus {
    Runnable = "Runnable",
    Running = "Running",
    Idle = "Idle",
    Suspended = "Suspended",
    Dead = "Dead"
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
export declare class RuntimeFiber {
    private static nextId;
    readonly id: number;
    parentFiberId: number;
    status: RuntimeFiberStatus;
    currentEnvId: number;
    instructionStack: InstructionStack<RuntimeInstruction>;
    operandStack: OperandStack<any>;
    constructor(id?: number);
    static CreateRootFiber(currentEnvId: number): RuntimeFiber;
    static FromSnapshot(snapshot: RuntimeFiberSnapshot): RuntimeFiber;
    toSnapshot(): RuntimeFiberSnapshot;
}
