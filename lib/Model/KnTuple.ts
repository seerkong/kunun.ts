
import { Env } from "../StateManagement/Env";
import { KnNodeType } from "./KnNodeType"
import { TableMeta } from "./TableMeta";
import { KnPropertyFunc } from "./KnPropertyFunc"
export class KnTuple {
  public _Type = KnNodeType.Tuple;
  // tag - type - value
  public RawValue: [string, any[], any][];

  constructor(value: [string, any[], any][] = []) {
    this.RawValue = value;
  }

  get Value() {
    let r = [];
    for (let i = 0; i < this.RawValue.length; i++) {
      r.push(this.RawValue[i][i])
    }
    return r;
  }
}