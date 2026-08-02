import { KnNodeType } from "./KnNodeType";
import { KnWord } from "./KnWord";
import { KnWrapper } from "./KnWrapper";
export declare class KnQuoteWrapper extends KnWrapper {
    constructor(kind: KnWord, inner: any, type?: KnNodeType);
}
