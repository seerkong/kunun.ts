import { IndexedStream, Token, TokenType } from "./Lexer";
export declare class TokenStreamV1 extends IndexedStream<Token, TokenType> {
    static BlankTypes: TokenType[];
    constructor(input: Token[]);
    Current(): Token;
    Next(): Token;
    InTypeSet(elem: Token, checkTypes: TokenType[]): boolean;
    SkipBlankTokens(): void;
    SkipToken(expect?: TokenType | null): void;
    ConsumeAndSkipBlankTokens(expectedTypes?: TokenType[]): Token;
    ConsumeTypeAndSkipBlankTokens(expect: TokenType): Token;
}
