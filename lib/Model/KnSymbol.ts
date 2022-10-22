import { KnNodeType } from "./KnType";

export class KnSymbol {
  public _Type = KnNodeType.KnSymbol;
  public Value: any;

  public constructor(inner: string) {
    this.Value = inner;
  }
}