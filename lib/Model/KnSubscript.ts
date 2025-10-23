import { KnNodeType } from "./KnNodeType";

export class KnSubscript {
  public _Type = KnNodeType.Subscript;
  public Value: any;

  public constructor(inner: string) {
    this.Value = inner;
  }
}