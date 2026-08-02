import { KnKnot } from "../Model/KnKnot";
import { KnUkn } from "../Model/KnUkn";
export declare class NodeHelper {
    static GetType(node: any): string;
    static IsEvaluated(node: any): boolean;
    static GetWordStr(node: any): any;
    static ToBoolean(node: any): Boolean;
    static IsFunctionType(funcType: string): boolean;
    static GetInnerString(node: any): string;
    static IsWordStr(node: any, expect: string): boolean;
    static Ukn: KnUkn;
    static MakeKnotChainByShallowCopy(nodes: KnKnot[]): any;
}
