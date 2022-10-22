import { KnNodeType } from "./KnType";
import { NodeHelper } from "../Util/NodeHelper";
import { KnWord } from "./KnWord";

export interface IKnKnot {
  // 仅作用于最外层
  Annotations?: any[];
  Flags?: any[];
  Modifiers?: any[];

  Core?: any;
  SegmentStop?: boolean;

  TypeParam?: any[];
  ContextParam?: any[];
  Param?: any[];

  // Definition?: any;
  Complements?: any[];

  Attr?: any;
  Block?: any[];

  Next?: KnKnot;
}

export class KnKnot implements IKnKnot {
  public _Type = KnNodeType.KnKnot;
  // 仅作用于最外层
  public IsData: boolean = false;
  public Annotations?: any[];
  public Flags?: any[];
  public Modifiers?: any[];
  


  public Core?: any;
  public SegmentStop?: boolean = false;
  // 仅作用于内层
  public TypeParam?: any[];
  public ContextParam?: any[];
  public Param?: any[];
  

  // public Definition?: any;
  public Complements?: any[];

  public Attr?: any;
  public Block?: any[];
  public Next?: KnKnot;

  public constructor(node : IKnKnot) {
    this.Annotations = node.Annotations;
    this.Flags = node.Flags;

    // this.Definition = node.Definition;
    this.Complements = node.Complements;

    this.Core = node.Core;
    this.TypeParam = node.TypeParam;
    this.ContextParam = node.ContextParam;
    this.SegmentStop = node.SegmentStop;
    this.Param = node.Param;
    this.Attr = node.Attr;
    
    this.Block = node.Block;
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


  public IsCoreSingleLine() : boolean {
    if (this.Core == null) {
      return true;
    }
    let coreType = NodeHelper.GetType(this.Core);
    if (coreType == KnNodeType.KnWord) {
      return (this.Core as KnWord).IsSingleLineWord();
    }
    if (coreType == KnNodeType.KnMap || coreType == KnNodeType.KnVector
      || coreType == KnNodeType.KnKnot || coreType == KnNodeType.KnCloseQuote
      || coreType == KnNodeType.KnQuasiQuote || coreType == KnNodeType.KnTable) {
      return false;
    }
    return true;
  }

  public HasNext() : boolean {
    return (this.Next != null);
  }

  public IsNextNodeSingleLine() {
    let nextNode = this.Next as KnKnot;
    let isNextNodeCoreSingleLine = nextNode.IsCoreSingleLine();
    return (isNextNodeCoreSingleLine)
      && nextNode.TypeParam == null && nextNode.ContextParam == null
      && nextNode.Param == null 
      // && nextNode.Definition == null
      && nextNode.Complements == null && nextNode.Attr == null
      && nextNode.Block == null
  }
}