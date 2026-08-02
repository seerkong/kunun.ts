import { KnWord } from "./KnWord";
export declare class KnCompositeFunctionBase {
    ParamTuple: KnWord[];
    ReturnType: any;
    FuncBody: any;
    Arity: number;
    VaryLengthParamPositiType: number;
    constructor(funcBody: any, paramTable: KnWord[], returnType?: any);
}
