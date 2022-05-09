import { KnType } from "./KnType";

export class KnSymbol {
  public _Type = KnType.Symbol;
  public Value: any;

  public constructor(inner: string) {
    this.Value = inner;
  }
}