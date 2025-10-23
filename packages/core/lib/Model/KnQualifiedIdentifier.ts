
export abstract class KnQualifiedIdentifier {
  public Qualifiers: string[];
  public Value: string;


  public GetQualifiersAndCore() : string[] {
    return [...this.Qualifiers].concat(this.Value);
  }
}