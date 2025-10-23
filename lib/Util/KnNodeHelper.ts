import { KnNodeType } from "../Model/KnNodeType"
import { KnKnot } from "../Model/KnKnot";
import { KnWord } from "../Model/KnWord";
import { KnSymbol } from "../Model/KnSymbol";
import { KnSubscript } from "../Model/KnSubscript";
import { KnProperty } from "../Model/KnProperty";
import { KnUnknown } from "../Model/KnUnknown";

export class KnNodeHelper {
  public static GetType(node : any) : KnNodeType {
    if (Array.isArray(node)) {
      return KnNodeType.Vector;
    }
    else if (typeof node == 'number' || typeof node == 'bigint') {
      return KnNodeType.Number;
    }
    else if (typeof node == 'string') {
      return KnNodeType.String;
    }
    else if (typeof node == 'boolean') {
      return KnNodeType.Boolean;
    }
    else if (node == null) {
      return KnNodeType.Nil;
    }
    else {
      let innerType = node._Type;
      if (innerType != null) {
        return innerType;
      }
      else {
        return KnNodeType.UnorderedMap;
      }
    }
  }

  public static IsEvaluated(node : any) {
    let type = KnNodeHelper.GetType(node);
    return (type !== KnNodeType.UnorderedMap
      && type !== KnNodeType.Vector
      && type !== KnNodeType.Knot
      && type !== KnNodeType.Word
      && type !== KnNodeType.Property
      && type !== KnNodeType.Subscript
      // && type !== XnNodeType.UnquoteExpand
    )
  }

  public static GetWordStr(node : any) {
    return node.Value;
  }

  public static ToBoolean(node : any) : Boolean {
    let type = KnNodeHelper.GetType(node);
    if (type === KnNodeType.Nil || node == false) {
      return false;
    } else {
      return true;
    }
  }

  public static IsFunctionType(funcType: string) {
    if (funcType === KnNodeType.Lambda || funcType === KnNodeType.MethodFunc
      || funcType === KnNodeType.PropertyFunc
    ) {
      return true;
    }
    else {
      return false;
    }
  }

  public static GetInnerString(node : any) : string {
    let type = KnNodeHelper.GetType(node);
    if (type === KnNodeType.Word) {
      return node.Value;
    }
    else if (type === KnNodeType.Symbol) {
      return node.Value;
    }
    else {
      return null;
    }
  }

  public static IsWordStr(node : any, expect : string) {
    let type = KnNodeHelper.GetType(node);
    let wordInner = KnNodeHelper.GetInnerString(node);
    return (type === KnNodeType.Word && wordInner === expect);
  }



  public static Ukn = new KnUnknown();

  
  public static MakeKnotChainByShallowCopy(nodes: KnKnot[]) {
    let result = null; // end of knot
    for (let i = nodes.length - 1; i >= 0; i--) {
      let node = nodes[i];
      let tmp = result;
      result = new KnKnot(node);
      result.Next = tmp;
    }
    return result;
  }


}