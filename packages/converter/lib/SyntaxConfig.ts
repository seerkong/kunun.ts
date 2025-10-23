import { TokenType as V1TokenType } from "./Lexer/Lexer";
import { TokenType as LegacyTokenType } from "./Lexer/Lexer";

export const SyntaxConfig = {
  PrefixToken: LegacyTokenType.ExclamationMark,
  PrefixStr: "!",

  PrefixTypeToken: LegacyTokenType.Colon,
  PrefixTypeStr: ":",

  SuffixTypeToken: LegacyTokenType.Tilde,
  SuffixTypeStr: "~",

  SuffixComplementToken: LegacyTokenType.UpArrow,
  SuffixComplementStr: "^",

  MapStartToken: LegacyTokenType.BeginParenthese,
  MapEndToken: LegacyTokenType.EndParenthese,
  MapStartStr: "(",
  MapEndStr: ")",

  VectorStartToken: LegacyTokenType.BeginCurlyBracket,
  VectorEndToken: LegacyTokenType.EndCurlyBracket,
  VectorStartStr: "{",
  VectorEndStr: "}",

  KnotStartToken: LegacyTokenType.BeginBracket,
  KnotEndToken: LegacyTokenType.EndBracket,
  KnotStartStr: "[",
  KnotEndStr: "]",

  EnableCommaSeperator: true,
  MapPairSeperatorToken: LegacyTokenType.Equal,
  MapPairSeperatorStr: "=",

  KnotTypeParamBeginToken: LegacyTokenType.LowerThan,
  KnotTypeParamEndToken: LegacyTokenType.BiggerThan,
  KnotTypeParamBeginStr: "<",
  KnotTypeParamEndStr: ">",

  KnotAnnotationBeginStr: "[",
  KnotAnnotationEndStr: "]",
  KnotAnnotationBeginToken: LegacyTokenType.BeginBracket,
  KnotAnnotationEndToken: LegacyTokenType.EndBracket,

  KnotModifierBeginToken: LegacyTokenType.BeginCurlyBracket,
  KnotModifierEndToken: LegacyTokenType.EndCurlyBracket,
  KnotModifierBeginStr: "{",
  KnotModifierEndStr: "}",

  KnotContextParamBeginToken: LegacyTokenType.BeginParenthese,
  KnotContextParamEndToken: LegacyTokenType.EndParenthese,
  KnotContextParamBeginStr: "(",
  KnotContextParamEndStr: ")",

  KnotParamBeginToken: LegacyTokenType.BeginParenthese,
  KnotParamEndToken: LegacyTokenType.EndParenthese,
  KnotParamBeginStr: "(",
  KnotParamEndStr: ")",

  KnotAttrStartToken: LegacyTokenType.Percent,
  KnotAttrEndToken: LegacyTokenType.Percent,
  KnotAttrStartStr: "%",
  KnotAttrEndStr: "%",

  KnotBlockStartToken: LegacyTokenType.BeginBracket,
  KnotBlockEndToken: LegacyTokenType.EndBracket,
  KnotBlockStartStr: "[",
  KnotBlockEndStr: "]",
};


export interface SyntaxConfig {
  FormatRawStringAsString: boolean;

  PrefixToken: V1TokenType;
  PrefixStr: string;

  TypeToken: V1TokenType;
  TypeStr: string;

  SuffixComplementToken: V1TokenType;
  SuffixComplementStr: string;

  QuoteMarcroPrefixToken: V1TokenType;
  QuoteMarcroPrefixStr: string;

  SyntaxMarcroPrefix: V1TokenType;
  SyntaxMarcroPrefixStr: string;

  ActionMarcroPrefix: V1TokenType;
  ActionMarcroPrefixStr: string;

  KnotSpecialPrefixToken: V1TokenType;
  KnotSpecialPrefixStr: string;

  KnotMetadataPrefixToken: V1TokenType;
  KnotMetadataPrefixStr: string;

  KnotMetadataSeparatorToken: V1TokenType;
  KnotMetadataSeparatorStr: string;

  ValueFlagToken: V1TokenType;
  ValueFlagStr: string;
  // KeyTagBeforeWord: boolean;

  FormaterMapKeyAsStr: boolean;
  FormaterAddPairsSeparator: boolean;
  PairsSeparatorToken: V1TokenType;
  PairsSeparatorStr: string;

  UnorderedMapStartToken: V1TokenType;
  UnorderedMapEndToken: V1TokenType;
  UnorderedMapStartStr: string;
  UnorderedMapEndStr: string;

  OrderedMapStartToken: V1TokenType;
  OrderedMapEndToken: V1TokenType;
  OrderedMapStartStr: string;
  OrderedMapEndStr: string;

  VectorStartToken: V1TokenType;
  VectorEndToken: V1TokenType;
  VectorStartStr: string;
  VectorEndStr: string;

  KnotStartToken: V1TokenType;
  KnotEndToken: V1TokenType;
  KnotStartStr: string;
  KnotEndStr: string;

  TableStartToken: V1TokenType;
  TableEndToken: V1TokenType;
  TableStartStr: string;
  TableEndStr: string;

  KnotPrefixTypeToken: V1TokenType;
  KnotPrefixTypeStr: string;
  KnotPostfixTypeToken: V1TokenType;
  KnotPostfixTypeStr: string;

  KnotUnboundTypesBeginToken: V1TokenType;
  KnotUnboundTypesEndToken: V1TokenType;
  KnotUnboundTypesBeginStr: string;
  KnotUnboundTypesEndStr: string;

  KnotGenericTypesBeginToken: V1TokenType;
  KnotGenericTypesEndToken: V1TokenType;
  KnotGenericTypesBeginStr: string;
  KnotGenericTypesEndStr: string;

  KnotParamBeginToken: V1TokenType;
  KnotParamEndToken: V1TokenType;
  KnotParamBeginStr: string;
  KnotParamEndStr: string;

  KnotResultTypeBeginToken: V1TokenType;
  KnotResultTypeEndToken: V1TokenType;
  KnotResultTypeBeginStr: string;
  KnotResultTypeEndStr: string;

  KnotCallParamEndToken: V1TokenType;
  KnotCallParamEndStr: string;

  KnotBlockStartToken: V1TokenType;
  KnotBlockEndToken: V1TokenType;
  KnotBlockStartStr: string;
  KnotBlockEndStr: string;
}
