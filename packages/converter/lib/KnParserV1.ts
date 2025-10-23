import { Lexer, ParseException, Token, TokenType } from './Lexer/Lexer';
import { TokenStreamV1 } from './Lexer/TokenStreamV1';
import type { SyntaxConfig } from './SyntaxConfig';
import { 
    KnActionWrapper, 
    KnKnot, 
    KnNodeType, 
    KnotCallType, 
    KnQuoteWrapper, 
    KnSymbol, 
    KnTuple, 
    KnUnknown, 
    KnWord 
} from 'kunun-core';
import { KnOrderedMap } from 'kunun-core/Model/KnOrderedMap';
import { KnInterpolatedString, KnInterpolatedStringPart } from 'kunun-core/Model/KnInterpolatedString';
import { KnRawString } from 'kunun-core/Model/KnRawString';
import { KnUndefined } from 'kunun-core/Model/KnUndefined';
import { KnUnorderedMap } from 'kunun-core/Model/KnUnorderedMap';
import { KnNodeHelper } from 'kunun-core/Util/KnNodeHelper';
import { KnModifierGroup } from 'kunun-core/Model/KnModifierGroup';

export class KnParserV1 {
  private SyntaxConfig: SyntaxConfig;

  constructor(syntaxConfig: SyntaxConfig) {
    this.SyntaxConfig = syntaxConfig;
  }

  private static readonly emptyReg = /^\s*$/s;

  public Parse(input: string): any {
    if (KnParserV1.emptyReg.test(input)) {
      return KnUnknown.Shared;
    }

    const tokens = Lexer.Lex(input);
    return this.Start(tokens);
  }

  private Start(input: Token[]): any {
    const s = new TokenStreamV1(input);
    const value = this.ParseValue(s);
    this.EnsureNoTrailingTokens(s);
    return value;
  }

  // Guard against silent truncation: a top-level parse consumes a single
  // value, so any non-blank token left over means the input was not fully
  // represented in the AST (e.g. `#foo-bar` once produced KnWord("#") and
  // silently discarded `foo-bar`). Rather than dropping characters, raise a
  // clear, positioned diagnostic.
  private EnsureNoTrailingTokens(s: TokenStreamV1): void {
    s.SkipBlankTokens();
    if (!s.End()) {
      const token = s.Current();
      throw new ParseException(
        `Unexpected token '${token.Value}' at ${token.Row}:${token.Column}: ` +
        `trailing tokens after a complete value. ` +
        `(In head/symbol position, '-' is the subtraction operator, so a name ` +
        `like 'foo-bar' is parsed as 'foo - bar'; quote the identifier or remove ` +
        `the hyphen if a single name was intended.)`
      );
    }
  }

  private ParseValue(
    s: TokenStreamV1,
    acceptPrefix: boolean = true,
    acceptSuffix: boolean = true,
    arrowAsContainer: boolean = false
  ): any {
    s.SkipBlankTokens();

    switch (s.Current().Type) {
      case TokenType.BackQuote:
        return this.ParseQuoteNode(s, TokenType.BackQuote, KnNodeType.QuasiQuote);
      case TokenType.Comma:
        return this.ParseQuoteNode(s, TokenType.Comma, KnNodeType.Unquote);
      case TokenType.UnquoteSplice:
        return this.ParseQuoteNode(s, TokenType.UnquoteSplice, KnNodeType.UnquoteSplice);
      case TokenType.UnquoteMap:
        return this.ParseQuoteNode(s, TokenType.UnquoteMap, KnNodeType.UnquoteMap);
      case TokenType.DotDot:
        return this.ParseRowSpread(s);
      case TokenType.VerticalBar:
        return this.ParseInOutTable(s);
      case TokenType.String:
        return this.ParseString(s);
      case TokenType.RawString:
        return this.ParseRawString(s);
      case TokenType.Number:
        return this.ParseNumber(s);
      case TokenType.Boolean:
        return this.ParseBoolean(s);
      case TokenType.Unknown:
        return this.ParseUkn(s);
      case TokenType.Null:
        return this.ParseNull(s);
      case TokenType.Undefined:
        return this.ParseUndefined(s);
      case TokenType.Nil:
        return this.ParseNil(s);
      default:
        break;
    }

    let prefixModifierGroup: KnModifierGroup = null;
    if (acceptPrefix) {
      prefixModifierGroup = this.ParsePrefixModifierGroups(s);
    }

    let value: any = null;

    if (s.Current().Type === this.SyntaxConfig.SyntaxMarcroPrefix) {
      s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.SyntaxMarcroPrefix);
      if (s.Current().Type === this.SyntaxConfig.UnorderedMapStartToken ||
        s.Current().Type === this.SyntaxConfig.VectorStartToken) {
        value = this.ParseValue(s);
      } else if (s.Current().Type === this.SyntaxConfig.OrderedMapStartToken) {
        value = this.ParseContainer(
          s,
          this.SyntaxConfig.OrderedMapStartToken,
          this.SyntaxConfig.OrderedMapEndToken,
          (s) => this.ParseOrderedMapRow(s),
          m => KnOrderedMap.MakeByPairs(m)
        );
      } else if (s.Current().Type === this.SyntaxConfig.KnotStartToken) {
        value = this.ParseContainer(
          s,
          this.SyntaxConfig.TableStartToken,
          this.SyntaxConfig.TableEndToken,
          stream => this.ParseTablePair(stream),
          m => new KnTuple(m)
        );
      } else {
        throw new Error("NotImplementedException");
      }
    } else if (s.Current().Type === this.SyntaxConfig.QuoteMarcroPrefixToken) {
      s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.QuoteMarcroPrefixToken);
      if (s.Current().Type === this.SyntaxConfig.KnotStartToken) {
        const marker = this.ParseKnotContainer(s);
        marker.CallType = KnotCallType.PostfixCall;
        value = marker;
      } else if (s.Current().Type === TokenType.Identifier || s.Current().Type === TokenType.Operator) {
        const word = this.ParseWord(s, true, false, false);

        if (s.Current().Type === TokenType.Comma) {
          s.ConsumeTypeAndSkipBlankTokens(TokenType.Comma);
          let wrapperInner = this.ParseValue(s);
          value = new KnQuoteWrapper(word, wrapperInner);
        }
        else {
          value = new KnSymbol(word.Value);
        }
      } else {
        throw new Error("NotImplementedException");
      }
    } else if (s.Current().Type === this.SyntaxConfig.ActionMarcroPrefix) {
      s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.ActionMarcroPrefix);
      if (s.Current().Type === TokenType.Identifier || s.Current().Type === TokenType.Operator) {
        const word = this.ParseWord(s, true, false, false);

        if (s.Current().Type === TokenType.Comma) {
          s.ConsumeTypeAndSkipBlankTokens(TokenType.Comma);
          let wrapperInner = this.ParseValue(s);
          value = new KnActionWrapper(word, wrapperInner);
        }
        else {
          throw new Error("NotImplementedException");
        }
      } else {
        throw new Error("NotImplementedException");
      }
    } else if (s.Current().Type === this.SyntaxConfig.UnorderedMapStartToken) {
      value = this.ParseContainer(
        s,
        this.SyntaxConfig.UnorderedMapStartToken,
        this.SyntaxConfig.UnorderedMapEndToken,
        (s) => this.ParseMapPair(s),
        m => KnUnorderedMap.MakeByPairs(m)
      );
    } else if (s.Current().Type === this.SyntaxConfig.VectorStartToken) {
      value = this.ParseContainer(
        s,
        this.SyntaxConfig.VectorStartToken,
        this.SyntaxConfig.VectorEndToken,
        stream => this.ParseVectorItem(stream),
        m => m
      );
    } else if (s.Current().Type === this.SyntaxConfig.KnotStartToken) {
      value = this.ParseKnotContainer(s);
    } else if (s.Current().Type === TokenType.Identifier || s.Current().Type === TokenType.Operator) {
      value = this.ParseWord(s, true, acceptPrefix, acceptSuffix);
    } else {
      if (arrowAsContainer &&
        s.Current().Type === TokenType.LowerThan &&
        s.Current().Type === this.SyntaxConfig.OrderedMapStartToken) {
        return this.ParseContainer(
          s,
          this.SyntaxConfig.OrderedMapStartToken,
          this.SyntaxConfig.OrderedMapEndToken,
          (s) => this.ParseOrderedMapRow(s),
          m => KnOrderedMap.MakeByPairs(m)
        );
      }
      else {
        let tokenInner = s.Current().Value;
        s.ConsumeAndSkipBlankTokens();
        value = new KnWord(tokenInner);
      }

    }
    if (prefixModifierGroup != null) {
      this.AttachPreModifiers(value, prefixModifierGroup);
    }
    return value;
  }

  private AttachPreModifiers(value: any, modifierGroup: KnModifierGroup): void {
    if (modifierGroup == null || !this.HasModifierContent(modifierGroup)) {
      return;
    }
    if (value instanceof KnWord || value instanceof KnKnot) {
      value.PreModifiers = modifierGroup;
    }
  }

  private HasModifierContent(modifierGroup: KnModifierGroup): boolean {
    return modifierGroup.Identifiers.length > 0
      || modifierGroup.NamedValues.size > 0
      || modifierGroup.Knots.length > 0
      || modifierGroup.UnorderedMap != null
      || modifierGroup.OrderedMap != null
      || modifierGroup.Vector != null;
  }

  private ParsePrefixModifierGroups(s: TokenStreamV1): KnModifierGroup {
    const result = new KnModifierGroup();
    while (!s.End()) {
      let consumed = false;
      const typePrefixes = this.ParseModifierGroup(s, this.SyntaxConfig.PrefixToken);
      this.MergeModifierGroup(result, typePrefixes);
      consumed = consumed || this.HasModifierContent(typePrefixes);

      while (!s.End()
        && s.Current().Type === this.SyntaxConfig.KnotMetadataPrefixToken
        && s.Next()?.Type === this.SyntaxConfig.KnotStartToken) {
        s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.KnotMetadataPrefixToken);
        const marker = this.ParseKnotContainer(s);
        result.Knots.push(marker);
        consumed = true;
        s.SkipBlankTokens();
      }

      if (!consumed) {
        break;
      }
    }
    return result;
  }

  private MergeModifierGroup(target: KnModifierGroup, source: KnModifierGroup): void {
    if (!this.HasModifierContent(source)) {
      return;
    }
    target.Identifiers.push(...source.Identifiers);
    for (const [key, value] of source.NamedValues.entries()) {
      target.NamedValues.set(key, value);
    }
    target.Knots.push(...source.Knots);
    target.UnorderedMap = source.UnorderedMap ?? target.UnorderedMap;
    target.OrderedMap = source.OrderedMap ?? target.OrderedMap;
    target.Vector = source.Vector ?? target.Vector;
  }

  private ParseModifierGroup(s: TokenStreamV1, tokenType: TokenType): KnModifierGroup {
    const r = new KnModifierGroup();
    s.SkipBlankTokens();

    while (!s.End() && s.Current().Type === tokenType) {
      const prefixToken = s.Current();
      s.ConsumeTypeAndSkipBlankTokens(tokenType);
      if (s.End()) {
        throw new ParseException(
          `Modifier '${TokenType[tokenType]}' at ${prefixToken.Row}:${prefixToken.Column} must be followed by a value`
        );
      }
      const node = this.ParseValue(s, false, false, true);
      const nodeType = KnNodeHelper.GetType(node);

      if (nodeType === KnNodeType.Word) {
        if (s.Next()?.Type === TokenType.Comma) {
          const nextNode = this.ParseValue(s, false, false);
          r.NamedValues.set(node, nextNode);
        } else {
          if (node instanceof KnWord) {
            r.Identifiers.push(node);
          }
        }
      } else if (nodeType === KnNodeType.Knot) {
        if (node instanceof KnKnot) {
          r.Knots.push(node);
        }
      } else if (nodeType === KnNodeType.UnorderedMap) {
        if (node instanceof KnUnorderedMap) {
          r.UnorderedMap = node;
        }
      } else if (nodeType === KnNodeType.OrderedMap) {
        if (node instanceof KnOrderedMap) {
          r.OrderedMap = node;
        }
      } else if (nodeType === KnNodeType.Vector) {
        r.Vector = node;
      }

      s.SkipBlankTokens();
    }

    return r;
  }

  private ParseRawString(s: TokenStreamV1): KnRawString {
    const token = s.ConsumeTypeAndSkipBlankTokens(TokenType.RawString);
    const str = token.Value;
    const delimiterLength = str.startsWith("'''") ? 3 : 1;
    const subStr = delimiterLength === 3
      ? this.NormalizeTripleQuotedString(str, token.Column, "'")
      : str.substring(delimiterLength, str.length - delimiterLength);
    return new KnRawString(subStr);
  }

  private ParseString(s: TokenStreamV1): string | KnInterpolatedString {
    const token = s.ConsumeTypeAndSkipBlankTokens(TokenType.String);
    const str = token.Value;
    const delimiterLength = str.startsWith('"""') ? 3 : 1;
    const inner = delimiterLength === 3
      ? this.NormalizeTripleQuotedString(str, token.Column, '"')
      : str.substring(delimiterLength, str.length - delimiterLength);
    return this.ParseInterpretedStringInner(inner);
  }

  private NormalizeTripleQuotedString(source: string, tokenColumn: number, quote: '"' | "'"): string {
    const delimiter = quote.repeat(3);
    const indentWidth = tokenColumn - 1;
    const inner = source.substring(delimiter.length, source.length - delimiter.length);
    const openingLineBreakStart = this.SkipHorizontalWhitespace(inner, 0);
    const firstNewline = this.ReadLeadingNewline(inner, openingLineBreakStart);
    if (firstNewline == null) {
      throw new Error("Triple-quoted string opening delimiter must be followed by a newline");
    }

    const withoutOpeningLine = inner.substring(openingLineBreakStart + firstNewline.length);
    const lastLineStart = Math.max(withoutOpeningLine.lastIndexOf("\n"), withoutOpeningLine.lastIndexOf("\r")) + 1;
    const closingIndent = withoutOpeningLine.substring(lastLineStart);
    if (!/^[ \t]*$/.test(closingIndent) || closingIndent.length !== indentWidth) {
      throw new Error("Triple-quoted string closing delimiter must align with opening delimiter");
    }

    const contentWithClosingLine = withoutOpeningLine.substring(0, lastLineStart);
    const content = contentWithClosingLine.endsWith("\r\n")
      ? contentWithClosingLine.substring(0, contentWithClosingLine.length - 2)
      : contentWithClosingLine.endsWith("\n") || contentWithClosingLine.endsWith("\r")
        ? contentWithClosingLine.substring(0, contentWithClosingLine.length - 1)
        : contentWithClosingLine;

    return content.split(/\r\n|\n|\r/).map((line) => this.NormalizeTripleQuotedLine(line, indentWidth)).join("\n");
  }

  private ReadLeadingNewline(source: string, index: number): string {
    if (source.startsWith("\r\n", index)) {
      return "\r\n";
    }
    if (source[index] === "\n" || source[index] === "\r") {
      return source[index];
    }
    return null;
  }

  private SkipHorizontalWhitespace(source: string, index: number): number {
    while (index < source.length && (source[index] === " " || source[index] === "\t")) {
      index++;
    }
    return index;
  }

  private NormalizeTripleQuotedLine(line: string, indentWidth: number): string {
    if (line.trim().length === 0) {
      return line.length >= indentWidth ? line.substring(indentWidth) : "";
    }
    if (line.length < indentWidth || !/^[ \t]*$/.test(line.substring(0, indentWidth))) {
      throw new Error("Triple-quoted string content must not be less indented than its delimiter");
    }
    return line.substring(indentWidth);
  }

  private ParseInterpretedStringInner(inner: string): string | KnInterpolatedString {
    const parts: KnInterpolatedStringPart[] = [];
    let text = "";
    let hasInterpolation = false;
    let index = 0;

    while (index < inner.length) {
      if (inner.startsWith("\\" + this.SyntaxConfig.KnotStartStr, index)) {
        if (text.length > 0) {
          parts.push({ kind: 'text', value: text });
          text = "";
        }
        const expressionStart = index + 1 + this.SyntaxConfig.KnotStartStr.length;
        const expressionEnd = this.FindInterpolationEnd(inner, expressionStart);
        const expressionSource = inner.slice(expressionStart, expressionEnd);
        parts.push({ kind: 'expr', value: this.Parse(expressionSource) });
        hasInterpolation = true;
        index = expressionEnd + this.SyntaxConfig.KnotEndStr.length;
        continue;
      }

      if (inner[index] === "\\") {
        const escape = this.ReadEscape(inner, index);
        text += escape.value;
        index = escape.nextIndex;
        continue;
      }

      text += inner[index];
      index++;
    }

    if (text.length > 0 || parts.length === 0) {
      parts.push({ kind: 'text', value: text });
    }
    return hasInterpolation ? new KnInterpolatedString(parts) : parts.map((part) => part.value).join("");
  }

  private ReadEscape(source: string, index: number): { value: string; nextIndex: number } {
    if (index + 1 >= source.length) {
      return { value: "\\", nextIndex: index + 1 };
    }
    const next = source[index + 1];
    switch (next) {
      case "n":
        return { value: "\n", nextIndex: index + 2 };
      case "t":
        return { value: "\t", nextIndex: index + 2 };
      case "r":
        return { value: "\r", nextIndex: index + 2 };
      case "b":
        return { value: "\b", nextIndex: index + 2 };
      case "f":
        return { value: "\f", nextIndex: index + 2 };
      case "\"":
        return { value: "\"", nextIndex: index + 2 };
      case "\\":
        return { value: "\\", nextIndex: index + 2 };
      case "u": {
        const hex = source.substring(index + 2, index + 6);
        if (hex.length === 4 && /^[0-9A-Fa-f]{4}$/.test(hex)) {
          return { value: String.fromCharCode(parseInt(hex, 16)), nextIndex: index + 6 };
        }
        throw new Error(`Invalid \\u escape: expected four hex digits after \\u`);
      }
      default:
        return { value: next, nextIndex: index + 2 };
    }
  }

  private FindInterpolationEnd(source: string, start: number): number {
    let depth = 1;
    let index = start;
    let quote: '"' | "'" | null = null;
    let tripleQuote = false;
    let escaped = false;

    while (index < source.length) {
      if (quote != null) {
        if (quote === "\"" && escaped) {
          escaped = false;
          index++;
          continue;
        }
        if (quote === "\"" && source[index] === "\\") {
          escaped = true;
          index++;
          continue;
        }
        const delimiter = tripleQuote ? quote.repeat(3) : quote;
        if (source.startsWith(delimiter, index)) {
          index += delimiter.length;
          quote = null;
          tripleQuote = false;
          continue;
        }
        index++;
        continue;
      }

      if (source[index] === "\"" || source[index] === "'") {
        quote = source[index] as '"' | "'";
        tripleQuote = source.startsWith(quote.repeat(3), index);
        index += tripleQuote ? 3 : 1;
        continue;
      }

      if (source.startsWith(this.SyntaxConfig.KnotStartStr, index)) {
        depth++;
        index += this.SyntaxConfig.KnotStartStr.length;
        continue;
      }
      if (source.startsWith(this.SyntaxConfig.KnotEndStr, index)) {
        depth--;
        if (depth === 0) {
          return index;
        }
        index += this.SyntaxConfig.KnotEndStr.length;
        continue;
      }

      index++;
    }

    throw new Error("Unterminated string interpolation");
  }

  private ParseQuoteNode(s: TokenStreamV1, tokenType: TokenType, nodeType: KnNodeType): KnQuoteWrapper {
    s.ConsumeTypeAndSkipBlankTokens(tokenType);
    return new KnQuoteWrapper(new KnWord(TokenType[tokenType]), this.ParseValue(s), nodeType);
  }

  private ParseRowSpread(s: TokenStreamV1): KnQuoteWrapper {
    s.ConsumeTypeAndSkipBlankTokens(TokenType.DotDot);
    return new KnQuoteWrapper(new KnWord(TokenType[TokenType.DotDot]), this.ParseValue(s, true, false), KnNodeType.RowSpread);
  }

  private ParseWord(s: TokenStreamV1, hasNamespace: boolean, acceptPrefix: boolean, acceptSuffix: boolean): KnWord {
    let sourceQualifier: KnWord = null;
    let path = this.ParseWordPath(s);

    if (!s.End() && s.Current().Type === TokenType.ColonColonColon) {
      s.ConsumeTypeAndSkipBlankTokens(TokenType.ColonColonColon);
      sourceQualifier = new KnWord(path[path.length - 1], path.slice(0, -1));
      path = this.ParseWordPath(s);
    }

    const word = sourceQualifier == null
      ? new KnWord(path[path.length - 1], path.slice(0, -1))
      : KnWord.SourceQualified(sourceQualifier, new KnWord(path[path.length - 1], path.slice(0, -1)));

    if (!s.End() && s.Current().Type === TokenType.LowerThan) {
      word.GenericArgs = this.ParseGenericArgs(s);
    }

    if (acceptSuffix) {
      let modifierGroup: KnModifierGroup = this.ParseModifierGroup(s, this.SyntaxConfig.SuffixComplementToken);
      word.PostModifiers = modifierGroup;
    }

    return word;
  }

  private ParseWordPath(s: TokenStreamV1): string[] {
    const items: string[] = [];
    while (!s.End() && (s.Current().Type === TokenType.Identifier || s.Current().Type === TokenType.Operator)) {
      const t = s.Current().Type === TokenType.Identifier
        ? s.ConsumeTypeAndSkipBlankTokens(TokenType.Identifier)
        : s.ConsumeTypeAndSkipBlankTokens(TokenType.Operator);
      items.push(t.Value);
      if (s.Current().Type === TokenType.Operator) {
        break;
      }
      if (!s.End() && s.Current().Type === TokenType.Dot) {
        s.ConsumeTypeAndSkipBlankTokens(TokenType.Dot);
      }
      else {
        break;
      }
    }

    return items;
  }

  private ParseGenericArgs(s: TokenStreamV1): any[] {
    s.ConsumeTypeAndSkipBlankTokens(TokenType.LowerThan);
    const args: any[] = [];
    while (!s.End() && s.Current().Type !== TokenType.BiggerThan) {
      const before = s.Current();
      args.push(this.ParseValue(s, true, false));
      s.SkipBlankTokens();
      // Progress guard: if ParseValue consumed no token this iteration, the
      // `<` is not a real generic-argument list (e.g. a `<` comparison /
      // identifier use). Stop instead of looping forever and allocating an
      // unbounded `args` array — that unbounded push was an OOM that froze the
      // whole machine, not a fast CPU loop.
      if (!s.End() && s.Current() === before) {
        break;
      }
    }
    // Only consume the closing `>` when it is actually present; a bare `<`
    // (comparison / identifier) has no matching `>` and must not throw here.
    if (!s.End() && s.Current().Type === TokenType.BiggerThan) {
      s.ConsumeTypeAndSkipBlankTokens(TokenType.BiggerThan);
    }
    return args;
  }

  private ParseInOutTable(s: TokenStreamV1): KnTuple {
    s.ConsumeTypeAndSkipBlankTokens(TokenType.VerticalBar);
    const inputNodes: any[] = [];
    const outputNodes: any[] = [];
    let outputs = false;
    let hasOutputMarker = false;

    while (!s.End() && s.Current().Type !== TokenType.VerticalBar) {
      if (s.Current().Type === TokenType.Operator && s.Current().Value === "->") {
        outputs = true;
        hasOutputMarker = true;
        s.ConsumeAndSkipBlankTokens();
        continue;
      }

      if (s.Current().Type === TokenType.Operator && s.Current().Value === "--") {
        s.ConsumeAndSkipBlankTokens();
        continue;
      }

      const value = this.ParseValue(s, true, false);
      (outputs ? outputNodes : inputNodes).push(value);
      s.SkipBlankTokens();
    }

    s.ConsumeTypeAndSkipBlankTokens(TokenType.VerticalBar);
    const table = new KnTuple([
      [null, [], inputNodes],
      ["->", [], outputNodes]
    ]);
    (table as any).HasOutputMarker = hasOutputMarker;
    return table;
  }

  private ParseNumber(s: TokenStreamV1): Number {
    const nextToken = s.ConsumeTypeAndSkipBlankTokens(TokenType.Number);
    const numValue = nextToken.Value;
    return Number(numValue);
  }

  private ParseBoolean(s: TokenStreamV1): boolean {
    const nextToken = s.ConsumeTypeAndSkipBlankTokens(TokenType.Boolean);
    return nextToken.Value === "true";
  }

  private ParseUkn(s: TokenStreamV1): KnUnknown {
    s.ConsumeTypeAndSkipBlankTokens(TokenType.Unknown);
    return KnUnknown.Shared;
  }

  private ParseNull(s: TokenStreamV1): KnUnknown {
    s.ConsumeTypeAndSkipBlankTokens(TokenType.Null);
    return KnUnknown.Shared;
  }

  private ParseUndefined(s: TokenStreamV1): KnUndefined {
    s.ConsumeTypeAndSkipBlankTokens(TokenType.Undefined);
    return KnUndefined.Shared;
  }

  private ParseNil(s: TokenStreamV1): KnKnot {
    s.ConsumeTypeAndSkipBlankTokens(TokenType.Nil);
    return KnKnot.Nil;
  }

  private ParseContainer<T, C>(
    s: TokenStreamV1,
    begin: TokenType,
    end: TokenType,
    parser: (s: TokenStreamV1) => C,
    factory: (children: C[]) => T
  ): T {
    s.ConsumeTypeAndSkipBlankTokens(begin);
    const children: C[] = [];
    s.SkipBlankTokens();

    while (!s.End() && s.Current().Type !== end) {
      if (s.Current().Type === TokenType.Comma && this.SyntaxConfig.PairsSeparatorToken !== TokenType.Comma) {
        throw new Error("Comma separators are not allowed in this syntax profile");
      }
      const before = s.Current();
      const item = parser(s);
      children.push(item);
      s.SkipBlankTokens();
      // Progress guard: if the item parser consumed no token this iteration the
      // container is malformed (typically a missing close delimiter). Stop
      // instead of looping forever pushing items — that unbounded `children`
      // growth was an OOM that froze the whole machine, not a fast CPU loop.
      // (The original loop also lacked the `!s.End()` guard above, so at EOF
      // `Current()` returned a fresh EOF token that never equals `end`.)
      if (!s.End() && s.Current() === before) {
        break;
      }
    }

    // The loop also exits at end-of-input when the close delimiter is missing;
    // raise a clear, bounded diagnostic instead of looping / silently truncating.
    if (s.End() || s.Current().Type !== end) {
      throw new ParseException(
        `Unclosed container: expected closing delimiter but reached ` +
        `${s.End() ? 'end of input' : `'${s.Current().Value}'`}.`
      );
    }
    const container = factory(children);
    s.ConsumeTypeAndSkipBlankTokens(end);

    return container;
  }

  private ParseVectorItem(s: TokenStreamV1): any {
    let r = this.ParseValue(s);
    s.SkipBlankTokens();
    if (!s.End() && s.Current().Type == this.SyntaxConfig.PairsSeparatorToken) {
      s.Consume(this.SyntaxConfig.PairsSeparatorToken);
    }
    return r;
  }

  private ParseMapPair(s: TokenStreamV1): [any, any] {
    let firstNode: any = null;
    let secondNode: any = null;

    firstNode = this.ParseValue(s);
    s.SkipBlankTokens();
    if (!s.End() && s.Current().Type == this.SyntaxConfig.ValueFlagToken) {
      s.Consume(this.SyntaxConfig.ValueFlagToken);
      secondNode = this.ParseValue(s);
    }
    s.SkipBlankTokens();
    if (!s.End() && s.Current().Type == TokenType.Comma && this.SyntaxConfig.PairsSeparatorToken !== TokenType.Comma) {
      throw new Error("Comma separators are not allowed in this syntax profile");
    }
    if (!s.End() && s.Current().Type == this.SyntaxConfig.PairsSeparatorToken) {
      s.Consume(this.SyntaxConfig.PairsSeparatorToken);
    }

    const keyNode = this.AsPairKey(firstNode);
    if (keyNode == null) {
      // D14: a map key that is not a bare word or string literal (e.g. a number
      // `{1 = v}` or an expression) used to crash with "null is not an object"
      // on `.Value`. Give a bounded, actionable diagnostic instead.
      throw new ParseException(
        `Map key must be a bare word or string literal, got ` +
        `${firstNode == null ? 'nothing' : (firstNode.constructor?.name ?? typeof firstNode)}` +
        ` — use {name = v} or {"name" = v} (number / expression keys are not allowed).`,
      );
    }
    const key = keyNode.Value;
    const val = secondNode;
    return [key, val];
  }

  private AsPairKey(parseResult: any): KnWord {
    if (typeof parseResult === 'string') {
      return new KnWord(parseResult);
    } else if (parseResult instanceof KnWord) {
      return parseResult;
    }
    return null;
  }

  private ParseOrderedMapRow(s: TokenStreamV1): [string, any[], any] {
    let tagNode: KnWord = null;
    const typeNodes: any[] = [];
    let valueNode: any = null;

    s.SkipBlankTokens();
    // type list 可选
    while (!s.End() && s.Current().Type === this.SyntaxConfig.TypeToken) {
      s.Consume(this.SyntaxConfig.TypeToken);
      typeNodes.push(this.ParseValue(s));
      s.SkipBlankTokens();
    }
    // 必须有key
    tagNode = this.ParseWord(s, false, false, false);
    s.SkipBlankTokens();

    // value可选
    if (!s.End()
      && s.Current().Type == this.SyntaxConfig.ValueFlagToken) {
      s.Consume(this.SyntaxConfig.ValueFlagToken);
      // parse value
      valueNode = this.ParseValue(s);
    }

    s.SkipBlankTokens();
    if (!s.End() && s.Current().Type == this.SyntaxConfig.PairsSeparatorToken) {
      s.Consume(this.SyntaxConfig.PairsSeparatorToken);
    }
    return [tagNode.Value, typeNodes, valueNode];
  }

  private ParseTablePair(s: TokenStreamV1): [string, any[], any] {
    let tagNode: any = null;
    const typeNodes: any[] = [];
    let valueNode: any = null;

    s.SkipBlankTokens();

    let firstVal: any = this.ParseValue(s);
    s.SkipBlankTokens();

    if (!s.End()
      && s.Current().Type == this.SyntaxConfig.ValueFlagToken) {
      s.Consume(this.SyntaxConfig.ValueFlagToken);
      tagNode = firstVal;
      // parse value
      valueNode = this.ParseValue(s);
    }
    else {
      valueNode = firstVal;
    }

    s.SkipBlankTokens();
    while (!s.End() && s.Current().Type == this.SyntaxConfig.TypeToken) {
      s.Consume(this.SyntaxConfig.TypeToken);
      typeNodes.push(this.ParseValue(s));
      s.SkipBlankTokens();
    }
    s.SkipBlankTokens();
    if (!s.End() && s.Current().Type == this.SyntaxConfig.PairsSeparatorToken) {
      s.Consume(this.SyntaxConfig.PairsSeparatorToken);
    }

    let tagStr: string = (tagNode == null || !(tagNode instanceof KnWord))
      ? null
      : (tagNode as KnWord).Value;
    return [tagStr, typeNodes, valueNode];
  }


  private ParseKnotContainer(s: TokenStreamV1): KnKnot {
    s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.KnotStartToken);
    const nodes: KnKnot[] = [];

    let top: KnKnot = null;

    while (!s.End() && s.Current().Type !== this.SyntaxConfig.KnotEndToken) {
      top = nodes.length > 0 ? nodes[nodes.length - 1] : null;
      if (!top) {
        top = new KnKnot();
        nodes.push(top);
      }
      else if (s.Current().Type == TokenType.LowerThan) {
        top.GenericParams = new KnTuple([
          [null, [], this.ParseGenericArgs(s)]
        ]);
      }
      else if (s.Current().IsOperatorToken()) {
        if (!top.AcceptCallType()) {
          top = new KnKnot();
          nodes.push(top);
        }
        top.CallType = KnotCallType.Operator;
        top.Core = new KnWord(s.Current().Value);
        s.Consume();
        top.Params = this.ParseOptionalCallParams(s);
      }
      else if (s.Current().Type == TokenType.Equal) {
        if (!top.AcceptCallType()) {
          top = new KnKnot();
          nodes.push(top);
        }
        s.Consume();
        top.CallType = KnotCallType.Assignment;
        top.Core = this.ParseValue(s);
      }
      else if (s.Current().Type == TokenType.Colon && s.Next()?.Type == TokenType.Equal) {
        if (!top.AcceptCallType()) {
          top = new KnKnot();
          nodes.push(top);
        }
        s.Consume();
        s.Consume();
        s.SkipBlankTokens();
        top.CallType = KnotCallType.Assignment;
        top.Core = this.ParseValue(s);
      }

      else if (s.Current().Type == TokenType.ColonColon) {
        if (!top.AcceptCallType()) {
          top = new KnKnot();
          nodes.push(top);
        }
        top.CallType = KnotCallType.Subscript;
        s.Consume();
        top.Core = this.ParseValue(s);
        // top.Core = new KnWord(s.Current().Value);
        // s.Consume();
        // top.Params = this.ParseCallParams(s);
      }
      else if (s.Current().Type == TokenType.DotColon) {
        if (!top.AcceptCallType()) {
          top = new KnKnot();
          nodes.push(top);
        }
        top.CallType = KnotCallType.StaticIndex;
        s.Consume();
        top.Core = this.ParseValue(s);

        // top.Core = new KnWord(s.Current().Value);
        // s.Consume();
        // top.Params = this.ParseCallParams(s);
      }
      else if (s.Current().Type == TokenType.Tilde) {
        if (!top.AcceptCallType()) {
          top = new KnKnot();
          nodes.push(top);
        }
        s.ConsumeTypeAndSkipBlankTokens(TokenType.Tilde);
        top.CallType = KnotCallType.InstanceCall;
        top.Core = this.ParseWord(s, true, false, false);
        top.Params = this.ParseOptionalCallParams(s);
      }

      else if (s.Current().Type == this.SyntaxConfig.KnotCallParamEndToken) {
        s.Consume();
      }
      else if (s.Current().Type == this.SyntaxConfig.KnotParamBeginToken) {
        if (!top.AcceptParam()) {
          top = new KnKnot();
          nodes.push(top);
        }

        top.InOutTable = this.ParseInOutTable(s);
      }
      else if (s.Current().Type == this.SyntaxConfig.KnotMetadataPrefixToken) {
        s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.KnotMetadataPrefixToken);
        if (s.Current().Type == TokenType.Identifier) {
          const tag = this.ParseWord(s, true, false, false);
          const tagStr = tag.Value;
          s.SkipBlankTokens();
          if (s.Current().Type == this.SyntaxConfig.KnotMetadataSeparatorToken) {
            if (top.Metadata == null) {
              top.Metadata = new Map<KnWord, any>();
            }
            s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.KnotMetadataSeparatorToken);
            const suffixNode = this.ParseValue(s, false, false, true);
            top.Metadata.set(tag, suffixNode);
          }
          else {
            top.Name = tag;
          }
        }
        else {
          throw new Error("illegal token");
        }
      }
      else if (s.Current().Type == TokenType.At) {
        s.ConsumeTypeAndSkipBlankTokens(TokenType.At);
        const attrName = this.ParseWord(s, true, false, false).Value;
        top.Attr ??= {};
        s.SkipBlankTokens();
        if (s.Current().Type === TokenType.Equal) {
          s.ConsumeTypeAndSkipBlankTokens(TokenType.Equal);
          top.Attr[attrName] = this.ParseValue(s);
        }
        else {
          top.Attr[attrName] = true;
        }
      }

      else if (s.Current().Type == this.SyntaxConfig.KnotPrefixTypeToken) {
        s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.KnotPrefixTypeToken);
        if (s.Current().Type == this.SyntaxConfig.KnotUnboundTypesBeginToken) {
          if (top.UnboundTypes != null) {
            top = new KnKnot();
            nodes.push(top);
          }
          top.UnboundTypes = this.ParseContainer(
            s,
            this.SyntaxConfig.KnotUnboundTypesBeginToken,
            this.SyntaxConfig.KnotUnboundTypesEndToken,
            stream => this.ParseVectorItem(stream),
            m => m
          );
        }
        else if (s.Current().Type == this.SyntaxConfig.KnotGenericTypesBeginToken) {
          if (top.GenericTypes != null) {
            top = new KnKnot();
            nodes.push(top);
          }
          top.GenericTypes = this.ParseContainer(
            s,
            this.SyntaxConfig.KnotGenericTypesBeginToken,
            this.SyntaxConfig.KnotGenericTypesEndToken,
            stream => this.ParseTablePair(stream),
            m => new KnTuple(m)
          );
        }
        else {
          if (!top.AcceptCallType()) {
            top = new KnKnot();
            nodes.push(top);
          }
          top.CallType = KnotCallType.PrefixCall;
          top.Core = this.ParseValue(s);
          top.Params = this.ParseOptionalCallParams(s);
        }
      }
      else if (s.Current().Type == this.SyntaxConfig.KnotPostfixTypeToken) {
        s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.KnotPostfixTypeToken);

        if (s.Current().Type == this.SyntaxConfig.KnotResultTypeBeginToken) {
          if (top.ResultTypes != null) {
            top = new KnKnot();
            nodes.push(top);
          }
          top.ResultTypes = this.ParseContainer(
            s,
            this.SyntaxConfig.KnotResultTypeBeginToken,
            this.SyntaxConfig.KnotResultTypeEndToken,
            stream => this.ParseTablePair(stream),
            m => new KnTuple(m)
          );
        }
        else {
          if (!top.AcceptCallType()) {
            top = new KnKnot();
            nodes.push(top);
          }
          top.CallType = KnotCallType.PostfixCall;
          top.Core = this.ParseValue(s);
          top.Params = this.ParseOptionalCallParams(s);
        }
      }


      else if (s.Current().Type === this.SyntaxConfig.KnotSpecialPrefixToken) {
        s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.KnotSpecialPrefixToken);
        if (s.Current().Type === this.SyntaxConfig.KnotParamBeginToken) {
          if (!top.AcceptParam()) {
            top = new KnKnot();
            nodes.push(top);
          }
          top.InOutTable = this.ParseInOutTable(s);
        }
        else if (s.Current().Type === this.SyntaxConfig.OrderedMapStartToken) {
          if (top.Prop != null) {
            top = new KnKnot();
            nodes.push(top);
          }
          top.Prop = this.ParseContainer(
            s,
            this.SyntaxConfig.OrderedMapStartToken,
            this.SyntaxConfig.OrderedMapEndToken,
            (s) => this.ParseOrderedMapRow(s),
            m => KnOrderedMap.MakeByPairs(m)
          );
        }
        else if (s.Current().Type === this.SyntaxConfig.UnorderedMapStartToken) {
          if (top.Attr != null) {
            top = new KnKnot();
            nodes.push(top);
          }
          top.Conf = this.ParseContainer(
            s,
            this.SyntaxConfig.UnorderedMapStartToken,
            this.SyntaxConfig.UnorderedMapEndToken,
            (s) => this.ParseMapPair(s),
            m => KnUnorderedMap.MakeByPairs(m)
          );
        }
        else if (s.Current().Type === this.SyntaxConfig.KnotBlockStartToken) {
          if (!top.AcceptBlock()) {
            top = new KnKnot();
            nodes.push(top);
          }
          const array = this.ParseContainer(
            s,
            this.SyntaxConfig.KnotBlockStartToken,
            this.SyntaxConfig.KnotBlockEndToken,
            stream => this.ParseValue(stream),
            m => m
          );
          top.Body = array;
        }


        else if (s.Current().Type === TokenType.Identifier || s.Current().Type === TokenType.Operator) {
          let tag = this.ParseWord(s, true, false, false);
          const tagStr = tag.Value;
          s.SkipBlankTokens();
          if (s.Current().Type === this.SyntaxConfig.KnotMetadataSeparatorToken) {
            // 遇到分隔符，后面是 named attr/prop/slot/block
            s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.KnotMetadataSeparatorToken);
            const suffixNode = this.ParseValue(s, false, false, true);
            const suffixNodeType = KnNodeHelper.GetType(suffixNode);
            if (suffixNodeType === KnNodeType.OrderedMap) {
              if (!top.NamedProp) {
                top.NamedProp = {};
              }
              top.NamedProp[tagStr] = suffixNode as KnOrderedMap;
            }
            else if (suffixNodeType === KnNodeType.UnorderedMap) {
              if (!top.NamedConf) {
                top.NamedConf = {};
              }
              top.NamedConf[tagStr] = suffixNode;
            } else if (suffixNodeType === KnNodeType.Knot) {
              if (!top.Slots) {
                top.Slots = {};
              }
              top.Slots[tagStr] = suffixNode;
            } else if (suffixNodeType === KnNodeType.Vector) {
              if (!top.Sections) {
                top.Sections = {};
              }
              top.Sections[tagStr] = suffixNode;
            }
          }
          else {
            if (!top.AcceptCallType()) {
              top = new KnKnot();
              nodes.push(top);
            }
            top.CallType = KnotCallType.InfixCall;
            top.Core = tag;
            top.Params = this.ParseOptionalCallParams(s);
          }
        }
        else {
          throw new Error("illegal knot special syntax")
        }

      }
      else {
        this.ParseKnotCore(s, top, nodes);
      }

      s.SkipBlankTokens();
    }

    const result = KnKnot.MakeByNodes(nodes);
    s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.KnotEndToken);

    return result;
  }

  private ParseKnotCore(s: TokenStreamV1, top: KnKnot, nodes: KnKnot[]): void {
    if (!top.AcceptCore()) {
      top = new KnKnot();
      nodes.push(top);
    }

    const core = this.ParseValue(s);
    top.Core = core;
    s.SkipBlankTokens();
    // if (s.Current().Type === TokenType.Colon) {
    //     s.Consume(TokenType.Colon);
    //     s.SkipBlankTokens();
    //     const postLabel = this.ParseWord(s, false, false, true);
    //     top.Label = postLabel;
    // }
  }

  public ParseCallParams(s: TokenStreamV1): KnTuple {
    s.SkipBlankTokens();
    let callParamValues: any[] = [];
    while (!s.End()
      && s.Current().Type != this.SyntaxConfig.KnotCallParamEndToken
      && s.Current().Type != this.SyntaxConfig.KnotEndToken
      && s.Current().Type != this.SyntaxConfig.KnotPrefixTypeToken
      && s.Current().Type != this.SyntaxConfig.KnotPostfixTypeToken
      && s.Current().Type != this.SyntaxConfig.KnotParamBeginToken
      && s.Current().Type != TokenType.Colon
      && s.Current().Type != TokenType.At
      && s.Current().Type != TokenType.DotColon
      && s.Current().Type != TokenType.ColonColon
      && s.Current().Type != TokenType.Equal
      // && !s.Current().IsOperatorToken()
    ) {
      const callParamItem = this.ParseValue(s);
      callParamValues.push(callParamItem);
      s.SkipBlankTokens();
    }
    if (s.Current().Type == this.SyntaxConfig.KnotCallParamEndToken) {
      s.Consume();
    }
    s.SkipBlankTokens();
    return new KnTuple(callParamValues);
  }

  private ParseOptionalCallParams(s: TokenStreamV1): KnTuple {
    const params = this.ParseCallParams(s);
    return params.RawValue.length === 0 ? undefined : params;
  }
}
