import { KnNodeType } from "../../Model/KnNodeType";
import { KnNodeHelper } from "../../Util/KnNodeHelper";
import { XnlOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";
import { KnSymbol } from "../../Model/KnSymbol";
import { KnKnot, KnProperty, KnSubscript, KnWord } from "../../Model";
import { StringExt } from "../../Util/StringExt";
import { SafeEval } from "../../Util/SafeEval";

export class JsCallHandler {
  public static ExpandJsCall(knState: XnlState, nodeToRun: any) {
    knState.OpBatchStart();

    knState.AddOp(XnlOpCode.ValStack_PushFrame);

    let targetWord = nodeToRun.Next.Core as KnWord;
    knState.AddOp(XnlOpCode.Node_RunNode, targetWord);
    knState.AddOp(XnlOpCode.ValStack_PushValue, new KnSymbol(targetWord.Value));

    let iter : KnKnot|undefined = nodeToRun.Next.Next as KnKnot;
    while (iter != null) {
      let core = iter.Core;
      let coreNodeType = KnNodeHelper.GetType(core);
      if (KnNodeType.Symbol == coreNodeType || KnNodeType.Property == coreNodeType) {
        knState.AddOp(XnlOpCode.ValStack_PushValue, core);
      }
      else if (KnNodeType.Subscript == coreNodeType) {
        knState.AddOp(XnlOpCode.Node_RunNode, (core as KnSubscript).Value);
        knState.AddOp(XnlOpCode.Node_RunMakeSubscript);
      }
      if (iter.Params != null) {
        knState.AddOp(XnlOpCode.Node_RunNode, iter.Params);
        break;
      }
      iter = iter.Next;
    }
    knState.AddOp(XnlOpCode.Ctrl_JsCall);
    knState.OpBatchCommit();
  }

  public static RunJsCall(knState: XnlState, opContState : Instruction) {
    let frameValues = knState.GetCurrentFiber().OperandStack.PopFrameAllValues();
    let exprSplices : any[] = [];
    let applyEnv = {};
    let targetVal = frameValues.shift();
    let targetName = frameValues.shift() as KnSymbol;

    exprSplices.push('env.');
    applyEnv[targetName.Value] = targetVal;

    exprSplices.push(targetName.Value);

    for (let i = 0; i < frameValues.length; i++) {
      let value = frameValues[i];
      let valueType = KnNodeHelper.GetType(value);
      if (KnNodeType.Property == valueType) {
        exprSplices.push('.' + (value as KnProperty).Value);
      }
      else if (KnNodeType.Subscript == valueType) {
        let innerVal = (value as KnSubscript).Value
        let innerType = KnNodeHelper.GetType(innerVal);
        if (KnNodeType.Number == innerType) {
          exprSplices.push('[' + innerVal + ']');
        } else if (KnNodeType.String == innerType) {
          exprSplices.push('["' + innerVal + '"]');
        }
      }
      else if (KnNodeType.Vector == valueType) {
        let argsParts: any[] = [];
        for (let j = 0; j < value.length; j++) {
          let argKey = 'args_' + j;
          argsParts.push('env.' + argKey);
          applyEnv[argKey] = value[j];
        }
        let argsStr = StringExt.Join(argsParts, ', ');
        exprSplices.push(`(${argsStr})`);
      }
    }

    let code = `${StringExt.Join(exprSplices, '')}`;

    // 使用 SafeEval 执行代码
    let r = SafeEval.execute(code, { env: applyEnv });
    knState.GetCurrentFiber().OperandStack.PushValue(r);
  }
}