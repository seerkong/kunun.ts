import { KnNodeType } from "./KnNodeType"
export class KnHostFunction {
  public _Type = KnNodeType.HostSyncFunc;
  public Func: (args: any) => any;
  public Name: string;

  constructor(name, func) {
    this.Name = name;
    this.Func = func;
  }
}