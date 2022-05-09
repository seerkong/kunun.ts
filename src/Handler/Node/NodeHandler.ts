import { FuncHandler } from '../PrefixKeyword/FuncHandler';
import { MapHandler } from './MapHandler';
import { ArrayHandler } from '../../Handler/Node/ArrayHandler';
import { NodeHelper } from '../../Util/NodeHelper';
import { StateMgr } from "../../StateMgr";
import { OpCode } from '../../OpCode';
import { KnType } from '../../Model/KnType';
import { Instruction } from '../../StateManagement/InstructionStack';
import { ExtensionRegistry } from '../../ExtensionRegistry';
import { OpenKnotDataHandler } from './OpenKnotDataHandler';
import { KnotExprHandler } from './KnotExprHandler';
import { PropertyHandler } from './PropertyHandler';
import { SubscriptHandler } from './SubscriptHandler';
import { KnKnot } from 'Model/KnKnot';
import { KnUnquoteSplicing } from 'Model/KnUnquoteSplicing';
import { KnOperandStack } from 'Model/KnOperandStack';

export class NodeHandler {
    public static ExpandNode(stateMgr: StateMgr, nodeToRun: any) {
      let nodeType = NodeHelper.GetType(nodeToRun);
      if (NodeHelper.IsEvaluated(nodeToRun)) {
        stateMgr.AddOpDirectly(OpCode.ValStack_PushValue, nodeToRun);
      }
      else if (nodeType === KnType.Knot) {
        let knotNode = nodeToRun as KnKnot;
        let firstVal = knotNode.Core;
        let firstValType = NodeHelper.GetType(firstVal);
        if (knotNode.IsData === true) {
          OpenKnotDataHandler.ExpandKnotData(stateMgr, knotNode);
        }
        else if (firstValType === KnType.Word
          && ExtensionRegistry.IsPrefixKeyWord(NodeHelper.GetInnerString(firstVal))) {
          let keyWordStr = NodeHelper.GetInnerString(firstVal);
          let instructionExpander = ExtensionRegistry.GetPrefixKeywordExpander(keyWordStr);
          instructionExpander.apply(null, [stateMgr, knotNode]);
        }
        else {
          KnotExprHandler.ExpandKnotSingleResultSentence(stateMgr, knotNode);
        }
      }
      else if (nodeType === KnType.UnquoteSplicing) {
        let inner = (nodeToRun as KnUnquoteSplicing).Value;
        let innerType = NodeHelper.GetType(inner);
        let dataToExpand = [];
        if (innerType === KnType.Word) {
          let wordStr = NodeHelper.GetWordStr(inner);
          let valInEnv = stateMgr.Lookup(wordStr);
          let valTypeInEnv = NodeHelper.GetType(valInEnv);
          if (valTypeInEnv === KnType.Vector) {
            dataToExpand = valInEnv;
          }
        }
        else if (innerType === KnType.Vector) {
          dataToExpand = inner;
        }
        stateMgr.OpBatchStart();
        for (let i = 0; i < dataToExpand.length; i++) {
          stateMgr.AddOp(OpCode.ValStack_PushValue, dataToExpand[i]);
        }
        stateMgr.OpBatchCommit(); 
      }
      else if (nodeType === KnType.Word) {
        let wordStr = NodeHelper.GetWordStr(nodeToRun);
        let valInEnv = stateMgr.Lookup(wordStr);
        stateMgr.AddOpDirectly(OpCode.ValStack_PushValue, valInEnv);
      }
      else if (nodeType === KnType.Vector) {
        ArrayHandler.ExpandOpenArray(stateMgr, nodeToRun);
      }
      else if (nodeType === KnType.Map) {
        MapHandler.ExpandOpenMap(stateMgr, nodeToRun);
      }
      else if (nodeType === KnType.Property) {
        PropertyHandler.ExpandGetProperty(stateMgr, nodeToRun);
      }
      else if (nodeType === KnType.Subscript) {
        SubscriptHandler.ExpandGetSubscript(stateMgr, nodeToRun);
      }
      else if (nodeType === KnType.Quote
        || nodeType === KnType.Symbol
        || nodeType === KnType.OperandStack) {
        stateMgr.AddOpDirectly(OpCode.ValStack_PushValue, nodeToRun);
      }
      else {
        stateMgr.AddOpDirectly(OpCode.ValStack_PushValue, nodeToRun);
      }
    }

    public static RunNode(stateMgr: StateMgr, opContState : Instruction) {
      let nodeToRun = opContState.Memo;
      stateMgr.OpBatchStart();
      NodeHandler.ExpandNode(stateMgr, nodeToRun);
      stateMgr.OpBatchCommit();
    }

    public static RunLastVal(stateMgr: StateMgr, opContState : Instruction) {
      let nodeToRun = stateMgr.GetCurrentFiber().OperandStack.PopValue();
      stateMgr.OpBatchStart();
      NodeHandler.ExpandNode(stateMgr, nodeToRun);
      stateMgr.OpBatchCommit();
    }
}