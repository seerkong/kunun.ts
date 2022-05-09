import { KnType } from "./KnType"
export class KnHostFunction {
  public _Type = KnType.HostFunc;
  public Func: (args: any) => any;
  public Name: string;

  constructor(name, func) {
    this.Name = name;
    this.Func = func;
  }
}