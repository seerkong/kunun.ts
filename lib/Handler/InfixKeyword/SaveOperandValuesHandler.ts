
import { KnProperty } from "../../Model/KnProperty";
import { KnSubscript } from "../../Model/KnSubscript";
import { KnNodeType } from "../../Model/KnType";
import { KnCloseQuote } from "../../Model/KnCloseQuote";
import { KnSymbol } from "../../Model/KnSymbol";
import { KnOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { KnState } from "../../KnState";
import { NodeHelper } from "../../Util/NodeHelper";

export class SaveOperandValuesHandler {
  public static ExpandSaveStack(knState: KnState, nodeToRun: any) {
    let stackValues = knState.GetCurrentFiber().OperandStack.PopFrameAllValues();
    knState.GetCurrentFiber().OperandStack.PushValue(stackValues);
  }


  public static ExpandRestoreStack(knState: KnState, nodeToRun: any) {
    let stackValues = knState.GetCurrentFiber().OperandStack.PopFrameAllValues();
    let firstItem = stackValues[0];
    knState.GetCurrentFiber().OperandStack.PushItems(firstItem);
  }

}