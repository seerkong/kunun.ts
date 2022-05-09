export class StackMachineData<T> {
    protected frameBottomIdxStack: number[] = [];
    protected items : T[] = [];
    protected stackTop : number = -1;

    public SetFrameBottomIdxStack(frameStack : number[]) {
        this.frameBottomIdxStack = frameStack;
    }

    public GetFrameBottomIdxStack() : number[] {
        return this.frameBottomIdxStack;
    }

    public SetItems(values : T[]) {
        this.items = values;
        this.stackTop = this.items.length - 1;
    }

    public GetItems() : T[] {
        return this.items;
    }
}

export class StackMachine<T> extends StackMachineData<T> {
    // private frameBottomIdxStack_: number[] = [];
    // private items_ : T[] = [];
    // private stackTop_ : number = -1;

    constructor(createInitFrame = false) {
        super();
        if (createInitFrame) {
            this.PushFrame();
        }
    }

    public ToStackMachineData() : StackMachineData<T> {
        let result = new StackMachineData<T>();
        let frameStackBackup = [];
        for (let i = 0; i < this.frameBottomIdxStack.length; i++) {
            frameStackBackup.push(this.frameBottomIdxStack[i]);
        }
        let itemsBackup = [];
        for (let i = 0; i < this.items.length; i++) {
            itemsBackup.push(this.items[i]);
        }
        result.SetFrameBottomIdxStack(frameStackBackup);
        result.SetItems(itemsBackup);
        return result;
    }

    public FromStackMachineData(stackData : StackMachineData<T>) {
        this.SetFrameBottomIdxStack(stackData.GetFrameBottomIdxStack());
        this.SetItems(stackData.GetItems());
    }

    public get FrameStackView() : T[] {
        let r : T[] = [];
        let currentFrameIdx = this.CurFrameBottomIdx();
        if (currentFrameIdx <= this.stackTop) {
            for (let i = currentFrameIdx; i <= this.stackTop; i++) {
                r.push(this.items[i]);
            }
        }
        return r;
    }

    

    public GetCurTopIdx() {
        return this.stackTop;
    }

    public SwapByIndex(index1, index2) {
        let tmp1 : T = this.items[index1];
        let tmp2 : T = this.items[index2];
        this.items[index1] = tmp2;
        this.items[index2] = tmp1;
    }

    public GetByIndex(idx) : T {
        return this.items[idx];
    }

    public PushFrame() {
        this.frameBottomIdxStack.push(this.stackTop + 1);
    }

    public JumpTo(valStackIdx) {
        let popTimes = this.stackTop - valStackIdx;
        for (let i  = 0; i < popTimes; i++) {
            this.PopValue();
        }
    }

    public PushItems(items: T[]) {
        for (let i = 0; i < items.length; i++) {
            this.PushValue(items[i]);
        }
    }

    public ReversePushItems(items: T[]) {
        for (let i = items.length - 1; i >= 0; i--) {
            this.PushValue(items[i]);
        }
    }

    public PushValue(v : T) {
        if (this.items.length <= (this.stackTop + 1)) {
            this.items.push(v);
        }
        else {
            this.items[this.stackTop + 1] = v;
        }
        this.stackTop += 1;
    }

    public PopValue() : T {
        let top = this.items.pop();
        this.stackTop -= 1;
        return top;
    }

    public PeekTop() : T {
        let top = this.items[this.stackTop];
        return top;
    }

    public PeekBottomOfCurFrames() : T {
        let bottom = this.items[this.CurFrameBottomIdx()];
        return bottom;
    }

    public PeekBottomOfAllFrames() : T {
        let bottom = this.items[0];
        return bottom;
    }


    public PopFrameAllValues() : T[] {
        let r: T[] = [];
        let currentFrameIdx = this.frameBottomIdxStack.pop();
        let frameValCnt = this.stackTop - currentFrameIdx + 1;
        if (frameValCnt >= 0) {
            for (let i = 0; i < frameValCnt; i++) {
                let v = this.PopValue();
                r.unshift(v);
            }
        }
        return r;
    }

    public PeekAndClearFrameAllValues() : T[] {
        let r: T[] = this.PopFrameAllValues();
        this.PushFrame();
        return r;
    }

    public PopFrameAndPushTopVal() {
        let frameValues: T[] = this.PopFrameAllValues();
        if (frameValues.length > 0) {
            this.PushValue(frameValues[frameValues.length - 1]);
        }
        else {
            this.PushValue(null);
        }
    }

    public CurFrameBottomIdx() : number {
        return this.frameBottomIdxStack[this.frameBottomIdxStack.length - 1];
    }
}