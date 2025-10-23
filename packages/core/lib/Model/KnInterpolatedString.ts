import { KnNodeType } from "./KnNodeType";

export type KnInterpolatedStringPart =
  | { kind: 'text'; value: string }
  | { kind: 'expr'; value: any };

export class KnInterpolatedString {
  public _Type = KnNodeType.InterpolatedString;
  public Parts: KnInterpolatedStringPart[];

  public constructor(parts: KnInterpolatedStringPart[]) {
    this.Parts = parts;
  }
}
