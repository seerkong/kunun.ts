import { KnNodeType } from "../Model/KnType"
import { KnKnot } from "../Model/KnKnot";
import { KnWord } from "../Model/KnWord";
import { KnSymbol } from "../Model/KnSymbol";
import { KnSubscript } from "../Model/KnSubscript";
import { KnProperty } from "../Model/KnProperty";
import { KnUkn } from "../Model/KnUkn";

export class NodeHelper {
  public static GetType(node : any) : string {
    if (Array.isArray(node)) {
      return KnNodeType.KnVector;
    }
    else if (typeof node == 'number' || typeof node == 'bigint') {
      return KnNodeType.KnNumber;
    }
    else if (typeof node == 'string') {
      return KnNodeType.KnString;
    }
    else if (typeof node == 'boolean') {
      return KnNodeType.KnBoolean;
    }
    else if (node == null) {
      return KnNodeType.KnNil;
    }
    else {
      let innerType = node._Type;
      if (innerType != null) {
        return innerType;
      }
      else {
        return KnNodeType.KnMap;
      }
    }
  }

  public static IsEvaluated(node : any) {
    let type = NodeHelper.GetType(node);
    return (type !== KnNodeType.KnMap
      && type !== KnNodeType.KnVector
      && type !== KnNodeType.KnKnot
      && type !== KnNodeType.KnWord
      && type !== KnNodeType.KnProperty
      && type !== KnNodeType.KnSubscript
      && type !== KnNodeType.KnUnquoteExpand
    )
  }

  public static GetWordStr(node : any) {
    return node.Value;
  }

  public static ToBoolean(node : any) : Boolean {
    let type = NodeHelper.GetType(node);
    if (type === KnNodeType.KnNil || node == false) {
      return false;
    } else {
      return true;
    }
  }

  public static IsFunctionType(funcType: string) {
    if (funcType === KnNodeType.KnLambdaFunc || funcType === KnNodeType.KnMethodFunc
      || funcType === KnNodeType.KnPropertyFunc
    ) {
      return true;
    }
    else {
      return false;
    }
  }

  public static GetInnerString(node : any) : string {
    let type = NodeHelper.GetType(node);
    if (type === KnNodeType.KnWord) {
      return node.Value;
    }
    else if (type === KnNodeType.KnSymbol) {
      return node.Value;
    }
    else {
      return null;
    }
  }

  public static IsWordStr(node : any, expect : string) {
    let type = NodeHelper.GetType(node);
    let wordInner = NodeHelper.GetInnerString(node);
    return (type === KnNodeType.KnWord && wordInner === expect);
  }



  public static Ukn = new KnUkn();

  
  public static MakeKnotChainByShallowCopy(nodes: KnKnot[]) {
    let result = null; // end of knot
    for (let i = nodes.length - 1; i >= 0; i--) {
      let node = nodes[i];
      result = new KnKnot({
        Core: node.Core,
        SegmentStop: node.SegmentStop,

        TypeParam: node.TypeParam,
        ContextParam: node.ContextParam,
        Param: node.Param,

        Definition: node.Definition,
        Complements: node.Complements,

        Attr: node.Attr,
        Block: node.Block,
        Next: result
      });
    }
    return result;
  }


}