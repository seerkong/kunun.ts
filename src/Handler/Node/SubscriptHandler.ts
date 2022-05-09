import { TableHandler } from "../PrefixKeyword/TableHandler";
import { KnType } from "../../Model/KnType";
import { KnSymbol } from "../../Model/KnSymbol";
import { NodeHelper } from "../../Util/NodeHelper";
import { OpCode } from "../../OpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { StateMgr } from "../../StateMgr";

export class SubscriptHandler {
  public static ExpandGetSubscript(stateMgr: StateMgr, nodeToRun: any) {
    let field = nodeToRun.Value;
    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.Node_RunNode, field);
    stateMgr.AddOp(OpCode.Node_RunGetSubscript);
    stateMgr.OpBatchCommit();
  }

  public static RunGetSuscript(stateMgr: StateMgr, opContState : Instruction) {
    let subscriptOperand = stateMgr.GetCurrentFiber().OperandStack.PopValue();
    let subscriptTarget = stateMgr.GetCurrentFiber().OperandStack.PopValue();
    let subscriptOperandType = NodeHelper.GetType(subscriptOperand);
    let subscriptTargetType = NodeHelper.GetType(subscriptTarget);
    if (subscriptOperandType !== KnType.Number && subscriptOperandType !== KnType.String) {
      throw new Error("invalid subscript operand");
    }
    
    if (subscriptTargetType === KnType.Table) {
      if (subscriptOperandType === KnType.String) {
        TableHandler.GetTablePropertyByKey(stateMgr, subscriptTarget, subscriptOperand);
      }
      else if (subscriptOperandType === KnType.Number) {
        let prop = TableHandler.GetTablePropertyByIndex(subscriptTarget, subscriptOperand);
        stateMgr.GetCurrentFiber().OperandStack.PushValue(prop);
      }
    }
    else if (subscriptTargetType !== KnType.Table) {
      let prop = subscriptTarget[subscriptOperand];
      stateMgr.GetCurrentFiber().OperandStack.PushValue(prop);
    }
    
  }

  public static RunSetSuscript(stateMgr: StateMgr, opContState : Instruction) {
    let assignToValue = stateMgr.GetCurrentFiber().OperandStack.PopValue();
    let subscriptOperand = stateMgr.GetCurrentFiber().OperandStack.PopValue();
    let assignTarget = stateMgr.GetCurrentFiber().OperandStack.PeekTop();
    let assignTargetType = NodeHelper.GetType(assignTarget);
    let subscriptOperandType = NodeHelper.GetType(subscriptOperand);
    
    if (subscriptOperandType !== KnType.Number && subscriptOperandType !== KnType.String) {
      throw new Error("invalid subscript operand");
    }
    
    if (assignTargetType === KnType.Table) {
      if (subscriptOperandType === KnType.String) {
        TableHandler.SetTablePropertyByKey(stateMgr, assignTarget, subscriptOperand, assignToValue);
      }
      else if (subscriptOperandType === KnType.Number) {
        TableHandler.SetTablePropertyByIndex(assignTarget, subscriptOperand, assignToValue);
      }
    }
    else if (assignTargetType !== KnType.Table) {
      assignTarget[subscriptOperand] = assignToValue;
    }
  }
}