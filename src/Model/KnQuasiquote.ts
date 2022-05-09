import { KnType } from "./KnType";

export class KnQuasiquote {
  public _Type = KnType.Quasiquote;
  public Value: any;

  public constructor(inner: string) {
    this.Value = inner;
  }
}