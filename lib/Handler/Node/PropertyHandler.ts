import { TableHandler } from "../PrefixKeyword/TableHandler";
import { KnNodeType } from "../../Model/KnType";
import { NodeHelper } from "../../Util/NodeHelper";
import { KnOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { KnState } from "../../KnState";
import { KnSymbol } from "../../Model/KnSymbol";

export class PropertyHandler {
  public static ExpandGetProperty(knState: KnState, nodeToRun: any) {
    let field = nodeToRun.Value;
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.Node_RunGetProperty, field);
    knState.OpBatchCommit();
  }

  public static RunGetProperty(knState: KnState, opContState : Instruction) {
    let key = opContState.Memo;
    let stackTopVal = knState.GetCurrentFiber().OperandStack.PopValue();
    let nodeType = NodeHelper.GetType(stackTopVal);
    if (nodeType === KnNodeType.KnTable) {
      TableHandler.ExpandTablePropertyByKey(knState, stackTopVal, key);
    }
    else {
      let prop = stackTopVal[key];
      knState.GetCurrentFiber().OperandStack.PushValue(prop);
    }
  }


  public static RunSetProperty(knState: KnState, opContState : Instruction) {
    let assignValue = knState.GetCurrentFiber().OperandStack.PopValue();
    let keySymbol: KnSymbol = knState.GetCurrentFiber().OperandStack.PopValue();
    let assignTarget = knState.GetCurrentFiber().OperandStack.PopValue();
    
    let key = keySymbol.Value;

    let assignTargetType = NodeHelper.GetType(assignTarget);
    if (assignTargetType === KnNodeType.KnTable) {
      TableHandler.SetTablePropertyByKey(knState, assignTarget, key, assignValue);
    }
    else {
      assignTarget[key] = assignValue;
    }
  }
}