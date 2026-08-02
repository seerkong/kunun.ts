export declare class FormatConfig {
    static readonly SingleLineConfig: FormatConfig;
    static readonly MultiLineConfig: FormatConfig;
    static readonly ExprInnerConfig: FormatConfig;
    static readonly PrettifyConfig: FormatConfig;
    IndentString: string;
    WordMultiLine: boolean;
    MapMultiLine: boolean;
    VectorMultiLine: boolean;
    PrettyExpr: boolean;
    KnotSegmentsMultiLine: boolean;
    KnotCoreMultiLine: boolean;
    KnotTypeParamMultiLine: boolean;
    KnotAttrMultiLine: boolean;
    KnotParamMultiLine: boolean;
    KnotBlockMultiLine: boolean;
    constructor(config?: Partial<FormatConfig>);
    clone(): FormatConfig;
}
