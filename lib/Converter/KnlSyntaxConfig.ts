
import { TokenType } from "./Lexer/Lexer";
import { SyntaxConfig } from "./SyntaxConfig";

export class KnlSyntaxConfig implements SyntaxConfig {
  readonly FormatRawStringAsString: boolean = false;

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

  readonly ValueFlagToken: TokenType = TokenType.Equal;
  readonly ValueFlagStr: string = "=";
  readonly KeyTagBeforeWord: boolean = true;

  readonly FormaterMapKeyAsStr: boolean = false;
  readonly FormaterAddPairsSeparator: boolean = false;
  readonly PairsSeparatorToken: TokenType = TokenType.Semicolon;
  readonly PairsSeparatorStr: string = ";";

  readonly UnorderedMapStartToken: TokenType = TokenType.BeginParenthese;
  readonly UnorderedMapEndToken: TokenType = TokenType.EndParenthese;
  readonly UnorderedMapStartStr: string = "(";
  readonly UnorderedMapEndStr: string = ")";

  readonly OrderedMapStartToken: TokenType = TokenType.LowerThan;
  readonly OrderedMapEndToken: TokenType = TokenType.BiggerThan;
  readonly OrderedMapStartStr: string = "<";
  readonly OrderedMapEndStr: string = ">";

  readonly VectorStartToken: TokenType = TokenType.BeginCurlyBracket;
  readonly VectorEndToken: TokenType = TokenType.EndCurlyBracket;
  readonly VectorStartStr: string = "{";
  readonly VectorEndStr: string = "}";

  readonly KnotStartToken: TokenType = TokenType.BeginBracket;
  readonly KnotEndToken: TokenType = TokenType.EndBracket;
  readonly KnotStartStr: string = "[";
  readonly KnotEndStr: string = "]";

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
    return this.VectorStartToken;
  }

  get KnotGenericTypesEndToken(): TokenType {
    return this.VectorEndToken;
  }

  get KnotGenericTypesBeginStr(): string {
    return this.VectorStartStr;
  }

  get KnotGenericTypesEndStr(): string {
    return this.VectorEndStr;
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
    return this.KnotStartToken;
  }

  get KnotResultTypeEndToken(): TokenType {
    return this.KnotEndToken;
  }

  get KnotResultTypeBeginStr(): string {
    return this.KnotStartStr;
  }

  get KnotResultTypeEndStr(): string {
    return this.KnotEndStr;
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