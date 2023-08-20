
export enum TokenType {
    Eof,
    BeginCurlyBracket,  // {
    EndCurlyBracket,    // }
    BeginBracket,    // [
    EndBracket,      // ]
    BeginParenthese, // (
    EndParenthese,   // )
    Tilde,      // ~
    UpArrow,      // ^
    QuestionMark,  // ?
    ExclamationMark, // !
    Percent,    // %
    Dollar,    // $
    Colon,  // :
    Semicolon,  // ;
    QuasiQuote, // `
    Comma,  // ,

    At,             // @
    Equal,    // =
    Ampersand,  // &
    LowerThan, // <
    BiggerThan, // >
    String,
    Word,
    Number,
    Boolean,
    Ukn,
    Nil,
    Undefined,

    Property,            // .
    UnquoteExpand,             // ..
    // EllipsisDots,                // ...
    Subscript,          // .:
}

export class Token {
    public Type : TokenType;
    public Value;
    public Line: number;
    public Column : number;
    constructor(type, value, line = 1, column = 0) {
        this.Type = type;
        this.Value = value;
        this.Line = line;
        this.Column = column;
    }

    static get Types() {
        return TokenType;
    }

    static Create(type, value = null, line = 1, column = 0) {
        return new this(type, value, line, column);
    }
}
