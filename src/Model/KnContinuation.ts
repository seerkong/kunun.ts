import { StackMachineData } from "../Algo/StackMachine";
import { CfgNodeCursor } from "../StateManagement/CfgNodeCursor";
import { Instruction } from "../StateManagement/InstructionStack";
import { KnType } from "./KnType";

export class KnContinuation {
  public _Type = KnType.Continuation;
  public CurrentEnvId;
  public OperandStackBackup : StackMachineData<any>;  
  public InstructionStackBackup : StackMachineData<Instruction>;
  public CurrentNodeCursor : CfgNodeCursor;
}