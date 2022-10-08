import { EnvTreeHandler } from './Handler/EnvTreeHandler';
import { OpCode } from "./OpCode";
import { Env } from "./StateManagement/Env";
import { InstructionExecLog, StateMgr } from "./StateMgr";
import { Instruction } from "./StateManagement/InstructionStack";
import { HostFunctions } from './HostSupport/HostFunctions';
import { ExtensionRegistry } from './ExtensionRegistry';
import { RunResult } from './RunResult';
import { Parser } from './Converter/Parser';

export class Interpreter {
    public static PrepareState() : StateMgr {
        let stateMgr: StateMgr = new StateMgr();
        let rootEnv = stateMgr.GetRootEnv();
        HostFunctions.Import(rootEnv);
        stateMgr.AddOpDirectly(OpCode.OpStack_LandSuccess);
        return stateMgr;
    }

    public static async Eval(knStr: string) : Promise<any> {
        let stateMgr: StateMgr = Interpreter.PrepareState();
        return Interpreter.EvalWithState(stateMgr, knStr);
    }

    public static async EvalWithState(stateMgr: StateMgr, knStr: string) : Promise<any> {
        let nodeToRun = Parser.Parse(knStr);
        return Interpreter.ExecWithState(stateMgr, nodeToRun);
    }

    public static async Exec(nodeToRun: any) : Promise<any> {
        let stateMgr: StateMgr = Interpreter.PrepareState();
        return Interpreter.ExecWithState(stateMgr, nodeToRun);
    }

    public static async ExecWithState(stateMgr: StateMgr, nodeToRun: any) : Promise<any> {
        stateMgr.AddOpDirectly(OpCode.Node_RunNode, nodeToRun);
        let r = Interpreter.StartLoop(stateMgr);
        return r;
    }

    public static async ExecAndReuseState(stateMgr: StateMgr, nodeToRun: any) : Promise<any> {
        stateMgr.ResetFiberMgr();

        stateMgr.OpBatchStart();
        stateMgr.AddOp(OpCode.Node_RunNode, nodeToRun);
        stateMgr.AddOp(OpCode.OpStack_LandSuccess);
        stateMgr.OpBatchCommit();

        let r = Interpreter.StartLoop(stateMgr);
        return r;
    }

    public static async StartLoop(stateMgr: StateMgr) : Promise<any> {
        let instruction : Instruction = stateMgr.GetCurrentFiber().InstructionStack.PopValue();
        let currentFiber = stateMgr.GetCurrentFiber();
        while (instruction.OpCode != OpCode.OpStack_LandSuccess
            && instruction.OpCode != OpCode.OpStack_LandFail) {
            let handler : (stateMgr: StateMgr, opContState : Instruction) => void = ExtensionRegistry.GetInstructionHandler(instruction.OpCode);
            handler(stateMgr, instruction);
            // this.DispatchOp(stateMgr, instruction);
            let log = new InstructionExecLog(currentFiber.Id, instruction);

            let nextRunFiber = stateMgr.FiberMgr.GetNextActiveFiber();
            if (nextRunFiber == null) {
                await stateMgr.FiberMgr.WaitAndConsumeResumeToken();

                nextRunFiber = stateMgr.FiberMgr.GetNextActiveFiber();
            }
            currentFiber = nextRunFiber;
            instruction = currentFiber.InstructionStack.PopValue();
        }
        let r = currentFiber.OperandStack.PeekBottomOfAllFrames();
        // return r;
        return Promise.resolve(r);
    }
}

