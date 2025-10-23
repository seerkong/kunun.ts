import { KnQualifiedIdentifier } from "./KnQualifiedIdentifier";
import { KnNodeType } from "./KnNodeType";

export class KnSymbol extends KnQualifiedIdentifier {
  public _Type = KnNodeType.Symbol;

  public constructor(inner: string) {
    super();
    this.Value = inner;
  }
}