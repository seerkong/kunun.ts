import { KnNodeType } from "./KnType";

export class KnWord {
  public _Type = KnNodeType.KnWord;
  public Annotations: any[];
  public Flags: any[];
  public Modifiers: any[];
  

  public Definition: any;
  // public Refinements: any[];
  public Value: any;

  public constructor(inner: string) {
    this.Value = inner;
  }

  public IsSingleLineWord() : boolean {
    return (this.Annotations == null || this.Annotations.length == 0)
      // && (this.Refinements == null || this.Refinements.length == 0);
  }
}