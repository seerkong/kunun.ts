import { TokenType } from "./Lexer/Lexer";


export interface SyntaxConfig {
  FormatRawStringAsString: boolean;

  PrefixToken: TokenType;
  PrefixStr: string;

  TypeToken: TokenType;
  TypeStr: string;

  SuffixComplementToken: TokenType;
  SuffixComplementStr: string;

  QuoteMarcroPrefixToken: TokenType;
  QuoteMarcroPrefixStr: string;

  SyntaxMarcroPrefix: TokenType;
  SyntaxMarcroPrefixStr: string;

  ActionMarcroPrefix: TokenType;
  ActionMarcroPrefixStr: string;

  KnotSpecialPrefixToken: TokenType;
  KnotSpecialPrefixStr: string;

  KnotMetadataPrefixToken: TokenType;
  KnotMetadataPrefixStr: string;

  KnotMetadataSeparatorToken: TokenType;
  KnotMetadataSeparatorStr: string;

  ValueFlagToken: TokenType;
  ValueFlagStr: string;
  // KeyTagBeforeWord: boolean;

  FormaterMapKeyAsStr: boolean;
  FormaterAddPairsSeparator: boolean;
  PairsSeparatorToken: TokenType;
  PairsSeparatorStr: string;

  UnorderedMapStartToken: TokenType;
  UnorderedMapEndToken: TokenType;
  UnorderedMapStartStr: string;
  UnorderedMapEndStr: string;

  OrderedMapStartToken: TokenType;
  OrderedMapEndToken: TokenType;
  OrderedMapStartStr: string;
  OrderedMapEndStr: string;

  VectorStartToken: TokenType;
  VectorEndToken: TokenType;
  VectorStartStr: string;
  VectorEndStr: string;

  KnotStartToken: TokenType;
  KnotEndToken: TokenType;
  KnotStartStr: string;
  KnotEndStr: string;

  TableStartToken: TokenType;
  TableEndToken: TokenType;
  TableStartStr: string;
  TableEndStr: string;

  KnotPrefixTypeToken: TokenType;
  KnotPrefixTypeStr: string;
  KnotPostfixTypeToken: TokenType;
  KnotPostfixTypeStr: string;

  KnotUnboundTypesBeginToken: TokenType;
  KnotUnboundTypesEndToken: TokenType;
  KnotUnboundTypesBeginStr: string;
  KnotUnboundTypesEndStr: string;

  KnotGenericTypesBeginToken: TokenType;
  KnotGenericTypesEndToken: TokenType;
  KnotGenericTypesBeginStr: string;
  KnotGenericTypesEndStr: string;

  KnotParamBeginToken: TokenType;
  KnotParamEndToken: TokenType;
  KnotParamBeginStr: string;
  KnotParamEndStr: string;

  KnotResultTypeBeginToken: TokenType;
  KnotResultTypeEndToken: TokenType;
  KnotResultTypeBeginStr: string;
  KnotResultTypeEndStr: string;

  KnotCallParamEndToken: TokenType;
  KnotCallParamEndStr: string;

  KnotBlockStartToken: TokenType;
  KnotBlockEndToken: TokenType;
  KnotBlockStartStr: string;
  KnotBlockEndStr: string;
}