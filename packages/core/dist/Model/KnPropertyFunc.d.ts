import { KnNodeType } from "./KnNodeType";
import { KnCompositeFunctionBase } from "./KnCompositeFunctionBase";
import { KnWord } from "./KnWord";
export declare class KnPropertyFunc extends KnCompositeFunctionBase {
    _Type: KnNodeType;
    RequiredFields: string[];
    Name: string;
    constructor(requiredFields: string[], paramTuple: KnWord[], funcBody: any, name: string);
}
