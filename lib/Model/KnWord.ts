import { KnNodeType } from "./KnType";

export class KnWord {
  public _Type = KnNodeType.KnWord;
  public Annotations: any[];
  public Flags: any[];
  public Modifiers: any[];
  

  public Definition: any;
  public Complements: any[];
  public Value: any;

  public constructor(inner: string) {
    this.Value = inner;
  }

  public static IsSingleLineWord(w : KnWord) : boolean {
    return (w.Annotations == null || w.Annotations.length == 0)
      && (w.Complements == null || w.Complements.length == 0);
  }
}