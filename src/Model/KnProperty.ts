import { KnType } from "./KnType";

export class KnProperty {
  public _Type = KnType.Property;
  public Value: any;

  public constructor(inner: string) {
    this.Value = inner;
  }
}