import { TokenType } from "./Lexer/Lexer";
import { SyntaxConfig } from "./SyntaxConfig";

export class KjsonSyntaxConfig implements SyntaxConfig {
  readonly FormatRawStringAsString: boolean = true;
  
  readonly PrefixToken: TokenType = TokenType.ExclamationMark;
  readonly PrefixStr: string = "!";

  readonly TypeToken: TokenType = TokenType.Tilde;
  readonly TypeStr: string = "~";

  readonly SuffixComplementToken: TokenType = TokenType.UpArrow;
  readonly SuffixComplementStr: string = "^";

  readonly QuoteMarcroPrefixToken: TokenType = TokenType.Percent;
  readonly QuoteMarcroPrefixStr: string = "%";

  readonly SyntaxMarcroPrefix: TokenType = TokenType.Dollar;
  readonly SyntaxMarcroPrefixStr: string = "$";

  readonly ActionMarcroPrefix: TokenType = TokenType.At;
  readonly ActionMarcroPrefixStr: string = "@";

  readonly KnotSpecialPrefixToken: TokenType = TokenType.Colon;
  readonly KnotSpecialPrefixStr: string = ":";

  readonly KnotMetadataPrefixToken: TokenType = TokenType.Sharp;
  readonly KnotMetadataPrefixStr: string = "#";

  readonly KnotMetadataSeparatorToken: TokenType = TokenType.Equal;
  readonly KnotMetadataSeparatorStr: string = "=";

  readonly ValueFlagToken: TokenType = TokenType.Colon;
  readonly ValueFlagStr: string = ":";

  readonly FormaterMapKeyAsStr: boolean = true;
  readonly FormaterAddPairsSeparator: boolean = true;
  readonly PairsSeparatorToken: TokenType = TokenType.Comma;
  readonly PairsSeparatorStr: string = ",";

  readonly UnorderedMapStartToken: TokenType = TokenType.BeginCurlyBracket;
  readonly UnorderedMapEndToken: TokenType = TokenType.EndCurlyBracket;
  readonly UnorderedMapStartStr: string = "{";
  readonly UnorderedMapEndStr: string = "}";

  readonly OrderedMapStartToken: TokenType = TokenType.LowerThan;
  readonly OrderedMapEndToken: TokenType = TokenType.BiggerThan;
  readonly OrderedMapStartStr: string = "<";
  readonly OrderedMapEndStr: string = ">";

  readonly VectorStartToken: TokenType = TokenType.BeginBracket;
  readonly VectorEndToken: TokenType = TokenType.EndBracket;
  readonly VectorStartStr: string = "[";
  readonly VectorEndStr: string = "]";

  readonly KnotStartToken: TokenType = TokenType.BeginParenthese;
  readonly KnotEndToken: TokenType = TokenType.EndParenthese;
  readonly KnotStartStr: string = "(";
  readonly KnotEndStr: string = ")";

  get TableStartToken(): TokenType {
    return this.KnotStartToken;
  }

  get TableEndToken(): TokenType {
    return this.KnotEndToken;
  }

  get TableStartStr(): string {
    return this.KnotStartStr;
  }

  get TableEndStr(): string {
    return this.KnotEndStr;
  }

  get KnotPrefixTypeToken(): TokenType {
    return TokenType.BackQuote;
  }

  get KnotPrefixTypeStr(): string {
    return "`";
  }

  get KnotPostfixTypeToken(): TokenType {
    return TokenType.Comma;
  }

  get KnotPostfixTypeStr(): string {
    return ",";
  }


  get KnotUnboundTypesBeginToken(): TokenType {
    return this.KnotStartToken;
  }

  get KnotUnboundTypesEndToken(): TokenType {
    return this.KnotEndToken;
  }

  get KnotUnboundTypesBeginStr(): string {
    return this.KnotStartStr;
  }

  get KnotUnboundTypesEndStr(): string {
    return this.KnotEndStr;
  }

  get KnotGenericTypesBeginToken(): TokenType {
    return this.OrderedMapStartToken;
  }

  get KnotGenericTypesEndToken(): TokenType {
    return this.OrderedMapEndToken;
  }

  get KnotGenericTypesBeginStr(): string {
    return this.OrderedMapStartStr;
  }

  get KnotGenericTypesEndStr(): string {
    return this.OrderedMapEndStr;
  }

  get KnotParamBeginToken(): TokenType {
    return TokenType.VerticalBar;
  }

  get KnotParamEndToken(): TokenType {
    return TokenType.VerticalBar;
  }

  get KnotParamBeginStr(): string {
    return "|";
  }

  get KnotParamEndStr(): string {
    return "|";
  }

  get KnotResultTypeBeginToken(): TokenType {
    return this.VectorStartToken;
  }

  get KnotResultTypeEndToken(): TokenType {
    return this.VectorEndToken;
  }

  get KnotResultTypeBeginStr(): string {
    return this.VectorStartStr;
  }

  get KnotResultTypeEndStr(): string {
    return this.VectorEndStr;
  }

  get KnotCallParamEndToken(): TokenType {
    return TokenType.Semicolon;
  }

  get KnotCallParamEndStr(): string {
    return ";";
  }

  get KnotBlockStartToken(): TokenType {
    return this.VectorStartToken;
  }

  get KnotBlockEndToken(): TokenType {
    return this.VectorEndToken;
  }

  get KnotBlockStartStr(): string {
    return this.VectorStartStr;
  }

  get KnotBlockEndStr(): string {
    return this.VectorEndStr;
  }
}