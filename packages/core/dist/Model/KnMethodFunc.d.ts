import { KnNodeType } from "./KnNodeType";
import { KnCompositeFunctionBase } from "./KnCompositeFunctionBase";
import { KnWord } from "./KnWord";
export declare class KnMethodFunc extends KnCompositeFunctionBase {
    _Type: KnNodeType;
    InstanceType: any;
    Name: string;
    Visibility: string;
    constructor(paramTable: KnWord[], returnType: any, funcBody: any, name: string, visibility: string);
}
