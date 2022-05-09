
import { KnProperty } from "Model/KnProperty";
import { KnSubscript } from "Model/KnSubscript";
import { KnType } from "../../Model/KnType";
import { KnQuote } from "../../Model/KnQuote";
import { KnSymbol } from "../../Model/KnSymbol";
import { OpCode } from "../../OpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { StateMgr } from "../../StateMgr";
import { NodeHelper } from "../../Util/NodeHelper";

export class SaveOperandValuesHandler {
  public static ExpandSaveStack(stateMgr: StateMgr, nodeToRun: any) {
    let stackValues = stateMgr.GetCurrentFiber().OperandStack.PopFrameAllValues();
    stateMgr.GetCurrentFiber().OperandStack.PushValue(stackValues);
  }


  public static ExpandRestoreStack(stateMgr: StateMgr, nodeToRun: any) {
    let stackValues = stateMgr.GetCurrentFiber().OperandStack.PopFrameAllValues();
    let firstItem = stackValues[0];
    stateMgr.GetCurrentFiber().OperandStack.PushItems(firstItem);
  }

}