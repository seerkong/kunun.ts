import { KnNodeType } from "./KnNodeType";
export declare class KnHostFunction {
    _Type: KnNodeType;
    Func: (args: any) => any;
    Name: string;
    constructor(name: any, func: any);
}
