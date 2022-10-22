export class StackMachineData<T> {
    protected FrameBottomIdxStack: number[] = [];
    protected Items : T[] = [];
    protected StackTop : number = -1;

    public SetFrameBottomIdxStack(frameStack : number[]) {
        this.FrameBottomIdxStack = frameStack;
    }

    public GetFrameBottomIdxStack() : number[] {
        return this.FrameBottomIdxStack;
    }

    public SetItems(values : T[]) {
        this.Items = values;
        this.StackTop = this.Items.length - 1;
    }

    public GetItems() : T[] {
        return this.Items;
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

    public get FrameStackView() : T[] {
        let r : T[] = [];
        let currentFrameIdx = this.CurFrameBottomIdx();
        if (currentFrameIdx <= this.StackTop) {
            for (let i = currentFrameIdx; i <= this.StackTop; i++) {
                r.push(this.Items[i]);
            }
        }
        return r;
    }

    public ToStackMachineData() : StackMachineData<T> {
        let result = new StackMachineData<T>();
        let frameStackBackup = [];
        for (let i = 0; i < this.FrameBottomIdxStack.length; i++) {
            frameStackBackup.push(this.FrameBottomIdxStack[i]);
        }
        let itemsBackup = [];
        for (let i = 0; i < this.Items.length; i++) {
            itemsBackup.push(this.Items[i]);
        }
        result.SetFrameBottomIdxStack(frameStackBackup);
        result.SetItems(itemsBackup);
        return result;
    }

    public LoadStackMachineData(stackData : StackMachineData<T>) {
        this.SetFrameBottomIdxStack(stackData.GetFrameBottomIdxStack());
        this.SetItems(stackData.GetItems());
    }

    public GetCurTopIdx() {
        return this.StackTop;
    }

    public SwapByIndex(index1, index2) {
        let tmp1 : T = this.Items[index1];
        let tmp2 : T = this.Items[index2];
        this.Items[index1] = tmp2;
        this.Items[index2] = tmp1;
    }

    public GetByIndex(idx) : T {
        return this.Items[idx];
    }

    public PushFrame() {
        this.FrameBottomIdxStack.push(this.StackTop + 1);
    }

    public JumpTo(valStackIdx) {
        let popTimes = this.StackTop - valStackIdx;
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
        if (this.Items.length <= (this.StackTop + 1)) {
            this.Items.push(v);
        }
        else {
            this.Items[this.StackTop + 1] = v;
        }
        this.StackTop += 1;
    }

    public PopValue() : T {
        let top = this.Items.pop();
        this.StackTop -= 1;
        return top;
    }

    public PeekTop() : T {
        let top = this.Items[this.StackTop];
        return top;
    }

    public PeekBottomOfCurFrame() : T {
        let bottom = this.Items[this.CurFrameBottomIdx()];
        return bottom;
    }

    public PeekBottomOfAllFrames() : T {
        let bottom = this.Items[0];
        return bottom;
    }


    public PopFrameAllValues() : T[] {
        let r: T[] = [];
        let currentFrameIdx = this.FrameBottomIdxStack.pop();
        let frameValCnt = this.StackTop - currentFrameIdx + 1;
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
        return this.FrameBottomIdxStack[this.FrameBottomIdxStack.length - 1];
    }
}