
export enum TokenType {
    Eof,
    BeginCurlyBracket,  // {
    EndCurlyBracket,    // }
    BeginBracket,    // [
    EndBracket,      // ]
    BeginParenthese, // (
    EndParenthese,   // )
    Tilde,      // ~
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
    UnquoteSplicing,             // ..
    // EllipsisDots,                // ...
    Subscript,          // .:
}

export class Token {
    public Type : TokenType;
    public Value;
    constructor(type, value) {
        this.Type = type;
        this.Value = value;
    }

    static get Types() {
        return TokenType;
    }

    static Create(type, value = null) {
        return new this(type, value);
    }
}