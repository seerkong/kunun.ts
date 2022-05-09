import { Fiber } from "./StateManagement/Fiber";
import { OpCode } from "./OpCode";
import { Env } from "./StateManagement/Env";
import { EnvTree } from "./StateManagement/EnvTree";
import { FiberMgr } from "./StateManagement/FiberMgr";
import { Instruction, InstructionStack } from "./StateManagement/InstructionStack";
import { OperandStack } from "./StateManagement/OperandStack"; 
import { FlowVarEnvType } from "./StateManagement/FlowVarEnvType";

export class InstructionExecLog {
    public FiberId: number;
    public Instruction: Instruction;
    constructor(fiberId: number, instruction: Instruction) {
        this.FiberId = fiberId;
        this.Instruction = instruction;
    }
};

export class StateMgr {
    public EnvTree = new EnvTree();
    public FiberMgr = new FiberMgr();
    public ExecHistory : InstructionExecLog[] = [];

    constructor() {
        let mainFiber = Fiber.CreateRootFiber();
        this.FiberMgr.GetRunnableFibers().push(mainFiber);
        let rootEnv = Env.CreateRootEnv();
        this.EnvTree.AddVertex(rootEnv);
        this.EnvTree.SetEntryVertexId(rootEnv.Id);

        let globalEnv = Env.CreateChildEnv(FlowVarEnvType.Global, rootEnv);
        this.EnvTree.AddVertex(globalEnv);
        this.EnvTree.AddEdge(rootEnv.GetVertexId(), globalEnv.GetVertexId());

        mainFiber.CurrentEnvId = globalEnv.Id;
    }
    // current active fiber state start
    public get CurrentEnvId() : number {
        let curFiber = this.GetCurrentFiber();
        if (curFiber == null) {
            return null;
        }
        return curFiber.CurrentEnvId;
    }

    public get OperandStack() : any[] {
        let curFiber = this.GetCurrentFiber();
        if (curFiber == null) {
            return null;
        }
        return curFiber.OperandStack.FrameStackView;
    }

    public get InstructionStack() : Instruction[] {
        let curFiber = this.GetCurrentFiber();
        if (curFiber == null) {
            return null;
        }
        return curFiber.InstructionStack.FrameStackView;
    }

    public get CurrentNodeCursor() : any {
        let curFiber = this.GetCurrentFiber();
        if (curFiber == null) {
            return null;
        }
        return curFiber.CurrentNodeCursor;
    }

    // current active fiber state end

    public GetCurrentFiber() {
        return this.FiberMgr.GetCurrentFiber();
    }

    public GetRootFiber() {
        return this.FiberMgr.GetRootFiber();
    }

    public GetRootEnv() {
        return this.EnvTree.GetEntryVertex();
    }

    public GetGlobalEnv() {
        let rootEnv = this.GetRootEnv();
        let envSetUnderRoot = this.EnvTree.GetNextVertexDetails(rootEnv.GetVertexId());
        let result = null;
        for (let item of envSetUnderRoot) {
            if (item.EnvType == FlowVarEnvType.Global) {
                result = item;
            }
        }
        return result;
    }

    public getCurEnvIdx() : number {
        let currentEnvId = this.FiberMgr.GetCurrentFiber().CurrentEnvId;
        return currentEnvId;
    }

    public GetCurEnv() : Env {
        let currentEnvId = this.FiberMgr.GetCurrentFiber().CurrentEnvId;
        return this.EnvTree.GetVertexDetail(currentEnvId);
    }

    public Lookup(key) {
        let declareEnv = this.EnvTree.LookupDeclareEnv(this.GetCurEnv(), key);
        return declareEnv.Lookup(key);
    }

    public LookupFromEnv(fromEnv: Env, key : String) {
        let declareEnv = this.EnvTree.LookupDeclareEnv(fromEnv, key);
        return declareEnv.Lookup(key);
    }

    public Define(key: String, obj : any) {
        let declareEnv = this.GetCurEnv();
        declareEnv.Define(key, obj);
    }

    public SetVar(key: String, obj : any) {
        let declareEnv = this.EnvTree.LookupDeclareEnv(this.GetCurEnv(), key);
        
        declareEnv.Define(key, obj);
    }

    public SetVarFromEnv(fromEnv: Env, key: String, obj : any) {
        let declareEnv = this.EnvTree.LookupDeclareEnv(fromEnv, key);
        declareEnv.Define(key, obj);
    }

    private _opBatchStack : Instruction[][] = [];

    public OpBatchStart() {
        this._opBatchStack.push([]);
    }

    public AddOp(opCode : OpCode, memo: any = null) {
        let top = this._opBatchStack[this._opBatchStack.length - 1];
        top.push(new Instruction(opCode, this.getCurEnvIdx(), memo));
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
            this.FiberMgr.GetCurrentFiber().InstructionStack.ReversePushItems(opList);
        }
    }

    public AddOpDirectly(opCode : OpCode, memo: any = null) {
        this.FiberMgr.GetCurrentFiber().InstructionStack.PushValue(new Instruction(opCode, this.getCurEnvIdx(), memo));
    }
}