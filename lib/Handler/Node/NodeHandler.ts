import { FuncHandler } from '../PrefixKeyword/FuncHandler';
import { MapHandler } from './MapHandler';
import { ArrayHandler } from '../../Handler/Node/ArrayHandler';
import { KnNodeHelper } from '../../Util/KnNodeHelper';
import XnlState from "../../KnState";
import { XnlOpCode } from '../../KnOpCode';
import { KnNodeType } from '../../Model/KnNodeType';
import { Instruction } from '../../StateManagement/InstructionStack';
import { ExtensionRegistry } from '../../ExtensionRegistry';
import { OpenKnotDataHandler } from './OpenKnotDataHandler';
import { KnotExprHandler } from './KnotExprHandler';
import { PropertyHandler } from './PropertyHandler';
import { SubscriptHandler } from './SubscriptHandler';
import { KnKnot } from '../../Model/KnKnot';
// import { XnUnquoteSplicing } from '../../Model/XnUnquoteSplicing';
import { KnOperandStack } from '../../Model/KnOperandStack';

export class NodeHandler {
    public static ExpandNode(knState: XnlState, nodeToRun: any) {
      let nodeType = KnNodeHelper.GetType(nodeToRun);
      if (KnNodeHelper.IsEvaluated(nodeToRun)) {
        knState.AddOpDirectly(XnlOpCode.ValStack_PushValue, nodeToRun);
      }
      else if (nodeType === KnNodeType.Knot) {
        let knotNode = nodeToRun as KnKnot;
        let firstVal = knotNode.Core;
        let firstValType = KnNodeHelper.GetType(firstVal);
        // if (knotNode.IsData === true) {
        //   OpenKnotDataHandler.ExpandKnotData(knState, knotNode);
        // }
        // else 
        if (firstValType === KnNodeType.Word
          && ExtensionRegistry.IsPrefixKeyWord(KnNodeHelper.GetInnerString(firstVal))) {
          let keyWordStr = KnNodeHelper.GetInnerString(firstVal);
          let instructionExpander = ExtensionRegistry.GetPrefixKeywordExpander(keyWordStr);
          instructionExpander.apply(null, [knState, knotNode]);
        }
        else {
          KnotExprHandler.ExpandKnotSingleResultSentence(knState, knotNode);
        }
      }
      // else if (nodeType === XnNodeType.KnUnquoteExpand) {
      //   let inner = (nodeToRun as XnUnquoteSplicing).Value;
      //   let innerType = XnNodeHelper.GetType(inner);
      //   let dataToExpand = [];
      //   if (innerType === XnNodeType.Word) {
      //     let wordStr = XnNodeHelper.GetWordStr(inner);
      //     let valInEnv = knState.Lookup(wordStr);
      //     let valTypeInEnv = XnNodeHelper.GetType(valInEnv);
      //     if (valTypeInEnv === XnNodeType.Vector) {
      //       dataToExpand = valInEnv;
      //     }
      //   }
      //   else if (innerType === XnNodeType.Vector) {
      //     dataToExpand = inner;
      //   }
      //   knState.OpBatchStart();
      //   for (let i = 0; i < dataToExpand.length; i++) {
      //     knState.AddOp(XnlOpCode.ValStack_PushValue, dataToExpand[i]);
      //   }
      //   knState.OpBatchCommit(); 
      // }
      else if (nodeType === KnNodeType.Word) {
        let wordStr = KnNodeHelper.GetWordStr(nodeToRun);
        let valInEnv = knState.Lookup(wordStr);
        knState.AddOpDirectly(XnlOpCode.ValStack_PushValue, valInEnv);
      }
      else if (nodeType === KnNodeType.Vector) {
        ArrayHandler.ExpandOpenArray(knState, nodeToRun);
      }
      else if (nodeType === KnNodeType.UnorderedMap) {
        MapHandler.ExpandOpenMap(knState, nodeToRun);
      }
      else if (nodeType === KnNodeType.Property) {
        PropertyHandler.ExpandGetProperty(knState, nodeToRun);
      }
      else if (nodeType === KnNodeType.Subscript) {
        SubscriptHandler.ExpandGetSubscript(knState, nodeToRun);
      }
      else if (nodeType === KnNodeType.CloseQuote
        || nodeType === KnNodeType.Symbol
        || nodeType === KnNodeType.OperandStack) {
        knState.AddOpDirectly(XnlOpCode.ValStack_PushValue, nodeToRun);
      }
      else {
        knState.AddOpDirectly(XnlOpCode.ValStack_PushValue, nodeToRun);
      }
    }

    public static RunNode(knState: XnlState, opContState : Instruction) {
      let nodeToRun = opContState.Memo;
      knState.OpBatchStart();
      NodeHandler.ExpandNode(knState, nodeToRun);
      knState.OpBatchCommit();
    }

    public static RunLastVal(knState: XnlState, opContState : Instruction) {
      let nodeToRun = knState.GetCurrentFiber().OperandStack.PopValue();
      knState.OpBatchStart();
      NodeHandler.ExpandNode(knState, nodeToRun);
      knState.OpBatchCommit();
    }
}