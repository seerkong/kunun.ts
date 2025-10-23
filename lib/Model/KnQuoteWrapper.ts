import { KnNodeType } from "./KnNodeType";
import { KnWord } from "./KnWord";
import { KnWrapper } from "./KnWrapper";


export class KnQuoteWrapper extends KnWrapper {
  public constructor(kind: KnWord, inner: any) {
    super(kind, inner);
  }
}