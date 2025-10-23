import { KnNodeType } from "./KnNodeType";
import { KnNodeHelper } from "../Util/KnNodeHelper";
import { KnWord } from "./KnWord";
import { KnOrderedMap } from "./KnOrderedMap";
import { KnTuple } from "./KnTuple";
import { KnModifierGroup } from "./KnModifierGroup";

export enum KnotCallType {
  PrefixCall, // [`a 1 2;]
  InfixCall,  // [obj:method 1 2;]
  InstanceCall, // (obj ~method args)
  PostfixCall,    // [1 2,sum 3 4;]
  Subscript,   // ::1  ::'a'
  StaticIndex,   // obj.:name
  Operator,
  Assignment,
}

export interface IKnKnot {
  PreModifiers?: KnModifierGroup;
  PostModifiers?: KnModifierGroup;
  UnboundTypes?: any[];
  CallType?: KnotCallType;
  Core?: any;
  Name?: KnWord;
  Metadata?: Map<KnWord, any>;
  GenericTypes?: KnTuple;
  Params?: KnTuple;
  ResultTypes?: KnTuple;
  Prop?: KnOrderedMap;
  NamedProp?: { [prop: string]: KnOrderedMap };
  Attr?: { [prop: string]: any };
  NamedAttr?: { [prop: string]: { [prop: string]: any } }
  NamedSlot?: { [prop: string]: KnKnot };
  Block?: any[];
  NamedBlock?: { [prop: string]: any[] };
  InOutTable?: KnTuple;
  GenericParams?: KnTuple;
  Conf?: any;
  NamedConf?: { [prop: string]: any };
  Body?: any[];
  Sections?: { [prop: string]: any[] };
  Slots?: { [prop: string]: KnKnot };
  Next?: IKnKnot;
}

export class KnKnot implements IKnKnot {
  public _Type = KnNodeType.Knot;
  public static Nil = null;

  public PreModifiers?: KnModifierGroup;
  public PostModifiers?: KnModifierGroup;
  public UnboundTypes?: any[];
  public CallType?: KnotCallType;
  public Core?: any;
  public Name?: KnWord;
  public Metadata?: Map<KnWord, any>;
  public GenericTypes?: KnTuple;
  public Params?: KnTuple;
  public ResultTypes?: KnTuple;

  public Prop?: KnOrderedMap;
  public NamedProp?: { [prop: string]: KnOrderedMap }

  
  public Attr?: { [prop: string]: any };
  public NamedAttr?: { [prop: string]: { [prop: string]: any } }
  public NamedSlot?: { [prop: string]: KnKnot };
  public Block?: any[];
  public NamedBlock?: { [prop: string]: any[] };
  public InOutTable?: KnTuple;
  public GenericParams?: KnTuple;
  public Conf?: any;
  public NamedConf?: { [prop: string]: any };
  public Body?: any[];
  public Sections?: { [prop: string]: any[] };
  public Slots?: { [prop: string]: KnKnot };
  public Next?: KnKnot;

  public constructor(node: IKnKnot = null) {
    if (node == null) {
      return;
    }
    this.PreModifiers = node.PreModifiers;
    this.PostModifiers = node.PostModifiers;
    this.UnboundTypes = node.UnboundTypes;
    this.CallType = node.CallType;
    this.Core = node.Core;
    this.Name = node.Name;
    this.Metadata = node.Metadata;
    this.GenericTypes = node.GenericTypes;
    this.Params = node.Params;
    this.ResultTypes = node.ResultTypes;
    this.Prop = node.Prop;
    this.NamedProp = node.NamedProp;
    this.Attr = node.Attr;
    this.NamedAttr = node.NamedAttr;
    this.NamedSlot = node.NamedSlot;
    this.Block = node.Block;
    this.NamedBlock = node.NamedBlock;
    this.InOutTable = node.InOutTable;
    this.GenericParams = node.GenericParams;
    this.Conf = node.Conf;
    this.NamedConf = node.NamedConf;
    this.Body = node.Body;
    this.Sections = node.Sections;
    this.Slots = node.Slots;
    if (node.Next != null) {
      this.Next = new KnKnot(node.Next);
    }
  }

  public static MakeByNodes(nodes: KnKnot[]): KnKnot {
    let result = null;
    for (let i = nodes.length - 1; i >= 0; i--) {
      let currentKnot = nodes[i];
      currentKnot.Next = result;
      result = currentKnot;
    }
    return result;
  }


  public static IsCoreSingleLine(knot: KnKnot): boolean {
    if (knot.Core == null) {
      return true;
    }
    let coreType = KnNodeHelper.GetType(knot.Core);
    if (coreType == KnNodeType.Word) {
      return KnWord.IsSingleLineWord(knot.Core as KnWord);
    }
    if (coreType == KnNodeType.OrderedMap
      || coreType == KnNodeType.UnorderedMap
      || coreType == KnNodeType.Vector
      || coreType == KnNodeType.Knot) {
      return false;
    }
    return true;
  }

  public static HasNext(knot: KnKnot): boolean {
    return (knot.Next != null);
  }

  public static IsNextNodeSingleLine(knot: KnKnot) {
    let nextNode = knot.Next as KnKnot;
    let isNextNodeCoreSingleLine = KnKnot.IsCoreSingleLine(nextNode);
    return (isNextNodeCoreSingleLine)
      && nextNode.GenericTypes == null && nextNode.Params == null
      && nextNode.ResultTypes == null
      && nextNode.Attr == null
      && nextNode.Block == null
  }

  public CouldOmitCallParamEnd(): boolean {
    return (this.Prop == null && this.NamedProp == null
        && this.Attr == null && this.NamedAttr == null
        && this.Block == null && this.NamedBlock == null
        && this.NamedSlot == null && this.Next == null);
  }

  public AcceptCallType(): boolean {
    return this.CallType == null && this.AcceptCore();
  }

  public AcceptCore(): boolean {
    return this.Core == null && this.AcceptParam();
  }

  public AcceptParam(): boolean {
    return this.Params == null && this.AcceptOrderedMap();
  }

  public AcceptOrderedMap(): boolean {
    return (this.Prop == null || this.Prop.Value.size == 0) && this.AcceptUnorderedMap();
  }
  public AcceptUnorderedMap(): boolean {
    return (this.Attr == null || Object.keys(this.Attr).length == 0) && this.AcceptBlock();
  }

  public AcceptBlock(): boolean {
    return this.Block == null;
  }
}
