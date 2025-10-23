import { KnNodeType } from "./KnNodeType";
import { KnWord } from "./KnWord";

export abstract class KnWrapper {
  public Kind: KnWord;
  public Inner: any;

  public constructor(kind: KnWord, inner: any) {
    this.Kind = kind;
    this.Inner = inner;
  }
}