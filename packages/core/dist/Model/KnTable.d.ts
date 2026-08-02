import { TableMeta } from "./TableMeta";
import { KnNodeType } from "./KnNodeType";
export declare class KnTable {
    _Type: KnNodeType;
    Metadata: TableMeta;
    Fields: any[];
    constructor(metadata: TableMeta, fields: any[]);
}
