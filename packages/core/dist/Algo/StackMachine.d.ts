export declare class StackMachineData<T> {
    protected FrameBottomIdxStack: number[];
    protected Items: T[];
    protected StackTop: number;
    SetFrameBottomIdxStack(frameStack: number[]): void;
    GetFrameBottomIdxStack(): number[];
    SetItems(values: T[]): void;
    GetItems(): T[];
}
export declare class StackMachine<T> extends StackMachineData<T> {
    constructor(createInitFrame?: boolean);
    get FrameStackView(): T[];
    Copy(): StackMachine<T>;
    ToStackMachineData(): StackMachineData<T>;
    LoadStackMachineData(stackData: StackMachineData<T>): void;
    GetCurTopIdx(): number;
    SwapByIndex(index1: any, index2: any): void;
    GetByIndex(idx: any): T;
    PushFrame(): void;
    JumpTo(valStackIdx: any): void;
    PushItems(items: T[]): void;
    ReversePushItems(items: T[]): void;
    PushValue(v: T): void;
    PopValue(): T;
    PeekTop(): T;
    PeekBottomOfCurFrame(): T;
    PeekBottomOfAllFrames(): T;
    PopFrameAllValues(): T[];
    PeekAndClearFrameAllValues(): T[];
    PopFrameAndPushTopVal(): void;
    CurFrameBottomIdx(): number;
}
