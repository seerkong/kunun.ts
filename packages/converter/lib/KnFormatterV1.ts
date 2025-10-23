import { KnNodeHelper } from "kunun-core/Util/KnNodeHelper";
import { FormatConfig } from "./FormatConfig";
import { FormatState } from "./FormatState";
import type { SyntaxConfig } from "./SyntaxConfig";
import { KnNodeType } from "kunun-core/Model/KnNodeType";
import { KnOrderedMap } from "kunun-core/Model/KnOrderedMap";
import { KnTuple } from "kunun-core/Model/KnTuple";
import { KnKnot, KnotCallType } from "kunun-core/Model/KnKnot";
import { KnWord } from "kunun-core/Model/KnWord";
import { KnSymbol } from "kunun-core/Model/KnSymbol";
import { KnRawString } from "kunun-core/Model/KnRawString";
import { KnInterpolatedString } from "kunun-core/Model/KnInterpolatedString";
import { KnQualifiedIdentifier } from "kunun-core/Model/KnQualifiedIdentifier";
import { KnActionWrapper } from "kunun-core/Model/KnActionWrapper";
import { KnQuoteWrapper } from "kunun-core/Model/KnQuoteWrapper";
import { KnWrapper } from "kunun-core/Model/KnWrapper";
import { KnModifierGroup } from "kunun-core/Model/KnModifierGroup";

export class KnFormatterV1 {
  public SyntaxConfig: SyntaxConfig;
  public constructor(syntaxConfig: SyntaxConfig) {
    this.SyntaxConfig = syntaxConfig;
  }

  public Stringify(node: any, prettify: boolean = true): string {
    if (prettify) {
      return this.NodeToString(
        node,
        {
          IndentLevel: 0,
          Config: FormatConfig.PrettifyConfig
        }
      );
    }

    return this.NodeToString(
      node,
      {
        IndentLevel: 0,
        Config: FormatConfig.SingleLineConfig
      }
    );
  }

  public NodeToString(node: any, formatState: FormatState): string {
    if (node === null) {
      return "nil";
    }

    const knType: KnNodeType = KnNodeHelper.GetType(node);
    if (knType === KnNodeType.Unknown || knType === KnNodeType.Undefined) {
      return "ukn";
    }

    if (knType === KnNodeType.UnorderedMap) {
      return this.MapToStringCustom(
        node,
        formatState,
        this.SyntaxConfig.UnorderedMapStartStr,
        this.SyntaxConfig.UnorderedMapEndStr
      );
    }

    if (knType === KnNodeType.OrderedMap) {
      return this.MapToStringCustom(
        node as KnOrderedMap,
        formatState,
        this.SyntaxConfig.SyntaxMarcroPrefixStr + this.SyntaxConfig.OrderedMapStartStr,
        this.SyntaxConfig.OrderedMapEndStr
      );
    }

    if (knType === KnNodeType.Vector) {
      return this.VectorToString(node, formatState);
    }

    if (knType === KnNodeType.Tuple) {
      return this.TupleToString(node as KnTuple, formatState,
        this.SyntaxConfig.SyntaxMarcroPrefixStr + this.SyntaxConfig.TableStartStr,
        this.SyntaxConfig.TableEndStr);
    }

    if (knType === KnNodeType.Knot) {
      return this.KnotToString(node as KnKnot, formatState);
    }

    if (knType == KnNodeType.QuoteMarcro) {
      return this.WrapperToString(node as KnQuoteWrapper, this.SyntaxConfig.QuoteMarcroPrefixStr, formatState);
    }
    if (knType === KnNodeType.QuasiQuote || knType === KnNodeType.Unquote || knType === KnNodeType.UnquoteSplice || knType === KnNodeType.UnquoteMap) {
      return this.QuoteNodeToString(node as KnQuoteWrapper, formatState);
    }
    if (knType === KnNodeType.RowSpread) {
      return this.RowSpreadToString(node as KnQuoteWrapper, formatState);
    }

    if (knType == KnNodeType.ActionMarcro) {
      return this.WrapperToString(node as KnActionWrapper, this.SyntaxConfig.ActionMarcroPrefixStr, formatState);
    }

    if (knType === KnNodeType.Word) {
      return this.WordToString(node as KnWord, formatState);
    }

    if (knType === KnNodeType.Symbol) {
      return this.SymbolToString(node as KnSymbol, formatState);
    }
    if (knType === KnNodeType.RawString) {
      const rawString: KnRawString = node as KnRawString;
      if (this.SyntaxConfig.FormatRawStringAsString) {
        return JSON.stringify(rawString.Value);
      }
      else {
        return `'${rawString.Value}'`;
      }
    }

    if (knType === KnNodeType.InterpolatedString) {
      return this.InterpolatedStringToString(node as KnInterpolatedString, formatState);
    }

    if (knType === KnNodeType.String) {
      return JSON.stringify(node);
    }

    if (knType === KnNodeType.Number || knType === KnNodeType.Integer || knType === KnNodeType.Double) {
      return node.toString();
    }

    if (knType === KnNodeType.Boolean) {
      return node.toString();
    }

    if (knType === KnNodeType.Nil) {
      return "nil";
    }

    if (knType === KnNodeType.KonTypedObject) {
      return "<typed-object>";
    }

    throw new Error("not supported type" + knType);
  }

  public InterpolatedStringToString(node: KnInterpolatedString, formatState: FormatState): string {
    const inner = node.Parts.map((part) => {
      if (part.kind === 'text') {
        return part.value
          .replace(/\\/g, "\\\\")
          .replace(/"/g, "\\\"")
          .replace(/\n/g, "\\n")
          .replace(/\t/g, "\\t")
          .replace(/\r/g, "\\r");
      }
      return "\\" + this.SyntaxConfig.KnotStartStr + this.NodeToString(part.value, {
        IndentLevel: formatState.IndentLevel,
        Config: FormatConfig.SingleLineConfig,
      }) + this.SyntaxConfig.KnotEndStr;
    }).join("");
    return `"${inner}"`;
  }

  public WrapperToString(wrapper: KnWrapper, prefix: string, formatState: FormatState): string {
    const typeStr = this.WordToString(wrapper.Kind, formatState);
    const valueStr = this.NodeToString(wrapper.Inner, formatState);
    return `${prefix}${typeStr},${valueStr}`;
  }

  public QuoteNodeToString(wrapper: KnWrapper, formatState: FormatState): string {
    const prefix = wrapper._Type === KnNodeType.QuasiQuote
      ? "`"
      : wrapper._Type === KnNodeType.UnquoteSplice
        ? ",@"
        : wrapper._Type === KnNodeType.UnquoteMap
          ? ",%"
          : ",";
    return prefix + this.NodeToString(wrapper.Inner, {
      IndentLevel: formatState.IndentLevel,
      Config: FormatConfig.SingleLineConfig
    });
  }

  public RowSpreadToString(wrapper: KnWrapper, formatState: FormatState): string {
    return ".." + this.NodeToString(wrapper.Inner, {
      IndentLevel: formatState.IndentLevel,
      Config: FormatConfig.SingleLineConfig
    });
  }

  public ModifiersToString(modifierGroup: KnModifierGroup, prefix: string, formatState: FormatState): string {
    const items: string[] = [];

    if (modifierGroup == null) {
      return "";
    }

    if (modifierGroup.Identifiers && modifierGroup.Identifiers.length > 0) {
      for (const node of modifierGroup.Identifiers) {
        const complementStr = this.Stringify(node, false);
        items.push(prefix + complementStr);
      }
    }

    if (modifierGroup.NamedValues && modifierGroup.NamedValues.size > 0) {
      for (const [key, value] of modifierGroup.NamedValues) {
        const tag = this.Stringify(key, false);
        const complementStr = this.Stringify(value, false);
        items.push(prefix + tag + complementStr);
      }
    }

    if (modifierGroup.Knots && modifierGroup.Knots.length > 0) {
      for (const node of modifierGroup.Knots) {
        const complementStr = this.Stringify(node, false);
        items.push(prefix + complementStr);
      }
    }

    if (modifierGroup.UnorderedMap != null) {
      const complementStr = this.Stringify(modifierGroup.UnorderedMap, false);
      items.push(prefix + complementStr);
    }

    if (modifierGroup.OrderedMap != null) {
      const complementStr = this.Stringify(modifierGroup.OrderedMap, false);
      items.push(prefix + complementStr);
    }

    if (modifierGroup.Vector != null) {
      const complementStr = this.Stringify(modifierGroup.Vector, false);
      items.push(prefix + complementStr);
    }

    return items.join(" ");
  }


  public WordToString(node: KnWord, formatState: FormatState): string {
    const word: string = this.WordToStringCustom(node, formatState, "");

    let prefixes: string = this.ModifiersToString(
      node.PreModifiers, this.SyntaxConfig.PrefixStr, {
      IndentLevel: formatState.IndentLevel,
      Config: FormatConfig.SingleLineConfig,
    }
    );
    let postfixes: string = this.ModifiersToString(
      node.PostModifiers, this.SyntaxConfig.SuffixComplementStr, {
      IndentLevel: formatState.IndentLevel,
      Config: FormatConfig.SingleLineConfig,
    }

    );

    const items: string[] = [];
    if (prefixes != "") {
      items.push(prefixes);
    }
    items.push(word);
    if (postfixes != "") {
      items.push(postfixes);
    }
    return items.join(" ");
  }

  public SymbolToString(node: KnSymbol, formatState: FormatState): string {
    return this.WordToStringCustom(node, formatState, this.SyntaxConfig.QuoteMarcroPrefixStr);
  }

  public WordToStringCustom(node: KnQualifiedIdentifier | string, formatState: FormatState, prefix: string, typeDefAfterWord: boolean = true): string {
    if (typeof node === 'string') {
      return node;
    }
    let annotationsJoiner = " ";
    let flagsJoiner = " ";
    let afterFlagsSection = " ";
    let afterAnnotationSection = " ";
    let containerIndent = "";
    if (formatState.Config.WordMultiLine) {
      containerIndent = formatState.Config.IndentString.repeat(formatState.IndentLevel + 1);
      annotationsJoiner = `\n${containerIndent}`;
      afterAnnotationSection += `\n${containerIndent}`;
    }

    let annotationStr = "";
    let modifiersStr = "";
    let qualifiersStr = "";
    let defStr = "";
    let complementStr = "";
    if (node instanceof KnWord && node.SourceQualifier) {
      qualifiersStr = node.SourceQualifier + ":::";
    }
    else if (node.Qualifiers && node.Qualifiers.length > 0) {
      qualifiersStr = node.Qualifiers.join(".") + ".";
    }

    if (node instanceof KnWord && node.GenericArgs && node.GenericArgs.length > 0) {
      defStr = "<" + node.GenericArgs.map(arg => this.Stringify(arg, false)).join(" ") + ">";
    }

    return `${qualifiersStr}${prefix}${node.Value}${defStr}${complementStr}`;
  }

  public MapToStringCustom(node: any, formatState: FormatState, preffix: string, suffix: string): string {
    const inner: string = this.MapFormatInner(node, formatState);
    let sb = "";
    if (formatState.Config.MapMultiLine) {
      const containerIndent = formatState.Config.IndentString.repeat(formatState.IndentLevel);
      sb += preffix;
      sb += "\n";
      sb += inner;
      if (Object.keys(node).length > 0) {
        sb += "\n";
      }

      sb += containerIndent;
      sb += suffix;
      return sb;
    }

    sb = `${preffix}${inner}${suffix}`;
    return sb;
  }

  public MapFormatInner(node: any, formatState: FormatState): string {
    let pairsJoiner = " ";
    const valFlagStr = " " + this.SyntaxConfig.ValueFlagStr;
    let valueTagAndValueJoiner = " ";
    let keyIndent = "";
    let valueIndent = "";
    if (formatState.Config.MapMultiLine) {
      pairsJoiner = "\n";
      // valueTagAndValueJoiner = "\n";
      keyIndent = formatState.Config.IndentString.repeat(formatState.IndentLevel + 1);
      // valueIndent = formatState.Config.IndentString.repeat(formatState.IndentLevel + 2);
    }
    if (this.SyntaxConfig.FormaterAddPairsSeparator) {
      pairsJoiner = this.SyntaxConfig.PairsSeparatorStr + pairsJoiner;
    }

    const innerStringList: string[] = [];
    const isOrderedMap = node instanceof KnOrderedMap;

    if (isOrderedMap) {
      let orderedMap = node as KnOrderedMap;
      for (const [key, value] of orderedMap.Value) {
        let types: any[] = orderedMap.TypeMap.get(key);
        const innerValStr: string = this.NodeToString(
          value,
          {
            IndentLevel: formatState.IndentLevel + 1,
            Config: formatState.Config,
            IndentKnotCore: true
          }
        );
        // let keyStr: string = this.WordToStringCustom(key, { IndentLevel: 0, Config: formatState.Config }, "", false);
        
        let keyStr: string | null = null;
        let keyAny: any = key;
        if (keyAny instanceof KnQualifiedIdentifier) {
            keyStr = this.WordToStringCustom(keyAny, new FormatState(), "", false);
        } else if (keyAny instanceof KnRawString) {
            keyStr = keyAny.Value;
        } else {
           keyStr = keyAny;
        }

        if (types != null && types.length > 0) {
          for (const typeItem of types) {
            // TODO
          }
        }
        const pairStr = `${keyIndent}${keyStr}${valFlagStr}${valueTagAndValueJoiner}${valueIndent}${innerValStr}`;
        innerStringList.push(pairStr);
      }
    }
    else {
      for (let [key, value] of Object.entries(node)) {
        const innerValStr: string = this.NodeToString(
          value,
          {
            IndentLevel: formatState.IndentLevel + 1,
            Config: formatState.Config,
            IndentKnotCore: true
          }
        );
        let keyStr: string = this.WordToStringCustom(key, { IndentLevel: 0, Config: formatState.Config }, "", false);
        if (this.SyntaxConfig.FormaterMapKeyAsStr) {
          keyStr = "\"" + keyStr + "\"";
        }
        const pairStr = `${keyIndent}${keyStr}${valFlagStr}${valueTagAndValueJoiner}${valueIndent}${innerValStr}`;
        innerStringList.push(pairStr);
      }
    }

    return innerStringList.join(pairsJoiner);
  }

  public VectorToString(node: any[], formatState: FormatState): string {
    return this.VectorToStringCustom(
      node,
      formatState,
      this.SyntaxConfig.VectorStartStr,
      this.SyntaxConfig.VectorEndStr
    );
  }

  public VectorToStringCustom(innerNodes: any[], formatState: FormatState, preffix: string, suffix: string): string {
    let sb = "";
    const inner: string = this.VectorFormatInner(innerNodes, formatState);
    if (formatState.Config.VectorMultiLine) {
      const containerIndent = formatState.Config.IndentString.repeat(formatState.IndentLevel);
      sb += preffix;
      sb += "\n";
      sb += inner;
      if (innerNodes.length > 0) {
        sb += "\n";
      }

      sb += containerIndent;
      sb += suffix;
      return sb;
    }

    sb = `${preffix}${inner}${suffix}`;
    return sb;
  }

  public TupleToString(node: KnTuple, formatState: FormatState, preffix: string, suffix: string): string {
    const joiner = " ";
    const containerIndent = "";

    if (!node.IsTupleRows()) {
      return `${preffix}${((node as KnTuple).RawValue as any[]).map(item => this.Stringify(item, false)).join(joiner)}${suffix}`;
    }

    const tableValues = node.RawValue;
    const innerStringList: string[] = [];
    for (const tableValue of tableValues) {
      if (tableValue[0] !== null) {
        innerStringList.push(this.SyntaxConfig.ValueFlagStr + tableValue[0]);
      }

      if (tableValue[1] && tableValue[1] != null && tableValue[1].length > 0) {
        for (const typeItem of tableValue[1]) {
          innerStringList.push(this.SyntaxConfig.TypeStr + this.Stringify(typeItem, false));
        }
      }

      if (tableValue[2] !== null) {
        innerStringList.push(this.Stringify(tableValue[2], false));
      }
    }
    const inner = innerStringList.join(joiner);

    const sb = `${preffix}${inner}${suffix}`;
    return sb;
  }

  public VectorFormatInner(innerNodes: any[], formatState: FormatState): string {
    let joiner = " ";
    let containerIndent = "";
    if (formatState.Config.VectorMultiLine) {
      joiner = "\n";
      containerIndent = formatState.Config.IndentString.repeat(formatState.IndentLevel + 1);
    }
    if (this.SyntaxConfig.FormaterAddPairsSeparator) {
      joiner = this.SyntaxConfig.PairsSeparatorStr + joiner;
    }

    const innerStringList: string[] = [];
    for (const innerNode of innerNodes) {
      const innerStr: string = this.NodeToString(
        innerNode,
        {
          IndentLevel: formatState.IndentLevel + 1,
          Config: formatState.Config
        }
      );
      innerStringList.push(containerIndent + innerStr);
    }

    return innerStringList.join(joiner);
  }

  public KnotToString(node: KnKnot, formatState: FormatState): string {
    let containerIndent = "";
    let innerIndent = "";
    let beforeKnotEndTokenStr = "";

    if (formatState.Config.KnotSegmentsMultiLine) {
      containerIndent = formatState.Config.IndentString.repeat(formatState.IndentLevel);
      innerIndent = formatState.Config.IndentString.repeat(formatState.IndentLevel + 1);
      beforeKnotEndTokenStr = `\n${containerIndent}`;
    }
    let inner = "";

    if (formatState.Config.PrettyExpr) {
      if (formatState.IndentLevel > 0 && formatState.IndentKnotCore) {
        inner += `\n${innerIndent}`;
      }
      inner += this.KnotFormatInner(
        node,
        {
          IndentLevel: formatState.IndentLevel,
          Config: FormatConfig.ExprInnerConfig,
          // IndentKnotCore: formatState.IndentKnotCore
        }
      );
    }
    else {
      inner = this.KnotFormatInner(
        node,
        {
          IndentLevel: formatState.IndentLevel,
          Config: FormatConfig.SingleLineConfig
        }
      );
    }

    return `${this.SyntaxConfig.KnotStartStr}${inner}${beforeKnotEndTokenStr}${this.SyntaxConfig.KnotEndStr}`;
  }

  public KnotFormatInner(node: KnKnot, formatState: FormatState): string {
    let containerIndent = "";
    let innerIndent = "";
    let segmentJoiner = " ";
    if (formatState.Config.KnotSegmentsMultiLine) {
      containerIndent = formatState.Config.IndentString.repeat(formatState.IndentLevel);
      innerIndent = formatState.Config.IndentString.repeat(formatState.IndentLevel + 1);
      segmentJoiner = `\n${innerIndent}`;
    }

    let iter: KnKnot | null = node;

    let sb = "";
    while (iter !== null) {
      const currentNode: KnKnot = iter;
      const segmentStr: string = this.KnotFormatSegment(currentNode, formatState);
      sb += segmentStr;
      if (currentNode.Next != null) {
        if (this.ShouldJoinNextWithoutSpace(currentNode.Next)) {
          // chained subscript syntax is written tightly: obj.:field::key
        }
        else {
          sb += segmentJoiner;
        }
      }

      iter = currentNode.Next;
    }

    return sb;
  }

  private ShouldJoinNextWithoutSpace(node: KnKnot): boolean {
    return node.CallType === KnotCallType.StaticIndex || node.CallType === KnotCallType.Subscript;
  }

  public GetCallTypeStr(callType: KnotCallType): string {
    switch (callType) {
      case KnotCallType.PrefixCall:
        return this.SyntaxConfig.KnotPrefixTypeStr;
      case KnotCallType.InfixCall:
        return this.SyntaxConfig.KnotSpecialPrefixStr;
      case KnotCallType.InstanceCall:
        return this.SyntaxConfig.TypeStr;
      case KnotCallType.PostfixCall:
        return this.SyntaxConfig.KnotPostfixTypeStr;
      case KnotCallType.Assignment:
        return "=";
      case KnotCallType.StaticIndex:
          return ".:";
      case KnotCallType.Subscript:
          return "::";
      default:
        return "";
    }
  }

  public KnotFormatSegment(node: KnKnot, formatState: FormatState): string {
    let containerIndent = "";
    let innerIndent = "";

    if (formatState.Config.KnotSegmentsMultiLine) {
      containerIndent = formatState.Config.IndentString.repeat(formatState.IndentLevel);
      innerIndent = formatState.Config.IndentString.repeat(formatState.IndentLevel + 1);
    }

    let sb = "";

    if (node.UnboundTypes != null) {
      let typeParamBefore = `${this.SyntaxConfig.KnotPrefixTypeStr}${this.SyntaxConfig.KnotUnboundTypesBeginStr}`;
      let typeParamAfter = `${this.SyntaxConfig.KnotUnboundTypesEndStr} `;

      let typeParamStr = this.VectorToStringCustom(
        node.UnboundTypes,
        {
          IndentLevel: formatState.IndentLevel + 1,
          Config: FormatConfig.SingleLineConfig
        },
        typeParamBefore,
        typeParamAfter
      );
      sb += typeParamStr;
    }

    if (node.CallType != null) {
      if ((node.CallType === KnotCallType.StaticIndex || node.CallType === KnotCallType.Subscript) && sb.endsWith(" ")) {
        sb = sb.slice(0, -1);
      }
      sb += this.GetCallTypeStr(node.CallType);
    }

    if (node.Core != null) {
      const coreType: KnNodeType = KnNodeHelper.GetType(node.Core);
      // if (coreType === KnNodeType.UnorderedMap || coreType === KnNodeType.Vector) {
      //   sb += this.SyntaxConfig.SyntaxMarcroPrefixStr;
      // }

      const isCoreSingleLine = KnKnot.IsCoreSingleLine(node);
      const formatCoreConfig = isCoreSingleLine ? FormatConfig.SingleLineConfig : FormatConfig.MultiLineConfig;
      const coreStr: string = this.NodeToString(
        node.Core,
        {
          IndentLevel: formatState.IndentLevel + 1,
          Config: formatCoreConfig
        }
      );
      sb += coreStr;
    }

    if (node.Name != null) {
      sb += " " + this.SyntaxConfig.KnotMetadataPrefixStr + this.Stringify(node.Name, false);
    }

    if (node.Metadata && node.Metadata.size !== 0) {
      for (const [key, value] of node.Metadata.entries()) {

        if (formatState.Config.KnotAttrMultiLine) {
          sb += `\n${innerIndent}`;
        }
        else if (!sb.endsWith(" ")) {
          sb += " ";
        }
        const tag: string = this.WordToStringCustom(key, formatState, "");
        const valueStr: string = this.NodeToString(
          value,
          {
            IndentLevel: formatState.IndentLevel + 1,
            Config: formatState.Config,
            IndentKnotCore: true
          }
        );
        sb += this.SyntaxConfig.KnotMetadataPrefixStr + tag + " " +this.SyntaxConfig.KnotMetadataSeparatorStr + " " + valueStr;
      }
    }

    if (node.GenericTypes) {
      if (formatState.Config.KnotAttrMultiLine && node.Metadata) {
        sb += `\n${innerIndent}`;
      }
      else if (!sb.endsWith(" ")) {
        sb += " ";
      }

      const typeParamBefore = `${this.SyntaxConfig.KnotSpecialPrefixStr}${this.SyntaxConfig.KnotGenericTypesBeginStr}`;
      const typeParamAfter = `${this.SyntaxConfig.KnotGenericTypesEndStr} `;

      const typeParamStr: string = this.TupleToString(
        node.GenericTypes,
        {
          IndentLevel: formatState.IndentLevel + 1,
          Config: FormatConfig.SingleLineConfig
        },
        typeParamBefore,
        typeParamAfter
      );
      sb += typeParamStr;
    }

    if (node.GenericParams) {
      if (!sb.endsWith(" ")) {
        sb += " ";
      }
      sb += "<" + this.TupleValuesToString(node.GenericParams) + ">";
    }

    if (node.Params) {
      if (node.CallType != null) {
        let canOmitCallParamEnd = node.CouldOmitCallParamEnd();
        let paramHeadStr = (node.Params.RawValue.length == 0)
          ? ""
          : " ";
        let paramTailStr = canOmitCallParamEnd
          ? ""
          : this.SyntaxConfig.KnotCallParamEndStr;
        if (node.Next != null && this.ShouldJoinNextWithoutSpace(node.Next)) {
          paramTailStr = "";
        }
        let paramStr = this.TupleToString(
          node.Params,
          {
            IndentLevel: formatState.IndentLevel + 1,
            Config: FormatConfig.SingleLineConfig
          },
          paramHeadStr, paramTailStr
        );
        sb += paramStr;
      }
      else {
        let shouldMultiline = true;
        const config = shouldMultiline ? formatState.Config : FormatConfig.SingleLineConfig;
        if (formatState.Config.KnotAttrMultiLine && node.Metadata && node.ResultTypes == null) {
          sb += `\n${innerIndent}`;
        }
        else if (!sb.endsWith(" ")) {
          sb += " ";
        }

        const paramStr: string = this.TupleToString(
          node.Params,
          {
            IndentLevel: formatState.IndentLevel + 1,
            Config: config
          },
          this.SyntaxConfig.KnotParamBeginStr,
          this.SyntaxConfig.KnotParamEndStr
        );
        sb += paramStr;
      }
    }

    if (node.InOutTable) {
      if (!sb.endsWith(" ")) {
        sb += " ";
      }
      sb += this.InOutTableToString(node.InOutTable);
    }

    if (node.Conf) {
      if (!sb.endsWith(" ")) {
        sb += " ";
      }
      sb += this.MapToStringCustom(
        node.Conf,
        {
          IndentLevel: formatState.IndentLevel + 1,
          Config: formatState.Config
        },
        `${this.SyntaxConfig.KnotSpecialPrefixStr}${this.SyntaxConfig.UnorderedMapStartStr}`,
        this.SyntaxConfig.UnorderedMapEndStr
      );
    }

    if (node.ResultTypes && node.ResultTypes.RawValue.length > 0) {
      const typeResultStart = `${this.SyntaxConfig.KnotSpecialPrefixStr}${this.SyntaxConfig.KnotResultTypeBeginStr}`;
      const typeResultEnd = `${this.SyntaxConfig.KnotResultTypeEndStr} `;

      if (formatState.Config.KnotAttrMultiLine && node.Metadata && node.Params == null) {
        sb += `\n${innerIndent}`;
      }
      else if (!sb.endsWith(" ")) {
        sb += " ";
      }

      const typeResultStr: string = this.TupleToString(
        node.ResultTypes,
        {
          IndentLevel: formatState.IndentLevel + 1,
          Config: FormatConfig.SingleLineConfig
        },
        typeResultStart,
        typeResultEnd
      );
      sb += typeResultStr;
    }

    if (node.Prop != null) {
      if (formatState.Config.KnotAttrMultiLine) {
        sb += `\n${innerIndent}`;
      }
      else if (!sb.endsWith(" ")) {
        sb += " ";
      }

      const attrStr: string = this.MapToStringCustom(
        node.Prop,
        {
          IndentLevel: formatState.IndentLevel + 1,
          Config: formatState.Config
        },
        `${this.SyntaxConfig.KnotSpecialPrefixStr}${this.SyntaxConfig.OrderedMapStartStr}`,
        this.SyntaxConfig.OrderedMapEndStr
      );

      sb += attrStr;

    }
    if (node.NamedProp && Object.keys(node.NamedProp).length !== 0) {
      for (const [key, value] of Object.entries(node.NamedProp)) {
        if (formatState.Config.KnotAttrMultiLine) {
          sb += `\n${innerIndent}`;
        }
        else if (!sb.endsWith(" ")) {
          sb += " ";
        }
        const tag: string = key;
        const valueStr: string = this.MapToStringCustom(
          value,
          {
            IndentLevel: formatState.IndentLevel + 1,
            Config: formatState.Config
          },
          `${this.SyntaxConfig.OrderedMapStartStr}`,
          this.SyntaxConfig.OrderedMapEndStr
        );
        sb += `${this.SyntaxConfig.KnotSpecialPrefixStr}${tag} ${this.SyntaxConfig.KnotMetadataSeparatorStr} ${valueStr}`;
      }
    }

    if (node.Attr) {
      if (formatState.Config.KnotAttrMultiLine) {
        sb += `\n${innerIndent}`;
      }
      else if (!sb.endsWith(" ")) {
        sb += " ";
      }

      for (const [key, value] of Object.entries(node.Attr)) {
        if (!sb.endsWith(" ")) {
          sb += " ";
        }
        sb += `${this.SyntaxConfig.ActionMarcroPrefixStr}${key}`;
        if (value !== true) {
          sb += ` ${this.SyntaxConfig.KnotMetadataSeparatorStr} ${this.NodeToString(value, { IndentLevel: formatState.IndentLevel + 1, Config: FormatConfig.SingleLineConfig })}`;
        }
      }

    }

    if (node.NamedAttr && Object.keys(node.NamedAttr).length > 0) {
      for (const [key, value] of Object.entries(node.NamedAttr)) {
        if (formatState.Config.KnotAttrMultiLine) {
          sb += `\n${innerIndent}`;
        }
        else if (!sb.endsWith(" ")) {
          sb += " ";
        }
        const tag: string = key;
        const valueStr: string = this.MapToStringCustom(
          value,
          {
            IndentLevel: formatState.IndentLevel + 1,
            Config: formatState.Config
          },
          `${this.SyntaxConfig.OrderedMapStartStr}`,
          this.SyntaxConfig.OrderedMapEndStr
        );
        sb += `${this.SyntaxConfig.KnotSpecialPrefixStr}${tag} ${this.SyntaxConfig.KnotMetadataSeparatorStr} ${valueStr}`;
      }
    }

    if (node.NamedConf && Object.keys(node.NamedConf).length > 0) {
      for (const [key, value] of Object.entries(node.NamedConf)) {
        if (!sb.endsWith(" ")) {
          sb += " ";
        }
        const valueStr = this.MapToStringCustom(
          value,
          {
            IndentLevel: formatState.IndentLevel + 1,
            Config: formatState.Config
          },
          this.SyntaxConfig.UnorderedMapStartStr,
          this.SyntaxConfig.UnorderedMapEndStr
        );
        sb += `${this.SyntaxConfig.KnotSpecialPrefixStr}${key} ${this.SyntaxConfig.KnotMetadataSeparatorStr} ${valueStr}`;
      }
    }

    if (node.NamedSlot && Object.keys(node.NamedSlot).length > 0) {
      for (const [key, value] of Object.entries(node.NamedSlot)) {
        if (formatState.Config.KnotAttrMultiLine) {
          sb += `\n${innerIndent}`;
        }
        else if (!sb.endsWith(" ")) {
          sb += " ";
        }
        const tag: string = key;
        let valueStr: string = this.NodeToString(
          value,
          {
            IndentLevel: formatState.IndentLevel + 1,
            Config: formatState.Config,
            IndentKnotCore: true
          }
        );
        // if (formatState.Config.KnotAttrMultiLine) {
        //   valueStr = `\n${innerIndent}${formatState.Config.IndentString}` + valueStr;
        // }
        sb += `${this.SyntaxConfig.KnotSpecialPrefixStr}${tag} ${this.SyntaxConfig.KnotMetadataSeparatorStr} ${valueStr}`;
      }
    }

    if (node.Block != null) {
      if (formatState.Config.KnotAttrMultiLine) {
        sb += `\n${innerIndent}`;
      }
      else if (!sb.endsWith(" ")) {
        sb += " ";
      }

      const blockStr = this.VectorToStringCustom(
        node.Block,
        {
          IndentLevel: formatState.IndentLevel + 1,
          Config: formatState.Config
        },
        `${this.SyntaxConfig.KnotSpecialPrefixStr}${this.SyntaxConfig.KnotBlockStartStr}`,
        this.SyntaxConfig.KnotBlockEndStr
      );
      sb += blockStr;
    }

    if (node.Body != null) {
      if (!sb.endsWith(" ")) {
        sb += " ";
      }
      sb += this.VectorToStringCustom(
        node.Body,
        {
          IndentLevel: formatState.IndentLevel + 1,
          Config: formatState.Config
        },
        `${this.SyntaxConfig.KnotSpecialPrefixStr}${this.SyntaxConfig.KnotBlockStartStr} `,
        ` ${this.SyntaxConfig.KnotBlockEndStr}`
      );
    }


    if (node.NamedBlock && Object.keys(node.NamedBlock).length > 0) {
      for (const [key, value] of Object.entries(node.NamedBlock)) {
        if (formatState.Config.KnotAttrMultiLine) {
          sb += `\n${innerIndent}`;
        }
        else if (!sb.endsWith(" ")) {
          sb += " ";
        }
        const tag: string = key;
        const valueStr: string = this.VectorToStringCustom(
          value,
          {
            IndentLevel: formatState.IndentLevel + 1,
            Config: formatState.Config
          },
          `${this.SyntaxConfig.KnotBlockStartStr}`,
          this.SyntaxConfig.KnotBlockEndStr
        );
        sb += `${this.SyntaxConfig.KnotSpecialPrefixStr}${tag} ${this.SyntaxConfig.KnotMetadataSeparatorStr} ${valueStr}`;
      }
    }

    if (node.Sections && Object.keys(node.Sections).length > 0) {
      for (const [key, value] of Object.entries(node.Sections)) {
        if (!sb.endsWith(" ")) {
          sb += " ";
        }
        const valueStr: string = this.VectorToStringCustom(
          value,
          {
            IndentLevel: formatState.IndentLevel + 1,
            Config: formatState.Config
          },
          this.SyntaxConfig.KnotBlockStartStr,
          this.SyntaxConfig.KnotBlockEndStr
        );
        sb += `${this.SyntaxConfig.KnotSpecialPrefixStr}${key} ${this.SyntaxConfig.KnotMetadataSeparatorStr} ${valueStr}`;
      }
    }

    if (node.Slots && Object.keys(node.Slots).length > 0) {
      for (const [key, value] of Object.entries(node.Slots)) {
        if (!sb.endsWith(" ")) {
          sb += " ";
        }
        const valueStr = this.NodeToString(
          value,
          {
            IndentLevel: formatState.IndentLevel + 1,
            Config: formatState.Config,
            IndentKnotCore: true
          }
        );
        sb += `${this.SyntaxConfig.KnotSpecialPrefixStr}${key} ${this.SyntaxConfig.KnotMetadataSeparatorStr} ${valueStr}`;
      }
    }

    return sb;
  }

  private TupleValuesToString(tuple: KnTuple): string {
    if (!tuple.IsTupleRows()) {
      return ((tuple as KnTuple).RawValue as any[])
        .filter(item => item != null)
        .map(item => this.Stringify(item, false))
        .join(" ");
    }

    const values: any[] = [];
    for (const item of tuple.RawValue) {
      const rawValue = item[2];
      if (Array.isArray(rawValue)) {
        values.push(...rawValue);
      } else {
        values.push(rawValue);
      }
    }

    return values
      .filter(item => item != null)
      .map(item => this.Stringify(item, false))
      .join(" ");
  }

  private InOutTableToString(tuple: KnTuple): string {
    const inputs = tuple.RawValue[0]?.[2] ?? [];
    const outputs = tuple.RawValue[1]?.[2] ?? [];
    const inputStr = inputs.map(item => this.Stringify(item, false)).join(" ");
    const outputStr = outputs.map(item => this.Stringify(item, false)).join(" ");
    if (!(tuple as any).HasOutputMarker) {
      return `|${inputStr}|`;
    }
    return `|${inputStr}${inputStr && outputStr ? " " : ""}->${outputStr ? " " + outputStr : ""}|`;
  }
}
