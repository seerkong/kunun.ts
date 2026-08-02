import { KnNodeType } from "../Model/KnNodeType";
import { KnKnot } from "../Model/KnKnot";
import { KnUnknown } from "../Model/KnUnknown";
export declare class KnNodeHelper {
    static GetType(node: any): KnNodeType;
    static IsEvaluated(node: any): boolean;
    static GetWordStr(node: any): any;
    static ToBoolean(node: any): Boolean;
    static IsFunctionType(funcType: string): boolean;
    static GetInnerString(node: any): string;
    static IsWordStr(node: any, expect: string): boolean;
    static Ukn: KnUnknown;
    static MakeKnotChainByShallowCopy(nodes: KnKnot[]): any;
}
