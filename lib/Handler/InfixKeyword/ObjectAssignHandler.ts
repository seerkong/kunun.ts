import { KnProperty } from "../../Model/KnProperty";
import { KnSubscript } from "../../Model/KnSubscript";
import { KnNodeType } from "../../Model/KnNodeType";
import { KnSymbol } from "../../Model/KnSymbol";
import { XnlOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";
import { KnNodeHelper } from "../../Util/KnNodeHelper";

export class ObjectAssignHandler {
  public static ExpandObjectAssign(knState: XnlState, nodeToRun: any) : number {
    let assignToValExpr = nodeToRun.Next.Core;
    let indexExpr = knState.GetCurrentFiber().OperandStack.PopValue();
    
    let indexExprType = KnNodeHelper.GetType(indexExpr);
    knState.OpBatchStart();

    let isPropertyAssign = true; 

    if (indexExprType === KnNodeType.Symbol) {
      knState.AddOp(XnlOpCode.Node_RunNode, indexExpr);
    }
    else if (indexExprType === KnNodeType.CloseQuote) {
      // let quoteInner = (indexExpr as XnCloseQuote).Value;
      // let quoteInnerType = XnNodeHelper.GetType(quoteInner);
      // if (quoteInnerType === XnNodeType.Property) {
      //   knState.AddOp(XnlOpCode.Node_RunNode, new XnSymbol((quoteInner as XnProperty).Value));
      // }
      // else if (quoteInnerType === XnNodeType.Subscript) {
      //   knState.AddOp(XnlOpCode.Node_RunNode, (quoteInner as XnSubscript).Value);
      //   isPropertyAssign = false;
      // }
      // else {
        throw new Error("the quote inner should be a 'KsProperty' or a 'KsSubscript'")
      // }
    }
    else {
      throw new Error("the last value before assign infix keyword should be a 'Quote' or a 'Symbol'")
    }

    knState.AddOp(XnlOpCode.Node_RunNode, assignToValExpr);

    if (isPropertyAssign) {
      knState.AddOp(XnlOpCode.Node_RunSetProperty);
    }
    else {
      knState.AddOp(XnlOpCode.Node_RunSetSubscript);
    }    

    knState.OpBatchCommit();

    return 2;
  }

}