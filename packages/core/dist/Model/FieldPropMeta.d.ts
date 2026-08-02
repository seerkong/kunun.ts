import { KnNodeType } from "./KnNodeType";
import { IPropertyMeta } from "./IPropertyMeta";
export declare class FieldPropMeta implements IPropertyMeta {
    _Type: KnNodeType;
    Name: string;
    Definition: any;
    Visibility: string;
    constructor(name: any, definition?: any, visibility?: string);
}
