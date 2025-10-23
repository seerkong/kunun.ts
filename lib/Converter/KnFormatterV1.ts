import { KnNodeHelper } from "../Util/KnNodeHelper";
import { FormatConfig } from "./FormatConfig";
import { FormatState } from "./FormatState";
import { SyntaxConfig } from "./SyntaxConfig";
import { KnNodeType } from "../Model/KnNodeType";
import { KnOrderedMap } from "../Model/KnOrderedMap";
import { KnTuple } from "../Model/KnTuple";
import { KnKnot, KnotCallType } from "../Model/KnKnot";
import { KnWord } from "../Model/KnWord";
import { KnSymbol } from "../Model/KnSymbol";
import { KnRawString } from "../Model/KnRawString";
import { KnQualifiedIdentifier } from "../Model/KnQualifiedIdentifier";
import { KnActionWrapper } from "../Model/KnActionWrapper";
import { KnQuoteWrapper } from "../Model/KnQuoteWrapper";
import { KnWrapper } from "../Model/KnWrapper";
import { KnModifierGroup } from "../Model/KnModifierGroup";

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

    throw new Error("not supported type" + knType);
  }

  public WrapperToString(wrapper: KnWrapper, prefix: string, formatState: FormatState): string {
    const typeStr = this.WordToString(wrapper.Kind, formatState);
    const valueStr = this.NodeToString(wrapper.Inner, formatState);
    return `${prefix}${typeStr},${valueStr}`;
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
    if (node.Qualifiers && node.Qualifiers.length > 0) {
      qualifiersStr = node.Qualifiers.join(".") + ".";
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

    const tableValues: [string, any[], any][] = node.RawValue;

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
        sb += segmentJoiner;
      }

      iter = currentNode.Next;
    }

    return sb;
  }

  public GetCallTypeStr(callType: KnotCallType): string {
    switch (callType) {
      case KnotCallType.PrefixCall:
        return this.SyntaxConfig.KnotPrefixTypeStr;
      case KnotCallType.InfixCall:
        return this.SyntaxConfig.KnotSpecialPrefixStr;
      case KnotCallType.PostfixCall:
        return this.SyntaxConfig.KnotPostfixTypeStr;
      case KnotCallType.Assignment:
        return "= ";
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

    if (node.Params) {
      if (node.CallType != null) {
        let canOmitCallParamEnd = node.CouldOmitCallParamEnd();
        let paramHeadStr = (node.Params.RawValue.length == 0)
          ? ""
          : " ";
        let paramTailStr = canOmitCallParamEnd
          ? ""
          : this.SyntaxConfig.KnotCallParamEndStr;
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

      const attrStr: string = this.MapToStringCustom(
        node.Attr,
        {
          IndentLevel: formatState.IndentLevel + 1,
          Config: formatState.Config
        },
        `${this.SyntaxConfig.KnotSpecialPrefixStr}${this.SyntaxConfig.UnorderedMapStartStr}`,
        this.SyntaxConfig.UnorderedMapEndStr
      );

      sb += attrStr;

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

    return sb;
  }
}