import { KnNodeType } from "./KnType";

export class KnUnquote {
  public _Type = KnNodeType.KnUnquoteReplace;
  public Value: any;

  public constructor(inner: string) {
    this.Value = inner;
  }
}