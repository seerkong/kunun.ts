import { KnNodeType } from "./KnNodeType";
export type KnTupleRow = [string | null, any[], any];
export type KnTupleRawValue = KnTupleRow[] | any[];
export declare class KnTuple {
    _Type: KnNodeType;
    RawValue: KnTupleRawValue;
    constructor(value?: KnTupleRawValue);
    get Value(): any[];
    IsTupleRows(): this is {
        RawValue: KnTupleRow[];
    };
}
