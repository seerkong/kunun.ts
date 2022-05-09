import { KnType } from "./KnType";

export class KnUnquoteSplicing {
  public _Type = KnType.UnquoteSplicing;
  public Value: any;

  public constructor(inner: string) {
    this.Value = inner;
  }
}