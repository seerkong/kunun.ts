import { EnvTreeHandler } from './Handler/EnvTreeHandler';
import { KnOpCode } from "./KnOpCode";
import { Env } from "./StateManagement/Env";
import { InstructionExecLog, KnState } from "./knState";
import { Instruction } from "./StateManagement/InstructionStack";
import { HostFunctions } from './HostSupport/HostFunctions';
import { ExtensionRegistry } from './ExtensionRegistry';
import { RunResult } from './RunResult';
import { Parser } from './Converter/Parser';

export class Interpreter {
    public static PrepareState() : KnState {
        let knState: KnState = new KnState();
        let rootEnv = knState.GetRootEnv();
        HostFunctions.Import(rootEnv);
        knState.AddOpDirectly(KnOpCode.OpStack_LandSuccess);
        return knState;
    }

    public static async Eval(knStr: string) : Promise<any> {
        let knState: KnState = Interpreter.PrepareState();
        return Interpreter.EvalWithState(knState, knStr);
    }

    public static async EvalWithState(knState: KnState, knStr: string) : Promise<any> {
        let nodeToRun = Parser.Parse(knStr);
        return Interpreter.ExecWithState(knState, nodeToRun);
    }

    public static async Exec(nodeToRun: any) : Promise<any> {
        let knState: KnState = Interpreter.PrepareState();
        return Interpreter.ExecWithState(knState, nodeToRun);
    }

    public static async ExecWithState(knState: KnState, nodeToRun: any) : Promise<any> {
        knState.AddOpDirectly(KnOpCode.Node_RunNode, nodeToRun);
        let r = Interpreter.StartLoop(knState);
        return r;
    }

    public static async ExecAndReuseState(knState: KnState, nodeToRun: any) : Promise<any> {
        knState.ResetFiberMgr();

        knState.OpBatchStart();
        knState.AddOp(KnOpCode.Node_RunNode, nodeToRun);
        knState.AddOp(KnOpCode.OpStack_LandSuccess);
        knState.OpBatchCommit();

        let r = Interpreter.StartLoop(knState);
        return r;
    }

    public static async StartLoop(knState: KnState) : Promise<any> {
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
                await knState.FiberMgr.WaitAndConsumeResumeToken();

                nextRunFiber = knState.FiberMgr.GetNextActiveFiber();
            }
            currentFiber = nextRunFiber;
            instruction = currentFiber.InstructionStack.PopValue();
        }
        let r = currentFiber.OperandStack.PeekBottomOfAllFrames();
        // return r;
        return Promise.resolve(r);
    }
}

