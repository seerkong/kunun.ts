import { StackMachineData } from "../Algo/StackMachine";
import { CfgNodeCursor } from "../StateManagement/CfgNodeCursor";
import { Instruction, InstructionStack } from "../StateManagement/InstructionStack";
import { OperandStack } from "../StateManagement/OperandStack";
import { KnNodeType } from "./KnNodeType";

export class KnContinuation {
  public _Type = KnNodeType.Continuation;
  public CurrentEnvId;
  public OperandStackBackup : StackMachineData<any>;
  public InstructionStackBackup : StackMachineData<Instruction>;
  public CurrentNodeCursor : CfgNodeCursor;
}