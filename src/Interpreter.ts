import { EnvTreeHandler } from './Handler/EnvTreeHandler';
import { OpCode } from "./OpCode";
import { Env } from "./StateManagement/Env";
import { InstructionExecLog, StateMgr } from "./StateMgr";
import { Instruction } from "./StateManagement/InstructionStack";
import { HostFunctions } from './HostSupport/HostFunctions';
import { ExtensionRegistry } from './ExtensionRegistry';

export class Interpreter {
    public async Exec(nodeToRun: any) : Promise<any> {
        let stateMgr: StateMgr = this.PrepareState();
        return this.ExecNode(stateMgr, nodeToRun);
    }

    public PrepareState() : StateMgr {
        let stateMgr: StateMgr = new StateMgr();
        let rootEnv = stateMgr.GetRootEnv();
        HostFunctions.Import(rootEnv);
        stateMgr.AddOpDirectly(OpCode.OpStack_LandSuccess);
        return stateMgr;
    }

    public async ExecNode(stateMgr: StateMgr, nodeToRun: any) : Promise<any> {
        stateMgr.AddOpDirectly(OpCode.Node_RunNode, nodeToRun);
        return this.StartLoop(stateMgr);
    }

    public async StartLoop(stateMgr: StateMgr) : Promise<any> {
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

