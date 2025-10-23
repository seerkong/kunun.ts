export enum TokenType {
    BeginCurlyBracket, // {
    EndCurlyBracket, // }
    BeginBracket, // [
    EndBracket, // ]
    BeginParenthese, // (
    EndParenthese, // )
    VerticalBar, // |
    Tilde, // ~
    UpArrow, // ^
    QuestionMark, // ?
    ExclamationMark, // !
    Percent, // %
    Dollar, // $
    Colon, // :
    ColonColon, // ::
    DotColon, // .:
    Semicolon, // ;
    BackQuote, // `
    Sharp, // #
    Comma, // ,
    // UnquoteReplace, // ,$
    // UnquoteExpandItems, // ,@
    // UnquoteExpandKeyValue, // ,%
    At, // @
    Equal, // =
    Ampersand, // &
    LowerThan, // <
    BiggerThan, // >
    NewLine,
    SingleLineComment,
    Whitespace,
    Boolean,
    Null,
    Nil,
    Unknown,
    Undefined,
    Number,
    RawString,
    String,
    Identifier,
    Symbol,
    Operator,

    Dot, // .
    DotDot, // ..
    DotDotDot, // ...
    EOF
}

export class TokenBase<TTokenType> {
    readonly Column: number;
    readonly Row: number;
    readonly Type: TTokenType;
    readonly Value: string;

    constructor(type: TTokenType, value: string, row: number, column: number) {
        this.Type = type;
        this.Value = value;
        this.Row = row;
        this.Column = column;
    }

    toString(): string {
        return `Token(Type=${this.Type}, Value=<'${this.Value}'>, Row=${this.Row}, Column=${this.Column})`;
    }

    equals(obj: any): boolean {
        if (!(obj instanceof TokenBase)) return false;
        const other: TokenBase<TTokenType> = obj;
        return this.Type === other.Type &&
            this.Value === other.Value &&
            this.Row === other.Row &&
            this.Column === other.Column;
    }

    // getHashCode(): number {
    //     let num = 0;
    //     if (this.value) {
    //         num += 7 * this.value.hashCode();
    //     }
    //     return num;
    // }
}

export class Token extends TokenBase<TokenType> {
    public static OperatorTokenValues : string[] = [
       "+", "++", "+=", "-", "--", "-=",
        "*", "*=", "/", "/=",
        "<", ">", "<=", ">=", "=="
    ];

    constructor(type: TokenType, value: string, row: number, column: number) {
        super(type, value, row, column);
    }

    public IsOperatorToken(): boolean {
        return Token.OperatorTokenValues.includes(this.Value);
    }
}

export class LexException extends Error {
    row: number;
    column: number;
    constructor(message: string, row: number, column: number) {
        super(message);
        this.row = row;
        this.column = column;
    }
}

export class ParseException extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class Lexer {
    // private static readonly reg_ = new RegExp(
    //     "(?<SingleLineComment>``.*\\n)"
    //     + "|(?<Whitespace>[\\x20\\t\\r]+)"
    //     + "|(?<NewLine>\\n)"
    //     + "|(?<Number>-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[Ee][+-]?\\d+)?)"
    //     + "|(?<String>\"(?:[^\"\\\\]*|\\\\(?:[\"\\\\bfnrt\\/]|u[0-9A-Fa-f]{4}))*\")"
    //     + "|(?<RawString>'[^']*')"
    //     + "|(?<Identifier>(?:[_a-zA-Z\\+\\-\\*\\/])(?:[_a-zA-Z0-9=\\+\\-\\*\\/])*|==|>=|<=|\\.[:]{1,2})?"
    //     + "|(?<BeginCurlyBracket>\\{)|(?<EndCurlyBracket>\\})|(?<BeginBracket>\\[)|(?<EndBracket>\\])|(?<BeginParenthese>\\()|(?<EndParenthese>\\))"
    //     + "|(?<LowerThan><)|(?<BiggerThan>>)|(?<Equal>=)"
    //     + "|(?<At>@)|(?<ExclamationMark>!)|(?<QuestionMark>\\?)"
    //     + "|(?<Tilde>~)|(?<UpArrow>\\^)|(?<Ampersand>&)"
    //     + "|(?<Comma>,)"
    //     + "|(?<Percent>%)"
    //     + "|(?<Colon>:)|(?<Semicolon>;)|(?<Sharp>#)|(?<Dollar>\\$)",
    //     "g"
    // );
    private static readonly reg_ = new RegExp(
        "(?<SingleLineComment>\\/\\/.*\\n)"
        + "|(?<Whitespace>(?:\x20|\t| |\r)+)"
        + "|(?<NewLine>\\n)"
        + "|(?<BeginCurlyBracket>\\{)|(?<EndCurlyBracket>\\})|(?<BeginBracket>\\[)|(?<EndBracket>\\])|(?<BeginParenthese>\\()|(?<EndParenthese>\\))"
        // + "|(?<Boolean>(?:true|false))|(?<Null>null)|(?<Nil>nil)|(?<Unknown>ukn)|(?<Undefined>undefined)"
        + "|(?<Number>-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[Ee][+-]?\\d+)?)"
        + "|(?<String>\"(?:[^\"\\\\]*|\\\\(?:[\"\\\\bfnrt\\/]|u[0-9A-Fa-f]{4}))*\")"
        + "|(?<RawString>'[^']*')"
        // + "|(?<Word>(?:(?:[_a-zA-Z\\+\\-\\*\\/])(?:[_a-zA-Z0-9=\\+\\-\\*\\/])*)|==|>[=]?|<[=]?|\\.([:]?|[\\.][\\.]?))"
        // + "|(?<Identifier>(?:(?:[_a-zA-Z\\+\\-\\*\\/])(?:[_a-zA-Z0-9=\\+\\-\\*\\/])*)|==|>=|<=|\\.(?:[:]|[\\.]{1,2})?)"
        + "|(?<Identifier>(?:[_a-zA-Z][_a-zA-Z0-9]*))"
        + "|(?<Operator>\\+[\\+|=]?|\\-[\\-|=]?|\\*[=]?|\\/[=]?|==|>=|<=)"
        + "|(?<LowerThan><)|(?<BiggerThan>>)|(?<Equal>=)"
        + "|(?<At>@)|(?<ExclamationMark>!)|(?<QuestionMark>\\?)|(?<VerticalBar>\\|)"
        + "|(?<Tilde>~)|(?<UpArrow>\\^)|(?<Ampersand>&)"
        + "|(?<Comma>,)"
        + "|(?<Percent>%)"
        + "|(?<BackQuote>`)"
        + "|(?<ColonColon>::)|(?<DotColon>\\.:)|(?<Colon>:)|(?<DotDotDot>\\.\\.\\.)|(?<DotDot>\\.\\.)|(?<Dot>\\.)"
        + "|(?<Semicolon>;)|(?<Sharp>#)|(?<Dollar>\\$)",
        "g"
    );

    public static Lex(input: string): Token[] {
        const tokenList: Token[] = [];
        let startat = 0;
        let row = 1;
        let column = 1;

        this.reg_.lastIndex = startat; // Ensure regex starts from the beginning
        let match: RegExpExecArray | null;

        while ((match = this.reg_.exec(input)) !== null) {
            let found = false;
            for (const [groupName, value] of Object.entries(match.groups || {})) {
                if (value) {
                    found = true;
                    let type = TokenType[groupName as keyof typeof TokenType];
                    let token = new Token(type, value, row, column);

                    // Special treatments
                    if (type === TokenType.Operator) {
                        type = TokenType.Identifier;
                    }
                    if (type === TokenType.Identifier) {
                        switch (value) {
                            case "true":
                            case "false":
                                token = new Token(TokenType.Boolean, value, row, column);
                                break;
                            case "null":
                                token = new Token(TokenType.Unknown, value, row, column);
                                break;
                            case "ukn":
                                token = new Token(TokenType.Unknown, value, row, column);
                                break;
                            case "nil":
                                token = new Token(TokenType.Nil, value, row, column);
                                break;
                            case "undefined":
                                token = new Token(TokenType.Undefined, value, row, column);
                                break;
                            default:
                                if (value === "<") {
                                    token = new Token(TokenType.LowerThan, value, row, column);
                                } else if (value === ">") {
                                    token = new Token(TokenType.BiggerThan, value, row, column);
                                } else if (value === ".") {
                                    token = new Token(TokenType.Dot, value, row, column);
                                } else if (value === "..") {
                                    token = new Token(TokenType.DotDot, value, row, column);
                                } else if (value === "...") {
                                    token = new Token(TokenType.DotDotDot, value, row, column);
                                }
                                break;
                        }
                    }

                    tokenList.push(token);
                    switch (type) {
                        case TokenType.NewLine:
                        case TokenType.SingleLineComment:
                            row++;
                            column = 1;
                            break;
                        case TokenType.Whitespace:
                            column += value.length;
                            break;
                        default:
                            column += value.length;
                            break;
                    }
                    break; // process only one group per match
                }
            }

            if (!found) {
                throw new LexException("Invalid Token", row, column);
            } else {
                startat = match.index + match[0].length;
                this.reg_.lastIndex = startat; // Move regex index forward
            }
        }

        return tokenList;
    }
}

export class IndexedStream<TElement extends TokenBase<TokenType>, TConstraint extends TokenType> {
    protected readonly _constraintChecker: (token: TElement, type: TConstraint) => boolean;
    protected readonly _input: TElement[];
    protected _index: number = 0;

    constructor(input: TElement[], constraintChecker: (token: TElement, type: TConstraint) => boolean) {
        this._input = input;
        this._constraintChecker = constraintChecker;
    }

    Current(): TElement {
        if (this.End()) {
            throw new ParseException("End of stream");
        }
        return this._input[this._index];
    }

    Consume(type : TConstraint = null): TElement {
        if (this.End()) {
            throw new ParseException("End of stream");
        }
        let r = this._input[this._index++];
        if (type != null && !this._constraintChecker(r, type)) {
            throw new ParseException("illegal token");
        }
        return r;
    }

    ConsumeWithConstraint(expectedType: TConstraint): TElement {
        const token = this.Consume();
        if (this._constraintChecker(token, expectedType)) {
            return token;
        }
        throw new ParseException(`Invalid token ${token} at position ${this._index}`);
    }

    Peek(nextOffset: number = 1): TElement | undefined {
        if (this._index + nextOffset > this._input.length - 1) {
            return undefined;
        }
        return this._input[this._index + nextOffset];
    }

    End(): boolean {
        return this._index >= this._input.length;
    }

    SkipBlankTokens(blankTypes: Set<TokenType>): void {
        while (!this.End() && blankTypes.has(this.Current().Type)) {
            this.Consume();
        }
    }

    SkipToken(expectedType?: TokenType): void {
        this.SkipBlankTokens(new Set([TokenType.NewLine, TokenType.Whitespace, TokenType.SingleLineComment]));
        if (this.End()) {
            return;
        }
        const token = this.Current();
        if (expectedType !== undefined && token.Type === expectedType) {
            this.Consume();
        }
    }

    ConsumeAndSkipBlankTokens(): TElement {
        this.SkipBlankTokens(new Set([TokenType.NewLine, TokenType.Whitespace, TokenType.SingleLineComment]));
        const token = this.Current();
        this.Consume();
        return token;
    }

    ConsumeAndSkipBlankTokensWithExpected(expectedTypes: Set<TokenType>): TElement {
        this.SkipBlankTokens(new Set([TokenType.NewLine, TokenType.Whitespace, TokenType.SingleLineComment]));
        const token = this.Current();
        if (expectedTypes.has(token.Type)) {
            this.Consume();
            return token;
        }
        throw new ParseException(`Invalid token ${token} at position ${this._index}`);
    }

    ConsumeTypeAndSkipBlankTokens(expectedType: TokenType): TElement {
        return this.ConsumeAndSkipBlankTokensWithExpected(new Set([expectedType]));
    }
    
    NewParseException() {
        throw new ParseException(`Invalid token ${this.Current()} at position ${this._index}`);
    }

    toString(): string {
        return `[CharStream Index=${this._index}, Input=${this._input}]`;
    }
}

// For TypeScript's lack of built-in string.hashCode(), we create one.
// if (!String.prototype.hashCode) {
//     String.prototype.hashCode = function(): number {
//         let hash = 0;
//         if (this.length === 0) return hash;
//         for (let i = 0; i < this.length; i++) {
//             const chr = this.charCodeAt(i);
//             hash  = ((hash << 5) - hash) + chr;
//             hash |= 0; // Convert to 32-bit integer
//         }
//         return hash;
//     };
// }

