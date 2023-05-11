import { KnNodeType } from "../Model/KnType";
import { NodeHelper } from "../Util/NodeHelper";
import { FormatConfig } from "./FormatConfig";
import { FormatState } from "./FormatState";
import { StringExt } from "../Util/StringExt";
import { SyntaxConfig } from "../Converter/SyntaxConfig";
import { KnKnot } from "../Model/KnKnot";
import { KnWord } from "../Model/KnWord";

export class KnFormatter {
  public static Stringify(node, prettify = true) {
    if (prettify) {
      return KnFormatter.NodeToString(node, new FormatState(0, FormatConfig.PrettifyConfig));
    }
    else {
      return KnFormatter.NodeToString(node, new FormatState(0, FormatConfig.SingleLineConfig));
    }
  }

  public static NodeToString(node, formatState) {
    if (node == null) {
      return "nil";
    }
    let knType = NodeHelper.GetType(node);
    if (knType === KnNodeType.KnUkn) {
      return "ukn";
    }
    else if (knType === KnNodeType.KnMap) {
      return KnFormatter.MapToString(node, formatState);
    }
    else if (knType === KnNodeType.KnVector) {
      return KnFormatter.VectorToString(node, formatState);
    }
    else if (knType === KnNodeType.KnKnot) {
      return KnFormatter.KnotToString(node, formatState);
    }
    else if (knType === KnNodeType.KnWord) {
      return KnFormatter.WordToString(node, formatState);
    }
    else if (knType === KnNodeType.KnSymbol) {
      return KnFormatter.SymbolToString(node, formatState);
    }
    else if (knType === KnNodeType.KnProperty) {
      return KnFormatter.PropertyToString(node, formatState);
    }
    else if (knType === KnNodeType.KnSubscript) {
      return KnFormatter.SubscriptToString(node, formatState);
    }
    else if (knType === KnNodeType.KnCloseQuote) {
      return KnFormatter.CloseQuoteToString(node, formatState);
    }
    else if (knType === KnNodeType.KnQuasiQuote) {
      return KnFormatter.QuasiquoteToString(node, formatState);
    }
    else if (knType === KnNodeType.KnUnquoteReplace) {
      return KnFormatter.UnquoteReplaceToString(node, formatState);
    }
    else if (knType === KnNodeType.KnUnquoteExpand) {
      return KnFormatter.UnquoteExpandToString(node, formatState);
    }
    else if (knType === KnNodeType.KnString) {
      return JSON.stringify(node);
    }
    else if (knType === KnNodeType.KnNumber) {
      return node.toString();
    }
    else if (knType === KnNodeType.KnBoolean) {
      return node.toString();
    }
    else if (knType === KnNodeType.KnNil) {
      return "nil";
    }
    else {
      return "[NotSupported]"
    }
  }

  public static WordToString(node, formatState) {
    return KnFormatter.WordToStringCustom(node, formatState, "");
  }

  public static SymbolToString(node, formatState) {
    return KnFormatter.WordToStringCustom(node, formatState, "$");
  }

  public static PropertyToString(node, formatState) {
    return KnFormatter.WordToStringCustom(node, formatState, ".");
  }

  public static WordToStringCustom(node : KnWord, formatState, prefix) {
    let joiner = " ";
    let containerIndent = "";
    if (formatState.Config.VectorMultiLine) {
        joiner = "\n";
        containerIndent = StringExt.Repeat(formatState.Config.IndentString, formatState.IndentLevel + 1);
    }
    
    let annotationStr = "";
    let flagStr = "";
    let modifiersStr = "";
    let defStr = "";
    let complementsStr = "";
    if (node.Annotations != null && node.Annotations.length > 0) {
      let prefixes = []
      for (let i = 0; i < node.Annotations.length; i++) {
        let prefixItemStr = KnFormatter.NodeToString(
          node.Annotations[i],
          new FormatState(
            (formatState.IndentLevel),
            FormatConfig.MultiLineConfig,
          )
        );
        prefixes.push(SyntaxConfig.PrefixStr + prefixItemStr);
      }
      annotationStr = StringExt.Join(prefixes, "\n");
      annotationStr += "\n";
    }
    if (node.Flags != null && node.Flags.length > 0) {
      let flags = []
      for (let i = 0; i < node.Flags.length; i++) {
        flags.push(SyntaxConfig.PrefixStr + node.Flags[i].Value);
      }
      flagStr = StringExt.Join(flags, " ");
      flagStr += " ";
    }
    if (node.Modifiers != null && node.Modifiers.length > 0) {
      modifiersStr = KnFormatter.VectorToStringCustom(
        node.Modifiers,
        new FormatState(
          (formatState.IndentLevel),
          FormatConfig.SingleLineConfig,
        ),
        `${SyntaxConfig.PrefixStr}{`, `}`);
    }
    if (node.Definition != null) {
      defStr += " ~";
      defStr += KnFormatter.NodeToString(
        node.Definition,
        new FormatState(
          (formatState.IndentLevel + 1),
          FormatConfig.SingleLineConfig,
        )
      );
    }
    if (node.Complements != null && node.Complements.length > 0) {
      let complementStrList = []
      for (let i = 0; i < node.Complements.length; i++) {
        let complementItemStr = KnFormatter.NodeToString(
          node.Complements[i],
          new FormatState(
            (formatState.IndentLevel + 1),
            FormatConfig.SingleLineConfig,
          )
        );
        complementStrList.push(SyntaxConfig.SuffixComplementStr + complementItemStr);
      }
      complementsStr = StringExt.Join(complementStrList, " ");
      complementsStr = ` ${complementsStr}`;
    }
    return `${annotationStr}${flagStr}${modifiersStr}${prefix}${node.Value}${defStr}${complementsStr}`;
  }

  public static SubscriptToString(node, formatState) {
    let innerValStr = KnFormatter.NodeToString(
      node.Value,
      new FormatState(
        (formatState.IndentLevel),
        FormatConfig.SingleLineConfig,
      )
    );
    return `.:${innerValStr}`;
  }

  public static CloseQuoteToString(node, formatState) {
    let innerValStr = KnFormatter.NodeToString(
      node.Value,
      new FormatState(
        (formatState.IndentLevel),
        FormatConfig.SingleLineConfig,
      )
    );
    return `@${innerValStr}`;
  }

  public static QuasiquoteToString(node, formatState) {
    let innerValStr = KnFormatter.NodeToString(
      node.Value,
      new FormatState(
        (formatState.IndentLevel),
        FormatConfig.SingleLineConfig,
      )
    );
    return `\`${innerValStr}`;
  }

  public static UnquoteReplaceToString(node, formatState) {
    let innerValStr = KnFormatter.NodeToString(
      node.Value,
      new FormatState(
        (formatState.IndentLevel),
        FormatConfig.SingleLineConfig,
      )
    );
    return `,${innerValStr}`;
  }

  public static UnquoteExpandToString(node, formatState) {
    let innerValStr = KnFormatter.NodeToString(
      node.Value,
      new FormatState(
        (formatState.IndentLevel),
        FormatConfig.SingleLineConfig,
      )
    );
    return `..${innerValStr}`;
  }

  public static MapToString(node, formatState) {
    return KnFormatter.MapToStringCustom(
      node, formatState, SyntaxConfig.MapStartStr, SyntaxConfig.MapEndStr);
  }

  public static MapToStringCustom(node, formatState, preffix, suffix) {
    let inner = KnFormatter.MapFormatInner(node, formatState);
    let sb: string = "";
    if (formatState.Config.MapMultiLine) {
      let containerIndent = StringExt.Repeat(formatState.Config.IndentString, formatState.IndentLevel);
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
    else {
      sb = `${preffix}${inner}${suffix}`;
      return sb;
    }
  }

  public static MapFormatInner(node, formatState : FormatState) {
    let pairsJoiner = " ";
    let keyValueJoiner = " " + SyntaxConfig.MapPairSeperatorStr;
    let valueTagAndValueJoiner = " ";
    let keyIndent = "";
    let valueIndent = "";
    if (formatState.Config.MapMultiLine) {
      pairsJoiner = "\n";
      valueTagAndValueJoiner = "\n";
      keyIndent = StringExt.Repeat(formatState.Config.IndentString, formatState.IndentLevel);
      valueIndent = StringExt.Repeat(formatState.Config.IndentString, formatState.IndentLevel + 1);
    }
    let innerStringList : string[] = [];
    for (let key in node) {
      let value = node[key];
      let innerValStr = KnFormatter.NodeToString(
        value,
        new FormatState(
          (formatState.IndentLevel + 1),
          formatState.Config,
        )
      );
      let pairStr = `${keyIndent}${key}${keyValueJoiner}${valueTagAndValueJoiner}${valueIndent}${innerValStr}`;
      innerStringList.push(pairStr);
    }
    let r = StringExt.Join(innerStringList, pairsJoiner);
    return r;
  }

  public static VectorToString(node, formatState: FormatState) {
    return KnFormatter.VectorToStringCustom(
      node, formatState, SyntaxConfig.VectorStartStr, SyntaxConfig.VectorEndStr);
  }

  public static VectorToStringCustom(node, formatState: FormatState, preffix, suffix) {
    let sb : string = "";
    let inner = KnFormatter.VectorFormatInner(node, formatState);
    if (formatState.Config.VectorMultiLine) {
      let containerIndent = StringExt.Repeat(formatState.Config.IndentString, formatState.IndentLevel);
      sb += preffix;
      sb += "\n";
      sb += inner;
      if (node.length > 0) {
          sb += "\n";
      }
      sb += containerIndent;
      sb += suffix;
      return sb;
    }
    else {
      sb = `${preffix}${inner}${suffix}`;
      return sb;
    }
  }

  public static VectorFormatInner(node, formatState : FormatState) {
    let joiner = " ";
    let containerIndent = "";
    if (formatState.Config.VectorMultiLine) {
        joiner = "\n";
        containerIndent = StringExt.Repeat(formatState.Config.IndentString, formatState.IndentLevel + 1);
    }
    let sb = "";
    let innerStringList : string[] = [];
    for (let i = 0; i < node.length; i++) {
      let innerStr: string = KnFormatter.NodeToString(
        node[i],
        new FormatState(
          (formatState.IndentLevel + 1),
          formatState.Config
        )
      );
      innerStringList.push(containerIndent + innerStr);
    }
    let r = StringExt.Join(innerStringList, joiner);
    return r;
  }

  public static KnotToString(node: KnKnot, formatState: FormatState) {
    let containerIndent = StringExt.Repeat(formatState.Config.IndentString, formatState.IndentLevel);
    let innerIndent = StringExt.Repeat(formatState.Config.IndentString, formatState.IndentLevel + 1);

    let annotationStr = "";
    let flagStr = "";
    let modifiersStr = "";
    let hasDataPrefix = node.IsData ? "$" : "";
    let beforeKnotEndTokenStr = "";

    if (node.Flags != null && node.Flags.length > 0) {
      let flags = []
      for (let i = 0; i < node.Flags.length; i++) {
        flags.push(SyntaxConfig.PrefixStr + node.Flags[i].Value);
      }
      flagStr = StringExt.Join(flags, " ");
    }

    if (node.Annotations != null && node.Annotations.length > 0) {
      let prefixes = []
      for (let i = 0; i < node.Annotations.length; i++) {
        let prefixItemStr = KnFormatter.NodeToString(
          node.Annotations[i],
          new FormatState(
            (formatState.IndentLevel),
            FormatConfig.SingleLineConfig,
          )
        );
        prefixes.push(SyntaxConfig.PrefixStr + prefixItemStr);
      }
      annotationStr = StringExt.Join(prefixes, "\n");
      annotationStr += "\n";
    }
    
    if (node.Modifiers != null && node.Modifiers.length > 0) {
      modifiersStr = KnFormatter.VectorToStringCustom(
        node.Modifiers,
        new FormatState(
          (formatState.IndentLevel + 1),
          FormatConfig.SingleLineConfig,
        ),
        `\n${containerIndent}${SyntaxConfig.PrefixStr}{`, `}\n`);
    }
    let inner = "";

    if (formatState.Config.PrettyExpr) {
      inner = KnFormatter.KnotFormatInner(node, new FormatState(
        formatState.IndentLevel,
        FormatConfig.ExprInnerConfig
      ));
      beforeKnotEndTokenStr = inner.indexOf("\n") > 0 ? `\n${containerIndent}` : '';
    }
    else {
      inner = KnFormatter.KnotFormatInner(node, new FormatState(
        formatState.IndentLevel,
        FormatConfig.SingleLineConfig
      ));
    }
    return `${annotationStr}${flagStr}${modifiersStr}${hasDataPrefix}${SyntaxConfig.KnotStartStr}${inner}${beforeKnotEndTokenStr}${SyntaxConfig.KnotEndStr}`;
  }

  public static KnotFormatInner(node, formatState : FormatState) {
    let containerIndent = StringExt.Repeat(formatState.Config.IndentString, formatState.IndentLevel);
    let innerIndent = StringExt.Repeat(formatState.Config.IndentString, formatState.IndentLevel + 1);

    let iter = node;

    let sb = '';
    while (iter != null) {
      let currentNode = iter as KnKnot;
      let segmentStr = KnFormatter.KnotFormatSegment(currentNode, formatState);
      sb += segmentStr;
      if (KnKnot.HasNext(currentNode)) {
        let isSegmentStrHasNewline = segmentStr.indexOf("\n") > 0;
        if (isSegmentStrHasNewline) {
          sb += `\n${innerIndent}`;
        } else {
        // } else if ((currentNode.Next as KnKnot).IsCoreSingleLine() && formatState.Config.PrettyExpr) {
          sb += ' ';
        }
      }
      iter = iter.Next;
    }
    
    let r = sb;
    return r;
  }

  public static KnotFormatSegment(node : KnKnot, formatState : FormatState) {
    let containerIndent = StringExt.Repeat(formatState.Config.IndentString, formatState.IndentLevel);
    let innerIndent = StringExt.Repeat(formatState.Config.IndentString, formatState.IndentLevel + 1);

    let sb = '';
    if (node.Core != null) {
      let coreType = NodeHelper.GetType(node.Core);
      if (coreType == KnNodeType.KnMap || coreType == KnNodeType.KnVector 
        || (coreType == KnNodeType.KnKnot && (node.Core as KnKnot).IsData === true)) {
        sb += "$";
      }
      let isCoreSingleLine = KnKnot.IsCoreSingleLine(node);
      let formatCoreConfig = isCoreSingleLine ? FormatConfig.SingleLineConfig : FormatConfig.MultiLineConfig;
      let coreStr : string = KnFormatter.NodeToString(
        node.Core,
        new FormatState(
          (formatState.IndentLevel + 1),
          formatCoreConfig,
        )
      );
      sb += coreStr;
    }

    if (node.TypeParam != null) {
      if (!sb.endsWith(" ")) {
        sb += " ";
      }
      let paramStr = KnFormatter.VectorToStringCustom(
        node.TypeParam,
        new FormatState(
          (formatState.IndentLevel + 1),
          FormatConfig.SingleLineConfig,
        ),
        `${SyntaxConfig.PrefixTypeStr}${SyntaxConfig.KnotTypeParamBeginStr}`,
        `${SyntaxConfig.KnotTypeParamEndStr}`);
      sb += paramStr;
    }

    if (node.ContextParam != null) {
      if (!sb.endsWith(" ")) {
        sb += " ";
      }
      let paramStr = KnFormatter.VectorToStringCustom(
        node.ContextParam,
        new FormatState(
          (formatState.IndentLevel + 1),
          FormatConfig.SingleLineConfig,
        ),
        `${SyntaxConfig.PrefixStr}${SyntaxConfig.KnotContextParamBeginStr}`,
        `${SyntaxConfig.KnotContextParamEndStr}`);
      sb += paramStr;
    }

    if (node.SegmentStop === true) {
      sb += ';';
    }
    else if (node.Param != null) {
      if (!sb.endsWith(" ")) {
        sb += " ";
      }
      let paramStr : string = KnFormatter.VectorToStringCustom(
        node.Param,
        new FormatState(
          (formatState.IndentLevel + 1),
          FormatConfig.SingleLineConfig,
        ),
        SyntaxConfig.KnotParamBeginStr, SyntaxConfig.KnotParamEndStr
      );
      sb += paramStr;
    }

    if (node.Definition != null) {
      let definitionStr = KnFormatter.NodeToString(
        node.Definition,
        new FormatState(
          (formatState.IndentLevel),
          FormatConfig.SingleLineConfig,
        )
      );
      sb += ` ~${definitionStr}`;
    }

    if (node.Complements != null && node.Complements.length > 0) {
      let complementStrList = []
      for (let i = 0; i < node.Complements.length; i++) {
        let complementItemStr = KnFormatter.NodeToString(
          node.Complements[i],
          new FormatState(
            (formatState.IndentLevel + 1),
            FormatConfig.SingleLineConfig,
          )
        );
        complementStrList.push(SyntaxConfig.SuffixComplementStr + complementItemStr);
      }
      let complementsStr = StringExt.Join(complementStrList, " ");
      sb += ` ${complementsStr}`;
    }

    if (node.Attr != null) {
      if (formatState.Config.KnotAttrMultiLine) {
        sb += `\n${innerIndent}`;
      }
      else if (!sb.endsWith(" ")) {
        sb += " ";
      }

      let attrStr = KnFormatter.MapToStringCustom(
        node.Attr,
        new FormatState(
          (formatState.IndentLevel + 1),
          formatState.Config,
        ),
        SyntaxConfig.KnotAttrStartStr, SyntaxConfig.KnotAttrEndStr
      );

      sb += attrStr;
    }

    if (node.Block != null) {
      if (!sb.endsWith(" ")) {
        sb += " ";
      }

      let blockStr : string = KnFormatter.VectorToStringCustom(
        node.Block,
        new FormatState(
          (formatState.IndentLevel + 1),
          formatState.Config,
        ),
        SyntaxConfig.KnotBlockStartStr, SyntaxConfig.KnotBlockEndStr
      );
      sb += blockStr;
    }
    return sb;
  }
}