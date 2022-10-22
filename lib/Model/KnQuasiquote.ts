import { KnNodeType } from "./KnType";

export class KnQuasiQuote {
  public _Type = KnNodeType.KnQuasiQuote;
  public Value: any;

  public constructor(inner: string) {
    this.Value = inner;
  }
}