import { KnNodeType } from "./KnType";

export class KnOperandStack {
  public _Type = KnNodeType.KnOperandStack;
  public Value: any[];

  public constructor(inner: any[]) {
    this.Value = inner;
  }
}