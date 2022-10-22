import { KnProperty } from "../../Model/KnProperty";
import { KnSubscript } from "../../Model/KnSubscript";
import { KnNodeType } from "../../Model/KnType";
import { KnCloseQuote } from "../../Model/KnCloseQuote";
import { KnSymbol } from "../../Model/KnSymbol";
import { KnOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { KnState } from "../../KnState";
import { NodeHelper } from "../../Util/NodeHelper";

export class ObjectAssignHandler {
  public static ExpandObjectAssign(knState: KnState, nodeToRun: any) {
    let assignToValExpr = nodeToRun.Next.Core;
    let indexExpr = knState.GetCurrentFiber().OperandStack.PopValue();
    
    let indexExprType = NodeHelper.GetType(indexExpr);
    knState.OpBatchStart();

    let isPropertyAssign = true; 

    if (indexExprType === KnNodeType.KnSymbol) {
      knState.AddOp(KnOpCode.Node_RunNode, indexExpr);
    }
    else if (indexExprType === KnNodeType.KnCloseQuote) {
      let quoteInner = (indexExpr as KnCloseQuote).Value;
      let quoteInnerType = NodeHelper.GetType(quoteInner);
      if (quoteInnerType === KnNodeType.KnProperty) {
        knState.AddOp(KnOpCode.Node_RunNode, new KnSymbol((quoteInner as KnProperty).Value));
      }
      else if (quoteInnerType === KnNodeType.KnSubscript) {
        knState.AddOp(KnOpCode.Node_RunNode, (quoteInner as KnSubscript).Value);
        isPropertyAssign = false;
      }
      else {
        throw new Error("the quote inner should be a 'KsProperty' or a 'KsSubscript'")
      }
    }
    else {
      throw new Error("the last value before assign infix keyword should be a 'Quote' or a 'Symbol'")
    }

    knState.AddOp(KnOpCode.Node_RunNode, assignToValExpr);

    if (isPropertyAssign) {
      knState.AddOp(KnOpCode.Node_RunSetProperty);
    }
    else {
      knState.AddOp(KnOpCode.Node_RunSetSubscript);
    }    

    knState.OpBatchCommit();
  }

}