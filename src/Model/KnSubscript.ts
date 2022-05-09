import { KnType } from "./KnType";

export class KnSubscript {
  public _Type = KnType.Subscript;
  public Value: any;

  public constructor(inner: string) {
    this.Value = inner;
  }
}