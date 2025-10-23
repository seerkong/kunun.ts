import { TableHandler } from "../PrefixKeyword/TableHandler";
import { KnNodeType } from "../../Model/KnNodeType";
import { KnSymbol } from "../../Model/KnSymbol";
import { KnNodeHelper } from "../../Util/KnNodeHelper";
import { XnlOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";
import { KnSubscript } from "../../Model";

export class SubscriptHandler {
  public static ExpandGetSubscript(knState: XnlState, nodeToRun: any) {
    let field = nodeToRun.Value;
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.Node_RunNode, field);
    knState.AddOp(XnlOpCode.Node_RunGetSubscript);
    knState.OpBatchCommit();
  }

  public static RunGetSubscript(knState: XnlState, opContState : Instruction) {
    let subscriptOperand = knState.GetCurrentFiber().OperandStack.PopValue();
    let subscriptTarget = knState.GetCurrentFiber().OperandStack.PopValue();
    let subscriptOperandType = KnNodeHelper.GetType(subscriptOperand);
    let subscriptTargetType = KnNodeHelper.GetType(subscriptTarget);
    if (subscriptOperandType !== KnNodeType.Number && subscriptOperandType !== KnNodeType.String) {
      throw new Error("invalid subscript operand");
    }
    
    if (subscriptTargetType === KnNodeType.Table) {
      if (subscriptOperandType === KnNodeType.String) {
        TableHandler.ExpandTablePropertyByKey(knState, subscriptTarget, subscriptOperand);
      }
      else if (subscriptOperandType === KnNodeType.Number) {
        let prop = TableHandler.GetTablePropertyByIndex(subscriptTarget, subscriptOperand);
        knState.GetCurrentFiber().OperandStack.PushValue(prop);
      }
    }
    // else if (subscriptTargetType !== XnNodeType.Table) {
    //   let prop = null;
    //   // if (Object.prototype.toString.call(subscriptTarget) === '[object Proxy]') {
    //   //   prop = subscriptTarget['[[Target]]'][subscriptOperand];
    //   // } else {
    //     prop = subscriptTarget[subscriptOperand];
    //   // }
    //   knState.GetCurrentFiber().OperandStack.PushValue(prop);
    // }
    
  }

  public static RunSetSubscript(knState: XnlState, opContState : Instruction) {
    let assignValue = knState.GetCurrentFiber().OperandStack.PopValue();
    let subscriptOperand = knState.GetCurrentFiber().OperandStack.PopValue();
    let assignTarget = knState.GetCurrentFiber().OperandStack.PeekTop();
    let assignTargetType = KnNodeHelper.GetType(assignTarget);
    let subscriptOperandType = KnNodeHelper.GetType(subscriptOperand);
    
    if (subscriptOperandType !== KnNodeType.Number && subscriptOperandType !== KnNodeType.String) {
      throw new Error("invalid subscript operand");
    }
    
    if (assignTargetType === KnNodeType.Table) {
      if (subscriptOperandType === KnNodeType.String) {
        TableHandler.SetTablePropertyByKey(knState, assignTarget, subscriptOperand, assignValue);
      }
      else if (subscriptOperandType === KnNodeType.Number) {
        TableHandler.SetTablePropertyByIndex(assignTarget, subscriptOperand, assignValue);
      }
    }
    // else if (assignTargetType !== XnNodeType.Table) {
    //   // if (Object.prototype.toString.call(assignTarget) === '[object Proxy]') {
    //   //   assignTarget['[[Target]]'][subscriptOperand] = assignValue;
    //   // } else {
    //     assignTarget[subscriptOperand] = assignValue;
    //   // }
    // }
  }

  public static RunMakeSubscript(knState: XnlState, opContState : Instruction) {
    let topVal = knState.GetCurrentFiber().OperandStack.PopValue();
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.ValStack_PushValue, new KnSubscript(topVal));
    knState.OpBatchCommit();
  }
}