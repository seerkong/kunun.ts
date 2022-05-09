import { KnType } from "./KnType";

export class KnOperandStack {
  public _Type = KnType.OperandStack;
  public Value: any[];

  public constructor(inner: any[]) {
    this.Value = inner;
  }
}