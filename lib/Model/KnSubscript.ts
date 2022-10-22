import { KnNodeType } from "./KnType";

export class KnSubscript {
  public _Type = KnNodeType.KnSubscript;
  public Value: any;

  public constructor(inner: string) {
    this.Value = inner;
  }
}