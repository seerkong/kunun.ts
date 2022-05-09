import { TokenType } from "./Token";


export class SyntaxConfig {
  public static EnableCommaSeperator = false;

  public static VectorStartToken = TokenType.BeginCurlyBracket;
  public static VectorEndToken = TokenType.EndCurlyBracket;
  public static VectorStartStr = '{';
  public static VectorEndStr = '}';

  public static MapStartToken = TokenType.BeginParenthese;
  public static MapEndToken = TokenType.EndParenthese;
  public static MapPairSeperatorToken = TokenType.Equal;
  public static MapStartStr = '(';
  public static MapEndStr = ')';
  public static MapPairSeperatorStr = '=';

  public static PrefixToken = TokenType.Colon;
  public static PrefixStr = ':';

  public static SuffixToken = TokenType.Tilde;
  public static SuffixStr = '~';

  public static KnotStartToken = TokenType.BeginBracket;
  public static KnotEndToken = TokenType.EndBracket;
  public static KnotStartStr = '[';
  public static KnotEndStr = ']';

  public static KnotTypeParamBeginToken = TokenType.BeginCurlyBracket;
  public static KnotTypeParamEndToken = TokenType.EndCurlyBracket;
  public static KnotTypeParamBeginStr = '{';
  public static KnotTypeParamEndStr = '}';

  public static KnotParamBeginToken = TokenType.BeginParenthese;
  public static KnotParamEndToken = TokenType.EndParenthese;
  public static KnotParamBeginStr = '(';
  public static KnotParamEndStr = ')';

  public static KnotHeaderStartToken = TokenType.Percent;
  public static KnotHeaderEndToken = TokenType.Percent;
  public static KnotHeaderStartStr = '%';
  public static KnotHeaderEndStr = '%';

  public static KnotBodyStartToken = TokenType.BeginCurlyBracket;
  public static KnotBodyEndToken = TokenType.EndCurlyBracket;
  public static KnotBodyStartStr = '{';
  public static KnotBodyEndStr = '}';
}
/*
export class SyntaxConfig {
  public static EnableCommaSeperator = true;

  public static VectorStartToken = TokenType.BeginBracket;
  public static VectorEndToken = TokenType.EndBracket;
  public static VectorStartStr = '[';
  public static VectorEndStr = ']';

  public static MapStartToken = TokenType.BeginCurlyBracket;
  public static MapEndToken = TokenType.EndCurlyBracket;
  public static MapPairSeperatorToken = TokenType.Colon;
  public static MapStartStr = '{';
  public static MapEndStr = '}';
  public static MapPairSeperatorStr = ':';

  public static KnotStartToken = TokenType.BeginParenthese;
  public static KnotEndToken = TokenType.EndParenthese;
  public static KnotStartStr = '(';
  public static KnotEndStr = ')';

  public static KnotTypeParamBeginToken = TokenType.BeginCurlyBracket;
  public static KnotTypeParamEndToken = TokenType.EndCurlyBracket;
  public static KnotTypeParamBeginStr = '{';
  public static KnotTypeParamEndStr = '}';

  public static KnotParamBeginToken = TokenType.BeginBracket;
  public static KnotParamEndToken = TokenType.EndBracket;
  public static KnotParamBeginStr = '[';
  public static KnotParamEndStr = ']';

  public static KnotHeaderStartToken = TokenType.Percent;
  public static KnotHeaderEndToken = TokenType.Percent;
  public static KnotHeaderStartStr = '%';
  public static KnotHeaderEndStr = '%';

  public static KnotBodyStartToken = TokenType.BeginCurlyBracket;
  public static KnotBodyEndToken = TokenType.EndCurlyBracket;
  public static KnotBodyStartStr = '{';
  public static KnotBodyEndStr = '}';
}
*/