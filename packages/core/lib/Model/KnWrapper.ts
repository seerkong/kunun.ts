import { KnNodeType } from "./KnNodeType";
import { KnWord } from "./KnWord";

export abstract class KnWrapper {
  public Kind: KnWord;
  public Inner: any;
  public _Type: KnNodeType;

  public constructor(kind: KnWord, inner: any, type: KnNodeType = KnNodeType.QuoteMarcro) {
    this.Kind = kind;
    this.Inner = inner;
    this._Type = type;
  }
}
