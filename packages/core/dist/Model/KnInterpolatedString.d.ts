import { KnNodeType } from "./KnNodeType";
export type KnInterpolatedStringPart = {
    kind: 'text';
    value: string;
} | {
    kind: 'expr';
    value: any;
};
export declare class KnInterpolatedString {
    _Type: KnNodeType;
    Parts: KnInterpolatedStringPart[];
    constructor(parts: KnInterpolatedStringPart[]);
}
