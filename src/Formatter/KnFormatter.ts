import { KnType } from "../Model/KnType";
import { NodeHelper } from "../Util/NodeHelper";
import { FormatConfig } from "./FormatConfig";
import { FormatState } from "./FormatState";
import { StringExt } from "../Util/StringExt";
import { FormatContextType } from "./FormatContextType";
import { SyntaxConfig } from "../Converter/SyntaxConfig";
import { KnKnot } from "Model/KnKnot";

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
    if (knType === KnType.Unknown) {
      return "ukn";
    }
    else if (knType === KnType.Map) {
      return KnFormatter.MapToString(node, formatState);
    }
    else if (knType === KnType.Vector) {
      return KnFormatter.VectorToString(node, formatState);
    }
    else if (knType === KnType.Knot) {
      return KnFormatter.KnotToString(node, formatState);
    }
    else if (knType === KnType.Word) {
      return KnFormatter.WordToString(node, formatState);
    }
    else if (knType === KnType.Symbol) {
      return KnFormatter.SymbolToString(node, formatState);
    }
    else if (knType === KnType.Property) {
      return KnFormatter.PropertyToString(node, formatState);
    }
    else if (knType === KnType.Subscript) {
      return KnFormatter.SubscriptToString(node, formatState);
    }
    else if (knType === KnType.Quote) {
      return KnFormatter.Quote(node, formatState);
    }
    else if (knType === KnType.Quasiquote) {
      return KnFormatter.Quasiquote(node, formatState);
    }
    else if (knType === KnType.Unquote) {
      return KnFormatter.Unquote(node, formatState);
    }
    else if (knType === KnType.UnquoteSplicing) {
      return KnFormatter.UnquoteSplicing(node, formatState);
    }
    else if (knType === KnType.String) {
      return `"${node.toString()}"`;
    }
    else if (knType === KnType.Number) {
      return node.toString();
    }
    else if (knType === KnType.Boolean) {
      return node.toString();
    }
    else if (knType === KnType.Nil) {
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

  public static WordToStringCustom(node, formatState, prefix) {
    let annotationStr = "";
    let flagStr = "";
    let namespaceStr = "";
    let defStr = "";
    let suffixStr = "";
    if (node.Annotations != null) {
      let prefixes = []
      for (let i = 0; i < node.Annotations.length; i++) {
        let prefixItemStr = KnFormatter.NodeToString(
          node.Annotations[i],
          new FormatState(
            (formatState.IndentLevel),
            FormatConfig.MultiLineConfig,
            FormatContextType.Other
          )
        );
        prefixes.push(SyntaxConfig.PrefixStr + prefixItemStr);
      }
      annotationStr = StringExt.Join(prefixes, "\n");
      annotationStr += "\n";
    }
    if (node.Flags != null) {
      let flags = []
      for (let i = 0; i < node.Flags.length; i++) {
        flags.push(SyntaxConfig.PrefixStr + node.Flags[i]);
      }
      flagStr = StringExt.Join(flags, " ");
      flagStr += " ";
    }
    if (node.Definition != null) {
      defStr += " ~";
      defStr += KnFormatter.NodeToString(
        node.Definition,
        new FormatState(
          (formatState.IndentLevel),
          FormatConfig.SingleLineConfig,
          FormatContextType.KnotParam
        )
      );
      defStr += " ";
    }
    if (node.Suffixes != null) {
      suffixStr += " ";
      let suffixes = []
      for (let i = 0; i < node.Suffixes.length; i++) {
        let suffixItemStr = KnFormatter.NodeToString(
          node.Suffixes[i],
          new FormatState(
            (formatState.IndentLevel),
            FormatConfig.SingleLineConfig,
            FormatContextType.KnotParam
          )
        );
        suffixes.push("~" + suffixItemStr);
      }
      suffixStr += StringExt.Join(suffixes, " ");
      suffixStr += " ";
    }
    return `${annotationStr}${flagStr}${namespaceStr}${prefix}${node.Value}${defStr}${suffixStr}`;
  }

  public static SubscriptToString(node, formatState) {
    let innerValStr = KnFormatter.NodeToString(
      node.Value,
      new FormatState(
        (formatState.IndentLevel),
        FormatConfig.SingleLineConfig,
        FormatContextType.KnotParam
      )
    );
    return `.:${innerValStr}`;
  }

  public static Quote(node, formatState) {
    let innerValStr = KnFormatter.NodeToString(
      node.Value,
      new FormatState(
        (formatState.IndentLevel),
        FormatConfig.SingleLineConfig,
        FormatContextType.KnotParam
      )
    );
    return `@${innerValStr}`;
  }

  public static Quasiquote(node, formatState) {
    let innerValStr = KnFormatter.NodeToString(
      node.Value,
      new FormatState(
        (formatState.IndentLevel),
        FormatConfig.SingleLineConfig,
        FormatContextType.KnotParam
      )
    );
    return `\`${innerValStr}`;
  }

  public static Unquote(node, formatState) {
    let innerValStr = KnFormatter.NodeToString(
      node.Value,
      new FormatState(
        (formatState.IndentLevel),
        FormatConfig.SingleLineConfig,
        FormatContextType.KnotParam
      )
    );
    return `,${innerValStr}`;
  }

  public static UnquoteSplicing(node, formatState) {
    let innerValStr = KnFormatter.NodeToString(
      node.Value,
      new FormatState(
        (formatState.IndentLevel),
        FormatConfig.SingleLineConfig,
        FormatContextType.KnotParam
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
    let keyValueJoiner = SyntaxConfig.MapPairSeperatorStr + " ";
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
          FormatContextType.Other
        )
      );
      // let pairStr = `${keyIndent}${key}${keyValueJoiner}${valueTagAndValueJoiner}${valueIndent}${innerValStr}`;
      let pairStr = `${keyIndent}${key}${valueTagAndValueJoiner}${keyIndent}${keyValueJoiner}${innerValStr}`;
      
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
          formatState.Config,
          formatState.ContextType
        )
      );
      innerStringList.push(containerIndent + innerStr);
    }
    let r = StringExt.Join(innerStringList, joiner);
    return r;
  }

  public static KnotToString(node: KnKnot, formatState: FormatState) {

    let annotationStr = "";
    let flagStr = "";
    if (node.Annotations != null) {
      let prefixes = []
      for (let i = 0; i < node.Annotations.length; i++) {
        let prefixItemStr = KnFormatter.NodeToString(
          node.Annotations[i],
          new FormatState(
            (formatState.IndentLevel),
            FormatConfig.MultiLineConfig,
            FormatContextType.Other
          )
        );
        prefixes.push(SyntaxConfig.PrefixStr + prefixItemStr);
      }
      annotationStr = StringExt.Join(prefixes, "\n");
      annotationStr += "\n";
    }
    if (node.Flags != null) {
      let flags = []
      for (let i = 0; i < node.Flags.length; i++) {
        flags.push(SyntaxConfig.PrefixStr + node.Flags[i]);
      }
      flagStr = StringExt.Join(flags, " ");
      flagStr += "\n";
    }

    if (formatState.Config.PrettyExpr) {
      let inner = KnFormatter.KnotFormatInner(node, new FormatState(
        formatState.IndentLevel,
        FormatConfig.ExprInnerConfig,
        formatState.ContextType
      ));

      let containerIndent = StringExt.Repeat(formatState.Config.IndentString, formatState.IndentLevel);
      let sb : string = "";
      sb += annotationStr;
      sb += flagStr;
      if (node.IsData === true) {
        sb += "$";
      }
      sb += SyntaxConfig.KnotStartStr;
      sb += inner;
      // sb += "\n";
      // sb += containerIndent;
      sb += SyntaxConfig.KnotEndStr;
      return sb;
    }
    else {
      let inner = KnFormatter.KnotFormatInner(node, new FormatState(
        formatState.IndentLevel,
        FormatConfig.SingleLineConfig,
        formatState.ContextType
      ));
      return `${annotationStr}${flagStr}${SyntaxConfig.KnotStartStr}${inner}${SyntaxConfig.KnotEndStr}`;
    }
  }

  public static KnotFormatInner(node, formatState : FormatState) {
    let joiner = "";
    let innerStringList : string[] = [];
    
    let iter = node;
    while (iter != null) {
      innerStringList.push(
        KnFormatter.KnotFormatSegment(iter, formatState)
      );
      iter = iter.Next;
    }
    
    let r = StringExt.Join(innerStringList, joiner);
    return r;
  }

  public static KnotFormatSegment(node : KnKnot, formatState : FormatState) {
    let containerIndent = StringExt.Repeat(formatState.Config.IndentString, formatState.IndentLevel);
    let innerIndent = StringExt.Repeat(formatState.Config.IndentString, formatState.IndentLevel + 1);

    let sb = "";
    if (node.Core != null) {
      if (sb !== '' && !sb.endsWith(" ")) {
        sb += " ";
      }
      let coreType = NodeHelper.GetType(node.Core);
      if (coreType == KnType.Map || coreType == KnType.Vector 
        || coreType == KnType.Knot) {
        sb += "$";
      }
      let isCoreMultiLine = formatState.Config.KnotCoreMultiLine;
      let coreStr : string = KnFormatter.NodeToString(
        node.Core,
        new FormatState(
          (formatState.IndentLevel + 1),
          formatState.Config,
          FormatContextType.KnotCore
        )
      );
      sb += coreStr;
      if (coreType == KnType.Map || coreType == KnType.Vector
        || coreType == KnType.Knot) {
        sb += `\n${containerIndent}`;
      }
    }

    if (node.ContextParam != null) {
      if (!sb.endsWith(" ")) {
        sb += " ";
      }
      let paramStr : string = KnFormatter.VectorFormatInner(
        node.ContextParam,
        new FormatState(
          0,
          FormatConfig.SingleLineConfig,
          FormatContextType.KnotParam
        )
      );
      sb += `${SyntaxConfig.PrefixStr}${SyntaxConfig.KnotTypeParamBeginStr}${paramStr}${SyntaxConfig.KnotTypeParamEndStr}`;
    }

    if (node.DoApply === true) {
      sb += ';';
    }
    else if (node.Param != null) {
      if (!sb.endsWith(" ")) {
        sb += " ";
      }
      let paramStr : string = KnFormatter.VectorToStringCustom(
        node.Param,
        new FormatState(
          0,
          FormatConfig.SingleLineConfig,
          FormatContextType.KnotParam
        ),
        SyntaxConfig.KnotParamBeginStr, SyntaxConfig.KnotParamEndStr
      );
      sb += paramStr;
    }

    if (node.Definition != null) {
      if (!sb.endsWith(" ")) {
        sb += " ";
      }
      let defStr : string = KnFormatter.NodeToString(
        node.Definition,
        new FormatState(
          0,
          FormatConfig.SingleLineConfig,
          FormatContextType.KnotParam
        )
      );
      sb += `~${defStr}`
    }

    if (node.Refinements != null) {
      for (let i = 0; i < node.Refinements.length; i++) {
        if (!sb.endsWith(" ")) {
          sb += " ";
        }
        let refinementsStr : string = KnFormatter.NodeToString(
          node.Refinements[i],
          new FormatState(
            0,
            FormatConfig.SingleLineConfig,
            FormatContextType.KnotParam
          )
        );
        sb += `<${refinementsStr}>`
      }
    }

    if (node.Header != null) {
      if (formatState.Config.KnotHeaderMultiLine) {
        sb += `\n${innerIndent}`;
      }
      else if (!sb.endsWith(" ")) {
        sb += " ";
      }

      let headerStr = KnFormatter.MapToStringCustom(
        node.Header,
        new FormatState(
          (formatState.IndentLevel + 1),
          formatState.Config,
          FormatContextType.KnotHeader
        ),
        SyntaxConfig.KnotHeaderStartStr, SyntaxConfig.KnotHeaderEndStr
      );

      sb += headerStr;
      // sb += `\n${containerIndent}`
    }

    if (node.Body != null) {
      sb += " ";
      // if (formatState.Config.KnotBodyMultiLine) {
      //   sb += `\n${innerIndent}`;
      // }
      // else if (!sb.endsWith(" ")) {
      //   sb += " ";
      // }

      let bodyStr : string = KnFormatter.VectorToStringCustom(
        node.Body,
        new FormatState(
          (formatState.IndentLevel + 1),
          formatState.Config,
          FormatContextType.KnotBody
        ),
        SyntaxConfig.KnotBodyStartStr, SyntaxConfig.KnotBodyEndStr
      );
      sb += bodyStr;
      sb += `\n${containerIndent}`
    }
    if (node.Next != null) {
      // indent for nodes after block
      if (node.Body != null) {
        sb += innerIndent;
      }
      else if (FormatContextType.KnotParam == formatState.ContextType) {
        sb += " ";
      }
      else {
        sb += innerIndent;
      }
    }
    return sb;
  }
}