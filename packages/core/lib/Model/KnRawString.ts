import { KnNodeType } from "./KnNodeType";

export class KnRawString {
  public _Type = KnNodeType.RawString;
  public Value: string;

  public constructor(inner: string) {
    this.Value = inner;
  }
}