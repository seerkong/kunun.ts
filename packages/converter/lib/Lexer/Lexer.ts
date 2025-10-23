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
    ColonColonColon, // :::
    ColonColon, // ::
    DotColon, // .:
    UnquoteSplice, // ,@
    UnquoteMap, // ,%
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
        + "|(?<Identifier>(?:[_a-zA-Z][_a-zA-Z0-9]*[\\?]?))"
        + "|(?<Operator>\\+[\\+|=]?|\\-[\\-|>|=]?|\\*[=]?|\\/[=]?|==|>=|<=)"
        + "|(?<LowerThan><)|(?<BiggerThan>>)|(?<Equal>=)"
        + "|(?<At>@)|(?<ExclamationMark>!)|(?<QuestionMark>\\?)|(?<VerticalBar>\\|)"
        + "|(?<Tilde>~)|(?<UpArrow>\\^)|(?<Ampersand>&)"
        + "|(?<UnquoteSplice>,@)|(?<UnquoteMap>,%)|(?<Comma>,)"
        + "|(?<Percent>%)"
        + "|(?<BackQuote>`)"
        + "|(?<ColonColonColon>:::)|(?<ColonColon>::)|(?<DotColon>\\.:)|(?<Colon>:)|(?<DotDotDot>\\.\\.\\.)|(?<DotDot>\\.\\.)|(?<Dot>\\.)"
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

        while (startat < input.length) {
            this.reg_.lastIndex = startat;

            if (input[startat] === "\"" || input[startat] === "'") {
                const token = this.ReadStringToken(input, startat, row, column);
                tokenList.push(token);
                const nextPosition = this.AdvancePosition(token.Value, row, column);
                row = nextPosition.row;
                column = nextPosition.column;
                startat += token.Value.length;
                continue;
            }

            match = this.reg_.exec(input);
            if (match == null || match.index !== startat) {
                throw this.UnrecognizedTokenError(input, startat, row, column);
            }

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
                    const nextPosition = this.AdvancePosition(value, row, column);
                    row = nextPosition.row;
                    column = nextPosition.column;
                    break; // process only one group per match
                }
            }

            if (!found) {
                throw this.UnrecognizedTokenError(input, startat, row, column);
            } else {
                startat = match.index + match[0].length;
                this.reg_.lastIndex = startat; // Move regex index forward
            }
        }

        return tokenList;
    }

    // Builds a clear, position-bearing diagnostic for a character the lexer
    // cannot recognise at `start`. Identifiers are intentionally ASCII-only
    // ([_a-zA-Z][_a-zA-Z0-9]*); a non-ASCII bare word (e.g. a CJK character)
    // therefore has no matching token rule. Rather than the contextless
    // "Invalid Token", we name the offending character, report its codepoint,
    // and — for non-ASCII characters — state explicitly that they are not
    // supported as identifiers.
    private static UnrecognizedTokenError(input: string, start: number, row: number, column: number): LexException {
        // Read a full Unicode codepoint so an astral character (surrogate pair)
        // is described as one character rather than a lone surrogate.
        const codePoint = input.codePointAt(start);
        if (codePoint === undefined) {
            return new LexException(`Unexpected end of input at row ${row}, column ${column}`, row, column);
        }
        const char = String.fromCodePoint(codePoint);
        const hex = codePoint.toString(16).toUpperCase().padStart(4, "0");

        if (codePoint > 0x7f) {
            return new LexException(
                `Unexpected non-ASCII character '${char}' (U+${hex}) at row ${row}, column ${column}: ` +
                `non-ASCII characters are not supported as identifiers (identifiers must match [_a-zA-Z][_a-zA-Z0-9]*)`,
                row,
                column,
            );
        }

        return new LexException(
            `Unexpected character '${char}' (U+${hex}) at row ${row}, column ${column}`,
            row,
            column,
        );
    }

    private static ReadStringToken(input: string, start: number, row: number, column: number): Token {
        const quote = input[start];
        const triple = input.startsWith(quote.repeat(3), start);
        const delimiter = triple ? quote.repeat(3) : quote;
        let index = start + delimiter.length;
        let escaped = false;

        if (triple) {
            const lineStart = Math.max(input.lastIndexOf("\n", start - 1), input.lastIndexOf("\r", start - 1)) + 1;
            if (!/^[ \t]*$/.test(input.slice(lineStart, start))) {
                throw new LexException("Triple-quoted string opening delimiter must be alone on its line", row, column);
            }
            const openingLineEnd = this.FindLineEnd(input, index);
            if (!/^[ \t]*$/.test(input.slice(index, openingLineEnd))) {
                throw new LexException("Triple-quoted string opening delimiter must be alone on its line", row, column);
            }
        }

        while (index < input.length) {
            if (quote === "\"" && escaped) {
                escaped = false;
                index++;
                continue;
            }

            const ch = input[index];
            if (quote === "\"" && ch === "\\") {
                // String interpolation: `\(...)` (Kon) or `\[...]` (Knl). The
                // interpolated expression may itself contain string literals
                // with the same quote character, so the whole balanced bracket
                // group must be skipped as opaque content of the outer string
                // instead of being treated as a single escaped character.
                const interpOpen = input[index + 1];
                if (interpOpen === "(" || interpOpen === "[") {
                    index = this.SkipInterpolationBlock(input, index + 1, row, column);
                    continue;
                }
                escaped = true;
                index++;
                continue;
            }

            if (!triple && (ch === "\n" || ch === "\r")) {
                throw new LexException("Unterminated string literal", row, column);
            }

            if (input.startsWith(delimiter, index)) {
                if (triple) {
                    const afterDelimiter = index + delimiter.length;
                    const closingLineEnd = this.FindLineEnd(input, afterDelimiter);
                    if (!/^[ \t]*$/.test(input.slice(afterDelimiter, closingLineEnd))) {
                        throw new LexException("Triple-quoted string closing delimiter must be alone on its line", row, column);
                    }
                }
                const tokenType = quote === "\"" ? TokenType.String : TokenType.RawString;
                return new Token(tokenType, input.slice(start, index + delimiter.length), row, column);
            }

            index++;
        }

        throw new LexException("Unterminated string literal", row, column);
    }

    // Scans a balanced interpolation block beginning at `openIndex` (the
    // opening `(` or `[`) and returns the index just past the matching close
    // bracket. Nested string literals (single/double, triple variants) inside
    // the block are skipped opaquely so that quotes within an interpolated
    // expression do not close the surrounding interpreted string.
    private static SkipInterpolationBlock(input: string, openIndex: number, row: number, column: number): number {
        const open = input[openIndex];
        const close = open === "(" ? ")" : "]";
        let depth = 0;
        let index = openIndex;

        while (index < input.length) {
            const ch = input[index];

            if (ch === "\"" || ch === "'") {
                const nestedTriple = input.startsWith(ch.repeat(3), index);
                const nestedDelimiter = nestedTriple ? ch.repeat(3) : ch;
                index += nestedDelimiter.length;
                while (index < input.length) {
                    if (ch === "\"" && input[index] === "\\") {
                        index += 2;
                        continue;
                    }
                    if (input.startsWith(nestedDelimiter, index)) {
                        index += nestedDelimiter.length;
                        break;
                    }
                    index++;
                }
                continue;
            }

            if (ch === open) {
                depth++;
                index++;
                continue;
            }

            if (ch === close) {
                depth--;
                index++;
                if (depth === 0) {
                    return index;
                }
                continue;
            }

            index++;
        }

        throw new LexException("Unterminated string interpolation", row, column);
    }

    private static FindLineEnd(input: string, start: number): number {
        let index = start;
        while (index < input.length && input[index] !== "\n" && input[index] !== "\r") {
            index++;
        }
        return index;
    }

    private static AdvancePosition(text: string, row: number, column: number): { row: number; column: number } {
        for (const ch of text) {
            if (ch === "\n") {
                row++;
                column = 1;
            } else {
                column++;
            }
        }
        return { row, column };
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
