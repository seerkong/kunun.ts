import { Lexer, Token, TokenType } from './Lexer/Lexer';
import { TokenStreamV1 } from './Lexer/TokenStreamV1';
import { SyntaxConfig } from './SyntaxConfig';
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
} from '../Model/index';
import { KnOrderedMap } from '../Model/KnOrderedMap';
import { KnRawString } from '../Model/KnRawString';
import { KnUndefined } from '../Model/KnUndefined';
import { KnUnorderedMap } from '../Model/KnUnorderedMap';
import { KnNodeHelper } from '../Util/KnNodeHelper';
import { KnModifierGroup } from '../Model/KnModifierGroup';

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
    return this.ParseValue(new TokenStreamV1(input));
  }

  private ParseValue(
    s: TokenStreamV1,
    acceptPrefix: boolean = true,
    acceptSuffix: boolean = true,
    arrowAsContainer: boolean = false
  ): any {
    s.SkipBlankTokens();

    switch (s.Current().Type) {
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
      prefixModifierGroup = this.ParseModifierGroup(s, this.SyntaxConfig.PrefixToken);
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
      if (s.Current().Type === TokenType.Identifier) {
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
      if (s.Current().Type === TokenType.Identifier) {
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
      return this.ParseContainer(
        s,
        this.SyntaxConfig.UnorderedMapStartToken,
        this.SyntaxConfig.UnorderedMapEndToken,
        (s) => this.ParseMapPair(s),
        m => KnUnorderedMap.MakeByPairs(m)
      );
    } else if (s.Current().Type === this.SyntaxConfig.VectorStartToken) {
      return this.ParseContainer(
        s,
        this.SyntaxConfig.VectorStartToken,
        this.SyntaxConfig.VectorEndToken,
        stream => this.ParseVectorItem(stream),
        m => m
      );
    } else if (s.Current().Type === this.SyntaxConfig.KnotStartToken) {
      return this.ParseKnotContainer(s);
    } else if (s.Current().Type === TokenType.Identifier) {
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
    return value;
  }

  private ParseModifierGroup(s: TokenStreamV1, tokenType: TokenType): KnModifierGroup {
    const r = new KnModifierGroup();
    s.SkipBlankTokens();

    while (!s.End() && s.Current().Type === tokenType) {
      s.ConsumeTypeAndSkipBlankTokens(tokenType);
      const node = this.ParseValue(s, false, false, true);
      const nodeType = KnNodeHelper.GetType(node);

      if (nodeType === KnNodeType.Word) {
        if (s.Next().Type === TokenType.Comma) {
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
    const str = s.ConsumeTypeAndSkipBlankTokens(TokenType.RawString).Value;
    const subStr = str.substring(1, str.length - 1);
    return new KnRawString(subStr);
  }

  private ParseString(s: TokenStreamV1): string {
    const str = s.ConsumeTypeAndSkipBlankTokens(TokenType.String).Value;
    const jsonArr = `[${str}]`;
    let jsonObj = JSON.parse(jsonArr);
    return jsonObj[0];
  }

  private ParseWord(s: TokenStreamV1, hasNamespace: boolean, acceptPrefix: boolean, acceptSuffix: boolean): KnWord {
    const items: string[] = [];
    while (!s.End() && s.Current().Type === TokenType.Identifier) {
      const t = s.ConsumeTypeAndSkipBlankTokens(TokenType.Identifier);
      items.push(t.Value);
      if (!s.End() && s.Current().Type === TokenType.Dot) {
        s.ConsumeTypeAndSkipBlankTokens(TokenType.Dot);
      }
    }

    const qualifiers = items.slice(0, -1);
    const word = new KnWord(items[items.length - 1], qualifiers);

    if (acceptSuffix) {
      let modifierGroup: KnModifierGroup = this.ParseModifierGroup(s, this.SyntaxConfig.SuffixComplementToken);
      word.PostModifiers = modifierGroup;
    }

    return word;
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

    while (s.Current().Type !== end) {
      const item = parser(s);
      children.push(item);
      s.SkipBlankTokens();
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
    if (!s.End() && s.Current().Type == this.SyntaxConfig.PairsSeparatorToken) {
      s.Consume(this.SyntaxConfig.PairsSeparatorToken);
    }

    let key = this.AsPairKey(firstNode).Value;
    let val = secondNode;
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
      else if (s.Current().IsOperatorToken()) {
        if (!top.AcceptCallType()) {
          top = new KnKnot();
          nodes.push(top);
        }
        top.CallType = KnotCallType.Operator;
        top.Core = new KnWord(s.Current().Value);
        s.Consume();
        top.Params = this.ParseCallParams(s);
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

      else if (s.Current().Type == this.SyntaxConfig.KnotCallParamEndToken) {
        s.Consume();
      }
      else if (s.Current().Type == this.SyntaxConfig.KnotParamBeginToken) {
        if (!top.AcceptParam()) {
          top = new KnKnot();
          nodes.push(top);
        }

        top.Params = this.ParseContainer(
          s,
          this.SyntaxConfig.KnotParamBeginToken,
          this.SyntaxConfig.KnotParamEndToken,
          stream => this.ParseTablePair(stream),
          m => new KnTuple(m)
        );
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
          top.Params = this.ParseCallParams(s);
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
          top.Params = this.ParseCallParams(s);
        }
      }


      else if (s.Current().Type === this.SyntaxConfig.KnotSpecialPrefixToken) {
        s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.KnotSpecialPrefixToken);
        if (s.Current().Type === this.SyntaxConfig.OrderedMapStartToken) {
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
          top.Attr = this.ParseContainer(
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
          top.Block = array;
        }


        else if (s.Current().Type === TokenType.Identifier) {
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
              if (!top.NamedAttr) {
                top.NamedAttr = {};
              }
              top.NamedAttr[tagStr] = suffixNode;
            } else if (suffixNodeType === KnNodeType.Knot) {
              if (!top.NamedSlot) {
                top.NamedSlot = {};
              }
              top.NamedSlot[tagStr] = suffixNode;
            } else if (suffixNodeType === KnNodeType.Vector) {
              if (!top.NamedBlock) {
                top.NamedBlock = {};
              }
              top.NamedBlock[tagStr] = suffixNode;
            }
          }
          else {
            if (!top.AcceptCallType()) {
              top = new KnKnot();
              nodes.push(top);
            }
            top.CallType = KnotCallType.InfixCall;
            top.Core = tag;
            top.Params = this.ParseCallParams(s);
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
}