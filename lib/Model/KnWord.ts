import { KnQualifiedIdentifier } from "./KnQualifiedIdentifier";
import { KnNodeType } from "./KnNodeType";
import { KnModifierGroup } from "./KnModifierGroup";

export class KnWord extends KnQualifiedIdentifier {
  public _Type = KnNodeType.Word;


  public PreModifiers: KnModifierGroup;
  public PostModifiers: KnModifierGroup;

  public constructor(inner: string, qualifiers: string[] = []) {
    super();
    this.Value = inner;
    this.Qualifiers = qualifiers;
  }

  public static IsSingleLineWord(w : KnWord) : boolean {
    return true;
    // return (w.Annotation == null || w.Annotation.length == 0)
    //   && (w.Complement == null || w.Complement.length == 0);
  }

}