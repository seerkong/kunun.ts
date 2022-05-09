import { TableHandler } from "../PrefixKeyword/TableHandler";
import { KnType } from "../../Model/KnType";
import { NodeHelper } from "../../Util/NodeHelper";
import { OpCode } from "../../OpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { StateMgr } from "../../StateMgr";
import { KnSymbol } from "../../Model/KnSymbol";

export class PropertyHandler {
  public static ExpandGetProperty(stateMgr: StateMgr, nodeToRun: any) {
    let field = nodeToRun.Value;
    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.Node_RunGetProperty, field);
    stateMgr.OpBatchCommit();
  }

  public static RunGetProperty(stateMgr: StateMgr, opContState : Instruction) {
    let key = opContState.Memo;
    let stackTopVal = stateMgr.GetCurrentFiber().OperandStack.PopValue();
    let nodeType = NodeHelper.GetType(stackTopVal);
    if (nodeType === KnType.Table) {
      TableHandler.GetTablePropertyByKey(stateMgr, stackTopVal, key);
    }
    else {
      let prop = stackTopVal[key];
      stateMgr.GetCurrentFiber().OperandStack.PushValue(prop);
    }
  }


  public static RunSetProperty(stateMgr: StateMgr, opContState : Instruction) {
    let assignToValue = stateMgr.GetCurrentFiber().OperandStack.PopValue();
    let keySymbol: KnSymbol = stateMgr.GetCurrentFiber().OperandStack.PopValue();
    let assignTarget = stateMgr.GetCurrentFiber().OperandStack.PopValue();
    
    let key = keySymbol.Value;

    let assignTargetType = NodeHelper.GetType(assignTarget);
    if (assignTargetType === KnType.Table) {
      TableHandler.SetTablePropertyByKey(stateMgr, assignTarget, key, assignToValue);
    }
    else {
      assignTarget[key] = assignToValue;
    }
  }
}