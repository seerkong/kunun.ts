import { KnNodeType } from "./KnType"
export class KnHostFunction {
  public _Type = KnNodeType.KnHostFunc;
  public Func: (args: any) => any;
  public Name: string;

  constructor(name, func) {
    this.Name = name;
    this.Func = func;
  }
}