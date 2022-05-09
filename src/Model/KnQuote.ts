import { KnType } from "./KnType";

export class KnQuote {
  public _Type = KnType.Quote;
  public Value: any;

  public constructor(inner: string) {
    this.Value = inner;
  }
}