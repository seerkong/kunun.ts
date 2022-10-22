import { TableHandler } from "../PrefixKeyword/TableHandler";
import { KnNodeType } from "../../Model/KnType";
import { KnSymbol } from "../../Model/KnSymbol";
import { NodeHelper } from "../../Util/NodeHelper";
import { KnOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { KnState } from "../../KnState";

export class SubscriptHandler {
  public static ExpandGetSubscript(knState: KnState, nodeToRun: any) {
    let field = nodeToRun.Value;
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.Node_RunNode, field);
    knState.AddOp(KnOpCode.Node_RunGetSubscript);
    knState.OpBatchCommit();
  }

  public static RunGetSubscript(knState: KnState, opContState : Instruction) {
    let subscriptOperand = knState.GetCurrentFiber().OperandStack.PopValue();
    let subscriptTarget = knState.GetCurrentFiber().OperandStack.PopValue();
    let subscriptOperandType = NodeHelper.GetType(subscriptOperand);
    let subscriptTargetType = NodeHelper.GetType(subscriptTarget);
    if (subscriptOperandType !== KnNodeType.KnNumber && subscriptOperandType !== KnNodeType.KnString) {
      throw new Error("invalid subscript operand");
    }
    
    if (subscriptTargetType === KnNodeType.KnTable) {
      if (subscriptOperandType === KnNodeType.KnString) {
        TableHandler.ExpandTablePropertyByKey(knState, subscriptTarget, subscriptOperand);
      }
      else if (subscriptOperandType === KnNodeType.KnNumber) {
        let prop = TableHandler.GetTablePropertyByIndex(subscriptTarget, subscriptOperand);
        knState.GetCurrentFiber().OperandStack.PushValue(prop);
      }
    }
    else if (subscriptTargetType !== KnNodeType.KnTable) {
      let prop = subscriptTarget[subscriptOperand];
      knState.GetCurrentFiber().OperandStack.PushValue(prop);
    }
    
  }

  public static RunSetSubscript(knState: KnState, opContState : Instruction) {
    let assignValue = knState.GetCurrentFiber().OperandStack.PopValue();
    let subscriptOperand = knState.GetCurrentFiber().OperandStack.PopValue();
    let assignTarget = knState.GetCurrentFiber().OperandStack.PeekTop();
    let assignTargetType = NodeHelper.GetType(assignTarget);
    let subscriptOperandType = NodeHelper.GetType(subscriptOperand);
    
    if (subscriptOperandType !== KnNodeType.KnNumber && subscriptOperandType !== KnNodeType.KnString) {
      throw new Error("invalid subscript operand");
    }
    
    if (assignTargetType === KnNodeType.KnTable) {
      if (subscriptOperandType === KnNodeType.KnString) {
        TableHandler.SetTablePropertyByKey(knState, assignTarget, subscriptOperand, assignValue);
      }
      else if (subscriptOperandType === KnNodeType.KnNumber) {
        TableHandler.SetTablePropertyByIndex(assignTarget, subscriptOperand, assignValue);
      }
    }
    else if (assignTargetType !== KnNodeType.KnTable) {
      assignTarget[subscriptOperand] = assignValue;
    }
  }
}