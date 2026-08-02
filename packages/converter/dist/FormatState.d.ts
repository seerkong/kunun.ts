import { FormatConfig } from "./FormatConfig";
export declare class FormatState {
    IndentLevel: number;
    Config: FormatConfig;
    IndentKnotCore?: boolean;
    constructor(indentLevel?: number, config?: FormatConfig);
}
