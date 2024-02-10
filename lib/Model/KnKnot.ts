import { KnNodeType } from "./KnType";
import { NodeHelper } from "../Util/NodeHelper";
import { KnWord } from "./KnWord";

export interface IKnKnot {

  // 仅作用于最外层
  IsData?: boolean;
  Modifier?: any[];
  Annotation?: any[];
  Flags?: any[];
  TypeWhere?: any[];
  ContextParam?: any[];
  Definition?: any[];
  
  
    
    
  // 仅作用于内层
  Core?: any;
  TypeParam?: any[];
  Param?: any[];
  Apply?: boolean;
  
  TypeResult?: any[];
  
    
  Complement?: any[];
  
  Attr?: any;
  Feature?: any;
  Body?: any[];
  Section?: any;
  Next?: KnKnot;

}

export class KnKnot implements IKnKnot {
  public _Type = KnNodeType.KnKnot;
  // 仅作用于最外层
  public IsData: boolean = false;
  public Modifier?: any[];
  public Annotation?: any[];
  public Flags?: any[];
  public TypeWhere?: any[];
  public ContextParam?: any[];
  public Definition?: any[];


  
  
  // 仅作用于内层
  public Core?: any;
  public TypeParam?: any[];
  public Param?: any[];
  public Apply?: boolean = false;

  public TypeResult?: any[];

  
  public Complement?: any[];

  public Attr?: any;
  public Feature?: {[prop:string] : any} = {};
  public Body?: any[];
  public Section?: {[prop:string] : any} = {};
  public Next?: KnKnot;

  public constructor(node : IKnKnot) {
    this.IsData = node.IsData;
    this.Modifier = node.Modifier;
    this.Annotation = node.Annotation;
    this.Flags = node.Flags;

    this.TypeWhere = node.TypeWhere;
    this.ContextParam = node.ContextParam;

    this.Definition = node.Definition;
    this.Core = node.Core;
    this.TypeParam = node.TypeParam;
    this.Param = node.Param;
    this.Apply = node.Apply;
    this.TypeResult = node.TypeResult;
    this.Complement = node.Complement;
    
    this.Attr = node.Attr;
    this.Feature = node.Feature;
    
    this.Body = node.Body;
    this.Section = node.Section;
    this.Next = node.Next;
  }

  public static MakeByNodes(nodes : KnKnot[]) : KnKnot {
    let result = null;
    for (let i = nodes.length - 1; i >= 0; i--) {
      let currentKnot = nodes[i];
      currentKnot.Next = result;
      result = currentKnot;
    }
    return result;
  }


  public static IsCoreSingleLine(knot : KnKnot) : boolean {
    if (knot.Core == null) {
      return true;
    }
    let coreType = NodeHelper.GetType(knot.Core);
    if (coreType == KnNodeType.KnWord) {
      return KnWord.IsSingleLineWord(knot.Core as KnWord);
    }
    if (coreType == KnNodeType.KnMap || coreType == KnNodeType.KnVector
      || coreType == KnNodeType.KnKnot || coreType == KnNodeType.KnCloseQuote
      || coreType == KnNodeType.KnQuasiQuote || coreType == KnNodeType.KnTable) {
      return false;
    }
    return true;
  }

  public static HasNext(knot : KnKnot) : boolean {
    return (knot.Next != null);
  }

  public static IsNextNodeSingleLine(knot : KnKnot) {
    let nextNode = knot.Next as KnKnot;
    let isNextNodeCoreSingleLine = KnKnot.IsCoreSingleLine(nextNode);
    return (isNextNodeCoreSingleLine)
      && nextNode.TypeParam == null && nextNode.ContextParam == null
      && nextNode.Param == null 
      && nextNode.Definition == null
      && nextNode.Complement == null && nextNode.Attr == null
      && nextNode.Body == null
  }
}