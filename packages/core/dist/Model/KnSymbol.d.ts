import { KnQualifiedIdentifier } from "./KnQualifiedIdentifier";
import { KnNodeType } from "./KnNodeType";
export declare class KnSymbol extends KnQualifiedIdentifier {
    _Type: KnNodeType;
    constructor(inner: string);
}
