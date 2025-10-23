import { KnNodeType } from "./KnNodeType";

export class KnProperty {
  public _Type = KnNodeType.Property;
  public Value: any;

  public constructor(inner: string) {
    this.Value = inner;
  }
}