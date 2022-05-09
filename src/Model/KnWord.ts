import { KnType } from "./KnType";

export class KnWord {
  public _Type = KnType.Word;
  public Flags: any[];
  public Annotations: any[];
  public Definition: any;
  public Refinements: any[];
  public Value: any;

  public constructor(inner: string, flags: string[] = [], annotations: string[] = [], definition: any = null, refinements: any[] = []) {
    this.Value = inner;
    this.Flags = flags;
    this.Annotations = annotations;
    this.Definition = definition;
    this.Refinements = refinements;
  }
}