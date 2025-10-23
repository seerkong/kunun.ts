import { KnNodeType } from "./KnNodeType";

export class KnOperandStack {
  public _Type = KnNodeType.OperandStack;
  public Value: any[];

  public constructor(inner: any[]) {
    this.Value = inner;
  }
}