import { EnvTreeHandler } from './Handler/EnvTreeHandler';
import { XnlOpCode } from "./KnOpCode";
import { Env } from "./StateManagement/Env";
import XnlState, { InstructionExecLog } from "./KnState";
import { Instruction } from "./StateManagement/InstructionStack";
import { HostFunctions } from './HostSupport/HostFunctions';
import { ExtensionRegistry } from './ExtensionRegistry';
import { RunResult } from './RunResult';
import { KnConverter } from './Converter/KnConverter';
import { KnLambdaFunction } from './Model';

export class Interpreter {
    public static PrepareState() : XnlState {
        let knState: XnlState = new XnlState();
        let rootEnv = knState.GetRootEnv();
        HostFunctions.Import(rootEnv);
        knState.AddOpDirectly(XnlOpCode.OpStack_LandSuccess);
        return knState;
    }

    public static EvalSync(knStr: string) : any {
        let knState: XnlState = Interpreter.PrepareState();
        return Interpreter.EvalWithStateSync(knState, knStr);
    }

    public static async EvalAsync(knStr: string) : Promise<any> {
        let knState: XnlState = Interpreter.PrepareState();
        return Interpreter.EvalWithStateAsync(knState, knStr);
    }

    public static EvalWithStateSync(knState: XnlState, knStr: string) : any {
        let nodeToRun = KnConverter.Knl.Parser.Parse(knStr);
        return Interpreter.ExecWithStateSync(knState, nodeToRun);
    }

    public static async EvalWithStateAsync(knState: XnlState, knStr: string) : Promise<any> {
        let nodeToRun = KnConverter.Knl.Parser.Parse(knStr);
        return Interpreter.ExecWithStateAsync(knState, nodeToRun);
    }

    public static ExecSync(nodeToRun: any) : any {
        let knState: XnlState = Interpreter.PrepareState();
        return Interpreter.ExecWithStateSync(knState, nodeToRun);
    }

    public static async ExecAsync(nodeToRun: any) : Promise<any> {
        let knState: XnlState = Interpreter.PrepareState();
        return Interpreter.ExecWithStateAsync(knState, nodeToRun);
    }

    public static ExecWithStateSync(knState: XnlState, nodeToRun: any) : any {
        knState.AddOpDirectly(XnlOpCode.Node_RunNode, nodeToRun);
        let r = Interpreter.StartLoopSync(knState);
        return r;
    }

    public static async ExecWithStateAsync(knState: XnlState, nodeToRun: any) : Promise<any> {
        knState.AddOpDirectly(XnlOpCode.Node_RunNode, nodeToRun);
        let r = Interpreter.StartLoopAsync(knState);
        return r;
    }

    public static MakeFuncSync(knState: XnlState, funcDefNode: any, reusable: boolean = false) : Function {
        knState.AddOpDirectly(XnlOpCode.Node_RunNode, funcDefNode);
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
                    knStateWhenInvoked.AddOp(XnlOpCode.Node_RunNode, args[i]);
                }
                else {
                    knStateWhenInvoked.AddOp(XnlOpCode.Node_RunNode, null);
                }
            }
            knStateWhenInvoked.AddOp(XnlOpCode.Ctrl_ApplyToFrameBottom);
            knStateWhenInvoked.AddOp(XnlOpCode.OpStack_LandSuccess);
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

    public static ExecAndReuseStateSync(knState: XnlState, nodeToRun: any) : any {
        knState.ResetFiberMgr();

        knState.OpBatchStart();
        knState.AddOp(XnlOpCode.Node_RunNode, nodeToRun);
        knState.AddOp(XnlOpCode.OpStack_LandSuccess);
        knState.OpBatchCommit();

        let r = Interpreter.StartLoopSync(knState);
        return r;
    }

    public static async ExecAndReuseStateAsync(knState: XnlState, nodeToRun: any) : Promise<any> {
        knState.ResetFiberMgr();

        knState.OpBatchStart();
        knState.AddOp(XnlOpCode.Node_RunNode, nodeToRun);
        knState.AddOp(XnlOpCode.OpStack_LandSuccess);
        knState.OpBatchCommit();

        let r = Interpreter.StartLoopAsync(knState);
        return r;
    }


    public static StartLoopSync(knState: XnlState) : any {
        let instruction : Instruction = knState.GetCurrentFiber().InstructionStack.PopValue();
        let currentFiber = knState.GetCurrentFiber();
        while (instruction.OpCode != XnlOpCode.OpStack_LandSuccess
            && instruction.OpCode != XnlOpCode.OpStack_LandFail) {
            let handler : (knState: XnlState, opContState : Instruction) => void = ExtensionRegistry.GetInstructionHandler(instruction.OpCode);
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

    public static async StartLoopAsync(knState: XnlState) : Promise<any> {
        let instruction : Instruction = knState.GetCurrentFiber().InstructionStack.PopValue();
        let currentFiber = knState.GetCurrentFiber();
        while (instruction.OpCode != XnlOpCode.OpStack_LandSuccess
            && instruction.OpCode != XnlOpCode.OpStack_LandFail) {
            let handler : (knState: XnlState, opContState : Instruction) => void = ExtensionRegistry.GetInstructionHandler(instruction.OpCode);
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

