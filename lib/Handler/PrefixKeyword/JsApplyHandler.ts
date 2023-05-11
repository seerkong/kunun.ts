import { TableHandler } from "../PrefixKeyword/TableHandler";
import { KnNodeType } from "../../Model/KnType";
import { NodeHelper } from "../../Util/NodeHelper";
import { KnOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { KnState } from "../../KnState";
import { KnSymbol } from "../../Model/KnSymbol";
import { KnKnot, KnProperty, KnSubscript, KnWord } from "../../Model";
import { StringExt } from "../../Util/StringExt";
import { ProxySandbox } from "../../Util/ProxySandbox";

export class JsApplyHandler {
  public static ExpandJsApply(knState: KnState, nodeToRun: any) {
    knState.OpBatchStart();

    knState.AddOp(KnOpCode.ValStack_PushFrame);

    let targetWord = nodeToRun.Next.Core as KnWord;
    knState.AddOp(KnOpCode.Node_RunNode, targetWord);
    knState.AddOp(KnOpCode.ValStack_PushValue, new KnSymbol(targetWord.Value));

    let iter : KnKnot = nodeToRun.Next.Next as KnKnot;
    while (iter != null) {
      let core = iter.Core;
      let coreNodeType = NodeHelper.GetType(core);
      if (KnNodeType.KnSymbol == coreNodeType || KnNodeType.KnProperty == coreNodeType) {
        knState.AddOp(KnOpCode.ValStack_PushValue, core);
      }
      else if (KnNodeType.KnSubscript == coreNodeType) {
        knState.AddOp(KnOpCode.Node_RunNode, (core as KnSubscript).Value);
        knState.AddOp(KnOpCode.Node_RunMakeSubscript);
      }
      if (iter.Param != null) {
        knState.AddOp(KnOpCode.Node_RunNode, iter.Param);
        break;
      }
      iter = iter.Next;
    }
    knState.AddOp(KnOpCode.Ctrl_JsApply);
    knState.OpBatchCommit();
  }

  public static RunJsApply(knState: KnState, opContState : Instruction) {
    let frameValues = knState.GetCurrentFiber().OperandStack.PopFrameAllValues();
    let exprSplices = [];
    let applyEnv = {};
    let targetVal = frameValues.shift();
    let targetName = frameValues.shift() as KnSymbol;

    applyEnv[targetName.Value] = targetVal;

    exprSplices.push('env.');
    exprSplices.push(targetName.Value);

    for (let i = 0; i < frameValues.length; i++) {
      let value = frameValues[i];
      let valueType = NodeHelper.GetType(value);
      if (KnNodeType.KnProperty == valueType) {
        exprSplices.push('.' + (value as KnProperty).Value);
      }
      else if (KnNodeType.KnSubscript == valueType) {
        let innerVal = (value as KnSubscript).Value
        let innerType = NodeHelper.GetType(innerVal);
        if (KnNodeType.KnNumber == innerType) {
          exprSplices.push('[' + innerVal + ']');
        } else if (KnNodeType.KnString == innerType) {
          exprSplices.push('["' + innerVal + '"]');
        }
      }
      else if (KnNodeType.KnVector == valueType) {
        applyEnv['args'] = value;
        exprSplices.push(`(env.args)`);
      }
    }
    let code = `(${StringExt.Join(exprSplices, '')})`;

    // 执行调用
    let proxy1 = new ProxySandbox(applyEnv);
    let r = ((env) => {
      proxy1.active();
      return eval(code);
    })(proxy1.proxy);
    knState.GetCurrentFiber().OperandStack.PushValue(r);
  }
}