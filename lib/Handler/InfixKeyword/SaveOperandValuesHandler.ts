
import { KnProperty } from "../../Model/KnProperty";
import { KnSubscript } from "../../Model/KnSubscript";
import { KnNodeType } from "../../Model/KnNodeType";
import { KnQuoteWrapper } from "../../Model/KnQuoteWrapper";
import { KnSymbol } from "../../Model/KnSymbol";
import { XnlOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";
import { KnNodeHelper } from "../../Util/KnNodeHelper";

export class SaveOperandValuesHandler {
  public static ExpandSaveStack(knState: XnlState, nodeToRun: any) : number {
    let stackValues = knState.GetCurrentFiber().OperandStack.PopFrameAllValues();
    knState.GetCurrentFiber().OperandStack.PushValue(stackValues);
    return 1;
  }


  public static ExpandRestoreStack(knState: XnlState, nodeToRun: any) : number{
    let stackValues = knState.GetCurrentFiber().OperandStack.PopFrameAllValues();
    let firstItem = stackValues[0];
    knState.GetCurrentFiber().OperandStack.PushItems(firstItem);
    return 1;
  }

}