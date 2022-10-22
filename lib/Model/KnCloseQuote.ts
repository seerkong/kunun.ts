import { KnNodeType } from "./KnType";

export class KnCloseQuote {
  public _Type = KnNodeType.KnCloseQuote;
  public Value: any;

  public constructor(inner: string) {
    this.Value = inner;
  }
}