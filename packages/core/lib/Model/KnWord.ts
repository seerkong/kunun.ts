import { KnQualifiedIdentifier } from "./KnQualifiedIdentifier";
import { KnNodeType } from "./KnNodeType";
import { KnModifierGroup } from "./KnModifierGroup";

export class KnWord extends KnQualifiedIdentifier {
  public _Type = KnNodeType.Word;


  public PreModifiers: KnModifierGroup;
  public PostModifiers: KnModifierGroup;
  public GenericArgs?: any[];
  public SourceQualifier?: string;

  public constructor(inner: string, qualifiers: string[] = []) {
    super();
    this.Value = inner;
    this.Qualifiers = qualifiers;
  }

  public static SourceQualified(source: KnWord, member: KnWord): KnWord {
    const word = new KnWord(member.Value, member.Qualifiers);
    word.SourceQualifier = source.GetFullNameStr();
    word.GenericArgs = member.GenericArgs;
    return word;
  }

  public GetFullNameStr(): string {
    const name = this.GetQualifiersAndCore().join(".");
    return this.SourceQualifier == null ? name : `${this.SourceQualifier}:::${name}`;
  }

  public static IsSingleLineWord(w : KnWord) : boolean {
    return true;
    // return (w.Annotation == null || w.Annotation.length == 0)
    //   && (w.Complement == null || w.Complement.length == 0);
  }

}
