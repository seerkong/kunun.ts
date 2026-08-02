import { KnQualifiedIdentifier } from "./KnQualifiedIdentifier";
import { KnNodeType } from "./KnNodeType";
import { KnModifierGroup } from "./KnModifierGroup";
export declare class KnWord extends KnQualifiedIdentifier {
    _Type: KnNodeType;
    PreModifiers: KnModifierGroup;
    PostModifiers: KnModifierGroup;
    GenericArgs?: any[];
    SourceQualifier?: string;
    constructor(inner: string, qualifiers?: string[]);
    static SourceQualified(source: KnWord, member: KnWord): KnWord;
    GetFullNameStr(): string;
    static IsSingleLineWord(w: KnWord): boolean;
}
