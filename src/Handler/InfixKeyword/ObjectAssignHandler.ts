import { KnProperty } from "Model/KnProperty";
import { KnSubscript } from "Model/KnSubscript";
import { KnType } from "../../Model/KnType";
import { KnQuote } from "../../Model/KnQuote";
import { KnSymbol } from "../../Model/KnSymbol";
import { OpCode } from "../../OpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { StateMgr } from "../../StateMgr";
import { NodeHelper } from "../../Util/NodeHelper";

export class ObjectAssignHandler {
  public static ExpandObjectAssign(stateMgr: StateMgr, nodeToRun: any) {
    let assignToValExpr = nodeToRun.Next.Core;
    let indexExpr = stateMgr.GetCurrentFiber().OperandStack.PopValue();
    
    let indexExprType = NodeHelper.GetType(indexExpr);
    stateMgr.OpBatchStart();

    let isPropertyAssign = true; 

    if (indexExprType === KnType.Symbol) {
      stateMgr.AddOp(OpCode.Node_RunNode, indexExpr);
    }
    else if (indexExprType === KnType.Quote) {
      let quoteInner = (indexExpr as KnQuote).Value;
      let quoteInnerType = NodeHelper.GetType(quoteInner);
      if (quoteInnerType === KnType.Property) {
        stateMgr.AddOp(OpCode.Node_RunNode, new KnSymbol((quoteInner as KnProperty).Value));
      }
      else if (quoteInnerType === KnType.Subscript) {
        stateMgr.AddOp(OpCode.Node_RunNode, (quoteInner as KnSubscript).Value);
        isPropertyAssign = false;
      }
      else {
        throw new Error("the quote inner should be a 'KsProperty' or a 'KsSubscript'")
      }
    }
    else {
      throw new Error("the last value before assign infix keyword should be a 'Quote' or a 'Symbol'")
    }

    stateMgr.AddOp(OpCode.Node_RunNode, assignToValExpr);

    if (isPropertyAssign) {
      stateMgr.AddOp(OpCode.Node_RunSetProperty);
    }
    else {
      stateMgr.AddOp(OpCode.Node_RunSetSubscript);
    }    

    stateMgr.OpBatchCommit();
  }

}