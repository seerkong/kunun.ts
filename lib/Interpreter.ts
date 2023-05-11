import { EnvTreeHandler } from './Handler/EnvTreeHandler';
import { KnOpCode } from "./KnOpCode";
import { Env } from "./StateManagement/Env";
import { InstructionExecLog, KnState } from "./KnState";
import { Instruction } from "./StateManagement/InstructionStack";
import { HostFunctions } from './HostSupport/HostFunctions';
import { ExtensionRegistry } from './ExtensionRegistry';
import { RunResult } from './RunResult';
import { Parser } from './Converter/Parser';
import { KnLambdaFunction } from './Model';

export class Interpreter {
    public static PrepareState() : KnState {
        let knState: KnState = new KnState();
        let rootEnv = knState.GetRootEnv();
        HostFunctions.Import(rootEnv);
        knState.AddOpDirectly(KnOpCode.OpStack_LandSuccess);
        return knState;
    }

    public static EvalSync(knStr: string) : any {
        let knState: KnState = Interpreter.PrepareState();
        return Interpreter.EvalWithStateSync(knState, knStr);
    }

    public static async EvalAsync(knStr: string) : Promise<any> {
        let knState: KnState = Interpreter.PrepareState();
        return Interpreter.EvalWithStateAsync(knState, knStr);
    }

    public static EvalWithStateSync(knState: KnState, knStr: string) : any {
        let nodeToRun = Parser.Parse(knStr);
        return Interpreter.ExecWithStateSync(knState, nodeToRun);
    }

    public static async EvalWithStateAsync(knState: KnState, knStr: string) : Promise<any> {
        let nodeToRun = Parser.Parse(knStr);
        return Interpreter.ExecWithStateAsync(knState, nodeToRun);
    }

    public static ExecSync(nodeToRun: any) : any {
        let knState: KnState = Interpreter.PrepareState();
        return Interpreter.ExecWithStateSync(knState, nodeToRun);
    }

    public static async ExecAsync(nodeToRun: any) : Promise<any> {
        let knState: KnState = Interpreter.PrepareState();
        return Interpreter.ExecWithStateAsync(knState, nodeToRun);
    }

    public static ExecWithStateSync(knState: KnState, nodeToRun: any) : any {
        knState.AddOpDirectly(KnOpCode.Node_RunNode, nodeToRun);
        let r = Interpreter.StartLoopSync(knState);
        return r;
    }

    public static async ExecWithStateAsync(knState: KnState, nodeToRun: any) : Promise<any> {
        knState.AddOpDirectly(KnOpCode.Node_RunNode, nodeToRun);
        let r = Interpreter.StartLoopAsync(knState);
        return r;
    }

    public static MakeFuncSync(knState: KnState, funcDefNode: any, reusable: boolean = false) : Function {
        knState.AddOpDirectly(KnOpCode.Node_RunNode, funcDefNode);
        let funcDef = Interpreter.StartLoopSync(knState) as KnLambdaFunction;
        let funcArity = funcDef.Arity;
        let knStateWhenInvoked = knState;
        if (reusable) {
            // 如果需要可以被重复调用，需要复制这个knState
            knStateWhenInvoked = knState.Copy();
        }
        return (...args) => {
            knStateWhenInvoked.OpBatchStart();
            // 定义function的结果，还在operand stack中，无需再次push
            // knState.AddOp(KnOpCode.ValStack_PushValue, funcDef);
            for (let i = 0; i < funcArity; i++) {
                if (i < args.length) {
                    knStateWhenInvoked.AddOp(KnOpCode.Node_RunNode, args[i]);
                }
                else {
                    knStateWhenInvoked.AddOp(KnOpCode.Node_RunNode, null);
                }
            }
            knStateWhenInvoked.AddOp(KnOpCode.Ctrl_ApplyToFrameBottom);
            knStateWhenInvoked.AddOp(KnOpCode.OpStack_LandSuccess);
            knStateWhenInvoked.OpBatchCommit();

            let r = Interpreter.StartLoopSync(knStateWhenInvoked);
            // 为了能够下次继续执行，需要再次复制
            if (reusable) {
                // 如果需要可以被重复调用，需要复制这个knState
                knStateWhenInvoked = knState.Copy();
            }
            return r;
        };
    }

    public static ExecAndReuseStateSync(knState: KnState, nodeToRun: any) : any {
        knState.ResetFiberMgr();

        knState.OpBatchStart();
        knState.AddOp(KnOpCode.Node_RunNode, nodeToRun);
        knState.AddOp(KnOpCode.OpStack_LandSuccess);
        knState.OpBatchCommit();

        let r = Interpreter.StartLoopSync(knState);
        return r;
    }

    public static async ExecAndReuseStateAsync(knState: KnState, nodeToRun: any) : Promise<any> {
        knState.ResetFiberMgr();

        knState.OpBatchStart();
        knState.AddOp(KnOpCode.Node_RunNode, nodeToRun);
        knState.AddOp(KnOpCode.OpStack_LandSuccess);
        knState.OpBatchCommit();

        let r = Interpreter.StartLoopAsync(knState);
        return r;
    }


    public static StartLoopSync(knState: KnState) : any {
        let instruction : Instruction = knState.GetCurrentFiber().InstructionStack.PopValue();
        let currentFiber = knState.GetCurrentFiber();
        while (instruction.OpCode != KnOpCode.OpStack_LandSuccess
            && instruction.OpCode != KnOpCode.OpStack_LandFail) {
            let handler : (knState: KnState, opContState : Instruction) => void = ExtensionRegistry.GetInstructionHandler(instruction.OpCode);
            handler(knState, instruction);
            // this.DispatchOp(knState, instruction);
            let log = new InstructionExecLog(currentFiber.Id, instruction);

            let nextRunFiber = knState.FiberMgr.GetNextActiveFiber();
            if (nextRunFiber == null) {
                knState.FiberMgr.WaitAndConsumeResumeTokenSync();

                nextRunFiber = knState.FiberMgr.GetNextActiveFiber();
            }
            currentFiber = nextRunFiber;
            instruction = currentFiber.InstructionStack.PopValue();
        }
        let r = currentFiber.OperandStack.PeekBottomOfAllFrames();
        return r;
    }

    public static async StartLoopAsync(knState: KnState) : Promise<any> {
        let instruction : Instruction = knState.GetCurrentFiber().InstructionStack.PopValue();
        let currentFiber = knState.GetCurrentFiber();
        while (instruction.OpCode != KnOpCode.OpStack_LandSuccess
            && instruction.OpCode != KnOpCode.OpStack_LandFail) {
            let handler : (knState: KnState, opContState : Instruction) => void = ExtensionRegistry.GetInstructionHandler(instruction.OpCode);
            handler(knState, instruction);
            // this.DispatchOp(knState, instruction);
            let log = new InstructionExecLog(currentFiber.Id, instruction);

            let nextRunFiber = knState.FiberMgr.GetNextActiveFiber();
            if (nextRunFiber == null) {
                await knState.FiberMgr.WaitAndConsumeResumeTokenAsync();

                nextRunFiber = knState.FiberMgr.GetNextActiveFiber();
            }
            currentFiber = nextRunFiber;
            instruction = currentFiber.InstructionStack.PopValue();
        }
        let r = currentFiber.OperandStack.PeekBottomOfAllFrames();
        return Promise.resolve(r);
    }

}

