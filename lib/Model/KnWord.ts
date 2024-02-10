import { KnNodeType } from "./KnType";

export class KnWord {
  public _Type = KnNodeType.KnWord;
  public Annotation: any[];
  public Flags: any[];
  public Modifier: any[];
  

  public Definition: any;
  public Complement: any[];
  public Value: any;

  public constructor(inner: string) {
    this.Value = inner;
  }

  public static IsSingleLineWord(w : KnWord) : boolean {
    return (w.Annotation == null || w.Annotation.length == 0)
      && (w.Complement == null || w.Complement.length == 0);
  }
}