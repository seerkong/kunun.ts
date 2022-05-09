import { KnType } from "./KnType";

export class KnUnquote {
  public _Type = KnType.Unquote;
  public Value: any;

  public constructor(inner: string) {
    this.Value = inner;
  }
}