import { KnNodeType } from "./KnNodeType";
import { KnWord } from "./KnWord";
export declare abstract class KnWrapper {
    Kind: KnWord;
    Inner: any;
    _Type: KnNodeType;
    constructor(kind: KnWord, inner: any, type?: KnNodeType);
}
