import { KnNodeType } from "./KnType";

export class KnProperty {
  public _Type = KnNodeType.KnProperty;
  public Value: any;

  public constructor(inner: string) {
    this.Value = inner;
  }
}