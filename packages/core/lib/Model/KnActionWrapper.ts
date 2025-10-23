import { KnNodeType } from "./KnNodeType";
import { KnWord } from "./KnWord";
import { KnWrapper } from "./KnWrapper";


export class KnActionWrapper extends KnWrapper {
  public constructor(kind: KnWord, inner: any) {
    super(kind, inner);
  }
}