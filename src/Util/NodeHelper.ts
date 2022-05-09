import { KnType } from "../Model/KnType"
import { KnKnot } from "../Model/KnKnot";
import { KnWord } from "../Model/KnWord";
import { KnSymbol } from "../Model/KnSymbol";
import { KnSubscript } from "../Model/KnSubscript";
import { KnProperty } from "../Model/KnProperty";
import { KnUnknown } from "../Model/KnUnknown";

export class NodeHelper {
  public static GetType(node : any) : string {
    if (Array.isArray(node)) {
      return KnType.Vector;
    }
    else if (typeof node == 'number' || typeof node == 'bigint') {
      return KnType.Number;
    }
    else if (typeof node == 'string') {
      return KnType.String;
    }
    else if (typeof node == 'boolean') {
      return KnType.Boolean;
    }
    else if (node == null) {
      return KnType.Nil;
    }
    else {
      let innerType = node._Type;
      if (innerType != null) {
        return innerType;
      }
      else {
        return KnType.Map;
      }
    }
  }

  public static IsEvaluated(node : any) {
    let type = NodeHelper.GetType(node);
    return (type !== KnType.Map
      && type !== KnType.Vector
      && type !== KnType.Knot
      && type !== KnType.Word
      && type !== KnType.Property
      && type !== KnType.Subscript
      && type !== KnType.UnquoteSplicing
    )
  }

  public static GetWordStr(node : any) {
    return node.Value;
  }

  public static ToBoolean(node : any) : Boolean {
    let type = NodeHelper.GetType(node);
    if (type === KnType.Nil || node == false) {
      return false;
    } else {
      return true;
    }
  }

  public static IsFunctionType(funcType: string) {
    if (funcType === KnType.LambdaFunc || funcType === KnType.MethodFunc
      || funcType === KnType.PropertyFunc
    ) {
      return true;
    }
    else {
      return false;
    }
  }

  public static GetInnerString(node : any) : string {
    let type = NodeHelper.GetType(node);
    if (type === KnType.Word) {
      return node.Value;
    }
    else if (type === KnType.Symbol) {
      return node.Value;
    }
    else {
      return null;
    }
  }

  public static IsWordStr(node : any, expect : string) {
    let type = NodeHelper.GetType(node);
    let WordInner = NodeHelper.GetInnerString(node);
    return (type === KnType.Word && WordInner === expect);
  }



  public static Ukn = new KnUnknown();

  
  public static MakeKnotChain(nodes: KnKnot[]) {
    let result = null; // end of knot
    for (let i = nodes.length - 1; i >= 0; i--) {
      let node = nodes[i];
      if (node.Core != null && KnType.Word === NodeHelper.GetType(node.Core)) {
          node.Core.Flags = node.Flags;
      }
      result = new KnKnot({
        Core: node.Core,
        DoApply: node.DoApply,

        GenericParam: node.GenericParam,
        ContextParam: node.ContextParam,
        Param: node.Param,

        Definition: node.Definition,
        Refinements: node.Refinements,

        Header: node.Header,
        Body: node.Body,
        Next: result
      });
    }
    return result;
  }


}