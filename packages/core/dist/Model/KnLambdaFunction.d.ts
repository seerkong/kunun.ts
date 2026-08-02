import { Env } from "../StateManagement/Env";
import { KnNodeType } from "./KnNodeType";
import { KnCompositeFunctionBase } from "./KnCompositeFunctionBase";
import { KnWord } from "./KnWord";
export declare class KnLambdaFunction extends KnCompositeFunctionBase {
    _Type: KnNodeType;
    Env: Env;
    Name: string;
    constructor(paramTable: KnWord[], funcBody: any, env: Env, name?: string);
}
