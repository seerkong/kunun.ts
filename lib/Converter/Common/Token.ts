
// export enum TokenType {
//     BeginCurlyBracket, // {
//     EndCurlyBracket, // }
//     BeginBracket, // [
//     EndBracket, // ]
//     BeginParenthese, // (
//     EndParenthese, // )
//     Tilde, // ~
//     UpArrow, // ^
//     QuestionMark, // ?
//     ExclamationMark, // !
//     Percent, // %
//     Dollar, // $
//     Colon, // :
//     Semicolon, // ;
//     BackQuote, // `
//     Sharp, // #
//     Comma, // ,
//     UnquoteReplace, // ,
//     UnquoteExpandItems, // ,@
//     UnquoteExpandKeyValue, // ,%
    
//     At, // @
//     Equal, // =
//     Ampersand, // &
//     LowerThan, // <
//     BiggerThan, // >
    

//     NewLine,
//     SingleLineComment,
//     Whitespace,
//     Boolean,
//     Null,
//     Nil,
//     Unknown,
//     Undefined,
//     Number,
//     RawString,
//     String,
//     Identifier,
//     Symbol,

    

//     Dot, // .
//     DoubleDot, // ..


//     // EllipsisDots,                // ...
//     Subscript, // .:

//     EOF
// }

// class TokenBase<T extends TokenType> {
//     public readonly Column: number;
//     public readonly Row: number;
//     public readonly Type: T;
//     public readonly Value: string;

//     constructor(type: T, value: string, row: number, column: number) {
//         this.Type = type;
//         this.Value = value;
//         this.Row = row;
//         this.Column = column;
//     }

//     public toString(): string {
//         return `Token(Type=${TokenType[this.Type]}, Value=<${this.Value}>, Row=${this.Row}, Column=${this.Column})`;
//     }

//     public equals(other: any): boolean {
//         if (other == null) return false;
//         if (other instanceof TokenBase) {
//             return this.Type === other.Type &&
//                    this.Value === other.Value &&
//                    this.Row === other.Row &&
//                    this.Column === other.Column;
//         }
//         return false;
//     }

//     public getHashCode(): number {
//         let num = 0;
//         if (this.Value != null) {
//             num += 7 * this.Value.hashCode();
//         }
//         return num;
//     }
// }


// export class Token extends TokenBase<TokenType> {
//     constructor(type: TokenType, value: string, row: number, column: number) {
//         super(type, value, row, column);
//     }
// }
