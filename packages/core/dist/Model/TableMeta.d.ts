import { FieldStorageMeta } from "./FieldStorageMeta";
import { KnNodeType } from "./KnNodeType";
import { KnMethodFunc } from "./KnMethodFunc";
import { IPropertyMeta } from "./IPropertyMeta";
export declare class TableMeta {
    _Type: KnNodeType;
    Kind: any;
    FieldMap: Map<string, FieldStorageMeta>;
    PropertyMap: Map<string, IPropertyMeta>;
    MethodMap: Map<string, KnMethodFunc>;
    constructor(kind: string, fields: any[], properties: IPropertyMeta[], methods: KnMethodFunc[]);
}
