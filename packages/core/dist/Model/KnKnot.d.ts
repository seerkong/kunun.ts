import { KnNodeType } from "./KnNodeType";
import { KnWord } from "./KnWord";
import { KnOrderedMap } from "./KnOrderedMap";
import { KnTuple } from "./KnTuple";
import { KnModifierGroup } from "./KnModifierGroup";
export declare enum KnotCallType {
    PrefixCall = 0,
    InfixCall = 1,
    InstanceCall = 2,
    PostfixCall = 3,
    Subscript = 4,
    StaticIndex = 5,
    Operator = 6,
    Assignment = 7
}
export interface IKnKnot {
    PreModifiers?: KnModifierGroup;
    PostModifiers?: KnModifierGroup;
    UnboundTypes?: any[];
    CallType?: KnotCallType;
    Core?: any;
    Name?: KnWord;
    Metadata?: Map<KnWord, any>;
    GenericTypes?: KnTuple;
    Params?: KnTuple;
    ResultTypes?: KnTuple;
    Prop?: KnOrderedMap;
    NamedProp?: {
        [prop: string]: KnOrderedMap;
    };
    Attr?: {
        [prop: string]: any;
    };
    NamedAttr?: {
        [prop: string]: {
            [prop: string]: any;
        };
    };
    NamedSlot?: {
        [prop: string]: KnKnot;
    };
    Block?: any[];
    NamedBlock?: {
        [prop: string]: any[];
    };
    InOutTable?: KnTuple;
    GenericParams?: KnTuple;
    Conf?: any;
    NamedConf?: {
        [prop: string]: any;
    };
    Body?: any[];
    Sections?: {
        [prop: string]: any[];
    };
    Slots?: {
        [prop: string]: KnKnot;
    };
    Next?: IKnKnot;
}
export declare class KnKnot implements IKnKnot {
    _Type: KnNodeType;
    static Nil: any;
    PreModifiers?: KnModifierGroup;
    PostModifiers?: KnModifierGroup;
    UnboundTypes?: any[];
    CallType?: KnotCallType;
    Core?: any;
    Name?: KnWord;
    Metadata?: Map<KnWord, any>;
    GenericTypes?: KnTuple;
    Params?: KnTuple;
    ResultTypes?: KnTuple;
    Prop?: KnOrderedMap;
    NamedProp?: {
        [prop: string]: KnOrderedMap;
    };
    Attr?: {
        [prop: string]: any;
    };
    NamedAttr?: {
        [prop: string]: {
            [prop: string]: any;
        };
    };
    NamedSlot?: {
        [prop: string]: KnKnot;
    };
    Block?: any[];
    NamedBlock?: {
        [prop: string]: any[];
    };
    InOutTable?: KnTuple;
    GenericParams?: KnTuple;
    Conf?: any;
    NamedConf?: {
        [prop: string]: any;
    };
    Body?: any[];
    Sections?: {
        [prop: string]: any[];
    };
    Slots?: {
        [prop: string]: KnKnot;
    };
    Next?: KnKnot;
    constructor(node?: IKnKnot);
    static MakeByNodes(nodes: KnKnot[]): KnKnot;
    static IsCoreSingleLine(knot: KnKnot): boolean;
    static HasNext(knot: KnKnot): boolean;
    static IsNextNodeSingleLine(knot: KnKnot): boolean;
    CouldOmitCallParamEnd(): boolean;
    AcceptCallType(): boolean;
    AcceptCore(): boolean;
    AcceptParam(): boolean;
    AcceptOrderedMap(): boolean;
    AcceptUnorderedMap(): boolean;
    AcceptBlock(): boolean;
}
