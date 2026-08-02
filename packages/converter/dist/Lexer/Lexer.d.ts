export declare enum TokenType {
    BeginCurlyBracket = 0,
    EndCurlyBracket = 1,
    BeginBracket = 2,
    EndBracket = 3,
    BeginParenthese = 4,
    EndParenthese = 5,
    VerticalBar = 6,
    Tilde = 7,
    UpArrow = 8,
    QuestionMark = 9,
    ExclamationMark = 10,
    Percent = 11,
    Dollar = 12,
    Colon = 13,
    ColonColonColon = 14,
    ColonColon = 15,
    DotColon = 16,
    UnquoteSplice = 17,
    UnquoteMap = 18,
    Semicolon = 19,
    BackQuote = 20,
    Sharp = 21,
    Comma = 22,
    At = 23,
    Equal = 24,
    Ampersand = 25,
    LowerThan = 26,
    BiggerThan = 27,
    NewLine = 28,
    SingleLineComment = 29,
    Whitespace = 30,
    Boolean = 31,
    Null = 32,
    Nil = 33,
    Unknown = 34,
    Undefined = 35,
    Number = 36,
    RawString = 37,
    String = 38,
    Identifier = 39,
    Symbol = 40,
    Operator = 41,
    Dot = 42,
    DotDot = 43,
    DotDotDot = 44,
    EOF = 45
}
export declare class TokenBase<TTokenType> {
    readonly Column: number;
    readonly Row: number;
    readonly Type: TTokenType;
    readonly Value: string;
    constructor(type: TTokenType, value: string, row: number, column: number);
    toString(): string;
    equals(obj: any): boolean;
}
export declare class Token extends TokenBase<TokenType> {
    static OperatorTokenValues: string[];
    constructor(type: TokenType, value: string, row: number, column: number);
    IsOperatorToken(): boolean;
}
export declare class LexException extends Error {
    row: number;
    column: number;
    constructor(message: string, row: number, column: number);
}
export declare class ParseException extends Error {
    constructor(message: string);
}
export declare class Lexer {
    private static readonly reg_;
    static Lex(input: string): Token[];
    private static UnrecognizedTokenError;
    private static ReadStringToken;
    private static SkipInterpolationBlock;
    private static FindLineEnd;
    private static AdvancePosition;
}
export declare class IndexedStream<TElement extends TokenBase<TokenType>, TConstraint extends TokenType> {
    protected readonly _constraintChecker: (token: TElement, type: TConstraint) => boolean;
    protected readonly _input: TElement[];
    protected _index: number;
    constructor(input: TElement[], constraintChecker: (token: TElement, type: TConstraint) => boolean);
    Current(): TElement;
    Consume(type?: TConstraint): TElement;
    ConsumeWithConstraint(expectedType: TConstraint): TElement;
    Peek(nextOffset?: number): TElement | undefined;
    End(): boolean;
    SkipBlankTokens(blankTypes: Set<TokenType>): void;
    SkipToken(expectedType?: TokenType): void;
    ConsumeAndSkipBlankTokens(): TElement;
    ConsumeAndSkipBlankTokensWithExpected(expectedTypes: Set<TokenType>): TElement;
    ConsumeTypeAndSkipBlankTokens(expectedType: TokenType): TElement;
    NewParseException(): void;
    toString(): string;
}
