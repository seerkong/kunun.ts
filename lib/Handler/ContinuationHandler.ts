import { StackMachine, StackMachineData } from "../Algo/StackMachine";
import { Env } from "../StateManagement/Env";
import { Instruction, InstructionStack } from "../StateManagement/InstructionStack";
import { OperandStack } from "../StateManagement/OperandStack";
import { KnContinuation } from "../Model/KnContinuation";
import { KnState } from "../KnState";

export class ContinuationHandler {
  public static RunMakeContExcludeTopNInstruction(knState: KnState, opContState : Instruction) {
    let excludeN = opContState.Memo;
    let cont = ContinuationHandler.MakeContinuation(knState);
    let instructionsBackup = cont.InstructionStackBackup.GetItems();
    if (excludeN > 0) {
      for (let i = 0; i < excludeN; i++) {
        instructionsBackup.pop();
      }
    }
    knState.GetCurrentFiber().OperandStack.PushValue(cont);
  }

  public static MakeContinuation(knState : KnState) : KnContinuation {
    let fiber = knState.GetCurrentFiber();
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

  public static RestoreContinuationAppendOperandStack(knState : KnState, cont : KnContinuation, operands: any[]) {
    let fiber = knState.GetCurrentFiber();
    fiber.CurrentEnvId = cont.CurrentEnvId;
    fiber.InstructionStack.LoadStackMachineData(cont.InstructionStackBackup);
    fiber.OperandStack.LoadStackMachineData(cont.OperandStackBackup);
    for (let i = 0; i < operands.length; i++) {
      fiber.OperandStack.PushValue(operands[i]);
    }
  }
}