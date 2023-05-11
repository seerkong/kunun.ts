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

  public static PrefixTypeToken = TokenType.Colon;
  public static PrefixTypeStr = ':';
  public static PrefixToken = TokenType.ExclamationMark;
  public static PrefixStr = '!';

  public static SuffixTypeToken = TokenType.Tilde;
  public static SuffixTypeStr = '~';
  public static SuffixComplementToken = TokenType.UpArrow;
  public static SuffixComplementStr = '^';

  public static KnotStartToken = TokenType.BeginBracket;
  public static KnotEndToken = TokenType.EndBracket;
  public static KnotStartStr = '[';
  public static KnotEndStr = ']';

  public static KnotAnnotationBeginToken = TokenType.BeginBracket;
  public static KnotAnnotationEndToken = TokenType.EndBracket;
  public static KnotAnnotationBeginStr = '[';
  public static KnotAnnotationEndStr = ']';

  public static KnotModifierBeginToken = TokenType.BeginCurlyBracket;
  public static KnotModifierEndToken = TokenType.EndCurlyBracket;
  public static KnotModifierBeginStr = '{';
  public static KnotModifierEndStr = '}';

  public static KnotTypeParamBeginToken = TokenType.LowerThan;
  public static KnotTypeParamEndToken = TokenType.BiggerThan;
  public static KnotTypeParamBeginStr = '<';
  public static KnotTypeParamEndStr = '>';

  public static KnotContextParamBeginToken = TokenType.BeginParenthese;
  public static KnotContextParamEndToken = TokenType.EndParenthese;
  public static KnotContextParamBeginStr = '(';
  public static KnotContextParamEndStr = ')';

  public static KnotParamBeginToken = TokenType.BeginParenthese;
  public static KnotParamEndToken = TokenType.EndParenthese;
  public static KnotParamBeginStr = '(';
  public static KnotParamEndStr = ')';

  public static KnotAttrStartToken = TokenType.Percent;
  public static KnotAttrEndToken = TokenType.Percent;
  public static KnotAttrStartStr = '%';
  public static KnotAttrEndStr = '%';

  public static KnotBlockStartToken = TokenType.BeginCurlyBracket;
  public static KnotBlockEndToken = TokenType.EndCurlyBracket;
  public static KnotBlockStartStr = '{';
  public static KnotBlockEndStr = '}';
}
