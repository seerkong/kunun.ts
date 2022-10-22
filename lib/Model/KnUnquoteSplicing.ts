import { KnNodeType } from "./KnType";

export class KnUnquoteSplicing {
  public _Type = KnNodeType.KnUnquoteExpand;
  public Value: any;

  public constructor(inner: string) {
    this.Value = inner;
  }
}