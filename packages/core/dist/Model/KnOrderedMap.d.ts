import { KnNodeType } from "./KnNodeType";
export declare class KnOrderedMap {
    _Type: KnNodeType;
    Value: Map<string, any>;
    TypeMap: Map<string, any[]>;
    constructor(valMap: Map<string, any>, typeMap?: Map<string, any[]>);
    static MakeByPairs(kvPairs: [string, any[], any][]): KnOrderedMap;
}
