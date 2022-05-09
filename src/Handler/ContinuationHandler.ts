import { StackMachine, StackMachineData } from "Algo/StackMachine";
import { Env } from "../StateManagement/Env";
import { Instruction, InstructionStack } from "../StateManagement/InstructionStack";
import { OperandStack } from "StateManagement/OperandStack";
import { KnContinuation } from "../Model/KnContinuation";
import { StateMgr } from "../StateMgr";

export class ContinuationHandler {
  public static RunMakeContExcludeTopNInstruction(stateMgr: StateMgr, opContState : Instruction) {
    let excludeN = opContState.Memo;
    let cont = ContinuationHandler.MakeContinuation(stateMgr);
    let instructionsBackup = cont.InstructionStackBackup.GetItems();
    if (excludeN > 0) {
      for (let i = 0; i < excludeN; i++) {
        instructionsBackup.pop();
      }
    }
    stateMgr.GetCurrentFiber().OperandStack.PushValue(cont);
  }

  public static MakeContinuation(stateMgr : StateMgr) : KnContinuation {
    let fiber = stateMgr.GetCurrentFiber();
    let operandStack : OperandStack = fiber.OperandStack;
    let operandStackBackup: StackMachineData<any> = operandStack.ToStackMachineData();
    let instructionStack : InstructionStack = fiber.InstructionStack;
    let instructionStackBackup : StackMachineData<Instruction> =  instructionStack.ToStackMachineData();

    let result = new KnContinuation();
    result.CurrentEnvId = fiber.CurrentEnvId;
    result.OperandStackBackup = operandStackBackup;
    result.InstructionStackBackup = instructionStackBackup;
    return result;
  }

  public static RestoreContinuationAppendOperandStack(stateMgr : StateMgr, cont : KnContinuation, operands: any[]) {
    let fiber = stateMgr.GetCurrentFiber();
    fiber.CurrentEnvId = cont.CurrentEnvId;
    fiber.InstructionStack.FromStackMachineData(cont.InstructionStackBackup);
    fiber.OperandStack.FromStackMachineData(cont.OperandStackBackup);
    for (let i = 0; i < operands.length; i++) {
      fiber.OperandStack.PushValue(operands[i]);
    }
  }
}