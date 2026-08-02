import { KnNodeType } from "./KnNodeType";
import { KnPropertyFunc } from "./KnPropertyFunc";
import { IPropertyMeta } from "./IPropertyMeta";
export declare class CalcPropMeta implements IPropertyMeta {
    _Type: KnNodeType;
    Name: string;
    Definition: any;
    GetterVisibility: string;
    GetterFunc: KnPropertyFunc | null;
    SetterVisibility: string;
    SetterFunc: KnPropertyFunc | null;
    constructor(name: any, definition: any, getterVisibility: string, getterFunc: KnPropertyFunc | null, setterVisibility: string, setterFunc: KnPropertyFunc | null);
}
