import { IndexedStream, Token, TokenType } from "./Lexer";

export class TokenStreamV1 extends IndexedStream<Token, TokenType> {
  public static BlankTypes: TokenType[] = [
    TokenType.NewLine,
    TokenType.Whitespace,
    TokenType.SingleLineComment
  ];

  constructor(input: Token[]) {
      super(input, (token, type) => token.Type === type);
  }

  public Current(): Token {
      if (this.End()) {
          const lastToken = this._input[this._index - 1];
          return new Token(TokenType.EOF, "", lastToken.Row, lastToken.Column);
      }

      return this._input[this._index];
  }

  public Next(): Token {
    if ((this._index + 1) >= this._input.length) {
        return null;
    }
    return this._input[this._index + 1];
  }

  public InTypeSet(elem: Token, checkTypes: TokenType[]): boolean {
      for (const type of checkTypes) {
          if (this._constraintChecker(elem, type)) {
              return true;
          }
      }

      return false;
  }

  public SkipBlankTokens(): void {
      while (!this.End() && this.InTypeSet(this.Current(), TokenStreamV1.BlankTypes)) {
          this.Consume();
      }
  }

  public SkipToken(expect: TokenType | null): void {
      const expectedTypes = [];
      if (expect !== null) {
          expectedTypes.push(expect);
      }

      this.SkipBlankTokens();
      if (this.End()) {
          return;
      }

      const elem = this.Current();
      if (this.InTypeSet(elem, expectedTypes)) {
          this.Consume();
      }
  }

  public ConsumeAndSkipBlankTokens(expectedTypes: TokenType[] = null): Token {
    this.SkipBlankTokens();
    const elem = this.Current();
    if (expectedTypes == null) {
      this.Consume();
      return elem;
    }
    else if (this.InTypeSet(elem, expectedTypes)) {
      this.Consume();
      return elem;
    }

    throw this.NewParseException();
      
  }

  public ConsumeTypeAndSkipBlankTokens(expect: TokenType): Token {
      const expectedTypes = [];
      expectedTypes.push(expect);
      return this.ConsumeAndSkipBlankTokens(expectedTypes);
  }
}