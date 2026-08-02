import { TypeCheckingResult } from './KonTypeChecker';
export declare class KonTypedBlockError extends Error {
    constructor(message: string);
}
export declare class KonTypedBlockEvaluator {
    static EvaluateSync(source: string): any;
    private static RegisterClassPrototype;
    private static RegisterPropertyPrototype;
    private static InvokeBody;
    private static EvaluateBlock;
    private static EvaluateNode;
    private static EvaluateVar;
    private static EvaluateSet;
    private static EvaluateChain;
    private static EvaluateChainParts;
    private static EvaluateSegment;
    private static EvaluateAtom;
    private static EvaluateLiteral;
    private static ReadSetTarget;
    private static CollectSegments;
    private static ReadCallArguments;
    private static ReadInputParameterNames;
    private static ReadClassReference;
    private static ReadFieldName;
    private static ReadFieldDefaultValue;
}
export declare class KonTypedBlockTypeCheckError extends Error {
    readonly Result: TypeCheckingResult;
    constructor(Result: TypeCheckingResult);
}
