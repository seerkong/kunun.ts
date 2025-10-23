import { KnNodeType } from "./KnNodeType";

export class KnUnknown {
  public _Type = KnNodeType.Unknown;
  public static Shared = new KnUnknown();

  public constructor() {
  }
}