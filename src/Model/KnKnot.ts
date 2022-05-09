import { KnType } from "./KnType";

export interface IKnKnot {
  Annotations?: any[];
  Flags?: any[];
  TypeVars?: any[];

  Core?: any;
  DoApply?: boolean;

  GenericParam?: any[];
  ContextParam?: any[];
  Param?: any[];

  Definition?: any;
  Refinements?: any[];

  Header?: any;
  Body?: any[];

  Next?: any;
}

export class KnKnot implements IKnKnot {
  public _Type = KnType.Knot;
  public IsData: boolean = false;

  
  public TypeVars: any[];
  public Flags: any[];
  public Annotations: any[];


  public Core: any;
  public DoApply: boolean = false;

  public GenericParam: any[];
  public ContextParam: any[];
  public Param: any[];
  

  public Definition: any;
  public Refinements: any[];

  public Header: any;
  public Body: any[];
  public Next: any;

  public constructor(node : IKnKnot) {
    this.Annotations = node.Annotations;
    this.TypeVars = node.TypeVars;
    this.Flags = node.Flags;

    this.Definition = node.Definition;
    this.Refinements = node.Refinements;

    this.Core = node.Core;
    this.GenericParam = node.GenericParam;
    this.ContextParam = node.ContextParam;
    this.DoApply = node.DoApply;
    this.Param = node.Param;
    this.Header = node.Header;
    
    this.Body = node.Body;
    this.Next = node.Next;
  }
}