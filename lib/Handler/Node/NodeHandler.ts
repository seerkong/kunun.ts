import { FuncHandler } from '../PrefixKeyword/FuncHandler';
import { MapHandler } from './MapHandler';
import { ArrayHandler } from '../../Handler/Node/ArrayHandler';
import { NodeHelper } from '../../Util/NodeHelper';
import { KnState } from "../../KnState";
import { KnOpCode } from '../../KnOpCode';
import { KnNodeType } from '../../Model/KnType';
import { Instruction } from '../../StateManagement/InstructionStack';
import { ExtensionRegistry } from '../../ExtensionRegistry';
import { OpenKnotDataHandler } from './OpenKnotDataHandler';
import { KnotExprHandler } from './KnotExprHandler';
import { PropertyHandler } from './PropertyHandler';
import { SubscriptHandler } from './SubscriptHandler';
import { KnKnot } from '../../Model/KnKnot';
import { KnUnquoteSplicing } from '../../Model/KnUnquoteSplicing';
import { KnOperandStack } from '../../Model/KnOperandStack';

export class NodeHandler {
    public static ExpandNode(knState: KnState, nodeToRun: any) {
      let nodeType = NodeHelper.GetType(nodeToRun);
      if (NodeHelper.IsEvaluated(nodeToRun)) {
        knState.AddOpDirectly(KnOpCode.ValStack_PushValue, nodeToRun);
      }
      else if (nodeType === KnNodeType.KnKnot) {
        let knotNode = nodeToRun as KnKnot;
        let firstVal = knotNode.Core;
        let firstValType = NodeHelper.GetType(firstVal);
        if (knotNode.IsData === true) {
          OpenKnotDataHandler.ExpandKnotData(knState, knotNode);
        }
        else if (firstValType === KnNodeType.KnWord
          && ExtensionRegistry.IsPrefixKeyWord(NodeHelper.GetInnerString(firstVal))) {
          let keyWordStr = NodeHelper.GetInnerString(firstVal);
          let instructionExpander = ExtensionRegistry.GetPrefixKeywordExpander(keyWordStr);
          instructionExpander.apply(null, [knState, knotNode]);
        }
        else {
          KnotExprHandler.ExpandKnotSingleResultSentence(knState, knotNode);
        }
      }
      else if (nodeType === KnNodeType.KnUnquoteExpand) {
        let inner = (nodeToRun as KnUnquoteSplicing).Value;
        let innerType = NodeHelper.GetType(inner);
        let dataToExpand = [];
        if (innerType === KnNodeType.KnWord) {
          let wordStr = NodeHelper.GetWordStr(inner);
          let valInEnv = knState.Lookup(wordStr);
          let valTypeInEnv = NodeHelper.GetType(valInEnv);
          if (valTypeInEnv === KnNodeType.KnVector) {
            dataToExpand = valInEnv;
          }
        }
        else if (innerType === KnNodeType.KnVector) {
          dataToExpand = inner;
        }
        knState.OpBatchStart();
        for (let i = 0; i < dataToExpand.length; i++) {
          knState.AddOp(KnOpCode.ValStack_PushValue, dataToExpand[i]);
        }
        knState.OpBatchCommit(); 
      }
      else if (nodeType === KnNodeType.KnWord) {
        let wordStr = NodeHelper.GetWordStr(nodeToRun);
        let valInEnv = knState.Lookup(wordStr);
        knState.AddOpDirectly(KnOpCode.ValStack_PushValue, valInEnv);
      }
      else if (nodeType === KnNodeType.KnVector) {
        ArrayHandler.ExpandOpenArray(knState, nodeToRun);
      }
      else if (nodeType === KnNodeType.KnMap) {
        MapHandler.ExpandOpenMap(knState, nodeToRun);
      }
      else if (nodeType === KnNodeType.KnProperty) {
        PropertyHandler.ExpandGetProperty(knState, nodeToRun);
      }
      else if (nodeType === KnNodeType.KnSubscript) {
        SubscriptHandler.ExpandGetSubscript(knState, nodeToRun);
      }
      else if (nodeType === KnNodeType.KnCloseQuote
        || nodeType === KnNodeType.KnSymbol
        || nodeType === KnNodeType.KnOperandStack) {
        knState.AddOpDirectly(KnOpCode.ValStack_PushValue, nodeToRun);
      }
      else {
        knState.AddOpDirectly(KnOpCode.ValStack_PushValue, nodeToRun);
      }
    }

    public static RunNode(knState: KnState, opContState : Instruction) {
      let nodeToRun = opContState.Memo;
      knState.OpBatchStart();
      NodeHandler.ExpandNode(knState, nodeToRun);
      knState.OpBatchCommit();
    }

    public static RunLastVal(knState: KnState, opContState : Instruction) {
      let nodeToRun = knState.GetCurrentFiber().OperandStack.PopValue();
      knState.OpBatchStart();
      NodeHandler.ExpandNode(knState, nodeToRun);
      knState.OpBatchCommit();
    }
}