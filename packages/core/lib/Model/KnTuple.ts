import { KnNodeType } from "./KnNodeType"

export type KnTupleRow = [string | null, any[], any];
export type KnTupleRawValue = KnTupleRow[] | any[];

export class KnTuple {
  public _Type = KnNodeType.Tuple;
  public RawValue: KnTupleRawValue;

  constructor(value: KnTupleRawValue = []) {
    this.RawValue = value;
  }

  get Value(): any[] {
    if (this.IsTupleRows()) {
      let r = [];
      for (let i = 0; i < this.RawValue.length; i++) {
        r.push(this.RawValue[i][2])
      }
      return r;
    }

    return (this as KnTuple).RawValue as any[];
  }

  public IsTupleRows(): this is { RawValue: KnTupleRow[] } {
    return this.RawValue.every(item => Array.isArray(item) && item.length === 3);
  }
}
