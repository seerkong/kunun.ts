import { TableHandler } from "../PrefixKeyword/TableHandler";
import { KnNodeType } from "../../Model/KnNodeType";
import { KnNodeHelper } from "../../Util/KnNodeHelper";
import { XnlOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";
import { KnSymbol } from "../../Model/KnSymbol";

export class PropertyHandler {
  public static ExpandGetProperty(knState: XnlState, nodeToRun: any) {
    let field = nodeToRun.Value;
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.Node_RunGetProperty, field);
    knState.OpBatchCommit();
  }

  public static RunGetProperty(knState: XnlState, opContState : Instruction) {
    let key = opContState.Memo;
    let stackTopVal = knState.GetCurrentFiber().OperandStack.PopValue();
    let nodeType = KnNodeHelper.GetType(stackTopVal);
    if (nodeType === KnNodeType.Table) {
      TableHandler.ExpandTablePropertyByKey(knState, stackTopVal, key);
    }
    else {
      let prop = null;
      // TODO 处理对 Proxy 对象 的方法调用 比如 aPropObj.push(1)
      // if (Object.prototype.toString.call(stackTopVal) === '[object Proxy]') {
      //   prop = stackTopVal['[[Target]]'][key];
      // } else {
        prop = stackTopVal[key];
      // }
      knState.GetCurrentFiber().OperandStack.PushValue(prop);
    }
  }


  public static RunSetProperty(knState: XnlState, opContState : Instruction) {
    let assignValue = knState.GetCurrentFiber().OperandStack.PopValue();
    let keySymbol: KnSymbol = knState.GetCurrentFiber().OperandStack.PopValue();
    let assignTarget = knState.GetCurrentFiber().OperandStack.PopValue();
    
    let key = keySymbol.Value;

    let assignTargetType = KnNodeHelper.GetType(assignTarget);
    if (assignTargetType === KnNodeType.Table) {
      TableHandler.SetTablePropertyByKey(knState, assignTarget, key, assignValue);
    }
    else {
      // if (Object.prototype.toString.call(assignTarget) === '[object Proxy]') {
      //   assignTarget['[[Target]]'][key] = assignValue;
      // } else {
        assignTarget[key] = assignValue;
      // }
    }
  }
}