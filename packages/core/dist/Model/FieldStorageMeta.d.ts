import { KnNodeType } from "./KnNodeType";
export declare class FieldStorageMeta {
    _Type: KnNodeType;
    Name: string;
    Index: number;
    Definition: any;
    DefaultValueExpr: any;
    constructor(name: any, index: any, definition?: any, defaultValueExpr?: any);
}
