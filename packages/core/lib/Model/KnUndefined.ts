import { KnNodeType } from "./KnNodeType";

export class KnUndefined {
  public _Type = KnNodeType.Undefined;
  public static Shared = new KnUndefined();

  public constructor() {
  }
}