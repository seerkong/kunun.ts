// ../core/lib/Model/KnNodeType.ts
var KnNodeType;
((KnNodeType2) => {
  KnNodeType2["Nil"] = "Nil";
  KnNodeType2["Unknown"] = "Unknown";
  KnNodeType2["Undefined"] = "Undefined";
  KnNodeType2["Boolean"] = "Boolean";
  KnNodeType2["Double"] = "Double";
  KnNodeType2["Integer"] = "Integer";
  KnNodeType2["Number"] = "Number";
  KnNodeType2["Word"] = "Word";
  KnNodeType2["Symbol"] = "Symbol";
  KnNodeType2["RawString"] = "RawString";
  KnNodeType2["InterpolatedString"] = "InterpolatedString";
  KnNodeType2["String"] = "String";
  KnNodeType2["UnorderedMap"] = "UnorderedMap";
  KnNodeType2["OrderedMap"] = "OrderedMap";
  KnNodeType2["Vector"] = "Vector";
  KnNodeType2["Tuple"] = "Tuple";
  KnNodeType2["Knot"] = "Knot";
  KnNodeType2["SyntaxMarcro"] = "SyntaxMarcro";
  KnNodeType2["ActionMarcro"] = "ActionMarcro";
  KnNodeType2["QuoteMarcro"] = "QuoteMarcro";
  KnNodeType2["QuasiQuote"] = "QuasiQuote";
  KnNodeType2["Unquote"] = "Unquote";
  KnNodeType2["UnquoteSplice"] = "UnquoteSplice";
  KnNodeType2["UnquoteMap"] = "UnquoteMap";
  KnNodeType2["RowSpread"] = "RowSpread";
  KnNodeType2["PrefixMarcro"] = "PrefixMarcro";
  KnNodeType2["PostfixMarcro"] = "PostfixMarcro";
  KnNodeType2["Property"] = "Property";
  KnNodeType2["Subscript"] = "Subscript";
  KnNodeType2["Continuation"] = "Continuation";
  KnNodeType2["OperandStack"] = "OperandStack";
  KnNodeType2["HostAsyncDelegate"] = "HostAsyncDelegate";
  KnNodeType2["HostSyncDelegate"] = "HostSyncDelegate";
  KnNodeType2["HostAsyncFunc"] = "HostAsyncFunc";
  KnNodeType2["HostSyncFunc"] = "HostSyncFunc";
  KnNodeType2["HostSyncMethodDelegate"] = "HostSyncMethodDelegate";
  KnNodeType2["HostStackFunction"] = "HostStackFunction";
  KnNodeType2["Procedure"] = "Procedure";
  KnNodeType2["Lambda"] = "Lambda";
  KnNodeType2["Table"] = "Table";
  KnNodeType2["TableMetadata"] = "TableMetadata";
  KnNodeType2["FieldStorageMetadata"] = "FieldStorageMetadata";
  KnNodeType2["FieldPropMetadata"] = "FieldPropMetadata";
  KnNodeType2["CalcPropMetadata"] = "CalcPropMetadata";
  KnNodeType2["PropertyFunc"] = "PropertyFunc";
  KnNodeType2["MethodMetadata"] = "MethodMetadata";
  KnNodeType2["MethodFunc"] = "MethodFunc";
  KnNodeType2["KonTypedObject"] = "KonTypedObject";
  KnNodeType2["CloseQuote"] = "CloseQuote";
})(KnNodeType ||= {});

// ../core/lib/Model/KnQualifiedIdentifier.ts
class KnQualifiedIdentifier {
  Qualifiers;
  Value;
  GetQualifiersAndCore() {
    return [...this.Qualifiers].concat(this.Value);
  }
}

// ../core/lib/Model/KnWord.ts
class KnWord extends KnQualifiedIdentifier {
  _Type = "Word" /* Word */;
  PreModifiers;
  PostModifiers;
  GenericArgs;
  SourceQualifier;
  constructor(inner, qualifiers = []) {
    super();
    this.Value = inner;
    this.Qualifiers = qualifiers;
  }
  static SourceQualified(source, member) {
    const word = new KnWord(member.Value, member.Qualifiers);
    word.SourceQualifier = source.GetFullNameStr();
    word.GenericArgs = member.GenericArgs;
    return word;
  }
  GetFullNameStr() {
    const name = this.GetQualifiersAndCore().join(".");
    return this.SourceQualifier == null ? name : `${this.SourceQualifier}:::${name}`;
  }
  static IsSingleLineWord(w) {
    return true;
  }
}

// ../core/lib/Model/KnKnot.ts
var KnotCallType;
((KnotCallType2) => {
  KnotCallType2[KnotCallType2["PrefixCall"] = 0] = "PrefixCall";
  KnotCallType2[KnotCallType2["InfixCall"] = 1] = "InfixCall";
  KnotCallType2[KnotCallType2["InstanceCall"] = 2] = "InstanceCall";
  KnotCallType2[KnotCallType2["PostfixCall"] = 3] = "PostfixCall";
  KnotCallType2[KnotCallType2["Subscript"] = 4] = "Subscript";
  KnotCallType2[KnotCallType2["StaticIndex"] = 5] = "StaticIndex";
  KnotCallType2[KnotCallType2["Operator"] = 6] = "Operator";
  KnotCallType2[KnotCallType2["Assignment"] = 7] = "Assignment";
})(KnotCallType ||= {});

class KnKnot {
  _Type = "Knot" /* Knot */;
  static Nil = null;
  PreModifiers;
  PostModifiers;
  UnboundTypes;
  CallType;
  Core;
  Name;
  Metadata;
  GenericTypes;
  Params;
  ResultTypes;
  Prop;
  NamedProp;
  Attr;
  NamedAttr;
  NamedSlot;
  Block;
  NamedBlock;
  InOutTable;
  GenericParams;
  Conf;
  NamedConf;
  Body;
  Sections;
  Slots;
  Next;
  constructor(node = null) {
    if (node == null) {
      return;
    }
    this.PreModifiers = node.PreModifiers;
    this.PostModifiers = node.PostModifiers;
    this.UnboundTypes = node.UnboundTypes;
    this.CallType = node.CallType;
    this.Core = node.Core;
    this.Name = node.Name;
    this.Metadata = node.Metadata;
    this.GenericTypes = node.GenericTypes;
    this.Params = node.Params;
    this.ResultTypes = node.ResultTypes;
    this.Prop = node.Prop;
    this.NamedProp = node.NamedProp;
    this.Attr = node.Attr;
    this.NamedAttr = node.NamedAttr;
    this.NamedSlot = node.NamedSlot;
    this.Block = node.Block;
    this.NamedBlock = node.NamedBlock;
    this.InOutTable = node.InOutTable;
    this.GenericParams = node.GenericParams;
    this.Conf = node.Conf;
    this.NamedConf = node.NamedConf;
    this.Body = node.Body;
    this.Sections = node.Sections;
    this.Slots = node.Slots;
    if (node.Next != null) {
      this.Next = new KnKnot(node.Next);
    }
  }
  static MakeByNodes(nodes) {
    let result = null;
    for (let i = nodes.length - 1;i >= 0; i--) {
      let currentKnot = nodes[i];
      currentKnot.Next = result;
      result = currentKnot;
    }
    return result;
  }
  static IsCoreSingleLine(knot) {
    if (knot.Core == null) {
      return true;
    }
    let coreType = KnNodeHelper.GetType(knot.Core);
    if (coreType == "Word" /* Word */) {
      return KnWord.IsSingleLineWord(knot.Core);
    }
    if (coreType == "OrderedMap" /* OrderedMap */ || coreType == "UnorderedMap" /* UnorderedMap */ || coreType == "Vector" /* Vector */ || coreType == "Knot" /* Knot */) {
      return false;
    }
    return true;
  }
  static HasNext(knot) {
    return knot.Next != null;
  }
  static IsNextNodeSingleLine(knot) {
    let nextNode = knot.Next;
    let isNextNodeCoreSingleLine = KnKnot.IsCoreSingleLine(nextNode);
    return isNextNodeCoreSingleLine && nextNode.GenericTypes == null && nextNode.Params == null && nextNode.ResultTypes == null && nextNode.Attr == null && nextNode.Block == null;
  }
  CouldOmitCallParamEnd() {
    return this.Prop == null && this.NamedProp == null && this.Attr == null && this.NamedAttr == null && this.Block == null && this.NamedBlock == null && this.NamedSlot == null && this.Next == null;
  }
  AcceptCallType() {
    return this.CallType == null && this.AcceptCore();
  }
  AcceptCore() {
    return this.Core == null && this.AcceptParam();
  }
  AcceptParam() {
    return this.Params == null && this.AcceptOrderedMap();
  }
  AcceptOrderedMap() {
    return (this.Prop == null || this.Prop.Value.size == 0) && this.AcceptUnorderedMap();
  }
  AcceptUnorderedMap() {
    return (this.Attr == null || Object.keys(this.Attr).length == 0) && this.AcceptBlock();
  }
  AcceptBlock() {
    return this.Block == null;
  }
}

// ../core/lib/Model/KnUnknown.ts
class KnUnknown {
  _Type = "Unknown" /* Unknown */;
  static Shared = new KnUnknown;
  constructor() {}
}

// ../core/lib/Util/KnNodeHelper.ts
class KnNodeHelper {
  static GetType(node) {
    if (Array.isArray(node)) {
      return "Vector" /* Vector */;
    } else if (typeof node == "number" || typeof node == "bigint") {
      return "Number" /* Number */;
    } else if (typeof node == "string") {
      return "String" /* String */;
    } else if (typeof node == "boolean") {
      return "Boolean" /* Boolean */;
    } else if (node == null) {
      return "Nil" /* Nil */;
    } else {
      let innerType = node._Type;
      if (innerType != null) {
        return innerType;
      } else {
        return "UnorderedMap" /* UnorderedMap */;
      }
    }
  }
  static IsEvaluated(node) {
    let type = KnNodeHelper.GetType(node);
    return type !== "UnorderedMap" /* UnorderedMap */ && type !== "Vector" /* Vector */ && type !== "Knot" /* Knot */ && type !== "Word" /* Word */ && type !== "Property" /* Property */ && type !== "Subscript" /* Subscript */;
  }
  static GetWordStr(node) {
    return node.Value;
  }
  static ToBoolean(node) {
    let type = KnNodeHelper.GetType(node);
    if (type === "Nil" /* Nil */ || node == false) {
      return false;
    } else {
      return true;
    }
  }
  static IsFunctionType(funcType) {
    if (funcType === "Lambda" /* Lambda */ || funcType === "MethodFunc" /* MethodFunc */ || funcType === "PropertyFunc" /* PropertyFunc */) {
      return true;
    } else {
      return false;
    }
  }
  static GetInnerString(node) {
    let type = KnNodeHelper.GetType(node);
    if (type === "Word" /* Word */) {
      return node.Value;
    } else if (type === "Symbol" /* Symbol */) {
      return node.Value;
    } else {
      return null;
    }
  }
  static IsWordStr(node, expect) {
    let type = KnNodeHelper.GetType(node);
    let wordInner = KnNodeHelper.GetInnerString(node);
    return type === "Word" /* Word */ && wordInner === expect;
  }
  static Ukn = new KnUnknown;
  static MakeKnotChainByShallowCopy(nodes) {
    let result = null;
    for (let i = nodes.length - 1;i >= 0; i--) {
      let node = nodes[i];
      let tmp = result;
      result = new KnKnot(node);
      result.Next = tmp;
    }
    return result;
  }
}
// ../core/lib/Model/CalcPropMeta.ts
class CalcPropMeta {
  _Type = "CalcPropMetadata" /* CalcPropMetadata */;
  Name;
  Definition;
  GetterVisibility;
  GetterFunc;
  SetterVisibility;
  SetterFunc;
  constructor(name, definition = null, getterVisibility = "public", getterFunc, setterVisibility = "public", setterFunc) {
    this.Name = name;
    this.Definition = definition;
    this.GetterVisibility = getterVisibility;
    this.GetterFunc = getterFunc;
    this.SetterVisibility = setterVisibility;
    this.SetterFunc = setterFunc;
  }
}
// ../core/lib/Model/FieldPropMeta.ts
class FieldPropMeta {
  _Type = "FieldPropMetadata" /* FieldPropMetadata */;
  Name;
  Definition;
  Visibility;
  constructor(name, definition = null, visibility = "public") {
    this.Name = name;
    this.Definition = definition;
    this.Visibility = visibility;
  }
}
// ../core/lib/Model/FieldStorageMeta.ts
class FieldStorageMeta {
  _Type = "FieldStorageMetadata" /* FieldStorageMetadata */;
  Name;
  Index;
  Definition;
  DefaultValueExpr;
  constructor(name, index, definition = null, defaultValueExpr = null) {
    this.Name = name;
    this.Index = index;
    this.Definition = definition;
    this.DefaultValueExpr = defaultValueExpr;
  }
}
// ../core/lib/Model/KnCompositeFunctionBase.ts
class KnCompositeFunctionBase {
  ParamTuple;
  ReturnType;
  FuncBody;
  Arity;
  VaryLengthParamPositiType = 0;
  constructor(funcBody, paramTable, returnType = null) {
    this.ReturnType = returnType;
    this.VaryLengthParamPositiType = 0;
    if (paramTable.length > 0) {
      let leftMostArg = paramTable[0];
      let rightMostArg = paramTable[paramTable.length - 1];
      if (KnNodeHelper.IsWordStr(leftMostArg, "...")) {
        this.VaryLengthParamPositiType = -1;
        paramTable.shift();
      } else if (KnNodeHelper.IsWordStr(rightMostArg, "...")) {
        this.VaryLengthParamPositiType = 1;
        paramTable.pop();
      }
    }
    this.ParamTuple = paramTable;
    if (this.VaryLengthParamPositiType !== 0) {
      this.Arity = paramTable.length - 1;
    } else {
      this.Arity = paramTable.length;
    }
    this.FuncBody = funcBody;
  }
}
// ../core/lib/Model/KnHostFunction.ts
class KnHostFunction {
  _Type = "HostSyncFunc" /* HostSyncFunc */;
  Func;
  Name;
  constructor(name, func) {
    this.Name = name;
    this.Func = func;
  }
}
// ../core/lib/Model/KnLambdaFunction.ts
class KnLambdaFunction extends KnCompositeFunctionBase {
  _Type = "Lambda" /* Lambda */;
  Env;
  Name;
  constructor(paramTable, funcBody, env, name = null) {
    super(funcBody, paramTable);
    this.Env = env;
    this.Name = name;
  }
}
// ../core/lib/Model/KnMethodFunc.ts
class KnMethodFunc extends KnCompositeFunctionBase {
  _Type = "MethodFunc" /* MethodFunc */;
  InstanceType;
  Name;
  Visibility;
  constructor(paramTable, returnType, funcBody, name, visibility) {
    super(funcBody, paramTable, returnType);
    this.Name = name;
    this.Visibility = visibility;
  }
}
// ../core/lib/Model/KnOperandStack.ts
class KnOperandStack {
  _Type = "OperandStack" /* OperandStack */;
  Value;
  constructor(inner) {
    this.Value = inner;
  }
}
// ../core/lib/Model/KnProperty.ts
class KnProperty {
  _Type = "Property" /* Property */;
  Value;
  constructor(inner) {
    this.Value = inner;
  }
}
// ../core/lib/Model/KnPropertyFunc.ts
class KnPropertyFunc extends KnCompositeFunctionBase {
  _Type = "PropertyFunc" /* PropertyFunc */;
  RequiredFields;
  Name;
  constructor(requiredFields, paramTuple, funcBody, name) {
    super(funcBody, paramTuple);
    this.RequiredFields = requiredFields;
    this.Name = name;
  }
}
// ../core/lib/Model/KnWrapper.ts
class KnWrapper {
  Kind;
  Inner;
  _Type;
  constructor(kind, inner, type = "QuoteMarcro" /* QuoteMarcro */) {
    this.Kind = kind;
    this.Inner = inner;
    this._Type = type;
  }
}
// ../core/lib/Model/KnQuoteWrapper.ts
class KnQuoteWrapper extends KnWrapper {
  constructor(kind, inner, type = "QuoteMarcro" /* QuoteMarcro */) {
    super(kind, inner, type);
  }
}
// ../core/lib/Model/KnRawString.ts
class KnRawString {
  _Type = "RawString" /* RawString */;
  Value;
  constructor(inner) {
    this.Value = inner;
  }
}
// ../core/lib/Model/KnInterpolatedString.ts
class KnInterpolatedString {
  _Type = "InterpolatedString" /* InterpolatedString */;
  Parts;
  constructor(parts) {
    this.Parts = parts;
  }
}
// ../core/lib/Model/KnSubscript.ts
class KnSubscript {
  _Type = "Subscript" /* Subscript */;
  Value;
  constructor(inner) {
    this.Value = inner;
  }
}
// ../core/lib/Model/KnSymbol.ts
class KnSymbol extends KnQualifiedIdentifier {
  _Type = "Symbol" /* Symbol */;
  constructor(inner) {
    super();
    this.Value = inner;
  }
}
// ../core/lib/Model/KnTuple.ts
class KnTuple {
  _Type = "Tuple" /* Tuple */;
  RawValue;
  constructor(value = []) {
    this.RawValue = value;
  }
  get Value() {
    if (this.IsTupleRows()) {
      let r = [];
      for (let i = 0;i < this.RawValue.length; i++) {
        r.push(this.RawValue[i][2]);
      }
      return r;
    }
    return this.RawValue;
  }
  IsTupleRows() {
    return this.RawValue.every((item) => Array.isArray(item) && item.length === 3);
  }
}
// ../core/lib/Model/KnUnorderedMap.ts
class KnUnorderedMap {
  static MakeByPairs(kvPairs) {
    let r = new KnUnorderedMap;
    for (let i = 0;i < kvPairs.length; i++) {
      let [k, v] = kvPairs[i];
      r[k] = v;
    }
    return r;
  }
}
// ../core/lib/Model/KnType.ts
var KnNodeType2 = {
  KnNil: "KnNil",
  KnUkn: "KnUkn",
  KnBoolean: "KnBoolean",
  KnNumber: "KnNumber",
  KnWord: "KnWord",
  KnSymbol: "KnSymbol",
  KnString: "KnString",
  KnMap: "KnMap",
  KnVector: "KnVector",
  KnBlock: "KnBlock",
  KnKnot: "KnKnot",
  KnBuilder: "KnBuilder",
  KnCloseQuote: "KnCloseQuote",
  KnQuasiQuote: "KnQuasiQuote",
  KnUnquoteReplace: "KnUnquoteReplace",
  KnUnquoteExpand: "KnUnquoteExpand",
  KnProperty: "KnProperty",
  KnSubscript: "KnSubscript",
  KnOperandStack: "KnOperandStack",
  KnHostFunc: "KnHostFunc",
  KnLambdaFunc: "KnLambdaFunc",
  KnTable: "KnTable",
  KnTableMetadata: "KnTableMetadata",
  KnFieldStorageMetadata: "KnFieldStorageMetadata",
  KnFieldPropMetadata: "KnFieldPropMetadata",
  KnCalcPropMetadata: "KnCalcPropMetadata",
  KnPropertyFunc: "KnPropertyFunc",
  KnMethodMetadata: "KnMethodMetadata",
  KnMethodFunc: "KnMethodFunc"
};

// ../core/lib/Model/KnUnquote.ts
class KnUnquote {
  _Type = KnNodeType2.KnUnquoteReplace;
  Value;
  constructor(inner) {
    this.Value = inner;
  }
}
// ../core/lib/Model/KnActionWrapper.ts
class KnActionWrapper extends KnWrapper {
  constructor(kind, inner) {
    super(kind, inner);
  }
}
// ../core/lib/Model/TableMeta.ts
class TableMeta {
  _Type = "TableMetadata" /* TableMetadata */;
  Kind;
  FieldMap;
  PropertyMap;
  MethodMap;
  constructor(kind = "Instance", fields, properties, methods) {
    this.Kind = kind;
    this.FieldMap = new Map;
    for (let i = 0;i < fields.length; i++) {
      this.FieldMap.set(fields[i].Name, fields[i]);
    }
    this.PropertyMap = new Map;
    for (let i = 0;i < properties.length; i++) {
      this.PropertyMap.set(properties[i].Name, properties[i]);
    }
    this.MethodMap = new Map;
    for (let i = 0;i < methods.length; i++) {
      this.MethodMap.set(methods[i].Name, methods[i]);
    }
  }
}
// ../core/lib/TaskQueue.ts
class TaskQueue {
  limit;
  debug;
  queue = [];
  activeTaskNum = 0;
  constructor(limit = 5, debug = false) {
    this.limit = limit;
    this.debug = debug;
    if (limit < 1) {
      throw new Error("limit must be integer greater than 1");
    }
  }
  addTask(task) {
    task.name ? task.name : task.fn.name || this.queue.length;
    this.queue.push(task);
    this.runTask();
  }
  execute(task) {
    this.log(`running ${task.name}`);
    return task.fn().then((ressult) => {
      this.log(`task ${task.name} finished`);
      return ressult;
    }).catch((error) => {
      this.log(`${task.name} failed`);
      throw error;
    }).finally(() => {
      this.activeTaskNum--;
      this.runTask();
    });
  }
  runTask() {
    while (this.activeTaskNum < this.limit && this.queue.length > 0) {
      const task = this.queue.shift();
      this.activeTaskNum++;
      this.execute(task).catch(() => {
        return;
      });
    }
  }
  log(msg) {
    if (this.debug) {
      console.info(`[TaskQueue] ${msg}`);
    }
  }
}
// ../converter/lib/Lexer/Lexer.ts
var TokenType;
((TokenType2) => {
  TokenType2[TokenType2["BeginCurlyBracket"] = 0] = "BeginCurlyBracket";
  TokenType2[TokenType2["EndCurlyBracket"] = 1] = "EndCurlyBracket";
  TokenType2[TokenType2["BeginBracket"] = 2] = "BeginBracket";
  TokenType2[TokenType2["EndBracket"] = 3] = "EndBracket";
  TokenType2[TokenType2["BeginParenthese"] = 4] = "BeginParenthese";
  TokenType2[TokenType2["EndParenthese"] = 5] = "EndParenthese";
  TokenType2[TokenType2["VerticalBar"] = 6] = "VerticalBar";
  TokenType2[TokenType2["Tilde"] = 7] = "Tilde";
  TokenType2[TokenType2["UpArrow"] = 8] = "UpArrow";
  TokenType2[TokenType2["QuestionMark"] = 9] = "QuestionMark";
  TokenType2[TokenType2["ExclamationMark"] = 10] = "ExclamationMark";
  TokenType2[TokenType2["Percent"] = 11] = "Percent";
  TokenType2[TokenType2["Dollar"] = 12] = "Dollar";
  TokenType2[TokenType2["Colon"] = 13] = "Colon";
  TokenType2[TokenType2["ColonColonColon"] = 14] = "ColonColonColon";
  TokenType2[TokenType2["ColonColon"] = 15] = "ColonColon";
  TokenType2[TokenType2["DotColon"] = 16] = "DotColon";
  TokenType2[TokenType2["UnquoteSplice"] = 17] = "UnquoteSplice";
  TokenType2[TokenType2["UnquoteMap"] = 18] = "UnquoteMap";
  TokenType2[TokenType2["Semicolon"] = 19] = "Semicolon";
  TokenType2[TokenType2["BackQuote"] = 20] = "BackQuote";
  TokenType2[TokenType2["Sharp"] = 21] = "Sharp";
  TokenType2[TokenType2["Comma"] = 22] = "Comma";
  TokenType2[TokenType2["At"] = 23] = "At";
  TokenType2[TokenType2["Equal"] = 24] = "Equal";
  TokenType2[TokenType2["Ampersand"] = 25] = "Ampersand";
  TokenType2[TokenType2["LowerThan"] = 26] = "LowerThan";
  TokenType2[TokenType2["BiggerThan"] = 27] = "BiggerThan";
  TokenType2[TokenType2["NewLine"] = 28] = "NewLine";
  TokenType2[TokenType2["SingleLineComment"] = 29] = "SingleLineComment";
  TokenType2[TokenType2["Whitespace"] = 30] = "Whitespace";
  TokenType2[TokenType2["Boolean"] = 31] = "Boolean";
  TokenType2[TokenType2["Null"] = 32] = "Null";
  TokenType2[TokenType2["Nil"] = 33] = "Nil";
  TokenType2[TokenType2["Unknown"] = 34] = "Unknown";
  TokenType2[TokenType2["Undefined"] = 35] = "Undefined";
  TokenType2[TokenType2["Number"] = 36] = "Number";
  TokenType2[TokenType2["RawString"] = 37] = "RawString";
  TokenType2[TokenType2["String"] = 38] = "String";
  TokenType2[TokenType2["Identifier"] = 39] = "Identifier";
  TokenType2[TokenType2["Symbol"] = 40] = "Symbol";
  TokenType2[TokenType2["Operator"] = 41] = "Operator";
  TokenType2[TokenType2["Dot"] = 42] = "Dot";
  TokenType2[TokenType2["DotDot"] = 43] = "DotDot";
  TokenType2[TokenType2["DotDotDot"] = 44] = "DotDotDot";
  TokenType2[TokenType2["EOF"] = 45] = "EOF";
})(TokenType ||= {});

class TokenBase {
  Column;
  Row;
  Type;
  Value;
  constructor(type, value, row, column) {
    this.Type = type;
    this.Value = value;
    this.Row = row;
    this.Column = column;
  }
  toString() {
    return `Token(Type=${this.Type}, Value=<'${this.Value}'>, Row=${this.Row}, Column=${this.Column})`;
  }
  equals(obj) {
    if (!(obj instanceof TokenBase))
      return false;
    const other = obj;
    return this.Type === other.Type && this.Value === other.Value && this.Row === other.Row && this.Column === other.Column;
  }
}

class Token extends TokenBase {
  static OperatorTokenValues = [
    "+",
    "++",
    "+=",
    "-",
    "--",
    "-=",
    "*",
    "*=",
    "/",
    "/=",
    "<",
    ">",
    "<=",
    ">=",
    "=="
  ];
  constructor(type, value, row, column) {
    super(type, value, row, column);
  }
  IsOperatorToken() {
    return Token.OperatorTokenValues.includes(this.Value);
  }
}

class LexException extends Error {
  row;
  column;
  constructor(message, row, column) {
    super(message);
    this.row = row;
    this.column = column;
  }
}

class ParseException extends Error {
  constructor(message) {
    super(message);
  }
}

class Lexer {
  static reg_ = new RegExp("(?<SingleLineComment>\\/\\/.*\\n)" + "|(?<Whitespace>(?: |\t| |\r)+)" + "|(?<NewLine>\\n)" + "|(?<BeginCurlyBracket>\\{)|(?<EndCurlyBracket>\\})|(?<BeginBracket>\\[)|(?<EndBracket>\\])|(?<BeginParenthese>\\()|(?<EndParenthese>\\))" + "|(?<Number>-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[Ee][+-]?\\d+)?)" + '|(?<String>"(?:[^"\\\\]*|\\\\(?:["\\\\bfnrt\\/]|u[0-9A-Fa-f]{4}))*")' + "|(?<RawString>'[^']*')" + "|(?<Identifier>(?:[_a-zA-Z][_a-zA-Z0-9]*[\\?]?))" + "|(?<Operator>\\+[\\+|=]?|\\-[\\-|>|=]?|\\*[=]?|\\/[=]?|==|>=|<=)" + "|(?<LowerThan><)|(?<BiggerThan>>)|(?<Equal>=)" + "|(?<At>@)|(?<ExclamationMark>!)|(?<QuestionMark>\\?)|(?<VerticalBar>\\|)" + "|(?<Tilde>~)|(?<UpArrow>\\^)|(?<Ampersand>&)" + "|(?<UnquoteSplice>,@)|(?<UnquoteMap>,%)|(?<Comma>,)" + "|(?<Percent>%)" + "|(?<BackQuote>`)" + "|(?<ColonColonColon>:::)|(?<ColonColon>::)|(?<DotColon>\\.:)|(?<Colon>:)|(?<DotDotDot>\\.\\.\\.)|(?<DotDot>\\.\\.)|(?<Dot>\\.)" + "|(?<Semicolon>;)|(?<Sharp>#)|(?<Dollar>\\$)", "g");
  static Lex(input) {
    const tokenList = [];
    let startat = 0;
    let row = 1;
    let column = 1;
    this.reg_.lastIndex = startat;
    let match;
    while (startat < input.length) {
      this.reg_.lastIndex = startat;
      if (input[startat] === '"' || input[startat] === "'") {
        const token = this.ReadStringToken(input, startat, row, column);
        tokenList.push(token);
        const nextPosition = this.AdvancePosition(token.Value, row, column);
        row = nextPosition.row;
        column = nextPosition.column;
        startat += token.Value.length;
        continue;
      }
      match = this.reg_.exec(input);
      if (match == null || match.index !== startat) {
        throw this.UnrecognizedTokenError(input, startat, row, column);
      }
      let found = false;
      for (const [groupName, value] of Object.entries(match.groups || {})) {
        if (value) {
          found = true;
          let type = TokenType[groupName];
          let token = new Token(type, value, row, column);
          if (type === 41 /* Operator */) {
            type = 39 /* Identifier */;
          }
          if (type === 39 /* Identifier */) {
            switch (value) {
              case "true":
              case "false":
                token = new Token(31 /* Boolean */, value, row, column);
                break;
              case "null":
                token = new Token(34 /* Unknown */, value, row, column);
                break;
              case "ukn":
                token = new Token(34 /* Unknown */, value, row, column);
                break;
              case "nil":
                token = new Token(33 /* Nil */, value, row, column);
                break;
              case "undefined":
                token = new Token(35 /* Undefined */, value, row, column);
                break;
              default:
                if (value === "<") {
                  token = new Token(26 /* LowerThan */, value, row, column);
                } else if (value === ">") {
                  token = new Token(27 /* BiggerThan */, value, row, column);
                } else if (value === ".") {
                  token = new Token(42 /* Dot */, value, row, column);
                } else if (value === "..") {
                  token = new Token(43 /* DotDot */, value, row, column);
                } else if (value === "...") {
                  token = new Token(44 /* DotDotDot */, value, row, column);
                }
                break;
            }
          }
          tokenList.push(token);
          const nextPosition = this.AdvancePosition(value, row, column);
          row = nextPosition.row;
          column = nextPosition.column;
          break;
        }
      }
      if (!found) {
        throw this.UnrecognizedTokenError(input, startat, row, column);
      } else {
        startat = match.index + match[0].length;
        this.reg_.lastIndex = startat;
      }
    }
    return tokenList;
  }
  static UnrecognizedTokenError(input, start, row, column) {
    const codePoint = input.codePointAt(start);
    if (codePoint === undefined) {
      return new LexException(`Unexpected end of input at row ${row}, column ${column}`, row, column);
    }
    const char = String.fromCodePoint(codePoint);
    const hex = codePoint.toString(16).toUpperCase().padStart(4, "0");
    if (codePoint > 127) {
      return new LexException(`Unexpected non-ASCII character '${char}' (U+${hex}) at row ${row}, column ${column}: ` + `non-ASCII characters are not supported as identifiers (identifiers must match [_a-zA-Z][_a-zA-Z0-9]*)`, row, column);
    }
    return new LexException(`Unexpected character '${char}' (U+${hex}) at row ${row}, column ${column}`, row, column);
  }
  static ReadStringToken(input, start, row, column) {
    const quote = input[start];
    const triple = input.startsWith(quote.repeat(3), start);
    const delimiter = triple ? quote.repeat(3) : quote;
    let index = start + delimiter.length;
    let escaped = false;
    if (triple) {
      const lineStart = Math.max(input.lastIndexOf(`
`, start - 1), input.lastIndexOf("\r", start - 1)) + 1;
      if (!/^[ \t]*$/.test(input.slice(lineStart, start))) {
        throw new LexException("Triple-quoted string opening delimiter must be alone on its line", row, column);
      }
      const openingLineEnd = this.FindLineEnd(input, index);
      if (!/^[ \t]*$/.test(input.slice(index, openingLineEnd))) {
        throw new LexException("Triple-quoted string opening delimiter must be alone on its line", row, column);
      }
    }
    while (index < input.length) {
      if (quote === '"' && escaped) {
        escaped = false;
        index++;
        continue;
      }
      const ch = input[index];
      if (quote === '"' && ch === "\\") {
        const interpOpen = input[index + 1];
        if (interpOpen === "(" || interpOpen === "[") {
          index = this.SkipInterpolationBlock(input, index + 1, row, column);
          continue;
        }
        escaped = true;
        index++;
        continue;
      }
      if (!triple && (ch === `
` || ch === "\r")) {
        throw new LexException("Unterminated string literal", row, column);
      }
      if (input.startsWith(delimiter, index)) {
        if (triple) {
          const afterDelimiter = index + delimiter.length;
          const closingLineEnd = this.FindLineEnd(input, afterDelimiter);
          if (!/^[ \t]*$/.test(input.slice(afterDelimiter, closingLineEnd))) {
            throw new LexException("Triple-quoted string closing delimiter must be alone on its line", row, column);
          }
        }
        const tokenType = quote === '"' ? 38 /* String */ : 37 /* RawString */;
        return new Token(tokenType, input.slice(start, index + delimiter.length), row, column);
      }
      index++;
    }
    throw new LexException("Unterminated string literal", row, column);
  }
  static SkipInterpolationBlock(input, openIndex, row, column) {
    const open = input[openIndex];
    const close = open === "(" ? ")" : "]";
    let depth = 0;
    let index = openIndex;
    while (index < input.length) {
      const ch = input[index];
      if (ch === '"' || ch === "'") {
        const nestedTriple = input.startsWith(ch.repeat(3), index);
        const nestedDelimiter = nestedTriple ? ch.repeat(3) : ch;
        index += nestedDelimiter.length;
        while (index < input.length) {
          if (ch === '"' && input[index] === "\\") {
            index += 2;
            continue;
          }
          if (input.startsWith(nestedDelimiter, index)) {
            index += nestedDelimiter.length;
            break;
          }
          index++;
        }
        continue;
      }
      if (ch === open) {
        depth++;
        index++;
        continue;
      }
      if (ch === close) {
        depth--;
        index++;
        if (depth === 0) {
          return index;
        }
        continue;
      }
      index++;
    }
    throw new LexException("Unterminated string interpolation", row, column);
  }
  static FindLineEnd(input, start) {
    let index = start;
    while (index < input.length && input[index] !== `
` && input[index] !== "\r") {
      index++;
    }
    return index;
  }
  static AdvancePosition(text, row, column) {
    for (const ch of text) {
      if (ch === `
`) {
        row++;
        column = 1;
      } else {
        column++;
      }
    }
    return { row, column };
  }
}

class IndexedStream {
  _constraintChecker;
  _input;
  _index = 0;
  constructor(input, constraintChecker) {
    this._input = input;
    this._constraintChecker = constraintChecker;
  }
  Current() {
    if (this.End()) {
      throw new ParseException("End of stream");
    }
    return this._input[this._index];
  }
  Consume(type = null) {
    if (this.End()) {
      throw new ParseException("End of stream");
    }
    let r = this._input[this._index++];
    if (type != null && !this._constraintChecker(r, type)) {
      throw new ParseException("illegal token");
    }
    return r;
  }
  ConsumeWithConstraint(expectedType) {
    const token = this.Consume();
    if (this._constraintChecker(token, expectedType)) {
      return token;
    }
    throw new ParseException(`Invalid token ${token} at position ${this._index}`);
  }
  Peek(nextOffset = 1) {
    if (this._index + nextOffset > this._input.length - 1) {
      return;
    }
    return this._input[this._index + nextOffset];
  }
  End() {
    return this._index >= this._input.length;
  }
  SkipBlankTokens(blankTypes) {
    while (!this.End() && blankTypes.has(this.Current().Type)) {
      this.Consume();
    }
  }
  SkipToken(expectedType) {
    this.SkipBlankTokens(new Set([28 /* NewLine */, 30 /* Whitespace */, 29 /* SingleLineComment */]));
    if (this.End()) {
      return;
    }
    const token = this.Current();
    if (expectedType !== undefined && token.Type === expectedType) {
      this.Consume();
    }
  }
  ConsumeAndSkipBlankTokens() {
    this.SkipBlankTokens(new Set([28 /* NewLine */, 30 /* Whitespace */, 29 /* SingleLineComment */]));
    const token = this.Current();
    this.Consume();
    return token;
  }
  ConsumeAndSkipBlankTokensWithExpected(expectedTypes) {
    this.SkipBlankTokens(new Set([28 /* NewLine */, 30 /* Whitespace */, 29 /* SingleLineComment */]));
    const token = this.Current();
    if (expectedTypes.has(token.Type)) {
      this.Consume();
      return token;
    }
    throw new ParseException(`Invalid token ${token} at position ${this._index}`);
  }
  ConsumeTypeAndSkipBlankTokens(expectedType) {
    return this.ConsumeAndSkipBlankTokensWithExpected(new Set([expectedType]));
  }
  NewParseException() {
    throw new ParseException(`Invalid token ${this.Current()} at position ${this._index}`);
  }
  toString() {
    return `[CharStream Index=${this._index}, Input=${this._input}]`;
  }
}

// ../converter/lib/KjsonSyntaxConfig.ts
class KjsonSyntaxConfig {
  FormatRawStringAsString = true;
  PrefixToken = 10 /* ExclamationMark */;
  PrefixStr = "!";
  TypeToken = 7 /* Tilde */;
  TypeStr = "~";
  SuffixComplementToken = 8 /* UpArrow */;
  SuffixComplementStr = "^";
  QuoteMarcroPrefixToken = 11 /* Percent */;
  QuoteMarcroPrefixStr = "%";
  SyntaxMarcroPrefix = 12 /* Dollar */;
  SyntaxMarcroPrefixStr = "$";
  ActionMarcroPrefix = 23 /* At */;
  ActionMarcroPrefixStr = "@";
  KnotSpecialPrefixToken = 13 /* Colon */;
  KnotSpecialPrefixStr = ":";
  KnotMetadataPrefixToken = 21 /* Sharp */;
  KnotMetadataPrefixStr = "#";
  KnotMetadataSeparatorToken = 24 /* Equal */;
  KnotMetadataSeparatorStr = "=";
  ValueFlagToken = 13 /* Colon */;
  ValueFlagStr = ":";
  FormaterMapKeyAsStr = true;
  FormaterAddPairsSeparator = true;
  PairsSeparatorToken = 22 /* Comma */;
  PairsSeparatorStr = ",";
  UnorderedMapStartToken = 0 /* BeginCurlyBracket */;
  UnorderedMapEndToken = 1 /* EndCurlyBracket */;
  UnorderedMapStartStr = "{";
  UnorderedMapEndStr = "}";
  OrderedMapStartToken = 26 /* LowerThan */;
  OrderedMapEndToken = 27 /* BiggerThan */;
  OrderedMapStartStr = "<";
  OrderedMapEndStr = ">";
  VectorStartToken = 2 /* BeginBracket */;
  VectorEndToken = 3 /* EndBracket */;
  VectorStartStr = "[";
  VectorEndStr = "]";
  KnotStartToken = 4 /* BeginParenthese */;
  KnotEndToken = 5 /* EndParenthese */;
  KnotStartStr = "(";
  KnotEndStr = ")";
  get TableStartToken() {
    return this.KnotStartToken;
  }
  get TableEndToken() {
    return this.KnotEndToken;
  }
  get TableStartStr() {
    return this.KnotStartStr;
  }
  get TableEndStr() {
    return this.KnotEndStr;
  }
  get KnotPrefixTypeToken() {
    return 20 /* BackQuote */;
  }
  get KnotPrefixTypeStr() {
    return "`";
  }
  get KnotPostfixTypeToken() {
    return 22 /* Comma */;
  }
  get KnotPostfixTypeStr() {
    return ",";
  }
  get KnotUnboundTypesBeginToken() {
    return this.KnotStartToken;
  }
  get KnotUnboundTypesEndToken() {
    return this.KnotEndToken;
  }
  get KnotUnboundTypesBeginStr() {
    return this.KnotStartStr;
  }
  get KnotUnboundTypesEndStr() {
    return this.KnotEndStr;
  }
  get KnotGenericTypesBeginToken() {
    return this.OrderedMapStartToken;
  }
  get KnotGenericTypesEndToken() {
    return this.OrderedMapEndToken;
  }
  get KnotGenericTypesBeginStr() {
    return this.OrderedMapStartStr;
  }
  get KnotGenericTypesEndStr() {
    return this.OrderedMapEndStr;
  }
  get KnotParamBeginToken() {
    return 6 /* VerticalBar */;
  }
  get KnotParamEndToken() {
    return 6 /* VerticalBar */;
  }
  get KnotParamBeginStr() {
    return "|";
  }
  get KnotParamEndStr() {
    return "|";
  }
  get KnotResultTypeBeginToken() {
    return this.VectorStartToken;
  }
  get KnotResultTypeEndToken() {
    return this.VectorEndToken;
  }
  get KnotResultTypeBeginStr() {
    return this.VectorStartStr;
  }
  get KnotResultTypeEndStr() {
    return this.VectorEndStr;
  }
  get KnotCallParamEndToken() {
    return 19 /* Semicolon */;
  }
  get KnotCallParamEndStr() {
    return ";";
  }
  get KnotBlockStartToken() {
    return this.VectorStartToken;
  }
  get KnotBlockEndToken() {
    return this.VectorEndToken;
  }
  get KnotBlockStartStr() {
    return this.VectorStartStr;
  }
  get KnotBlockEndStr() {
    return this.VectorEndStr;
  }
}

// ../converter/lib/KonSyntaxConfig.ts
class KonSyntaxConfig {
  FormatRawStringAsString = false;
  PrefixToken = 10 /* ExclamationMark */;
  PrefixStr = "!";
  TypeToken = 7 /* Tilde */;
  TypeStr = "~";
  SuffixComplementToken = 8 /* UpArrow */;
  SuffixComplementStr = "^";
  QuoteMarcroPrefixToken = 11 /* Percent */;
  QuoteMarcroPrefixStr = "%";
  SyntaxMarcroPrefix = 12 /* Dollar */;
  SyntaxMarcroPrefixStr = "$";
  ActionMarcroPrefix = 23 /* At */;
  ActionMarcroPrefixStr = "@";
  KnotSpecialPrefixToken = 13 /* Colon */;
  KnotSpecialPrefixStr = ":";
  KnotMetadataPrefixToken = 21 /* Sharp */;
  KnotMetadataPrefixStr = "#";
  KnotMetadataSeparatorToken = 24 /* Equal */;
  KnotMetadataSeparatorStr = "=";
  ValueFlagToken = 24 /* Equal */;
  ValueFlagStr = "=";
  KeyTagBeforeWord = true;
  FormaterMapKeyAsStr = false;
  FormaterAddPairsSeparator = false;
  PairsSeparatorToken = 19 /* Semicolon */;
  PairsSeparatorStr = ";";
  UnorderedMapStartToken = 0 /* BeginCurlyBracket */;
  UnorderedMapEndToken = 1 /* EndCurlyBracket */;
  UnorderedMapStartStr = "{";
  UnorderedMapEndStr = "}";
  OrderedMapStartToken = 26 /* LowerThan */;
  OrderedMapEndToken = 27 /* BiggerThan */;
  OrderedMapStartStr = "<";
  OrderedMapEndStr = ">";
  VectorStartToken = 2 /* BeginBracket */;
  VectorEndToken = 3 /* EndBracket */;
  VectorStartStr = "[";
  VectorEndStr = "]";
  KnotStartToken = 4 /* BeginParenthese */;
  KnotEndToken = 5 /* EndParenthese */;
  KnotStartStr = "(";
  KnotEndStr = ")";
  get TableStartToken() {
    return this.KnotStartToken;
  }
  get TableEndToken() {
    return this.KnotEndToken;
  }
  get TableStartStr() {
    return this.KnotStartStr;
  }
  get TableEndStr() {
    return this.KnotEndStr;
  }
  get KnotPrefixTypeToken() {
    return 20 /* BackQuote */;
  }
  get KnotPrefixTypeStr() {
    return "`";
  }
  get KnotPostfixTypeToken() {
    return 22 /* Comma */;
  }
  get KnotPostfixTypeStr() {
    return ",";
  }
  get KnotUnboundTypesBeginToken() {
    return this.KnotStartToken;
  }
  get KnotUnboundTypesEndToken() {
    return this.KnotEndToken;
  }
  get KnotUnboundTypesBeginStr() {
    return this.KnotStartStr;
  }
  get KnotUnboundTypesEndStr() {
    return this.KnotEndStr;
  }
  get KnotGenericTypesBeginToken() {
    return this.VectorStartToken;
  }
  get KnotGenericTypesEndToken() {
    return this.VectorEndToken;
  }
  get KnotGenericTypesBeginStr() {
    return this.VectorStartStr;
  }
  get KnotGenericTypesEndStr() {
    return this.VectorEndStr;
  }
  get KnotParamBeginToken() {
    return 6 /* VerticalBar */;
  }
  get KnotParamEndToken() {
    return 6 /* VerticalBar */;
  }
  get KnotParamBeginStr() {
    return "|";
  }
  get KnotParamEndStr() {
    return "|";
  }
  get KnotResultTypeBeginToken() {
    return this.KnotStartToken;
  }
  get KnotResultTypeEndToken() {
    return this.KnotEndToken;
  }
  get KnotResultTypeBeginStr() {
    return this.KnotStartStr;
  }
  get KnotResultTypeEndStr() {
    return this.KnotEndStr;
  }
  get KnotCallParamEndToken() {
    return 19 /* Semicolon */;
  }
  get KnotCallParamEndStr() {
    return ";";
  }
  get KnotBlockStartToken() {
    return this.VectorStartToken;
  }
  get KnotBlockEndToken() {
    return this.VectorEndToken;
  }
  get KnotBlockStartStr() {
    return this.VectorStartStr;
  }
  get KnotBlockEndStr() {
    return this.VectorEndStr;
  }
}

// ../converter/lib/KnlSyntaxConfig.ts
class KnlSyntaxConfig {
  FormatRawStringAsString = false;
  PrefixToken = 10 /* ExclamationMark */;
  PrefixStr = "!";
  TypeToken = 7 /* Tilde */;
  TypeStr = "~";
  SuffixComplementToken = 8 /* UpArrow */;
  SuffixComplementStr = "^";
  QuoteMarcroPrefixToken = 11 /* Percent */;
  QuoteMarcroPrefixStr = "%";
  SyntaxMarcroPrefix = 12 /* Dollar */;
  SyntaxMarcroPrefixStr = "$";
  ActionMarcroPrefix = 23 /* At */;
  ActionMarcroPrefixStr = "@";
  KnotSpecialPrefixToken = 13 /* Colon */;
  KnotSpecialPrefixStr = ":";
  KnotMetadataPrefixToken = 21 /* Sharp */;
  KnotMetadataPrefixStr = "#";
  KnotMetadataSeparatorToken = 24 /* Equal */;
  KnotMetadataSeparatorStr = "=";
  ValueFlagToken = 24 /* Equal */;
  ValueFlagStr = "=";
  KeyTagBeforeWord = true;
  FormaterMapKeyAsStr = false;
  FormaterAddPairsSeparator = false;
  PairsSeparatorToken = 19 /* Semicolon */;
  PairsSeparatorStr = ";";
  UnorderedMapStartToken = 4 /* BeginParenthese */;
  UnorderedMapEndToken = 5 /* EndParenthese */;
  UnorderedMapStartStr = "(";
  UnorderedMapEndStr = ")";
  OrderedMapStartToken = 26 /* LowerThan */;
  OrderedMapEndToken = 27 /* BiggerThan */;
  OrderedMapStartStr = "<";
  OrderedMapEndStr = ">";
  VectorStartToken = 0 /* BeginCurlyBracket */;
  VectorEndToken = 1 /* EndCurlyBracket */;
  VectorStartStr = "{";
  VectorEndStr = "}";
  KnotStartToken = 2 /* BeginBracket */;
  KnotEndToken = 3 /* EndBracket */;
  KnotStartStr = "[";
  KnotEndStr = "]";
  get TableStartToken() {
    return this.KnotStartToken;
  }
  get TableEndToken() {
    return this.KnotEndToken;
  }
  get TableStartStr() {
    return this.KnotStartStr;
  }
  get TableEndStr() {
    return this.KnotEndStr;
  }
  get KnotPrefixTypeToken() {
    return 20 /* BackQuote */;
  }
  get KnotPrefixTypeStr() {
    return "`";
  }
  get KnotPostfixTypeToken() {
    return 22 /* Comma */;
  }
  get KnotPostfixTypeStr() {
    return ",";
  }
  get KnotUnboundTypesBeginToken() {
    return this.KnotStartToken;
  }
  get KnotUnboundTypesEndToken() {
    return this.KnotEndToken;
  }
  get KnotUnboundTypesBeginStr() {
    return this.KnotStartStr;
  }
  get KnotUnboundTypesEndStr() {
    return this.KnotEndStr;
  }
  get KnotGenericTypesBeginToken() {
    return this.VectorStartToken;
  }
  get KnotGenericTypesEndToken() {
    return this.VectorEndToken;
  }
  get KnotGenericTypesBeginStr() {
    return this.VectorStartStr;
  }
  get KnotGenericTypesEndStr() {
    return this.VectorEndStr;
  }
  get KnotParamBeginToken() {
    return 6 /* VerticalBar */;
  }
  get KnotParamEndToken() {
    return 6 /* VerticalBar */;
  }
  get KnotParamBeginStr() {
    return "|";
  }
  get KnotParamEndStr() {
    return "|";
  }
  get KnotResultTypeBeginToken() {
    return this.KnotStartToken;
  }
  get KnotResultTypeEndToken() {
    return this.KnotEndToken;
  }
  get KnotResultTypeBeginStr() {
    return this.KnotStartStr;
  }
  get KnotResultTypeEndStr() {
    return this.KnotEndStr;
  }
  get KnotCallParamEndToken() {
    return 19 /* Semicolon */;
  }
  get KnotCallParamEndStr() {
    return ";";
  }
  get KnotBlockStartToken() {
    return this.VectorStartToken;
  }
  get KnotBlockEndToken() {
    return this.VectorEndToken;
  }
  get KnotBlockStartStr() {
    return this.VectorStartStr;
  }
  get KnotBlockEndStr() {
    return this.VectorEndStr;
  }
}

// ../converter/lib/Lexer/TokenStreamV1.ts
class TokenStreamV1 extends IndexedStream {
  static BlankTypes = [
    28 /* NewLine */,
    30 /* Whitespace */,
    29 /* SingleLineComment */
  ];
  constructor(input) {
    super(input, (token, type) => token.Type === type);
  }
  Current() {
    if (this.End()) {
      const lastToken = this._input[this._index - 1];
      return new Token(45 /* EOF */, "", lastToken.Row, lastToken.Column);
    }
    return this._input[this._index];
  }
  Next() {
    if (this._index + 1 >= this._input.length) {
      return null;
    }
    return this._input[this._index + 1];
  }
  InTypeSet(elem, checkTypes) {
    for (const type of checkTypes) {
      if (this._constraintChecker(elem, type)) {
        return true;
      }
    }
    return false;
  }
  SkipBlankTokens() {
    while (!this.End() && this.InTypeSet(this.Current(), TokenStreamV1.BlankTypes)) {
      this.Consume();
    }
  }
  SkipToken(expect) {
    const expectedTypes = [];
    if (expect !== null) {
      expectedTypes.push(expect);
    }
    this.SkipBlankTokens();
    if (this.End()) {
      return;
    }
    const elem = this.Current();
    if (this.InTypeSet(elem, expectedTypes)) {
      this.Consume();
    }
  }
  ConsumeAndSkipBlankTokens(expectedTypes = null) {
    this.SkipBlankTokens();
    const elem = this.Current();
    if (expectedTypes == null) {
      this.Consume();
      return elem;
    } else if (this.InTypeSet(elem, expectedTypes)) {
      this.Consume();
      return elem;
    }
    throw this.NewParseException();
  }
  ConsumeTypeAndSkipBlankTokens(expect) {
    const expectedTypes = [];
    expectedTypes.push(expect);
    return this.ConsumeAndSkipBlankTokens(expectedTypes);
  }
}

// ../core/lib/Model/KnOrderedMap.ts
class KnOrderedMap {
  _Type = "OrderedMap" /* OrderedMap */;
  Value;
  TypeMap;
  constructor(valMap, typeMap = new Map) {
    this.Value = valMap;
    this.TypeMap = typeMap;
  }
  static MakeByPairs(kvPairs) {
    let valMap = new Map;
    let typeMap = new Map;
    for (let i = 0;i < kvPairs.length; i++) {
      let [k, types, v] = kvPairs[i];
      valMap.set(k, v);
      typeMap.set(k, types);
    }
    return new KnOrderedMap(valMap, typeMap);
  }
}

// ../core/lib/Model/KnUndefined.ts
class KnUndefined {
  _Type = "Undefined" /* Undefined */;
  static Shared = new KnUndefined;
  constructor() {}
}

// ../core/lib/Model/KnModifierGroup.ts
class KnModifierGroup {
  Identifiers = [];
  NamedValues = new Map;
  Knots = [];
  UnorderedMap = null;
  OrderedMap = null;
  Vector = null;
}

// ../converter/lib/KnParserV1.ts
class KnParserV1 {
  SyntaxConfig;
  constructor(syntaxConfig) {
    this.SyntaxConfig = syntaxConfig;
  }
  static emptyReg = /^\s*$/s;
  Parse(input) {
    if (KnParserV1.emptyReg.test(input)) {
      return KnUnknown.Shared;
    }
    const tokens = Lexer.Lex(input);
    return this.Start(tokens);
  }
  Start(input) {
    const s = new TokenStreamV1(input);
    const value = this.ParseValue(s);
    this.EnsureNoTrailingTokens(s);
    return value;
  }
  EnsureNoTrailingTokens(s) {
    s.SkipBlankTokens();
    if (!s.End()) {
      const token = s.Current();
      throw new ParseException(`Unexpected token '${token.Value}' at ${token.Row}:${token.Column}: ` + `trailing tokens after a complete value. ` + `(In head/symbol position, '-' is the subtraction operator, so a name ` + `like 'foo-bar' is parsed as 'foo - bar'; quote the identifier or remove ` + `the hyphen if a single name was intended.)`);
    }
  }
  ParseValue(s, acceptPrefix = true, acceptSuffix = true, arrowAsContainer = false) {
    s.SkipBlankTokens();
    switch (s.Current().Type) {
      case 20 /* BackQuote */:
        return this.ParseQuoteNode(s, 20 /* BackQuote */, "QuasiQuote" /* QuasiQuote */);
      case 22 /* Comma */:
        return this.ParseQuoteNode(s, 22 /* Comma */, "Unquote" /* Unquote */);
      case 17 /* UnquoteSplice */:
        return this.ParseQuoteNode(s, 17 /* UnquoteSplice */, "UnquoteSplice" /* UnquoteSplice */);
      case 18 /* UnquoteMap */:
        return this.ParseQuoteNode(s, 18 /* UnquoteMap */, "UnquoteMap" /* UnquoteMap */);
      case 43 /* DotDot */:
        return this.ParseRowSpread(s);
      case 6 /* VerticalBar */:
        return this.ParseInOutTable(s);
      case 38 /* String */:
        return this.ParseString(s);
      case 37 /* RawString */:
        return this.ParseRawString(s);
      case 36 /* Number */:
        return this.ParseNumber(s);
      case 31 /* Boolean */:
        return this.ParseBoolean(s);
      case 34 /* Unknown */:
        return this.ParseUkn(s);
      case 32 /* Null */:
        return this.ParseNull(s);
      case 35 /* Undefined */:
        return this.ParseUndefined(s);
      case 33 /* Nil */:
        return this.ParseNil(s);
      default:
        break;
    }
    let prefixModifierGroup = null;
    if (acceptPrefix) {
      prefixModifierGroup = this.ParsePrefixModifierGroups(s);
    }
    let value = null;
    if (s.Current().Type === this.SyntaxConfig.SyntaxMarcroPrefix) {
      s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.SyntaxMarcroPrefix);
      if (s.Current().Type === this.SyntaxConfig.UnorderedMapStartToken || s.Current().Type === this.SyntaxConfig.VectorStartToken) {
        value = this.ParseValue(s);
      } else if (s.Current().Type === this.SyntaxConfig.OrderedMapStartToken) {
        value = this.ParseContainer(s, this.SyntaxConfig.OrderedMapStartToken, this.SyntaxConfig.OrderedMapEndToken, (s2) => this.ParseOrderedMapRow(s2), (m) => KnOrderedMap.MakeByPairs(m));
      } else if (s.Current().Type === this.SyntaxConfig.KnotStartToken) {
        value = this.ParseContainer(s, this.SyntaxConfig.TableStartToken, this.SyntaxConfig.TableEndToken, (stream) => this.ParseTablePair(stream), (m) => new KnTuple(m));
      } else {
        throw new Error("NotImplementedException");
      }
    } else if (s.Current().Type === this.SyntaxConfig.QuoteMarcroPrefixToken) {
      s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.QuoteMarcroPrefixToken);
      if (s.Current().Type === this.SyntaxConfig.KnotStartToken) {
        const marker = this.ParseKnotContainer(s);
        marker.CallType = 3 /* PostfixCall */;
        value = marker;
      } else if (s.Current().Type === 39 /* Identifier */ || s.Current().Type === 41 /* Operator */) {
        const word = this.ParseWord(s, true, false, false);
        if (s.Current().Type === 22 /* Comma */) {
          s.ConsumeTypeAndSkipBlankTokens(22 /* Comma */);
          let wrapperInner = this.ParseValue(s);
          value = new KnQuoteWrapper(word, wrapperInner);
        } else {
          value = new KnSymbol(word.Value);
        }
      } else {
        throw new Error("NotImplementedException");
      }
    } else if (s.Current().Type === this.SyntaxConfig.ActionMarcroPrefix) {
      s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.ActionMarcroPrefix);
      if (s.Current().Type === 39 /* Identifier */ || s.Current().Type === 41 /* Operator */) {
        const word = this.ParseWord(s, true, false, false);
        if (s.Current().Type === 22 /* Comma */) {
          s.ConsumeTypeAndSkipBlankTokens(22 /* Comma */);
          let wrapperInner = this.ParseValue(s);
          value = new KnActionWrapper(word, wrapperInner);
        } else {
          throw new Error("NotImplementedException");
        }
      } else {
        throw new Error("NotImplementedException");
      }
    } else if (s.Current().Type === this.SyntaxConfig.UnorderedMapStartToken) {
      value = this.ParseContainer(s, this.SyntaxConfig.UnorderedMapStartToken, this.SyntaxConfig.UnorderedMapEndToken, (s2) => this.ParseMapPair(s2), (m) => KnUnorderedMap.MakeByPairs(m));
    } else if (s.Current().Type === this.SyntaxConfig.VectorStartToken) {
      value = this.ParseContainer(s, this.SyntaxConfig.VectorStartToken, this.SyntaxConfig.VectorEndToken, (stream) => this.ParseVectorItem(stream), (m) => m);
    } else if (s.Current().Type === this.SyntaxConfig.KnotStartToken) {
      value = this.ParseKnotContainer(s);
    } else if (s.Current().Type === 39 /* Identifier */ || s.Current().Type === 41 /* Operator */) {
      value = this.ParseWord(s, true, acceptPrefix, acceptSuffix);
    } else {
      if (arrowAsContainer && s.Current().Type === 26 /* LowerThan */ && s.Current().Type === this.SyntaxConfig.OrderedMapStartToken) {
        return this.ParseContainer(s, this.SyntaxConfig.OrderedMapStartToken, this.SyntaxConfig.OrderedMapEndToken, (s2) => this.ParseOrderedMapRow(s2), (m) => KnOrderedMap.MakeByPairs(m));
      } else {
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
  AttachPreModifiers(value, modifierGroup) {
    if (modifierGroup == null || !this.HasModifierContent(modifierGroup)) {
      return;
    }
    if (value instanceof KnWord || value instanceof KnKnot) {
      value.PreModifiers = modifierGroup;
    }
  }
  HasModifierContent(modifierGroup) {
    return modifierGroup.Identifiers.length > 0 || modifierGroup.NamedValues.size > 0 || modifierGroup.Knots.length > 0 || modifierGroup.UnorderedMap != null || modifierGroup.OrderedMap != null || modifierGroup.Vector != null;
  }
  ParsePrefixModifierGroups(s) {
    const result = new KnModifierGroup;
    while (!s.End()) {
      let consumed = false;
      const typePrefixes = this.ParseModifierGroup(s, this.SyntaxConfig.PrefixToken);
      this.MergeModifierGroup(result, typePrefixes);
      consumed = consumed || this.HasModifierContent(typePrefixes);
      while (!s.End() && s.Current().Type === this.SyntaxConfig.KnotMetadataPrefixToken && s.Next()?.Type === this.SyntaxConfig.KnotStartToken) {
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
  MergeModifierGroup(target, source) {
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
  ParseModifierGroup(s, tokenType) {
    const r = new KnModifierGroup;
    s.SkipBlankTokens();
    while (!s.End() && s.Current().Type === tokenType) {
      const prefixToken = s.Current();
      s.ConsumeTypeAndSkipBlankTokens(tokenType);
      if (s.End()) {
        throw new ParseException(`Modifier '${TokenType[tokenType]}' at ${prefixToken.Row}:${prefixToken.Column} must be followed by a value`);
      }
      const node = this.ParseValue(s, false, false, true);
      const nodeType = KnNodeHelper.GetType(node);
      if (nodeType === "Word" /* Word */) {
        if (s.Next()?.Type === 22 /* Comma */) {
          const nextNode = this.ParseValue(s, false, false);
          r.NamedValues.set(node, nextNode);
        } else {
          if (node instanceof KnWord) {
            r.Identifiers.push(node);
          }
        }
      } else if (nodeType === "Knot" /* Knot */) {
        if (node instanceof KnKnot) {
          r.Knots.push(node);
        }
      } else if (nodeType === "UnorderedMap" /* UnorderedMap */) {
        if (node instanceof KnUnorderedMap) {
          r.UnorderedMap = node;
        }
      } else if (nodeType === "OrderedMap" /* OrderedMap */) {
        if (node instanceof KnOrderedMap) {
          r.OrderedMap = node;
        }
      } else if (nodeType === "Vector" /* Vector */) {
        r.Vector = node;
      }
      s.SkipBlankTokens();
    }
    return r;
  }
  ParseRawString(s) {
    const token = s.ConsumeTypeAndSkipBlankTokens(37 /* RawString */);
    const str = token.Value;
    const delimiterLength = str.startsWith("'''") ? 3 : 1;
    const subStr = delimiterLength === 3 ? this.NormalizeTripleQuotedString(str, token.Column, "'") : str.substring(delimiterLength, str.length - delimiterLength);
    return new KnRawString(subStr);
  }
  ParseString(s) {
    const token = s.ConsumeTypeAndSkipBlankTokens(38 /* String */);
    const str = token.Value;
    const delimiterLength = str.startsWith('"""') ? 3 : 1;
    const inner = delimiterLength === 3 ? this.NormalizeTripleQuotedString(str, token.Column, '"') : str.substring(delimiterLength, str.length - delimiterLength);
    return this.ParseInterpretedStringInner(inner);
  }
  NormalizeTripleQuotedString(source, tokenColumn, quote) {
    const delimiter = quote.repeat(3);
    const indentWidth = tokenColumn - 1;
    const inner = source.substring(delimiter.length, source.length - delimiter.length);
    const openingLineBreakStart = this.SkipHorizontalWhitespace(inner, 0);
    const firstNewline = this.ReadLeadingNewline(inner, openingLineBreakStart);
    if (firstNewline == null) {
      throw new Error("Triple-quoted string opening delimiter must be followed by a newline");
    }
    const withoutOpeningLine = inner.substring(openingLineBreakStart + firstNewline.length);
    const lastLineStart = Math.max(withoutOpeningLine.lastIndexOf(`
`), withoutOpeningLine.lastIndexOf("\r")) + 1;
    const closingIndent = withoutOpeningLine.substring(lastLineStart);
    if (!/^[ \t]*$/.test(closingIndent) || closingIndent.length !== indentWidth) {
      throw new Error("Triple-quoted string closing delimiter must align with opening delimiter");
    }
    const contentWithClosingLine = withoutOpeningLine.substring(0, lastLineStart);
    const content = contentWithClosingLine.endsWith(`\r
`) ? contentWithClosingLine.substring(0, contentWithClosingLine.length - 2) : contentWithClosingLine.endsWith(`
`) || contentWithClosingLine.endsWith("\r") ? contentWithClosingLine.substring(0, contentWithClosingLine.length - 1) : contentWithClosingLine;
    return content.split(/\r\n|\n|\r/).map((line) => this.NormalizeTripleQuotedLine(line, indentWidth)).join(`
`);
  }
  ReadLeadingNewline(source, index) {
    if (source.startsWith(`\r
`, index)) {
      return `\r
`;
    }
    if (source[index] === `
` || source[index] === "\r") {
      return source[index];
    }
    return null;
  }
  SkipHorizontalWhitespace(source, index) {
    while (index < source.length && (source[index] === " " || source[index] === "\t")) {
      index++;
    }
    return index;
  }
  NormalizeTripleQuotedLine(line, indentWidth) {
    if (line.trim().length === 0) {
      return line.length >= indentWidth ? line.substring(indentWidth) : "";
    }
    if (line.length < indentWidth || !/^[ \t]*$/.test(line.substring(0, indentWidth))) {
      throw new Error("Triple-quoted string content must not be less indented than its delimiter");
    }
    return line.substring(indentWidth);
  }
  ParseInterpretedStringInner(inner) {
    const parts = [];
    let text = "";
    let hasInterpolation = false;
    let index = 0;
    while (index < inner.length) {
      if (inner.startsWith("\\" + this.SyntaxConfig.KnotStartStr, index)) {
        if (text.length > 0) {
          parts.push({ kind: "text", value: text });
          text = "";
        }
        const expressionStart = index + 1 + this.SyntaxConfig.KnotStartStr.length;
        const expressionEnd = this.FindInterpolationEnd(inner, expressionStart);
        const expressionSource = inner.slice(expressionStart, expressionEnd);
        parts.push({ kind: "expr", value: this.Parse(expressionSource) });
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
      parts.push({ kind: "text", value: text });
    }
    return hasInterpolation ? new KnInterpolatedString(parts) : parts.map((part) => part.value).join("");
  }
  ReadEscape(source, index) {
    if (index + 1 >= source.length) {
      return { value: "\\", nextIndex: index + 1 };
    }
    const next = source[index + 1];
    switch (next) {
      case "n":
        return { value: `
`, nextIndex: index + 2 };
      case "t":
        return { value: "\t", nextIndex: index + 2 };
      case "r":
        return { value: "\r", nextIndex: index + 2 };
      case "b":
        return { value: "\b", nextIndex: index + 2 };
      case "f":
        return { value: "\f", nextIndex: index + 2 };
      case '"':
        return { value: '"', nextIndex: index + 2 };
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
  FindInterpolationEnd(source, start) {
    let depth = 1;
    let index = start;
    let quote = null;
    let tripleQuote = false;
    let escaped = false;
    while (index < source.length) {
      if (quote != null) {
        if (quote === '"' && escaped) {
          escaped = false;
          index++;
          continue;
        }
        if (quote === '"' && source[index] === "\\") {
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
      if (source[index] === '"' || source[index] === "'") {
        quote = source[index];
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
  ParseQuoteNode(s, tokenType, nodeType) {
    s.ConsumeTypeAndSkipBlankTokens(tokenType);
    return new KnQuoteWrapper(new KnWord(TokenType[tokenType]), this.ParseValue(s), nodeType);
  }
  ParseRowSpread(s) {
    s.ConsumeTypeAndSkipBlankTokens(43 /* DotDot */);
    return new KnQuoteWrapper(new KnWord(TokenType[43 /* DotDot */]), this.ParseValue(s, true, false), "RowSpread" /* RowSpread */);
  }
  ParseWord(s, hasNamespace, acceptPrefix, acceptSuffix) {
    let sourceQualifier = null;
    let path = this.ParseWordPath(s);
    if (!s.End() && s.Current().Type === 14 /* ColonColonColon */) {
      s.ConsumeTypeAndSkipBlankTokens(14 /* ColonColonColon */);
      sourceQualifier = new KnWord(path[path.length - 1], path.slice(0, -1));
      path = this.ParseWordPath(s);
    }
    const word = sourceQualifier == null ? new KnWord(path[path.length - 1], path.slice(0, -1)) : KnWord.SourceQualified(sourceQualifier, new KnWord(path[path.length - 1], path.slice(0, -1)));
    if (!s.End() && s.Current().Type === 26 /* LowerThan */) {
      word.GenericArgs = this.ParseGenericArgs(s);
    }
    if (acceptSuffix) {
      let modifierGroup = this.ParseModifierGroup(s, this.SyntaxConfig.SuffixComplementToken);
      word.PostModifiers = modifierGroup;
    }
    return word;
  }
  ParseWordPath(s) {
    const items = [];
    while (!s.End() && (s.Current().Type === 39 /* Identifier */ || s.Current().Type === 41 /* Operator */)) {
      const t = s.Current().Type === 39 /* Identifier */ ? s.ConsumeTypeAndSkipBlankTokens(39 /* Identifier */) : s.ConsumeTypeAndSkipBlankTokens(41 /* Operator */);
      items.push(t.Value);
      if (s.Current().Type === 41 /* Operator */) {
        break;
      }
      if (!s.End() && s.Current().Type === 42 /* Dot */) {
        s.ConsumeTypeAndSkipBlankTokens(42 /* Dot */);
      } else {
        break;
      }
    }
    return items;
  }
  ParseGenericArgs(s) {
    s.ConsumeTypeAndSkipBlankTokens(26 /* LowerThan */);
    const args = [];
    while (!s.End() && s.Current().Type !== 27 /* BiggerThan */) {
      const before = s.Current();
      args.push(this.ParseValue(s, true, false));
      s.SkipBlankTokens();
      if (!s.End() && s.Current() === before) {
        break;
      }
    }
    if (!s.End() && s.Current().Type === 27 /* BiggerThan */) {
      s.ConsumeTypeAndSkipBlankTokens(27 /* BiggerThan */);
    }
    return args;
  }
  ParseInOutTable(s) {
    s.ConsumeTypeAndSkipBlankTokens(6 /* VerticalBar */);
    const inputNodes = [];
    const outputNodes = [];
    let outputs = false;
    let hasOutputMarker = false;
    while (!s.End() && s.Current().Type !== 6 /* VerticalBar */) {
      if (s.Current().Type === 41 /* Operator */ && s.Current().Value === "->") {
        outputs = true;
        hasOutputMarker = true;
        s.ConsumeAndSkipBlankTokens();
        continue;
      }
      if (s.Current().Type === 41 /* Operator */ && s.Current().Value === "--") {
        s.ConsumeAndSkipBlankTokens();
        continue;
      }
      const value = this.ParseValue(s, true, false);
      (outputs ? outputNodes : inputNodes).push(value);
      s.SkipBlankTokens();
    }
    s.ConsumeTypeAndSkipBlankTokens(6 /* VerticalBar */);
    const table = new KnTuple([
      [null, [], inputNodes],
      ["->", [], outputNodes]
    ]);
    table.HasOutputMarker = hasOutputMarker;
    return table;
  }
  ParseNumber(s) {
    const nextToken = s.ConsumeTypeAndSkipBlankTokens(36 /* Number */);
    const numValue = nextToken.Value;
    return Number(numValue);
  }
  ParseBoolean(s) {
    const nextToken = s.ConsumeTypeAndSkipBlankTokens(31 /* Boolean */);
    return nextToken.Value === "true";
  }
  ParseUkn(s) {
    s.ConsumeTypeAndSkipBlankTokens(34 /* Unknown */);
    return KnUnknown.Shared;
  }
  ParseNull(s) {
    s.ConsumeTypeAndSkipBlankTokens(32 /* Null */);
    return KnUnknown.Shared;
  }
  ParseUndefined(s) {
    s.ConsumeTypeAndSkipBlankTokens(35 /* Undefined */);
    return KnUndefined.Shared;
  }
  ParseNil(s) {
    s.ConsumeTypeAndSkipBlankTokens(33 /* Nil */);
    return KnKnot.Nil;
  }
  ParseContainer(s, begin, end, parser, factory) {
    s.ConsumeTypeAndSkipBlankTokens(begin);
    const children = [];
    s.SkipBlankTokens();
    while (!s.End() && s.Current().Type !== end) {
      if (s.Current().Type === 22 /* Comma */ && this.SyntaxConfig.PairsSeparatorToken !== 22 /* Comma */) {
        throw new Error("Comma separators are not allowed in this syntax profile");
      }
      const before = s.Current();
      const item = parser(s);
      children.push(item);
      s.SkipBlankTokens();
      if (!s.End() && s.Current() === before) {
        break;
      }
    }
    if (s.End() || s.Current().Type !== end) {
      throw new ParseException(`Unclosed container: expected closing delimiter but reached ` + `${s.End() ? "end of input" : `'${s.Current().Value}'`}.`);
    }
    const container = factory(children);
    s.ConsumeTypeAndSkipBlankTokens(end);
    return container;
  }
  ParseVectorItem(s) {
    let r = this.ParseValue(s);
    s.SkipBlankTokens();
    if (!s.End() && s.Current().Type == this.SyntaxConfig.PairsSeparatorToken) {
      s.Consume(this.SyntaxConfig.PairsSeparatorToken);
    }
    return r;
  }
  ParseMapPair(s) {
    let firstNode = null;
    let secondNode = null;
    firstNode = this.ParseValue(s);
    s.SkipBlankTokens();
    if (!s.End() && s.Current().Type == this.SyntaxConfig.ValueFlagToken) {
      s.Consume(this.SyntaxConfig.ValueFlagToken);
      secondNode = this.ParseValue(s);
    }
    s.SkipBlankTokens();
    if (!s.End() && s.Current().Type == 22 /* Comma */ && this.SyntaxConfig.PairsSeparatorToken !== 22 /* Comma */) {
      throw new Error("Comma separators are not allowed in this syntax profile");
    }
    if (!s.End() && s.Current().Type == this.SyntaxConfig.PairsSeparatorToken) {
      s.Consume(this.SyntaxConfig.PairsSeparatorToken);
    }
    const keyNode = this.AsPairKey(firstNode);
    if (keyNode == null) {
      throw new ParseException(`Map key must be a bare word or string literal, got ` + `${firstNode == null ? "nothing" : firstNode.constructor?.name ?? typeof firstNode}` + ` — use {name = v} or {"name" = v} (number / expression keys are not allowed).`);
    }
    const key = keyNode.Value;
    const val = secondNode;
    return [key, val];
  }
  AsPairKey(parseResult) {
    if (typeof parseResult === "string") {
      return new KnWord(parseResult);
    } else if (parseResult instanceof KnWord) {
      return parseResult;
    }
    return null;
  }
  ParseOrderedMapRow(s) {
    let tagNode = null;
    const typeNodes = [];
    let valueNode = null;
    s.SkipBlankTokens();
    while (!s.End() && s.Current().Type === this.SyntaxConfig.TypeToken) {
      s.Consume(this.SyntaxConfig.TypeToken);
      typeNodes.push(this.ParseValue(s));
      s.SkipBlankTokens();
    }
    tagNode = this.ParseWord(s, false, false, false);
    s.SkipBlankTokens();
    if (!s.End() && s.Current().Type == this.SyntaxConfig.ValueFlagToken) {
      s.Consume(this.SyntaxConfig.ValueFlagToken);
      valueNode = this.ParseValue(s);
    }
    s.SkipBlankTokens();
    if (!s.End() && s.Current().Type == this.SyntaxConfig.PairsSeparatorToken) {
      s.Consume(this.SyntaxConfig.PairsSeparatorToken);
    }
    return [tagNode.Value, typeNodes, valueNode];
  }
  ParseTablePair(s) {
    let tagNode = null;
    const typeNodes = [];
    let valueNode = null;
    s.SkipBlankTokens();
    let firstVal = this.ParseValue(s);
    s.SkipBlankTokens();
    if (!s.End() && s.Current().Type == this.SyntaxConfig.ValueFlagToken) {
      s.Consume(this.SyntaxConfig.ValueFlagToken);
      tagNode = firstVal;
      valueNode = this.ParseValue(s);
    } else {
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
    let tagStr = tagNode == null || !(tagNode instanceof KnWord) ? null : tagNode.Value;
    return [tagStr, typeNodes, valueNode];
  }
  ParseKnotContainer(s) {
    s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.KnotStartToken);
    const nodes = [];
    let top = null;
    while (!s.End() && s.Current().Type !== this.SyntaxConfig.KnotEndToken) {
      top = nodes.length > 0 ? nodes[nodes.length - 1] : null;
      if (!top) {
        top = new KnKnot;
        nodes.push(top);
      } else if (s.Current().Type == 26 /* LowerThan */) {
        top.GenericParams = new KnTuple([
          [null, [], this.ParseGenericArgs(s)]
        ]);
      } else if (s.Current().IsOperatorToken()) {
        if (!top.AcceptCallType()) {
          top = new KnKnot;
          nodes.push(top);
        }
        top.CallType = 6 /* Operator */;
        top.Core = new KnWord(s.Current().Value);
        s.Consume();
        top.Params = this.ParseOptionalCallParams(s);
      } else if (s.Current().Type == 24 /* Equal */) {
        if (!top.AcceptCallType()) {
          top = new KnKnot;
          nodes.push(top);
        }
        s.Consume();
        top.CallType = 7 /* Assignment */;
        top.Core = this.ParseValue(s);
      } else if (s.Current().Type == 13 /* Colon */ && s.Next()?.Type == 24 /* Equal */) {
        if (!top.AcceptCallType()) {
          top = new KnKnot;
          nodes.push(top);
        }
        s.Consume();
        s.Consume();
        s.SkipBlankTokens();
        top.CallType = 7 /* Assignment */;
        top.Core = this.ParseValue(s);
      } else if (s.Current().Type == 15 /* ColonColon */) {
        if (!top.AcceptCallType()) {
          top = new KnKnot;
          nodes.push(top);
        }
        top.CallType = 4 /* Subscript */;
        s.Consume();
        top.Core = this.ParseValue(s);
      } else if (s.Current().Type == 16 /* DotColon */) {
        if (!top.AcceptCallType()) {
          top = new KnKnot;
          nodes.push(top);
        }
        top.CallType = 5 /* StaticIndex */;
        s.Consume();
        top.Core = this.ParseValue(s);
      } else if (s.Current().Type == 7 /* Tilde */) {
        if (!top.AcceptCallType()) {
          top = new KnKnot;
          nodes.push(top);
        }
        s.ConsumeTypeAndSkipBlankTokens(7 /* Tilde */);
        top.CallType = 2 /* InstanceCall */;
        top.Core = this.ParseWord(s, true, false, false);
        top.Params = this.ParseOptionalCallParams(s);
      } else if (s.Current().Type == this.SyntaxConfig.KnotCallParamEndToken) {
        s.Consume();
      } else if (s.Current().Type == this.SyntaxConfig.KnotParamBeginToken) {
        if (!top.AcceptParam()) {
          top = new KnKnot;
          nodes.push(top);
        }
        top.InOutTable = this.ParseInOutTable(s);
      } else if (s.Current().Type == this.SyntaxConfig.KnotMetadataPrefixToken) {
        s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.KnotMetadataPrefixToken);
        if (s.Current().Type == 39 /* Identifier */) {
          const tag = this.ParseWord(s, true, false, false);
          const tagStr = tag.Value;
          s.SkipBlankTokens();
          if (s.Current().Type == this.SyntaxConfig.KnotMetadataSeparatorToken) {
            if (top.Metadata == null) {
              top.Metadata = new Map;
            }
            s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.KnotMetadataSeparatorToken);
            const suffixNode = this.ParseValue(s, false, false, true);
            top.Metadata.set(tag, suffixNode);
          } else {
            top.Name = tag;
          }
        } else {
          throw new Error("illegal token");
        }
      } else if (s.Current().Type == 23 /* At */) {
        s.ConsumeTypeAndSkipBlankTokens(23 /* At */);
        const attrName = this.ParseWord(s, true, false, false).Value;
        top.Attr ??= {};
        s.SkipBlankTokens();
        if (s.Current().Type === 24 /* Equal */) {
          s.ConsumeTypeAndSkipBlankTokens(24 /* Equal */);
          top.Attr[attrName] = this.ParseValue(s);
        } else {
          top.Attr[attrName] = true;
        }
      } else if (s.Current().Type == this.SyntaxConfig.KnotPrefixTypeToken) {
        s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.KnotPrefixTypeToken);
        if (s.Current().Type == this.SyntaxConfig.KnotUnboundTypesBeginToken) {
          if (top.UnboundTypes != null) {
            top = new KnKnot;
            nodes.push(top);
          }
          top.UnboundTypes = this.ParseContainer(s, this.SyntaxConfig.KnotUnboundTypesBeginToken, this.SyntaxConfig.KnotUnboundTypesEndToken, (stream) => this.ParseVectorItem(stream), (m) => m);
        } else if (s.Current().Type == this.SyntaxConfig.KnotGenericTypesBeginToken) {
          if (top.GenericTypes != null) {
            top = new KnKnot;
            nodes.push(top);
          }
          top.GenericTypes = this.ParseContainer(s, this.SyntaxConfig.KnotGenericTypesBeginToken, this.SyntaxConfig.KnotGenericTypesEndToken, (stream) => this.ParseTablePair(stream), (m) => new KnTuple(m));
        } else {
          if (!top.AcceptCallType()) {
            top = new KnKnot;
            nodes.push(top);
          }
          top.CallType = 0 /* PrefixCall */;
          top.Core = this.ParseValue(s);
          top.Params = this.ParseOptionalCallParams(s);
        }
      } else if (s.Current().Type == this.SyntaxConfig.KnotPostfixTypeToken) {
        s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.KnotPostfixTypeToken);
        if (s.Current().Type == this.SyntaxConfig.KnotResultTypeBeginToken) {
          if (top.ResultTypes != null) {
            top = new KnKnot;
            nodes.push(top);
          }
          top.ResultTypes = this.ParseContainer(s, this.SyntaxConfig.KnotResultTypeBeginToken, this.SyntaxConfig.KnotResultTypeEndToken, (stream) => this.ParseTablePair(stream), (m) => new KnTuple(m));
        } else {
          if (!top.AcceptCallType()) {
            top = new KnKnot;
            nodes.push(top);
          }
          top.CallType = 3 /* PostfixCall */;
          top.Core = this.ParseValue(s);
          top.Params = this.ParseOptionalCallParams(s);
        }
      } else if (s.Current().Type === this.SyntaxConfig.KnotSpecialPrefixToken) {
        s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.KnotSpecialPrefixToken);
        if (s.Current().Type === this.SyntaxConfig.KnotParamBeginToken) {
          if (!top.AcceptParam()) {
            top = new KnKnot;
            nodes.push(top);
          }
          top.InOutTable = this.ParseInOutTable(s);
        } else if (s.Current().Type === this.SyntaxConfig.OrderedMapStartToken) {
          if (top.Prop != null) {
            top = new KnKnot;
            nodes.push(top);
          }
          top.Prop = this.ParseContainer(s, this.SyntaxConfig.OrderedMapStartToken, this.SyntaxConfig.OrderedMapEndToken, (s2) => this.ParseOrderedMapRow(s2), (m) => KnOrderedMap.MakeByPairs(m));
        } else if (s.Current().Type === this.SyntaxConfig.UnorderedMapStartToken) {
          if (top.Attr != null) {
            top = new KnKnot;
            nodes.push(top);
          }
          top.Conf = this.ParseContainer(s, this.SyntaxConfig.UnorderedMapStartToken, this.SyntaxConfig.UnorderedMapEndToken, (s2) => this.ParseMapPair(s2), (m) => KnUnorderedMap.MakeByPairs(m));
        } else if (s.Current().Type === this.SyntaxConfig.KnotBlockStartToken) {
          if (!top.AcceptBlock()) {
            top = new KnKnot;
            nodes.push(top);
          }
          const array = this.ParseContainer(s, this.SyntaxConfig.KnotBlockStartToken, this.SyntaxConfig.KnotBlockEndToken, (stream) => this.ParseValue(stream), (m) => m);
          top.Body = array;
        } else if (s.Current().Type === 39 /* Identifier */ || s.Current().Type === 41 /* Operator */) {
          let tag = this.ParseWord(s, true, false, false);
          const tagStr = tag.Value;
          s.SkipBlankTokens();
          if (s.Current().Type === this.SyntaxConfig.KnotMetadataSeparatorToken) {
            s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.KnotMetadataSeparatorToken);
            const suffixNode = this.ParseValue(s, false, false, true);
            const suffixNodeType = KnNodeHelper.GetType(suffixNode);
            if (suffixNodeType === "OrderedMap" /* OrderedMap */) {
              if (!top.NamedProp) {
                top.NamedProp = {};
              }
              top.NamedProp[tagStr] = suffixNode;
            } else if (suffixNodeType === "UnorderedMap" /* UnorderedMap */) {
              if (!top.NamedConf) {
                top.NamedConf = {};
              }
              top.NamedConf[tagStr] = suffixNode;
            } else if (suffixNodeType === "Knot" /* Knot */) {
              if (!top.Slots) {
                top.Slots = {};
              }
              top.Slots[tagStr] = suffixNode;
            } else if (suffixNodeType === "Vector" /* Vector */) {
              if (!top.Sections) {
                top.Sections = {};
              }
              top.Sections[tagStr] = suffixNode;
            }
          } else {
            if (!top.AcceptCallType()) {
              top = new KnKnot;
              nodes.push(top);
            }
            top.CallType = 1 /* InfixCall */;
            top.Core = tag;
            top.Params = this.ParseOptionalCallParams(s);
          }
        } else {
          throw new Error("illegal knot special syntax");
        }
      } else {
        this.ParseKnotCore(s, top, nodes);
      }
      s.SkipBlankTokens();
    }
    const result = KnKnot.MakeByNodes(nodes);
    s.ConsumeTypeAndSkipBlankTokens(this.SyntaxConfig.KnotEndToken);
    return result;
  }
  ParseKnotCore(s, top, nodes) {
    if (!top.AcceptCore()) {
      top = new KnKnot;
      nodes.push(top);
    }
    const core = this.ParseValue(s);
    top.Core = core;
    s.SkipBlankTokens();
  }
  ParseCallParams(s) {
    s.SkipBlankTokens();
    let callParamValues = [];
    while (!s.End() && s.Current().Type != this.SyntaxConfig.KnotCallParamEndToken && s.Current().Type != this.SyntaxConfig.KnotEndToken && s.Current().Type != this.SyntaxConfig.KnotPrefixTypeToken && s.Current().Type != this.SyntaxConfig.KnotPostfixTypeToken && s.Current().Type != this.SyntaxConfig.KnotParamBeginToken && s.Current().Type != 13 /* Colon */ && s.Current().Type != 23 /* At */ && s.Current().Type != 16 /* DotColon */ && s.Current().Type != 15 /* ColonColon */ && s.Current().Type != 24 /* Equal */) {
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
  ParseOptionalCallParams(s) {
    const params = this.ParseCallParams(s);
    return params.RawValue.length === 0 ? undefined : params;
  }
}

// ../converter/lib/FormatConfig.ts
class FormatConfig {
  static SingleLineConfig = new FormatConfig({
    IndentString: "  ",
    WordMultiLine: false,
    MapMultiLine: false,
    VectorMultiLine: false,
    PrettyExpr: false,
    KnotSegmentsMultiLine: false,
    KnotCoreMultiLine: false,
    KnotTypeParamMultiLine: false,
    KnotAttrMultiLine: false,
    KnotParamMultiLine: false,
    KnotBlockMultiLine: false
  });
  static MultiLineConfig = new FormatConfig({
    IndentString: "  ",
    WordMultiLine: true,
    MapMultiLine: true,
    VectorMultiLine: true,
    PrettyExpr: true,
    KnotSegmentsMultiLine: true,
    KnotCoreMultiLine: true,
    KnotTypeParamMultiLine: true,
    KnotAttrMultiLine: true,
    KnotParamMultiLine: true,
    KnotBlockMultiLine: true
  });
  static ExprInnerConfig = new FormatConfig({
    IndentString: "  ",
    WordMultiLine: true,
    MapMultiLine: true,
    VectorMultiLine: true,
    PrettyExpr: true,
    KnotSegmentsMultiLine: true,
    KnotCoreMultiLine: true,
    KnotTypeParamMultiLine: false,
    KnotAttrMultiLine: true,
    KnotParamMultiLine: false,
    KnotBlockMultiLine: true
  });
  static PrettifyConfig = new FormatConfig({
    IndentString: "  ",
    MapMultiLine: true,
    VectorMultiLine: true,
    PrettyExpr: true,
    KnotSegmentsMultiLine: true,
    KnotCoreMultiLine: false,
    KnotTypeParamMultiLine: false,
    KnotAttrMultiLine: true,
    KnotParamMultiLine: false,
    KnotBlockMultiLine: true
  });
  IndentString;
  WordMultiLine;
  MapMultiLine;
  VectorMultiLine;
  PrettyExpr;
  KnotSegmentsMultiLine;
  KnotCoreMultiLine;
  KnotTypeParamMultiLine;
  KnotAttrMultiLine;
  KnotParamMultiLine;
  KnotBlockMultiLine;
  constructor(config = {}) {
    this.IndentString = config.IndentString ?? "  ";
    this.WordMultiLine = config.WordMultiLine ?? false;
    this.MapMultiLine = config.MapMultiLine ?? false;
    this.VectorMultiLine = config.VectorMultiLine ?? false;
    this.PrettyExpr = config.PrettyExpr ?? false;
    this.KnotSegmentsMultiLine = config.KnotSegmentsMultiLine ?? false;
    this.KnotCoreMultiLine = config.KnotCoreMultiLine ?? false;
    this.KnotTypeParamMultiLine = config.KnotTypeParamMultiLine ?? false;
    this.KnotAttrMultiLine = config.KnotAttrMultiLine ?? false;
    this.KnotParamMultiLine = config.KnotParamMultiLine ?? false;
    this.KnotBlockMultiLine = config.KnotBlockMultiLine ?? false;
  }
  clone() {
    return new FormatConfig({
      IndentString: this.IndentString,
      WordMultiLine: this.WordMultiLine,
      MapMultiLine: this.MapMultiLine,
      VectorMultiLine: this.VectorMultiLine,
      PrettyExpr: this.PrettyExpr,
      KnotSegmentsMultiLine: this.KnotSegmentsMultiLine,
      KnotCoreMultiLine: this.KnotCoreMultiLine,
      KnotTypeParamMultiLine: this.KnotTypeParamMultiLine,
      KnotAttrMultiLine: this.KnotAttrMultiLine,
      KnotParamMultiLine: this.KnotParamMultiLine,
      KnotBlockMultiLine: this.KnotBlockMultiLine
    });
  }
}

// ../converter/lib/FormatState.ts
class FormatState {
  IndentLevel = 0;
  Config;
  IndentKnotCore = false;
  constructor(indentLevel = 0, config = FormatConfig.SingleLineConfig) {
    this.IndentLevel = indentLevel;
    this.Config = config;
  }
}

// ../converter/lib/KnFormatterV1.ts
class KnFormatterV1 {
  SyntaxConfig;
  constructor(syntaxConfig) {
    this.SyntaxConfig = syntaxConfig;
  }
  Stringify(node, prettify = true) {
    if (prettify) {
      return this.NodeToString(node, {
        IndentLevel: 0,
        Config: FormatConfig.PrettifyConfig
      });
    }
    return this.NodeToString(node, {
      IndentLevel: 0,
      Config: FormatConfig.SingleLineConfig
    });
  }
  NodeToString(node, formatState) {
    if (node === null) {
      return "nil";
    }
    const knType = KnNodeHelper.GetType(node);
    if (knType === "Unknown" /* Unknown */ || knType === "Undefined" /* Undefined */) {
      return "ukn";
    }
    if (knType === "UnorderedMap" /* UnorderedMap */) {
      return this.MapToStringCustom(node, formatState, this.SyntaxConfig.UnorderedMapStartStr, this.SyntaxConfig.UnorderedMapEndStr);
    }
    if (knType === "OrderedMap" /* OrderedMap */) {
      return this.MapToStringCustom(node, formatState, this.SyntaxConfig.SyntaxMarcroPrefixStr + this.SyntaxConfig.OrderedMapStartStr, this.SyntaxConfig.OrderedMapEndStr);
    }
    if (knType === "Vector" /* Vector */) {
      return this.VectorToString(node, formatState);
    }
    if (knType === "Tuple" /* Tuple */) {
      return this.TupleToString(node, formatState, this.SyntaxConfig.SyntaxMarcroPrefixStr + this.SyntaxConfig.TableStartStr, this.SyntaxConfig.TableEndStr);
    }
    if (knType === "Knot" /* Knot */) {
      return this.KnotToString(node, formatState);
    }
    if (knType == "QuoteMarcro" /* QuoteMarcro */) {
      return this.WrapperToString(node, this.SyntaxConfig.QuoteMarcroPrefixStr, formatState);
    }
    if (knType === "QuasiQuote" /* QuasiQuote */ || knType === "Unquote" /* Unquote */ || knType === "UnquoteSplice" /* UnquoteSplice */ || knType === "UnquoteMap" /* UnquoteMap */) {
      return this.QuoteNodeToString(node, formatState);
    }
    if (knType === "RowSpread" /* RowSpread */) {
      return this.RowSpreadToString(node, formatState);
    }
    if (knType == "ActionMarcro" /* ActionMarcro */) {
      return this.WrapperToString(node, this.SyntaxConfig.ActionMarcroPrefixStr, formatState);
    }
    if (knType === "Word" /* Word */) {
      return this.WordToString(node, formatState);
    }
    if (knType === "Symbol" /* Symbol */) {
      return this.SymbolToString(node, formatState);
    }
    if (knType === "RawString" /* RawString */) {
      const rawString = node;
      if (this.SyntaxConfig.FormatRawStringAsString) {
        return JSON.stringify(rawString.Value);
      } else {
        return `'${rawString.Value}'`;
      }
    }
    if (knType === "InterpolatedString" /* InterpolatedString */) {
      return this.InterpolatedStringToString(node, formatState);
    }
    if (knType === "String" /* String */) {
      return JSON.stringify(node);
    }
    if (knType === "Number" /* Number */ || knType === "Integer" /* Integer */ || knType === "Double" /* Double */) {
      return node.toString();
    }
    if (knType === "Boolean" /* Boolean */) {
      return node.toString();
    }
    if (knType === "Nil" /* Nil */) {
      return "nil";
    }
    if (knType === "KonTypedObject" /* KonTypedObject */) {
      return "<typed-object>";
    }
    throw new Error("not supported type" + knType);
  }
  InterpolatedStringToString(node, formatState) {
    const inner = node.Parts.map((part) => {
      if (part.kind === "text") {
        return part.value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\n/g, "\\n").replace(/\t/g, "\\t").replace(/\r/g, "\\r");
      }
      return "\\" + this.SyntaxConfig.KnotStartStr + this.NodeToString(part.value, {
        IndentLevel: formatState.IndentLevel,
        Config: FormatConfig.SingleLineConfig
      }) + this.SyntaxConfig.KnotEndStr;
    }).join("");
    return `"${inner}"`;
  }
  WrapperToString(wrapper, prefix, formatState) {
    const typeStr = this.WordToString(wrapper.Kind, formatState);
    const valueStr = this.NodeToString(wrapper.Inner, formatState);
    return `${prefix}${typeStr},${valueStr}`;
  }
  QuoteNodeToString(wrapper, formatState) {
    const prefix = wrapper._Type === "QuasiQuote" /* QuasiQuote */ ? "`" : wrapper._Type === "UnquoteSplice" /* UnquoteSplice */ ? ",@" : wrapper._Type === "UnquoteMap" /* UnquoteMap */ ? ",%" : ",";
    return prefix + this.NodeToString(wrapper.Inner, {
      IndentLevel: formatState.IndentLevel,
      Config: FormatConfig.SingleLineConfig
    });
  }
  RowSpreadToString(wrapper, formatState) {
    return ".." + this.NodeToString(wrapper.Inner, {
      IndentLevel: formatState.IndentLevel,
      Config: FormatConfig.SingleLineConfig
    });
  }
  ModifiersToString(modifierGroup, prefix, formatState) {
    const items = [];
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
  WordToString(node, formatState) {
    const word = this.WordToStringCustom(node, formatState, "");
    let prefixes = this.ModifiersToString(node.PreModifiers, this.SyntaxConfig.PrefixStr, {
      IndentLevel: formatState.IndentLevel,
      Config: FormatConfig.SingleLineConfig
    });
    let postfixes = this.ModifiersToString(node.PostModifiers, this.SyntaxConfig.SuffixComplementStr, {
      IndentLevel: formatState.IndentLevel,
      Config: FormatConfig.SingleLineConfig
    });
    const items = [];
    if (prefixes != "") {
      items.push(prefixes);
    }
    items.push(word);
    if (postfixes != "") {
      items.push(postfixes);
    }
    return items.join(" ");
  }
  SymbolToString(node, formatState) {
    return this.WordToStringCustom(node, formatState, this.SyntaxConfig.QuoteMarcroPrefixStr);
  }
  WordToStringCustom(node, formatState, prefix, typeDefAfterWord = true) {
    if (typeof node === "string") {
      return node;
    }
    let annotationsJoiner = " ";
    let flagsJoiner = " ";
    let afterFlagsSection = " ";
    let afterAnnotationSection = " ";
    let containerIndent = "";
    if (formatState.Config.WordMultiLine) {
      containerIndent = formatState.Config.IndentString.repeat(formatState.IndentLevel + 1);
      annotationsJoiner = `
${containerIndent}`;
      afterAnnotationSection += `
${containerIndent}`;
    }
    let annotationStr = "";
    let modifiersStr = "";
    let qualifiersStr = "";
    let defStr = "";
    let complementStr = "";
    if (node instanceof KnWord && node.SourceQualifier) {
      qualifiersStr = node.SourceQualifier + ":::";
    } else if (node.Qualifiers && node.Qualifiers.length > 0) {
      qualifiersStr = node.Qualifiers.join(".") + ".";
    }
    if (node instanceof KnWord && node.GenericArgs && node.GenericArgs.length > 0) {
      defStr = "<" + node.GenericArgs.map((arg) => this.Stringify(arg, false)).join(" ") + ">";
    }
    return `${qualifiersStr}${prefix}${node.Value}${defStr}${complementStr}`;
  }
  MapToStringCustom(node, formatState, preffix, suffix) {
    const inner = this.MapFormatInner(node, formatState);
    let sb = "";
    if (formatState.Config.MapMultiLine) {
      const containerIndent = formatState.Config.IndentString.repeat(formatState.IndentLevel);
      sb += preffix;
      sb += `
`;
      sb += inner;
      if (Object.keys(node).length > 0) {
        sb += `
`;
      }
      sb += containerIndent;
      sb += suffix;
      return sb;
    }
    sb = `${preffix}${inner}${suffix}`;
    return sb;
  }
  MapFormatInner(node, formatState) {
    let pairsJoiner = " ";
    const valFlagStr = " " + this.SyntaxConfig.ValueFlagStr;
    let valueTagAndValueJoiner = " ";
    let keyIndent = "";
    let valueIndent = "";
    if (formatState.Config.MapMultiLine) {
      pairsJoiner = `
`;
      keyIndent = formatState.Config.IndentString.repeat(formatState.IndentLevel + 1);
    }
    if (this.SyntaxConfig.FormaterAddPairsSeparator) {
      pairsJoiner = this.SyntaxConfig.PairsSeparatorStr + pairsJoiner;
    }
    const innerStringList = [];
    const isOrderedMap = node instanceof KnOrderedMap;
    if (isOrderedMap) {
      let orderedMap = node;
      for (const [key, value] of orderedMap.Value) {
        let types = orderedMap.TypeMap.get(key);
        const innerValStr = this.NodeToString(value, {
          IndentLevel: formatState.IndentLevel + 1,
          Config: formatState.Config,
          IndentKnotCore: true
        });
        let keyStr = null;
        let keyAny = key;
        if (keyAny instanceof KnQualifiedIdentifier) {
          keyStr = this.WordToStringCustom(keyAny, new FormatState, "", false);
        } else if (keyAny instanceof KnRawString) {
          keyStr = keyAny.Value;
        } else {
          keyStr = keyAny;
        }
        if (types != null && types.length > 0) {
          for (const typeItem of types) {}
        }
        const pairStr = `${keyIndent}${keyStr}${valFlagStr}${valueTagAndValueJoiner}${valueIndent}${innerValStr}`;
        innerStringList.push(pairStr);
      }
    } else {
      for (let [key, value] of Object.entries(node)) {
        const innerValStr = this.NodeToString(value, {
          IndentLevel: formatState.IndentLevel + 1,
          Config: formatState.Config,
          IndentKnotCore: true
        });
        let keyStr = this.WordToStringCustom(key, { IndentLevel: 0, Config: formatState.Config }, "", false);
        if (this.SyntaxConfig.FormaterMapKeyAsStr) {
          keyStr = '"' + keyStr + '"';
        }
        const pairStr = `${keyIndent}${keyStr}${valFlagStr}${valueTagAndValueJoiner}${valueIndent}${innerValStr}`;
        innerStringList.push(pairStr);
      }
    }
    return innerStringList.join(pairsJoiner);
  }
  VectorToString(node, formatState) {
    return this.VectorToStringCustom(node, formatState, this.SyntaxConfig.VectorStartStr, this.SyntaxConfig.VectorEndStr);
  }
  VectorToStringCustom(innerNodes, formatState, preffix, suffix) {
    let sb = "";
    const inner = this.VectorFormatInner(innerNodes, formatState);
    if (formatState.Config.VectorMultiLine) {
      const containerIndent = formatState.Config.IndentString.repeat(formatState.IndentLevel);
      sb += preffix;
      sb += `
`;
      sb += inner;
      if (innerNodes.length > 0) {
        sb += `
`;
      }
      sb += containerIndent;
      sb += suffix;
      return sb;
    }
    sb = `${preffix}${inner}${suffix}`;
    return sb;
  }
  TupleToString(node, formatState, preffix, suffix) {
    const joiner = " ";
    const containerIndent = "";
    if (!node.IsTupleRows()) {
      return `${preffix}${node.RawValue.map((item) => this.Stringify(item, false)).join(joiner)}${suffix}`;
    }
    const tableValues = node.RawValue;
    const innerStringList = [];
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
  VectorFormatInner(innerNodes, formatState) {
    let joiner = " ";
    let containerIndent = "";
    if (formatState.Config.VectorMultiLine) {
      joiner = `
`;
      containerIndent = formatState.Config.IndentString.repeat(formatState.IndentLevel + 1);
    }
    if (this.SyntaxConfig.FormaterAddPairsSeparator) {
      joiner = this.SyntaxConfig.PairsSeparatorStr + joiner;
    }
    const innerStringList = [];
    for (const innerNode of innerNodes) {
      const innerStr = this.NodeToString(innerNode, {
        IndentLevel: formatState.IndentLevel + 1,
        Config: formatState.Config
      });
      innerStringList.push(containerIndent + innerStr);
    }
    return innerStringList.join(joiner);
  }
  KnotToString(node, formatState) {
    let containerIndent = "";
    let innerIndent = "";
    let beforeKnotEndTokenStr = "";
    if (formatState.Config.KnotSegmentsMultiLine) {
      containerIndent = formatState.Config.IndentString.repeat(formatState.IndentLevel);
      innerIndent = formatState.Config.IndentString.repeat(formatState.IndentLevel + 1);
      beforeKnotEndTokenStr = `
${containerIndent}`;
    }
    let inner = "";
    if (formatState.Config.PrettyExpr) {
      if (formatState.IndentLevel > 0 && formatState.IndentKnotCore) {
        inner += `
${innerIndent}`;
      }
      inner += this.KnotFormatInner(node, {
        IndentLevel: formatState.IndentLevel,
        Config: FormatConfig.ExprInnerConfig
      });
    } else {
      inner = this.KnotFormatInner(node, {
        IndentLevel: formatState.IndentLevel,
        Config: FormatConfig.SingleLineConfig
      });
    }
    return `${this.SyntaxConfig.KnotStartStr}${inner}${beforeKnotEndTokenStr}${this.SyntaxConfig.KnotEndStr}`;
  }
  KnotFormatInner(node, formatState) {
    let containerIndent = "";
    let innerIndent = "";
    let segmentJoiner = " ";
    if (formatState.Config.KnotSegmentsMultiLine) {
      containerIndent = formatState.Config.IndentString.repeat(formatState.IndentLevel);
      innerIndent = formatState.Config.IndentString.repeat(formatState.IndentLevel + 1);
      segmentJoiner = `
${innerIndent}`;
    }
    let iter = node;
    let sb = "";
    while (iter !== null) {
      const currentNode = iter;
      const segmentStr = this.KnotFormatSegment(currentNode, formatState);
      sb += segmentStr;
      if (currentNode.Next != null) {
        if (this.ShouldJoinNextWithoutSpace(currentNode.Next)) {} else {
          sb += segmentJoiner;
        }
      }
      iter = currentNode.Next;
    }
    return sb;
  }
  ShouldJoinNextWithoutSpace(node) {
    return node.CallType === 5 /* StaticIndex */ || node.CallType === 4 /* Subscript */;
  }
  GetCallTypeStr(callType) {
    switch (callType) {
      case 0 /* PrefixCall */:
        return this.SyntaxConfig.KnotPrefixTypeStr;
      case 1 /* InfixCall */:
        return this.SyntaxConfig.KnotSpecialPrefixStr;
      case 2 /* InstanceCall */:
        return this.SyntaxConfig.TypeStr;
      case 3 /* PostfixCall */:
        return this.SyntaxConfig.KnotPostfixTypeStr;
      case 7 /* Assignment */:
        return "=";
      case 5 /* StaticIndex */:
        return ".:";
      case 4 /* Subscript */:
        return "::";
      default:
        return "";
    }
  }
  KnotFormatSegment(node, formatState) {
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
      let typeParamStr = this.VectorToStringCustom(node.UnboundTypes, {
        IndentLevel: formatState.IndentLevel + 1,
        Config: FormatConfig.SingleLineConfig
      }, typeParamBefore, typeParamAfter);
      sb += typeParamStr;
    }
    if (node.CallType != null) {
      if ((node.CallType === 5 /* StaticIndex */ || node.CallType === 4 /* Subscript */) && sb.endsWith(" ")) {
        sb = sb.slice(0, -1);
      }
      sb += this.GetCallTypeStr(node.CallType);
    }
    if (node.Core != null) {
      const coreType = KnNodeHelper.GetType(node.Core);
      const isCoreSingleLine = KnKnot.IsCoreSingleLine(node);
      const formatCoreConfig = isCoreSingleLine ? FormatConfig.SingleLineConfig : FormatConfig.MultiLineConfig;
      const coreStr = this.NodeToString(node.Core, {
        IndentLevel: formatState.IndentLevel + 1,
        Config: formatCoreConfig
      });
      sb += coreStr;
    }
    if (node.Name != null) {
      sb += " " + this.SyntaxConfig.KnotMetadataPrefixStr + this.Stringify(node.Name, false);
    }
    if (node.Metadata && node.Metadata.size !== 0) {
      for (const [key, value] of node.Metadata.entries()) {
        if (formatState.Config.KnotAttrMultiLine) {
          sb += `
${innerIndent}`;
        } else if (!sb.endsWith(" ")) {
          sb += " ";
        }
        const tag = this.WordToStringCustom(key, formatState, "");
        const valueStr = this.NodeToString(value, {
          IndentLevel: formatState.IndentLevel + 1,
          Config: formatState.Config,
          IndentKnotCore: true
        });
        sb += this.SyntaxConfig.KnotMetadataPrefixStr + tag + " " + this.SyntaxConfig.KnotMetadataSeparatorStr + " " + valueStr;
      }
    }
    if (node.GenericTypes) {
      if (formatState.Config.KnotAttrMultiLine && node.Metadata) {
        sb += `
${innerIndent}`;
      } else if (!sb.endsWith(" ")) {
        sb += " ";
      }
      const typeParamBefore = `${this.SyntaxConfig.KnotSpecialPrefixStr}${this.SyntaxConfig.KnotGenericTypesBeginStr}`;
      const typeParamAfter = `${this.SyntaxConfig.KnotGenericTypesEndStr} `;
      const typeParamStr = this.TupleToString(node.GenericTypes, {
        IndentLevel: formatState.IndentLevel + 1,
        Config: FormatConfig.SingleLineConfig
      }, typeParamBefore, typeParamAfter);
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
        let paramHeadStr = node.Params.RawValue.length == 0 ? "" : " ";
        let paramTailStr = canOmitCallParamEnd ? "" : this.SyntaxConfig.KnotCallParamEndStr;
        if (node.Next != null && this.ShouldJoinNextWithoutSpace(node.Next)) {
          paramTailStr = "";
        }
        let paramStr = this.TupleToString(node.Params, {
          IndentLevel: formatState.IndentLevel + 1,
          Config: FormatConfig.SingleLineConfig
        }, paramHeadStr, paramTailStr);
        sb += paramStr;
      } else {
        let shouldMultiline = true;
        const config = shouldMultiline ? formatState.Config : FormatConfig.SingleLineConfig;
        if (formatState.Config.KnotAttrMultiLine && node.Metadata && node.ResultTypes == null) {
          sb += `
${innerIndent}`;
        } else if (!sb.endsWith(" ")) {
          sb += " ";
        }
        const paramStr = this.TupleToString(node.Params, {
          IndentLevel: formatState.IndentLevel + 1,
          Config: config
        }, this.SyntaxConfig.KnotParamBeginStr, this.SyntaxConfig.KnotParamEndStr);
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
      sb += this.MapToStringCustom(node.Conf, {
        IndentLevel: formatState.IndentLevel + 1,
        Config: formatState.Config
      }, `${this.SyntaxConfig.KnotSpecialPrefixStr}${this.SyntaxConfig.UnorderedMapStartStr}`, this.SyntaxConfig.UnorderedMapEndStr);
    }
    if (node.ResultTypes && node.ResultTypes.RawValue.length > 0) {
      const typeResultStart = `${this.SyntaxConfig.KnotSpecialPrefixStr}${this.SyntaxConfig.KnotResultTypeBeginStr}`;
      const typeResultEnd = `${this.SyntaxConfig.KnotResultTypeEndStr} `;
      if (formatState.Config.KnotAttrMultiLine && node.Metadata && node.Params == null) {
        sb += `
${innerIndent}`;
      } else if (!sb.endsWith(" ")) {
        sb += " ";
      }
      const typeResultStr = this.TupleToString(node.ResultTypes, {
        IndentLevel: formatState.IndentLevel + 1,
        Config: FormatConfig.SingleLineConfig
      }, typeResultStart, typeResultEnd);
      sb += typeResultStr;
    }
    if (node.Prop != null) {
      if (formatState.Config.KnotAttrMultiLine) {
        sb += `
${innerIndent}`;
      } else if (!sb.endsWith(" ")) {
        sb += " ";
      }
      const attrStr = this.MapToStringCustom(node.Prop, {
        IndentLevel: formatState.IndentLevel + 1,
        Config: formatState.Config
      }, `${this.SyntaxConfig.KnotSpecialPrefixStr}${this.SyntaxConfig.OrderedMapStartStr}`, this.SyntaxConfig.OrderedMapEndStr);
      sb += attrStr;
    }
    if (node.NamedProp && Object.keys(node.NamedProp).length !== 0) {
      for (const [key, value] of Object.entries(node.NamedProp)) {
        if (formatState.Config.KnotAttrMultiLine) {
          sb += `
${innerIndent}`;
        } else if (!sb.endsWith(" ")) {
          sb += " ";
        }
        const tag = key;
        const valueStr = this.MapToStringCustom(value, {
          IndentLevel: formatState.IndentLevel + 1,
          Config: formatState.Config
        }, `${this.SyntaxConfig.OrderedMapStartStr}`, this.SyntaxConfig.OrderedMapEndStr);
        sb += `${this.SyntaxConfig.KnotSpecialPrefixStr}${tag} ${this.SyntaxConfig.KnotMetadataSeparatorStr} ${valueStr}`;
      }
    }
    if (node.Attr) {
      if (formatState.Config.KnotAttrMultiLine) {
        sb += `
${innerIndent}`;
      } else if (!sb.endsWith(" ")) {
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
          sb += `
${innerIndent}`;
        } else if (!sb.endsWith(" ")) {
          sb += " ";
        }
        const tag = key;
        const valueStr = this.MapToStringCustom(value, {
          IndentLevel: formatState.IndentLevel + 1,
          Config: formatState.Config
        }, `${this.SyntaxConfig.OrderedMapStartStr}`, this.SyntaxConfig.OrderedMapEndStr);
        sb += `${this.SyntaxConfig.KnotSpecialPrefixStr}${tag} ${this.SyntaxConfig.KnotMetadataSeparatorStr} ${valueStr}`;
      }
    }
    if (node.NamedConf && Object.keys(node.NamedConf).length > 0) {
      for (const [key, value] of Object.entries(node.NamedConf)) {
        if (!sb.endsWith(" ")) {
          sb += " ";
        }
        const valueStr = this.MapToStringCustom(value, {
          IndentLevel: formatState.IndentLevel + 1,
          Config: formatState.Config
        }, this.SyntaxConfig.UnorderedMapStartStr, this.SyntaxConfig.UnorderedMapEndStr);
        sb += `${this.SyntaxConfig.KnotSpecialPrefixStr}${key} ${this.SyntaxConfig.KnotMetadataSeparatorStr} ${valueStr}`;
      }
    }
    if (node.NamedSlot && Object.keys(node.NamedSlot).length > 0) {
      for (const [key, value] of Object.entries(node.NamedSlot)) {
        if (formatState.Config.KnotAttrMultiLine) {
          sb += `
${innerIndent}`;
        } else if (!sb.endsWith(" ")) {
          sb += " ";
        }
        const tag = key;
        let valueStr = this.NodeToString(value, {
          IndentLevel: formatState.IndentLevel + 1,
          Config: formatState.Config,
          IndentKnotCore: true
        });
        sb += `${this.SyntaxConfig.KnotSpecialPrefixStr}${tag} ${this.SyntaxConfig.KnotMetadataSeparatorStr} ${valueStr}`;
      }
    }
    if (node.Block != null) {
      if (formatState.Config.KnotAttrMultiLine) {
        sb += `
${innerIndent}`;
      } else if (!sb.endsWith(" ")) {
        sb += " ";
      }
      const blockStr = this.VectorToStringCustom(node.Block, {
        IndentLevel: formatState.IndentLevel + 1,
        Config: formatState.Config
      }, `${this.SyntaxConfig.KnotSpecialPrefixStr}${this.SyntaxConfig.KnotBlockStartStr}`, this.SyntaxConfig.KnotBlockEndStr);
      sb += blockStr;
    }
    if (node.Body != null) {
      if (!sb.endsWith(" ")) {
        sb += " ";
      }
      sb += this.VectorToStringCustom(node.Body, {
        IndentLevel: formatState.IndentLevel + 1,
        Config: formatState.Config
      }, `${this.SyntaxConfig.KnotSpecialPrefixStr}${this.SyntaxConfig.KnotBlockStartStr} `, ` ${this.SyntaxConfig.KnotBlockEndStr}`);
    }
    if (node.NamedBlock && Object.keys(node.NamedBlock).length > 0) {
      for (const [key, value] of Object.entries(node.NamedBlock)) {
        if (formatState.Config.KnotAttrMultiLine) {
          sb += `
${innerIndent}`;
        } else if (!sb.endsWith(" ")) {
          sb += " ";
        }
        const tag = key;
        const valueStr = this.VectorToStringCustom(value, {
          IndentLevel: formatState.IndentLevel + 1,
          Config: formatState.Config
        }, `${this.SyntaxConfig.KnotBlockStartStr}`, this.SyntaxConfig.KnotBlockEndStr);
        sb += `${this.SyntaxConfig.KnotSpecialPrefixStr}${tag} ${this.SyntaxConfig.KnotMetadataSeparatorStr} ${valueStr}`;
      }
    }
    if (node.Sections && Object.keys(node.Sections).length > 0) {
      for (const [key, value] of Object.entries(node.Sections)) {
        if (!sb.endsWith(" ")) {
          sb += " ";
        }
        const valueStr = this.VectorToStringCustom(value, {
          IndentLevel: formatState.IndentLevel + 1,
          Config: formatState.Config
        }, this.SyntaxConfig.KnotBlockStartStr, this.SyntaxConfig.KnotBlockEndStr);
        sb += `${this.SyntaxConfig.KnotSpecialPrefixStr}${key} ${this.SyntaxConfig.KnotMetadataSeparatorStr} ${valueStr}`;
      }
    }
    if (node.Slots && Object.keys(node.Slots).length > 0) {
      for (const [key, value] of Object.entries(node.Slots)) {
        if (!sb.endsWith(" ")) {
          sb += " ";
        }
        const valueStr = this.NodeToString(value, {
          IndentLevel: formatState.IndentLevel + 1,
          Config: formatState.Config,
          IndentKnotCore: true
        });
        sb += `${this.SyntaxConfig.KnotSpecialPrefixStr}${key} ${this.SyntaxConfig.KnotMetadataSeparatorStr} ${valueStr}`;
      }
    }
    return sb;
  }
  TupleValuesToString(tuple) {
    if (!tuple.IsTupleRows()) {
      return tuple.RawValue.filter((item) => item != null).map((item) => this.Stringify(item, false)).join(" ");
    }
    const values = [];
    for (const item of tuple.RawValue) {
      const rawValue = item[2];
      if (Array.isArray(rawValue)) {
        values.push(...rawValue);
      } else {
        values.push(rawValue);
      }
    }
    return values.filter((item) => item != null).map((item) => this.Stringify(item, false)).join(" ");
  }
  InOutTableToString(tuple) {
    const inputs = tuple.RawValue[0]?.[2] ?? [];
    const outputs = tuple.RawValue[1]?.[2] ?? [];
    const inputStr = inputs.map((item) => this.Stringify(item, false)).join(" ");
    const outputStr = outputs.map((item) => this.Stringify(item, false)).join(" ");
    if (!tuple.HasOutputMarker) {
      return `|${inputStr}|`;
    }
    return `|${inputStr}${inputStr && outputStr ? " " : ""}->${outputStr ? " " + outputStr : ""}|`;
  }
}

// ../converter/lib/KnConverter.ts
var KnConverter = {
  Knl: {
    Parser: new KnParserV1(new KnlSyntaxConfig),
    Formater: new KnFormatterV1(new KnlSyntaxConfig)
  },
  Kon: {
    Parser: new KnParserV1(new KonSyntaxConfig),
    Formater: new KnFormatterV1(new KonSyntaxConfig)
  },
  Kjson: {
    Parser: new KnParserV1(new KjsonSyntaxConfig),
    Formater: new KnFormatterV1(new KjsonSyntaxConfig)
  }
};
// ../converter/lib/SyntaxConfig.ts
var SyntaxConfig = {
  PrefixToken: 10 /* ExclamationMark */,
  PrefixStr: "!",
  PrefixTypeToken: 13 /* Colon */,
  PrefixTypeStr: ":",
  SuffixTypeToken: 7 /* Tilde */,
  SuffixTypeStr: "~",
  SuffixComplementToken: 8 /* UpArrow */,
  SuffixComplementStr: "^",
  MapStartToken: 4 /* BeginParenthese */,
  MapEndToken: 5 /* EndParenthese */,
  MapStartStr: "(",
  MapEndStr: ")",
  VectorStartToken: 0 /* BeginCurlyBracket */,
  VectorEndToken: 1 /* EndCurlyBracket */,
  VectorStartStr: "{",
  VectorEndStr: "}",
  KnotStartToken: 2 /* BeginBracket */,
  KnotEndToken: 3 /* EndBracket */,
  KnotStartStr: "[",
  KnotEndStr: "]",
  EnableCommaSeperator: true,
  MapPairSeperatorToken: 24 /* Equal */,
  MapPairSeperatorStr: "=",
  KnotTypeParamBeginToken: 26 /* LowerThan */,
  KnotTypeParamEndToken: 27 /* BiggerThan */,
  KnotTypeParamBeginStr: "<",
  KnotTypeParamEndStr: ">",
  KnotAnnotationBeginStr: "[",
  KnotAnnotationEndStr: "]",
  KnotAnnotationBeginToken: 2 /* BeginBracket */,
  KnotAnnotationEndToken: 3 /* EndBracket */,
  KnotModifierBeginToken: 0 /* BeginCurlyBracket */,
  KnotModifierEndToken: 1 /* EndCurlyBracket */,
  KnotModifierBeginStr: "{",
  KnotModifierEndStr: "}",
  KnotContextParamBeginToken: 4 /* BeginParenthese */,
  KnotContextParamEndToken: 5 /* EndParenthese */,
  KnotContextParamBeginStr: "(",
  KnotContextParamEndStr: ")",
  KnotParamBeginToken: 4 /* BeginParenthese */,
  KnotParamEndToken: 5 /* EndParenthese */,
  KnotParamBeginStr: "(",
  KnotParamEndStr: ")",
  KnotAttrStartToken: 11 /* Percent */,
  KnotAttrEndToken: 11 /* Percent */,
  KnotAttrStartStr: "%",
  KnotAttrEndStr: "%",
  KnotBlockStartToken: 2 /* BeginBracket */,
  KnotBlockEndToken: 3 /* EndBracket */,
  KnotBlockStartStr: "[",
  KnotBlockEndStr: "]"
};
// ../runtime/lib/RuntimeInterpreter/Instruction.ts
var RuntimeOpCode = {
  LandSuccess: "Runtime_LandSuccess",
  LandFail: "Runtime_LandFail",
  RunNode: "Node_RunNode",
  RunBlock: "Node_RunBlock",
  MakeArray: "Node_MakeArray",
  MakeMap: "Node_MakeMap",
  ExpandChain: "Node_ExpandChain",
  ChainStep: "Node_ChainStep",
  RunLastVal: "Node_RunLastVal",
  IterEvalChainNode: "Node_IterEvalChainNode",
  ApplyToFrameTop: "Ctrl_ApplyToFrameTop",
  ApplyToFrameBottom: "Ctrl_ApplyToFrameBottom",
  ApplyCallable: "Ctrl_ApplyCallable",
  CompleteFunctionCall: "Ctrl_CompleteFunctionCall",
  ReturnFromFunction: "Ctrl_ReturnFromFunction",
  MakeContExcludeTopNInstruction: "Ctrl_MakeContExcludeTopNInstruction",
  CaptureContinuation: "Ctrl_CaptureContinuation",
  InvokeWorkflowExtension: "Workflow_InvokeExtension",
  Jump: "Ctrl_Jump",
  JumpIfFalse: "Ctrl_JumpIfFalse",
  IterConditionPairs: "Ctrl_IterConditionPairs",
  SelectConditionBranch: "Ctrl_SelectConditionBranch",
  IterForEachLoop: "Ctrl_IterForEachLoop",
  IterForLoop: "Ctrl_IterForLoop",
  IterForLoopAfterCondition: "Ctrl_IterForLoopAfterCondition",
  ReturnOperands: "Ctrl_ReturnOperands",
  RunGetProperty: "Node_RunGetProperty",
  RunSetProperty: "Node_RunSetProperty",
  RunGetSubscript: "Node_RunGetSubscript",
  RunSetSubscript: "Node_RunSetSubscript",
  CallInstance: "Ctrl_CallInstance",
  ApplyLogicalOperator: "Ctrl_ApplyLogicalOperator",
  BuildInterpolatedString: "String_BuildInterpolated",
  PushValue: "ValStack_PushValue",
  Duplicate: "ValStack_Duplicate",
  SwapTop: "ValStack_SwapTop",
  CollectTopN: "ValStack_CollectTopN",
  WorkflowDispatch: "Workflow_Dispatch"
};
// ../runtime/lib/RuntimeInterpreter/TypeSystemBridge.ts
var activeBridge = null;
function RegisterTypeSystemBridge(bridge) {
  activeBridge = bridge;
}
function ClearTypeSystemBridge() {
  activeBridge = null;
}
function GetTypeSystemBridge() {
  return activeBridge;
}
function RequireTypeSystemBridge() {
  if (activeBridge == null) {
    throw new Error("TypeSystem bridge not registered. Import the kunun package, " + "or call registerTypeSystemBridge() from kunun-type-system.");
  }
  return activeBridge;
}
// ../../node_modules/.bun/depa-actor@..+..+vendor+depa-actor-0.2.0.tgz/node_modules/depa-actor/dist/core/ActorSystem.js
class ActorSystem {
  getRuntime;
  onLog;
  seq = 0;
  cells = new Map;
  constructor(getRuntime, onLog) {
    this.getRuntime = getRuntime;
    this.onLog = onLog;
  }
  ids() {
    return Array.from(this.cells.keys()).sort();
  }
  has(id) {
    return this.cells.has(id);
  }
  register(id, def) {
    if (this.cells.has(id)) {
      throw new Error(`Actor already registered: ${id}`);
    }
    if (!def.handler && !def.handlers) {
      throw new Error(`Actor "${id}" must have at least handler or handlers`);
    }
    this.cells.set(id, {
      id,
      def,
      state: def.initialState,
      queue: [],
      processing: false
    });
  }
  unregister(id) {
    this.cells.delete(id);
  }
  refFrom(from, to) {
    if (!this.cells.has(to))
      return;
    return {
      id: to,
      send: (tag, payload) => this.sendFrom(from, to, tag, payload)
    };
  }
  sendFrom(from, to, tag, payload) {
    const target = this.cells.get(to);
    const envelope = {
      id: ++this.seq,
      ts: Date.now(),
      from,
      to,
      tag,
      payload
    };
    if (!target) {
      this.onLog?.({ kind: "error", ...envelope, error: `Unknown actor: ${to}` });
      return;
    }
    this.onLog?.({ kind: "send", ...envelope });
    target.queue.push(envelope);
    this.scheduleDrain(target);
  }
  broadcastFrom(from, tag, payload, opts) {
    for (const id of this.cells.keys()) {
      if (opts?.excludeSelf && id === from)
        continue;
      this.sendFrom(from, id, tag, payload);
    }
  }
  scheduleDrain(cell) {
    if (cell.processing)
      return;
    cell.processing = true;
    queueMicrotask(() => {
      this.drain(cell);
    });
  }
  async drain(cell) {
    try {
      while (cell.queue.length > 0) {
        const priorities = cell.def.priority ?? {};
        cell.queue.sort((a, b) => {
          const pa = priorities[a.tag] ?? 100;
          const pb = priorities[b.tag] ?? 100;
          return pa - pb;
        });
        const envelope = cell.queue.shift();
        const self = this.makeSelf(cell);
        try {
          await this.dispatch(cell, self, envelope);
          this.onLog?.({ kind: "deliver", ...envelope });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.onLog?.({ kind: "error", ...envelope, error: message });
        }
      }
    } finally {
      cell.processing = false;
      if (cell.queue.length > 0) {
        this.scheduleDrain(cell);
      }
    }
  }
  async dispatch(cell, self, envelope) {
    const tagHandler = cell.def.handlers?.[envelope.tag];
    if (tagHandler) {
      await tagHandler(self, envelope);
    } else if (cell.def.handler) {
      await cell.def.handler(self, envelope);
    } else {
      this.onLog?.({
        kind: "error",
        ...envelope,
        error: `No handler for tag "${envelope.tag}" on actor "${cell.id}"`
      });
    }
  }
  makeSelf(cell) {
    return {
      id: cell.id,
      ref: {
        id: cell.id,
        send: (tag, payload) => this.sendFrom(cell.id, cell.id, tag, payload)
      },
      runtime: this.getRuntime(),
      state: cell.state,
      send: (to, tag, payload) => this.sendFrom(cell.id, to, tag, payload),
      broadcast: (tag, payload, opts) => this.broadcastFrom(cell.id, tag, payload, opts),
      hasPending: (tag) => cell.queue.some((e) => e.tag === tag),
      drainMailbox: (tag) => {
        const matching = [];
        const remaining = [];
        for (const e of cell.queue) {
          if (e.tag === tag) {
            matching.push(e);
          } else {
            remaining.push(e);
          }
        }
        cell.queue.length = 0;
        cell.queue.push(...remaining);
        return matching;
      }
    };
  }
}
// ../../node_modules/.bun/depa-actor@..+..+vendor+depa-actor-0.2.0.tgz/node_modules/depa-actor/dist/runtime/ActorRuntime.js
class ActorRuntime {
  system;
  plugins = [];
  facets = new Map;
  constructor(getRuntime, plugins) {
    this.plugins = plugins ?? [];
    this.system = new ActorSystem(getRuntime, (entry) => this.handleLog(entry));
  }
  addPlugin(plugin) {
    this.plugins.push(plugin);
  }
  hasFacet(name) {
    return this.facets.has(name);
  }
  getFacet(name) {
    return this.facets.get(name);
  }
  setFacet(name, facet) {
    this.facets.set(name, facet);
    return facet;
  }
  ensureFacet(name, create) {
    const existing = this.facets.get(name);
    if (existing !== undefined) {
      return existing;
    }
    const created = create();
    this.facets.set(name, created);
    return created;
  }
  register(id, def) {
    this.system.register(id, def);
    for (const p of this.plugins) {
      p.onRegister?.(id, def);
    }
  }
  unregister(id) {
    this.system.unregister(id);
    for (const p of this.plugins) {
      p.onUnregister?.(id);
    }
  }
  sendFrom(from, to, tag, payload) {
    this.system.sendFrom(from, to, tag, payload);
  }
  refFrom(from, to) {
    return this.system.refFrom(from, to);
  }
  ids() {
    return this.system.ids();
  }
  has(id) {
    return this.system.has(id);
  }
  handleLog(entry) {
    for (const p of this.plugins) {
      p.onLog?.(entry);
    }
  }
}
// ../../node_modules/.bun/depa-actor@..+..+vendor+depa-actor-0.2.0.tgz/node_modules/depa-actor/dist/runtime/completion.js
class CompletionSignalRegistry {
  waiters = new Map;
  subscribe(key, waiter) {
    const current = this.waiters.get(key) ?? new Set;
    current.add(waiter);
    this.waiters.set(key, current);
    return () => {
      const next = this.waiters.get(key);
      if (!next) {
        return;
      }
      next.delete(waiter);
      if (next.size === 0) {
        this.waiters.delete(key);
      }
    };
  }
  resolve(key, result) {
    const waiters = this.waiters.get(key);
    if (!waiters || waiters.size === 0) {
      return;
    }
    this.waiters.delete(key);
    for (const waiter of Array.from(waiters)) {
      waiter(result);
    }
  }
  has(key) {
    return (this.waiters.get(key)?.size ?? 0) > 0;
  }
  count(key) {
    return this.waiters.get(key)?.size ?? 0;
  }
  clear(key) {
    if (key !== undefined) {
      this.waiters.delete(key);
      return;
    }
    this.waiters.clear();
  }
}
// ../../node_modules/.bun/depa-actor@..+..+vendor+depa-actor-0.2.0.tgz/node_modules/depa-actor/dist/runtime/indexing.js
class RuntimeIndexHook {
  entries = new Map;
  constructor(initial) {
    for (const [key, value] of Object.entries(initial ?? {})) {
      this.entries.set(key, value);
    }
  }
  get(key) {
    return this.entries.get(key);
  }
  set(key, value) {
    this.entries.set(key, value);
  }
  delete(key) {
    this.entries.delete(key);
  }
  has(key) {
    return this.entries.has(key);
  }
  values() {
    return Array.from(this.entries.values());
  }
  snapshot() {
    return Object.fromEntries(this.entries.entries());
  }
}
// ../../node_modules/.bun/depa-actor@..+..+vendor+depa-actor-0.2.0.tgz/node_modules/depa-actor/dist/execution/stack.js
class ArrayStackMachine {
  items;
  frameBottoms;
  constructor(state) {
    this.items = [...state?.items ?? []];
    this.frameBottoms = [...state?.frameBottoms ?? []];
    this.validateFrameBottoms();
  }
  get size() {
    return this.items.length;
  }
  get frameDepth() {
    return this.frameBottoms.length;
  }
  push(value) {
    this.items.push(value);
  }
  pushItems(values) {
    for (const value of values) {
      this.push(value);
    }
  }
  pop() {
    return this.items.pop();
  }
  peek() {
    return this.items.at(-1);
  }
  pushFrame() {
    this.frameBottoms.push(this.items.length);
  }
  popFrameAllValues() {
    const frameBottom = this.popFrameBottom();
    return this.items.splice(frameBottom);
  }
  popFrameAndPushTopValue() {
    const values = this.popFrameAllValues();
    const topValue = values.at(-1);
    if (topValue !== undefined) {
      this.items.push(topValue);
    }
    return topValue;
  }
  peekBottomOfAllFrames() {
    return this.items[0];
  }
  snapshot() {
    return {
      items: [...this.items],
      frameBottoms: [...this.frameBottoms]
    };
  }
  loadSnapshot(state) {
    this.items.splice(0, this.items.length, ...state.items ?? []);
    this.frameBottoms.splice(0, this.frameBottoms.length, ...state.frameBottoms ?? []);
    this.validateFrameBottoms();
  }
  popFrameBottom() {
    const frameBottom = this.frameBottoms.pop();
    if (frameBottom === undefined) {
      throw new Error("Cannot pop frame: no frame is open");
    }
    return frameBottom;
  }
  validateFrameBottoms() {
    let previous = 0;
    for (const frameBottom of this.frameBottoms) {
      if (!Number.isInteger(frameBottom) || frameBottom < previous || frameBottom > this.items.length) {
        throw new Error(`Invalid frame bottom index: ${frameBottom}`);
      }
      previous = frameBottom;
    }
  }
}
function createStackMachine(state) {
  return new ArrayStackMachine(state);
}
function createInstructionStack(state) {
  return createStackMachine(state);
}
function createOperandStack(state) {
  return createStackMachine(state);
}
// ../../node_modules/.bun/depa-actor@..+..+vendor+depa-actor-0.2.0.tgz/node_modules/depa-actor/dist/execution/dispatcher.js
function dispatchInstructions(context, resolveHandler, options) {
  const maxInstructions = options?.maxInstructions ?? Number.POSITIVE_INFINITY;
  const effects = [];
  const trace = [];
  let executed = 0;
  const finish = (stopReason, stopDetail, error) => {
    options?.hooks?.onStop?.({ stopReason, stopDetail, executed });
    const result = { executed, stopReason, effects, trace };
    if (stopDetail !== undefined) {
      result.stopDetail = stopDetail;
    }
    if (error !== undefined) {
      result.error = error;
    }
    return result;
  };
  while (executed < maxInstructions) {
    const customStop = options?.shouldStop?.({ executed });
    if (customStop) {
      return finish("custom", customStop);
    }
    const instruction = context.instructionStack.pop();
    if (!instruction) {
      return finish("instruction_stack_empty");
    }
    options?.hooks?.beforeInstruction?.({ instruction, executed });
    const handler = resolveHandler(instruction.opcode);
    if (!handler) {
      trace.push({ instruction, result: "missing_handler" });
      options?.hooks?.afterInstruction?.({ instruction, executed, result: "missing_handler" });
      return finish("missing_handler");
    }
    try {
      const handlerResult = handler({
        runtime: context.runtime,
        instruction,
        instructionStack: context.instructionStack,
        operandStack: context.operandStack
      });
      executed += 1;
      if (handlerResult?.effects) {
        effects.push(...handlerResult.effects);
        options?.hooks?.onHandlerEffects?.({
          instruction,
          effects: handlerResult.effects,
          executed
        });
      }
      if (handlerResult?.yield) {
        trace.push({ instruction, result: "yield" });
        const stopDetail = handlerResult.yieldReason;
        options?.hooks?.afterInstruction?.({ instruction, executed, result: "yield" });
        return finish("yield_requested", stopDetail);
      }
      if (handlerResult?.stop) {
        trace.push({ instruction, result: "stop" });
        const stopDetail = handlerResult.stopReason;
        const stopReason = stopDetail === undefined ? "handler_requested_stop" : "custom";
        options?.hooks?.afterInstruction?.({ instruction, executed, result: "stop" });
        return finish(stopReason, stopDetail);
      }
      trace.push({ instruction, result: "ok" });
      options?.hooks?.afterInstruction?.({ instruction, executed, result: "ok" });
    } catch (error) {
      trace.push({
        instruction,
        result: "error",
        error: error instanceof Error ? error.message : String(error)
      });
      options?.hooks?.afterInstruction?.({ instruction, executed, result: "error" });
      return finish("error", undefined, error);
    }
  }
  return finish("budget_exhausted");
}
// ../runtime/lib/RuntimeInterpreter/RuntimeFiber.ts
var RuntimeFiberStatus;
((RuntimeFiberStatus2) => {
  RuntimeFiberStatus2["Runnable"] = "Runnable";
  RuntimeFiberStatus2["Running"] = "Running";
  RuntimeFiberStatus2["Idle"] = "Idle";
  RuntimeFiberStatus2["Suspended"] = "Suspended";
  RuntimeFiberStatus2["Dead"] = "Dead";
})(RuntimeFiberStatus ||= {});

class RuntimeFiber {
  static nextId = 1;
  id;
  parentFiberId = 0;
  status = "Runnable" /* Runnable */;
  currentEnvId = 0;
  instructionStack;
  operandStack;
  constructor(id) {
    this.id = id ?? RuntimeFiber.nextId;
    RuntimeFiber.nextId = Math.max(RuntimeFiber.nextId, this.id + 1);
    this.instructionStack = createInstructionStack();
    this.operandStack = createOperandStack();
    this.operandStack.pushFrame();
  }
  static CreateRootFiber(currentEnvId) {
    const fiber = new RuntimeFiber;
    fiber.status = "Running" /* Running */;
    fiber.currentEnvId = currentEnvId;
    return fiber;
  }
  static FromSnapshot(snapshot) {
    const fiber = new RuntimeFiber(snapshot.id);
    fiber.parentFiberId = snapshot.parentFiberId;
    fiber.status = snapshot.status;
    fiber.currentEnvId = snapshot.currentEnvId;
    fiber.instructionStack.loadSnapshot(snapshot.instructionStack);
    fiber.operandStack.loadSnapshot(snapshot.operandStack);
    return fiber;
  }
  toSnapshot() {
    return {
      id: this.id,
      parentFiberId: this.parentFiberId,
      status: this.status,
      currentEnvId: this.currentEnvId,
      instructionStack: this.instructionStack.snapshot(),
      operandStack: this.operandStack.snapshot()
    };
  }
}
// ../core/lib/StateManagement/Env.ts
class Env {
  static nextEnvId = 1;
  Id;
  Variables = new Map;
  EnvType;
  ParentEnv;
  constructor() {
    this.Id = Env.nextEnvId;
    this.EnvType = 3 /* Local */;
    Env.nextEnvId += 1;
  }
  static CreateRootEnv() {
    let env = new Env;
    env.EnvType = 0 /* BuildIn */;
    return env;
  }
  static CreateChildEnv(envType, parentEnv) {
    let env = new Env;
    env.EnvType = envType;
    env.ParentEnv = parentEnv;
    return env;
  }
  static CreateBuildInEnv() {
    return Env.CreateRootEnv();
  }
  static CreateGlobalEnv(parentEnv) {
    return Env.CreateChildEnv(1 /* Global */, parentEnv);
  }
  static CreateProcessEnv(parentEnv) {
    return Env.CreateChildEnv(2 /* Process */, parentEnv);
  }
  static CreateLocalEnv(parentEnv) {
    return Env.CreateChildEnv(3 /* Local */, parentEnv);
  }
  static CreateFromSnapshot(snapshot) {
    let env = new Env;
    env.Id = snapshot.id;
    env.EnvType = snapshot.envType;
    env.ParentEnv = null;
    env.Variables = new Map(snapshot.variables ?? []);
    Env.nextEnvId = Math.max(Env.nextEnvId, snapshot.id + 1);
    return env;
  }
  ToSnapshot(parentEnvId = this.ParentEnv?.Id ?? 0) {
    return {
      id: this.Id,
      envType: this.EnvType,
      parentEnvId,
      variables: Array.from(this.Variables.entries()).map(([key, value]) => [String(key), value])
    };
  }
  Define(key, value) {
    this.Variables.set(key, value);
  }
  GetVertexId() {
    return this.Id;
  }
  ContainsVar(key) {
    return this.Variables.has(key);
  }
  Lookup(key) {
    return this.Variables.get(key);
  }
}

// ../core/lib/Util/ArrayExt.ts
class ArrayExt {
  static AddAll(lhs, rhs) {
    for (let v of rhs) {
      lhs.push(v);
    }
  }
  static FromSet(set) {
    let r = [];
    for (let v of set) {
      r.push(v);
    }
    return r;
  }
  static Contains(arr, item) {
    if (arr == null) {
      return false;
    }
    for (let i = 0;i < arr.length; i++) {
      if (arr[i] === item) {
        return true;
      }
    }
    return false;
  }
}

// ../core/lib/Util/MapExt.ts
class MapExt {
  static CopySetValue(map, key) {
    let r = new Set;
    if (map.has(key)) {
      let valuEofKey = map.get(key);
      for (let id of valuEofKey) {
        r.add(id);
      }
    }
    return r;
  }
  static NewValuesSet(map) {
    let r = new Set;
    for (let v of map.values()) {
      r.add(v);
    }
    return r;
  }
  static getOrDefault(map, key, defaultValue) {
    if (map.has(key)) {
      return map.get(key);
    }
    return defaultValue;
  }
  static ComputeIfAbsent(map, key, defaultProvider) {
    if (map.has(key)) {
      return map.get(key);
    }
    let v = defaultProvider(key);
    map.set(key, v);
    return v;
  }
}

// ../core/lib/Util/SetExt.ts
class SetExt {
  static CreateBySet(values) {
    let r = new Set;
    for (let v of values) {
      r.add(v);
    }
    return r;
  }
  static AddAll(lhs, rhs) {
    for (let v of rhs) {
      lhs.add(v);
    }
  }
  static RemoveAll(lhs, rhs) {
    for (let v of rhs) {
      lhs.delete(v);
    }
  }
}

// ../core/lib/Algo/SingleEntryGraph.ts
class SingleEntryGraph {
  vertexDetailMap = new Map;
  vertexIds = new Set;
  entryVertexId = null;
  nextIdsMap = new Map;
  prevIdsMap = new Map;
  constructor() {}
  SetEntryVertexId(rootId) {
    this.entryVertexId = rootId;
  }
  GetEntryVertexId() {
    return this.entryVertexId;
  }
  GetEntryVertex() {
    return this.vertexDetailMap.get(this.entryVertexId);
  }
  GetNextIdsMap() {
    return this.nextIdsMap;
  }
  GetNextIds(vertextId) {
    if (this.nextIdsMap.has(vertextId)) {
      return this.nextIdsMap.get(vertextId);
    } else {
      return new Set;
    }
  }
  GetNextVertexDetails(vertexId) {
    let nextIds = this.GetNextIds(vertexId);
    return this.GetVertexDetailsByIds(nextIds);
  }
  AddVertex(vertexDetail) {
    if (this.vertexIds.has(vertexDetail.GetVertexId())) {
      return;
    }
    this.vertexDetailMap.set(vertexDetail.GetVertexId(), vertexDetail);
    this.vertexIds.add(vertexDetail.GetVertexId());
  }
  RemoveVertexAndNeighborEdges(vertexId) {
    let vertexNextIds = MapExt.CopySetValue(this.nextIdsMap, vertexId);
    let vertexPrevIds = MapExt.CopySetValue(this.prevIdsMap, vertexId);
    for (let nextVertexId of vertexNextIds) {
      this.RemoveEdge(vertexId, nextVertexId);
    }
    for (let prevVertexId of vertexPrevIds) {
      this.RemoveEdge(prevVertexId, vertexId);
    }
    this.vertexDetailMap.delete(vertexId);
    this.vertexIds.delete(vertexId);
  }
  RemoveVertexAndConnectNeighborEdges(vertexId) {
    let vertexNextIds = MapExt.CopySetValue(this.nextIdsMap, vertexId);
    let vertexPrevIds = MapExt.CopySetValue(this.prevIdsMap, vertexId);
    this.RemoveVertexAndNeighborEdges(vertexId);
    for (let vertexPrevId of vertexPrevIds) {
      for (let vertextNextId of vertexNextIds) {
        this.AddEdge(vertexPrevId, vertextNextId);
      }
    }
  }
  AddEdge(prevId, nextId) {
    if (!this.vertexIds.has(prevId) || !this.vertexIds.has(nextId)) {
      return;
    }
    let nextIds = MapExt.ComputeIfAbsent(this.nextIdsMap, prevId, (id) => new Set);
    let prevIds = MapExt.ComputeIfAbsent(this.prevIdsMap, nextId, (id) => new Set);
    nextIds.add(nextId);
    prevIds.add(prevId);
  }
  RemoveEdge(prevId, nextId) {
    let nextIds = MapExt.ComputeIfAbsent(this.nextIdsMap, prevId, (id) => new Set);
    let prevIds = MapExt.ComputeIfAbsent(this.prevIdsMap, nextId, (id) => new Set);
    nextIds.delete(nextId);
    if (nextIds.size <= 0) {
      this.nextIdsMap.delete(prevId);
    }
    prevIds.delete(prevId);
    if (prevIds.size <= 0) {
      this.prevIdsMap.delete(nextId);
    }
  }
  AppendDAG(appendAfterVertexIds, otherDAG) {
    if (otherDAG == null) {
      return;
    }
    let otherEntryVertexId = otherDAG.GetEntryVertexId();
    let otherReachableVertexes = otherDAG.GetReachableVertexes();
    let otherNextIdsMap = otherDAG.GetNextIdsMap();
    for (let otherReachableVertex of otherReachableVertexes) {
      this.AddVertex(otherReachableVertex);
    }
    for (let appendAfterVertexId of appendAfterVertexIds) {
      this.AddEdge(appendAfterVertexId, otherEntryVertexId);
    }
    for (let [vertexEdgesStartId, vertexEdgesEndIds] of otherNextIdsMap) {
      for (let vertexEdgesEndId of vertexEdgesEndIds) {
        this.AddEdge(vertexEdgesStartId, vertexEdgesEndId);
      }
    }
  }
  GetReachableVertexes() {
    let reachableVertexIds = this.GetReachableVertexIds();
    let result = new Set;
    for (let vertexId of reachableVertexIds) {
      let detail = this.vertexDetailMap.get(vertexId);
      result.add(detail);
    }
    return result;
  }
  GetVertexesIncludeUnreachable() {
    return MapExt.NewValuesSet(this.vertexDetailMap);
  }
  GetVertexeIdsIncludeUnreachable() {
    return SetExt.CreateBySet(this.vertexIds);
  }
  GetUnreachableVertexeIds() {
    let reachableVertexIds = this.GetReachableVertexIds();
    let unreachableVertexIds = SetExt.CreateBySet(this.vertexIds);
    SetExt.RemoveAll(unreachableVertexIds, reachableVertexIds);
    return unreachableVertexIds;
  }
  GetUnreachableVertexes() {
    let unreachableVertexIds = this.GetUnreachableVertexeIds();
    let result = new Set;
    for (let vertexId of unreachableVertexIds) {
      let detail = this.vertexDetailMap.get(vertexId);
      result.add(detail);
    }
    return result;
  }
  GetReachableVertexIds() {
    return this.QueryReachableVertexIds(this.nextIdsMap, this.entryVertexId, true);
  }
  GetAllVertexDetailsFromEntryToVertex(queryFromVertexId, includeSelf) {
    let prevVertexIds = this.GetAllVertexIdsFromEntryToVertex(queryFromVertexId, includeSelf);
    return this.GetVertexDetailsByIds(prevVertexIds);
  }
  GetAllVertexIdsFromEntryToVertex(queryFromVertexId, includeSelf) {
    let prePathIds = new Set;
    if (includeSelf) {
      prePathIds.add(queryFromVertexId);
    }
    let queue = [];
    queue.push(queryFromVertexId);
    let visited = new Set;
    while (queue.length > 0) {
      let levelSize = queue.length;
      for (let i = 0;i < levelSize; i++) {
        let vertexId = queue.shift();
        if (visited.has(vertexId)) {
          continue;
        }
        visited.add(vertexId);
        let prevVertexIds = MapExt.getOrDefault(this.prevIdsMap, vertexId, new Set);
        SetExt.AddAll(prePathIds, prevVertexIds);
        ArrayExt.AddAll(queue, prevVertexIds);
      }
    }
    return prePathIds;
  }
  QueryReachableVertexIds(nextIdsMap, fromId, includeFromId) {
    let result = new Set;
    if (includeFromId) {
      result.add(fromId);
    }
    let queue = [];
    queue.push(fromId);
    let visited = new Set;
    while (queue.length > 0) {
      let levelSize = queue.length;
      for (let i = 0;i < levelSize; i++) {
        let vertexId = queue.shift();
        if (visited.has(vertexId)) {
          continue;
        }
        visited.add(vertexId);
        let nextVertexIds = MapExt.getOrDefault(this.nextIdsMap, vertexId, new Set);
        SetExt.AddAll(result, nextVertexIds);
        ArrayExt.AddAll(queue, nextVertexIds);
      }
    }
    return result;
  }
  GetEndVertexIds() {
    let result = new Set;
    let reachableVertexIds = this.GetReachableVertexIds();
    for (let vertexId of reachableVertexIds) {
      let nextIds = MapExt.getOrDefault(this.nextIdsMap, vertexId, new Set);
      if (nextIds.size <= 0) {
        result.add(vertexId);
      }
    }
    return result;
  }
  GetPrevVertexIds(vertexId) {
    let prevVertexIds = MapExt.getOrDefault(this.prevIdsMap, vertexId, new Set);
    return SetExt.CreateBySet(prevVertexIds);
  }
  GetPrevVertexesById(vertexId) {
    let prevVertexIds = this.GetPrevVertexIds(vertexId);
    return this.GetVertexDetailsByIds(prevVertexIds);
  }
  GetVertexDetailsByIds(vertexIds) {
    let result = new Set;
    for (let id of vertexIds) {
      let vertexDetail = this.vertexDetailMap.get(id);
      result.add(vertexDetail);
    }
    return result;
  }
  GetVertexDetail(vertexId) {
    return this.vertexDetailMap.get(vertexId);
  }
}

// ../core/lib/StateManagement/EnvTree.ts
class EnvTree extends SingleEntryGraph {
  GetParentEnv(envId) {
    let prevIdSet = this.GetPrevVertexIds(envId);
    let prevIdArr = ArrayExt.FromSet(prevIdSet);
    if (prevIdArr.length > 0) {
      return this.GetVertexDetail(prevIdArr[0]);
    } else {
      return null;
    }
  }
  LookupDeclareEnv(fromEnv, key) {
    let lookupIter = fromEnv;
    while (lookupIter != null) {
      let containsVar = lookupIter.ContainsVar(key);
      if (containsVar) {
        return lookupIter;
      } else {
        lookupIter = this.GetParentEnv(lookupIter.Id);
      }
    }
    return fromEnv;
  }
}

// ../runtime/lib/RuntimeInterpreter/RuntimeObject.ts
class RuntimeClassDefinition {
  name;
  kind = "RuntimeClassDefinition";
  fields = [];
  constructorDef = { params: [], body: [] };
  methods = {};
  properties = {};
  constructor(name) {
    this.name = name;
  }
}

class RuntimeObject {
  fields = {};
  methods = {};
  properties = {};
  setField(name, value) {
    this.fields[name] = value;
  }
  getField(name) {
    return this.fields[name] ?? null;
  }
  getFieldNames() {
    return Object.keys(this.fields);
  }
  hasField(name) {
    return Object.prototype.hasOwnProperty.call(this.fields, name);
  }
  addMethod(name, method) {
    this.methods[name] = method;
  }
  getMethod(name) {
    return this.methods[name] ?? null;
  }
  getMethodNames() {
    return Object.keys(this.methods);
  }
  hasMethod(name) {
    return this.methods[name] != null;
  }
  defineProperty(name, descriptor) {
    this.properties[name] = descriptor;
  }
  getProperty(name) {
    const property = this.properties[name];
    if (property?.get != null) {
      return property.get(this);
    }
    return this.getField(name);
  }
  setProperty(name, value) {
    const property = this.properties[name];
    if (property?.set != null) {
      property.set(this, value);
      return;
    }
    this.setField(name, value);
  }
}

// ../runtime/lib/RuntimeInterpreter/RuntimeState.ts
class RuntimeReturnSignal {
  value;
  constructor(value) {
    this.value = value;
  }
}

class RuntimeBreakSignal {
}

class RuntimeContinueSignal {
}

class RuntimeContinuationResumeSignal {
  value;
  restoreEnvId;
  constructor(value, restoreEnvId) {
    this.value = value;
    this.restoreEnvId = restoreEnvId;
  }
}

class RuntimeState {
  envTree = new EnvTree;
  fibers = [];
  instructionHistory = [];
  typedRuntimeContext;
  prototypeResolver;
  instructionHandlers = {};
  nodeExpanders = {};
  prefixKeywordExpanders = {};
  infixKeywordExpanders = {};
  hostFunctions = {};
  hostFunctionArities = {};
  hostFunctionVariadic = {};
  effectHandlers = [];
  activeEffectHandlerMaps = [];
  namedEffectHandlers = {};
  workflowExtensions = {};
  builtinMethods = {};
  ioHost = {};
  timerHost = {
    setTimeout: (handler, timeout) => setTimeout(handler, timeout),
    clearTimeout: (handle) => clearTimeout(handle),
    setInterval: (handler, interval) => setInterval(handler, interval),
    clearInterval: (handle) => clearInterval(handle)
  };
  resumeFiberTokens = [];
  classDefinitions = {};
  controlFrames = [];
  pendingAbruptCompletion = null;
  pendingWorkflowJobs = [];
  constructor() {
    const buildInEnv = Env.CreateBuildInEnv();
    this.envTree.AddVertex(buildInEnv);
    this.envTree.SetEntryVertexId(buildInEnv.Id);
    const globalEnv = Env.CreateGlobalEnv(buildInEnv);
    this.envTree.AddVertex(globalEnv);
    this.envTree.AddEdge(buildInEnv.GetVertexId(), globalEnv.GetVertexId());
    this.registerDefaultBuiltinMethods();
    this.createRootFiber();
  }
  get currentEnvId() {
    return this.getCurrentFiber().currentEnvId;
  }
  createRootFiber() {
    const fiber = RuntimeFiber.CreateRootFiber(this.getGlobalEnv().Id);
    this.fibers = [fiber];
    return fiber;
  }
  createFiber(parentFiber = this.getCurrentFiber(), status = "Runnable" /* Runnable */) {
    const fiber = new RuntimeFiber;
    fiber.parentFiberId = parentFiber.id;
    fiber.currentEnvId = parentFiber.currentEnvId;
    fiber.status = status;
    this.fibers.push(fiber);
    return fiber;
  }
  getFiberById(fiberId) {
    return this.fibers.find((fiber) => fiber.id === fiberId) ?? null;
  }
  getCurrentFiber() {
    const running = this.fibers.find((fiber) => fiber.status === "Running" /* Running */);
    if (running != null) {
      return running;
    }
    const runnable = this.fibers.find((fiber) => fiber.status === "Runnable" /* Runnable */);
    if (runnable != null) {
      runnable.status = "Running" /* Running */;
      return runnable;
    }
    return this.fibers[0];
  }
  switchToFiber(fiberId, oldFiberStatus = "Runnable" /* Runnable */) {
    const current = this.getCurrentFiber();
    const next = this.getFiberById(fiberId);
    if (next == null) {
      throw new Error(`Fiber not found: ${fiberId}`);
    }
    if (current != null && current.id !== next.id) {
      current.status = oldFiberStatus;
    }
    next.status = "Running" /* Running */;
    return next;
  }
  awakenFibers(fiberIds) {
    for (const fiberId of fiberIds) {
      const fiber = this.getFiberById(fiberId);
      if (fiber != null && fiber.status !== "Dead" /* Dead */) {
        fiber.status = "Runnable" /* Runnable */;
      }
    }
  }
  yieldToParentAndChangeCurrentFiberState(status) {
    const current = this.getCurrentFiber();
    if (current.parentFiberId == null || current.parentFiberId === 0) {
      current.status = status;
      return current;
    }
    return this.switchToFiber(current.parentFiberId, status);
  }
  yieldToFiberAndChangeCurrentFiberState(fiberId, status) {
    const current = this.getCurrentFiber();
    const values = current.operandStack.popFrameAllValues();
    const next = this.switchToFiber(fiberId, status);
    for (const value of values) {
      next.operandStack.push(value);
    }
    return next;
  }
  finalizeCurrentFiber() {
    const fiber = this.getCurrentFiber();
    fiber.status = "Dead" /* Dead */;
    return { fiberId: fiber.id };
  }
  getRunnableFiberWithWork() {
    return this.fibers.find((fiber) => (fiber.status === "Running" /* Running */ || fiber.status === "Runnable" /* Runnable */) && fiber.instructionStack.peek() != null) ?? null;
  }
  hasLiveFiberWork() {
    return this.fibers.some((fiber) => fiber.status !== "Dead" /* Dead */ && fiber.instructionStack.peek() != null);
  }
  switchToNextRunnableFiberWithWork() {
    const next = this.getRunnableFiberWithWork();
    if (next == null) {
      return null;
    }
    for (const fiber of this.fibers) {
      if (fiber.status === "Running" /* Running */ && fiber.id !== next.id) {
        fiber.status = "Runnable" /* Runnable */;
      }
    }
    next.status = "Running" /* Running */;
    return next;
  }
  currentFiberToIdle() {
    const fiber = this.getCurrentFiber();
    fiber.status = "Idle" /* Idle */;
    return { fiberId: fiber.id };
  }
  suspendCurrentFiber() {
    const fiber = this.getCurrentFiber();
    fiber.status = "Suspended" /* Suspended */;
    return { fiberId: fiber.id };
  }
  addResumeFiberToken(token) {
    this.resumeFiberTokens.push(token);
  }
  consumeResumeFiberToken() {
    const token = this.resumeFiberTokens.shift();
    if (token == null) {
      return null;
    }
    const fiber = this.getFiberById(token.fiberId);
    if (fiber == null) {
      throw new Error(`Resume fiber not found: ${token.fiberId}`);
    }
    for (let i = (token.beforeResumeOps?.length ?? 0) - 1;i >= 0; i--) {
      fiber.instructionStack.push(token.beforeResumeOps[i]);
    }
    for (const value of token.result ?? []) {
      fiber.operandStack.push(value);
    }
    fiber.status = "Runnable" /* Runnable */;
    return token;
  }
  getResumeFiberTokenCount() {
    return this.resumeFiberTokens.length;
  }
  consumeAllResumeFiberTokens() {
    const tokens = [];
    while (this.getResumeFiberTokenCount() > 0) {
      tokens.push(this.consumeResumeFiberToken());
    }
    return tokens;
  }
  pushControlFrame(frame) {
    this.controlFrames.push({ ...frame });
  }
  popControlFrame() {
    return this.controlFrames.pop() ?? null;
  }
  popControlFramesUntil(kind) {
    const popped = [];
    while (this.controlFrames.length > 0) {
      const frame = this.popControlFrame();
      popped.push(frame);
      if (frame.kind === kind) {
        return popped;
      }
    }
    return popped;
  }
  getControlFrames() {
    return this.controlFrames.map((frame) => ({ ...frame }));
  }
  restoreActiveEffectHandlerMaps(maps) {
    this.activeEffectHandlerMaps = (maps ?? []).map((map) => ({ ...map }));
  }
  setPendingAbruptCompletion(completion) {
    this.pendingAbruptCompletion = completion == null ? null : { ...completion };
  }
  getPendingAbruptCompletion() {
    return this.pendingAbruptCompletion == null ? null : { ...this.pendingAbruptCompletion };
  }
  setPendingWorkflowJobs(jobs) {
    this.pendingWorkflowJobs = this.clonePendingWorkflowJobs(jobs);
  }
  getPendingWorkflowJobs() {
    return this.clonePendingWorkflowJobs(this.pendingWorkflowJobs);
  }
  clearPendingWorkflowJobs() {
    this.pendingWorkflowJobs = [];
  }
  getRootEnv() {
    return this.envTree.GetEntryVertex();
  }
  getGlobalEnv() {
    const rootEnv = this.getRootEnv();
    const envSetUnderRoot = this.envTree.GetNextVertexDetails(rootEnv.GetVertexId());
    for (const item of envSetUnderRoot) {
      if (item.EnvType === 1 /* Global */) {
        return item;
      }
    }
    return rootEnv;
  }
  getCurrentEnv() {
    return this.envTree.GetVertexDetail(this.currentEnvId);
  }
  changeEnvById(envId) {
    const env = this.envTree.GetVertexDetail(envId);
    if (env == null) {
      throw new Error(`Env not found: ${envId}`);
    }
    this.getCurrentFiber().currentEnvId = envId;
  }
  diveProcessEnv(name = "process") {
    const env = Env.CreateProcessEnv(this.getCurrentEnv());
    this.envTree.AddVertex(env);
    this.envTree.AddEdge(this.getCurrentEnv().GetVertexId(), env.GetVertexId());
    this.changeEnvById(env.Id);
    return env;
  }
  diveLocalEnv(name = "local") {
    const env = Env.CreateLocalEnv(this.getCurrentEnv());
    this.envTree.AddVertex(env);
    this.envTree.AddEdge(this.getCurrentEnv().GetVertexId(), env.GetVertexId());
    this.changeEnvById(env.Id);
    return env;
  }
  makeSubLocalEnvUnderEnv(parentEnvId, name = "local") {
    const parent = this.envTree.GetVertexDetail(parentEnvId);
    if (parent == null) {
      throw new Error(`Parent env not found: ${parentEnvId}`);
    }
    const env = Env.CreateLocalEnv(parent);
    this.envTree.AddVertex(env);
    this.envTree.AddEdge(parent.GetVertexId(), env.GetVertexId());
    this.changeEnvById(env.Id);
    return env;
  }
  riseEnv() {
    const parent = this.envTree.GetParentEnv(this.currentEnvId);
    if (parent == null) {
      throw new Error("Cannot rise from root env");
    }
    this.changeEnvById(parent.Id);
    return parent;
  }
  lookup(key) {
    const declareEnv = this.envTree.LookupDeclareEnv(this.getCurrentEnv(), key);
    return declareEnv.Lookup(key);
  }
  hasBinding(key) {
    const declareEnv = this.envTree.LookupDeclareEnv(this.getCurrentEnv(), key);
    return declareEnv.ContainsVar(key);
  }
  define(key, obj) {
    this.getCurrentEnv().Define(key, obj);
  }
  defineGlobal(key, obj) {
    this.getGlobalEnv().Define(key, obj);
  }
  setVar(key, obj) {
    const declareEnv = this.envTree.LookupDeclareEnv(this.getCurrentEnv(), key);
    declareEnv.Define(key, obj);
  }
  setGlobal(key, obj) {
    this.getGlobalEnv().Define(key, obj);
  }
  bindEnvByMap(values) {
    if (values instanceof Map) {
      for (const [key, value] of values.entries()) {
        this.define(String(key), value);
      }
      return;
    }
    for (const [key, value] of Object.entries(values)) {
      this.define(key, value);
    }
  }
  registerClassDefinition(classDef) {
    this.classDefinitions[classDef.name] = classDef;
    this.define(classDef.name, classDef);
  }
  getClassDefinition(name) {
    return this.classDefinitions[name] ?? null;
  }
  createLambda(params, body, name) {
    return {
      kind: "RuntimeLambdaFunction",
      name,
      params,
      body,
      closureValues: this.snapshotVisibleEnvValues(),
      definitionEnvId: this.currentEnvId
    };
  }
  callRuntimeFunction(fn, args) {
    if (typeof fn === "function") {
      return fn(...args);
    }
    const previousFiber = this.getCurrentFiber();
    const previousEnvId = previousFiber.currentEnvId;
    const localEnv = Env.CreateLocalEnv(this.getCurrentEnv());
    this.envTree.AddVertex(localEnv);
    this.envTree.AddEdge(previousEnvId, localEnv.GetVertexId());
    previousFiber.currentEnvId = localEnv.Id;
    let restoreEnvId = previousEnvId;
    try {
      for (const [key, value] of Object.entries(fn.closureValues)) {
        localEnv.Define(key, value);
      }
      for (let i = 0;i < fn.params.length; i++) {
        localEnv.Define(fn.params[i], args[i]);
      }
      let result = null;
      for (const item of fn.body) {
        try {
          result = typeof item === "function" ? item(this) : item;
        } catch (error) {
          if (error instanceof RuntimeReturnSignal) {
            return error.value;
          }
          if (error instanceof RuntimeContinuationResumeSignal) {
            restoreEnvId = error.restoreEnvId;
            return error.value;
          }
          throw error;
        }
      }
      return result;
    } finally {
      previousFiber.currentEnvId = restoreEnvId;
    }
  }
  withEffectHandler(name, handler, body) {
    this.effectHandlers.push({ name, handler });
    try {
      return body();
    } finally {
      this.effectHandlers.pop();
    }
  }
  performEffect(name, payload) {
    for (let i = this.effectHandlers.length - 1;i >= 0; i--) {
      const item = this.effectHandlers[i];
      if (item.name === name) {
        return item.handler(payload, this);
      }
    }
    return payload;
  }
  pushActiveEffectHandlerMap(map) {
    this.activeEffectHandlerMaps.push({ ...map });
  }
  popActiveEffectHandlerMap() {
    return this.activeEffectHandlerMaps.pop() ?? null;
  }
  withActiveEffectHandlerMap(map, body) {
    this.pushActiveEffectHandlerMap(map);
    try {
      return body();
    } finally {
      this.popActiveEffectHandlerMap();
    }
  }
  getActiveEffectHandler(effectName) {
    for (let i = this.activeEffectHandlerMaps.length - 1;i >= 0; i--) {
      const handler = this.activeEffectHandlerMaps[i][effectName];
      if (handler != null) {
        return handler;
      }
    }
    return null;
  }
  getActiveEffectHandlerMap() {
    return Object.assign({}, ...this.activeEffectHandlerMaps);
  }
  registerNamedEffectHandler(handlerName, effectNames) {
    this.namedEffectHandlers[handlerName] = [...effectNames];
  }
  getNamedEffectHandlerEffects(handlerName) {
    return [...this.namedEffectHandlers[handlerName] ?? []];
  }
  captureContinuation(excludeTopN = 0) {
    const fiber = this.getCurrentFiber();
    const operandSnapshot = fiber.operandStack.snapshot();
    const instructionSnapshot = fiber.instructionStack.snapshot();
    const instructionItems = instructionSnapshot.items.slice(0, Math.max(instructionSnapshot.items.length - excludeTopN, 0));
    return {
      currentEnvId: fiber.currentEnvId,
      operandItems: [...operandSnapshot.items],
      operandFrameBottoms: [...operandSnapshot.frameBottoms],
      instructionItems,
      instructionFrameBottoms: instructionSnapshot.frameBottoms.filter((frameBottom) => frameBottom <= instructionItems.length),
      activeEffectHandlerMaps: this.activeEffectHandlerMaps.map((map) => ({ ...map }))
    };
  }
  restoreContinuation(continuation, operands = []) {
    const fiber = this.getCurrentFiber();
    this.changeEnvById(continuation.currentEnvId);
    fiber.operandStack.loadSnapshot({
      items: [...continuation.operandItems],
      frameBottoms: [...continuation.operandFrameBottoms]
    });
    fiber.instructionStack.loadSnapshot({
      items: [...continuation.instructionItems],
      frameBottoms: [...continuation.instructionFrameBottoms]
    });
    this.activeEffectHandlerMaps = continuation.activeEffectHandlerMaps.map((map) => ({ ...map }));
    for (const operand of operands) {
      fiber.operandStack.push(operand);
    }
  }
  captureSnapshot(options = {}) {
    const snapshot = this.buildSnapshot();
    if (options.strict === true) {
      RuntimeState.assertSnapshotSerializable(snapshot);
    }
    return snapshot;
  }
  static assertSnapshotSerializable(value, path = "snapshot", seen = new Set) {
    if (value == null) {
      return;
    }
    const valueType = typeof value;
    if (valueType === "function") {
      throw new Error(`Snapshot value at ${path} is not JSON-serializable: function`);
    }
    if (valueType === "bigint" || valueType === "symbol") {
      throw new Error(`Snapshot value at ${path} is not JSON-serializable: ${valueType}`);
    }
    if (valueType !== "object") {
      return;
    }
    if (seen.has(value)) {
      throw new Error(`Snapshot value at ${path} contains a circular reference`);
    }
    seen.add(value);
    try {
      if (Array.isArray(value)) {
        for (let i = 0;i < value.length; i++) {
          RuntimeState.assertSnapshotSerializable(value[i], `${path}[${i}]`, seen);
        }
        return;
      }
      for (const [key, child] of Object.entries(value)) {
        RuntimeState.assertSnapshotSerializable(child, `${path}.${key}`, seen);
      }
    } finally {
      seen.delete(value);
    }
  }
  buildSnapshot() {
    const currentFiber = this.getCurrentFiber();
    return {
      version: 1,
      currentFiberId: currentFiber.id,
      envTree: this.captureEnvTreeSnapshot(),
      fibers: this.fibers.map((fiber) => fiber.toSnapshot()),
      activeEffectHandlerMaps: this.activeEffectHandlerMaps.map((map) => ({ ...map })),
      namedEffectHandlers: this.captureNamedEffectHandlers(),
      resumeFiberTokens: this.resumeFiberTokens.map((token) => ({
        fiberId: token.fiberId,
        result: token.result == null ? undefined : [...token.result],
        beforeResumeOps: token.beforeResumeOps == null ? undefined : [...token.beforeResumeOps]
      })),
      controlFrames: this.getControlFrames(),
      pendingAbruptCompletion: this.getPendingAbruptCompletion(),
      pendingWorkflowJobs: this.getPendingWorkflowJobs()
    };
  }
  hydrateSnapshot(snapshot) {
    if (snapshot.version !== 1) {
      throw new Error(`Unsupported runtime snapshot version: ${snapshot.version}`);
    }
    this.envTree = this.hydrateEnvTreeSnapshot(snapshot.envTree);
    this.fibers = snapshot.fibers.map((fiberSnapshot) => RuntimeFiber.FromSnapshot(fiberSnapshot));
    if (this.getFiberById(snapshot.currentFiberId) == null) {
      throw new Error(`Snapshot current fiber not found: ${snapshot.currentFiberId}`);
    }
    for (const fiber of this.fibers) {
      if (fiber.status === "Running" /* Running */ && fiber.id !== snapshot.currentFiberId) {
        fiber.status = "Runnable" /* Runnable */;
      }
    }
    this.getFiberById(snapshot.currentFiberId).status = "Running" /* Running */;
    this.activeEffectHandlerMaps = snapshot.activeEffectHandlerMaps.map((map) => ({ ...map }));
    this.namedEffectHandlers = {};
    for (const [handlerName, effectNames] of Object.entries(snapshot.namedEffectHandlers ?? {})) {
      this.namedEffectHandlers[handlerName] = [...effectNames];
    }
    this.resumeFiberTokens = (snapshot.resumeFiberTokens ?? []).map((token) => ({
      fiberId: token.fiberId,
      result: token.result == null ? undefined : [...token.result],
      beforeResumeOps: token.beforeResumeOps == null ? undefined : [...token.beforeResumeOps]
    }));
    this.controlFrames = (snapshot.controlFrames ?? []).map((frame) => ({ ...frame }));
    this.pendingAbruptCompletion = snapshot.pendingAbruptCompletion == null ? null : { ...snapshot.pendingAbruptCompletion };
    this.pendingWorkflowJobs = this.clonePendingWorkflowJobs(snapshot.pendingWorkflowJobs ?? []);
  }
  addOpDirectly(opcode, memo = null, comment) {
    this.getCurrentFiber().instructionStack.push({
      opcode,
      memo,
      comment
    });
  }
  addOpsInOrder(ops) {
    const fiber = this.getCurrentFiber();
    for (let i = ops.length - 1;i >= 0; i--) {
      const op = ops[i];
      fiber.instructionStack.push({ ...op });
    }
  }
  registerInstructionHandler(opcode, handler) {
    this.instructionHandlers[opcode] = handler;
  }
  getInstructionHandler(opcode) {
    return this.instructionHandlers[opcode];
  }
  registerNodeExpander(nodeType, expander) {
    this.nodeExpanders[nodeType] = expander;
  }
  getNodeExpander(nodeType) {
    return this.nodeExpanders[nodeType];
  }
  registerPrefixKeyword(keyword, expander) {
    this.prefixKeywordExpanders[keyword] = expander;
  }
  registerInfixKeyword(keyword, expander) {
    this.infixKeywordExpanders[keyword] = expander;
  }
  registerWorkflowExtension(name, lower = (args) => this.defaultWorkflowExtensionLowering(args), options = {}) {
    const fixity = options.fixity ?? "prefix";
    this.workflowExtensions[name] = {
      lower,
      options: { ...options, fixity }
    };
    if (fixity === "function") {
      this.registerHostFunction(name, (...args) => this.invokeWorkflowExtension(name, args, {
        fixity,
        sourceNodeId: `function:${name}`
      }), options.arity ?? lower.length);
    }
  }
  hasWorkflowExtension(name, fixity) {
    const extension = this.workflowExtensions[name];
    if (extension == null) {
      return false;
    }
    return fixity == null || extension.options.fixity === fixity;
  }
  invokeWorkflowExtension(name, args, options = {}) {
    const extension = this.workflowExtensions[name];
    if (extension == null) {
      throw new Error(`Workflow extension not found: ${name}`);
    }
    const fixity = options.fixity ?? extension.options.fixity ?? "prefix";
    return extension.lower({
      runtime: this,
      name,
      fixity,
      args,
      sourceNodeId: options.sourceNodeId ?? `${fixity}:${name}`,
      sourceNode: options.sourceNode,
      checkpoint: this.captureSnapshot()
    });
  }
  getPrefixKeywordExpander(keyword) {
    return this.prefixKeywordExpanders[keyword];
  }
  getInfixKeywordExpander(keyword) {
    return this.infixKeywordExpanders[keyword];
  }
  registerHostFunction(name, fn, arity = fn.length, options = {}) {
    this.hostFunctions[name] = fn;
    this.hostFunctionArities[name] = arity;
    this.hostFunctionVariadic[name] = options.variadic === true;
  }
  getHostFunction(name) {
    return this.hostFunctions[name];
  }
  hasHostFunction(name) {
    return this.hostFunctions[name] != null;
  }
  getHostFunctionArity(name) {
    return this.hostFunctionArities[name] ?? this.getHostFunction(name)?.length ?? 0;
  }
  isHostFunctionVariadic(name) {
    return this.hostFunctionVariadic[name] === true;
  }
  callHostFunction(name, args) {
    const fn = this.getHostFunction(name);
    if (fn == null) {
      throw new Error(`Host function not found: ${name}`);
    }
    return fn(...args);
  }
  callHostObjectMethod(target, methodName, args = []) {
    if (target == null) {
      throw new Error(`Cannot call method ${methodName} on null target`);
    }
    const method = target[methodName];
    if (typeof method !== "function") {
      throw new Error(`Host method not found: ${methodName}`);
    }
    return method.apply(target, args);
  }
  applyHostObjectMethod(target, methodName, args = []) {
    return this.callHostObjectMethod(target, methodName, args);
  }
  setIoHost(ioHost) {
    this.ioHost = ioHost;
  }
  getIoHost() {
    return this.ioHost;
  }
  setTimerHost(timerHost) {
    this.timerHost = { ...this.timerHost, ...timerHost };
  }
  getTimerHost() {
    return this.timerHost;
  }
  getProperty(target, key) {
    if (target == null) {
      return null;
    }
    if (target instanceof RuntimeObject) {
      return target.getProperty(key);
    }
    return target[key];
  }
  setProperty(target, key, value) {
    if (target == null) {
      throw new Error(`Cannot set property ${key} on null target`);
    }
    if (target instanceof RuntimeObject) {
      target.setProperty(key, value);
      return;
    }
    target[key] = value;
  }
  callBoundMethod(target, methodName, args) {
    const method = target.getMethod(methodName);
    if (method == null) {
      throw new Error(`Method not found: ${methodName}`);
    }
    return this.callRuntimeFunction(method, [target, ...args]);
  }
  registerBuiltinMethod(typeName, methodName, method) {
    this.builtinMethods[typeName] ??= {};
    this.builtinMethods[typeName][methodName] = method;
  }
  callBuiltinMethod(target, methodName, args) {
    const typeName = this.getBuiltinTypeName(target);
    const method = this.builtinMethods[typeName]?.[methodName];
    if (method == null) {
      throw new Error(`Builtin method not found: ${typeName}.${methodName}`);
    }
    return method(target, args, this);
  }
  getSubscript(target, key) {
    if (target == null) {
      return null;
    }
    return target[key];
  }
  setSubscript(target, key, value) {
    if (target == null) {
      throw new Error(`Cannot set subscript ${key} on null target`);
    }
    target[key] = value;
  }
  setTypedRuntimeContext(context) {
    this.typedRuntimeContext = context;
  }
  setPrototypeResolver(resolver) {
    this.prototypeResolver = resolver;
  }
  resolvePrototype(name) {
    if (this.prototypeResolver == null) {
      return null;
    }
    return this.prototypeResolver(name);
  }
  resolveHandler(opcode) {
    return this.getInstructionHandler(opcode);
  }
  makeDispatchContext() {
    const fiber = this.getCurrentFiber();
    return {
      runtime: this,
      instructionStack: fiber.instructionStack,
      operandStack: fiber.operandStack
    };
  }
  snapshotVisibleEnvValues() {
    const values = {};
    const visibleEnvs = this.envTree.GetAllVertexDetailsFromEntryToVertex(this.currentEnvId, true);
    for (const env of visibleEnvs) {
      for (const [key, value] of env.Variables.entries()) {
        values[String(key)] = value;
      }
    }
    return values;
  }
  captureEnvTreeSnapshot() {
    const envs = [];
    for (const env of this.envTree.GetVertexesIncludeUnreachable()) {
      envs.push(env.ToSnapshot(this.envTree.GetParentEnv(env.Id)?.Id ?? 0));
    }
    envs.sort((left, right) => left.id - right.id);
    return {
      entryEnvId: this.envTree.GetEntryVertexId(),
      envs
    };
  }
  hydrateEnvTreeSnapshot(snapshot) {
    const envTree = new EnvTree;
    const envById = new Map;
    for (const envSnapshot of snapshot.envs ?? []) {
      const env = Env.CreateFromSnapshot(envSnapshot);
      envById.set(env.Id, env);
      envTree.AddVertex(env);
    }
    for (const envSnapshot of snapshot.envs ?? []) {
      const env = envById.get(envSnapshot.id);
      const parent = envSnapshot.parentEnvId === 0 ? null : envById.get(envSnapshot.parentEnvId);
      env.ParentEnv = parent;
      if (parent != null) {
        envTree.AddEdge(parent.Id, env.Id);
      }
    }
    envTree.SetEntryVertexId(snapshot.entryEnvId);
    return envTree;
  }
  captureNamedEffectHandlers() {
    const result = {};
    for (const [handlerName, effectNames] of Object.entries(this.namedEffectHandlers)) {
      result[handlerName] = [...effectNames];
    }
    return result;
  }
  defaultWorkflowExtensionLowering(args) {
    const pendingJobs = this.buildPendingWorkflowJobs(args.name, args.sourceNodeId, args.args);
    this.setPendingWorkflowJobs(pendingJobs);
    const checkpoint = this.captureSnapshot();
    return {
      kind: "RuntimeWorkflowEffect",
      name: args.name,
      fixity: args.fixity,
      args: [...args.args],
      sourceNodeId: args.sourceNodeId,
      pendingJobs,
      checkpoint
    };
  }
  buildPendingWorkflowJobs(extensionName, sourceNodeId, args) {
    const options = this.workflowExtensions[extensionName]?.options ?? {};
    if (options.buildJobs != null) {
      return this.clonePendingWorkflowJobs(options.buildJobs(args, sourceNodeId, extensionName));
    }
    if (options.jobExpansion === "perArg") {
      return args.map((arg, index) => this.createPendingWorkflowJob(extensionName, sourceNodeId, `${sourceNodeId}/item:${index}`, [arg], { itemIndex: index }));
    }
    return [
      this.createPendingWorkflowJob(extensionName, sourceNodeId, `${sourceNodeId}/job:0`, args, { itemIndex: 0 })
    ];
  }
  createPendingWorkflowJob(extensionName, sourceNodeId, path, args, metadata) {
    return {
      id: `${extensionName}:${path}`,
      extensionName,
      sourceNodeId,
      path,
      status: "pending",
      args: [...args],
      metadata: { ...metadata }
    };
  }
  clonePendingWorkflowJobs(jobs) {
    return (jobs ?? []).map((job) => ({
      ...job,
      args: job.args == null ? undefined : [...job.args],
      metadata: job.metadata == null ? undefined : { ...job.metadata }
    }));
  }
  getBuiltinTypeName(target) {
    if (Array.isArray(target)) {
      return "Array";
    }
    if (target instanceof Map) {
      return "Map";
    }
    if (target != null && typeof target === "object") {
      return "Map";
    }
    return typeof target;
  }
  registerDefaultBuiltinMethods() {
    this.registerBuiltinMethod("Array", "Count", (target) => target.length);
    this.registerBuiltinMethod("Array", "Length", (target) => target.length);
    this.registerBuiltinMethod("Array", "Get", (target, args) => target[args[0]]);
    this.registerBuiltinMethod("Array", "Push", (target, args) => target.push(args[0]));
    this.registerBuiltinMethod("Array", "Pop", (target) => target.pop());
    this.registerBuiltinMethod("Array", "Unshift", (target, args) => target.unshift(args[0]));
    this.registerBuiltinMethod("Array", "Shift", (target) => target.shift());
    this.registerBuiltinMethod("Array", "Top", (target) => target[target.length - 1] ?? null);
    this.registerBuiltinMethod("Array", "IsEmpty", (target) => target.length === 0);
    this.registerBuiltinMethod("Map", "Count", (target) => this.getMapKeys(target).length);
    this.registerBuiltinMethod("Map", "Get", (target, args) => this.getMapValue(target, args[0]));
    this.registerBuiltinMethod("Map", "ContainsKey", (target, args) => this.hasMapKey(target, args[0]));
    this.registerBuiltinMethod("Map", "Keys", (target) => this.getMapKeys(target));
    this.registerBuiltinMethod("Map", "Values", (target) => this.getMapValues(target));
    this.registerBuiltinMethod("Map", "IsEmpty", (target) => this.getMapKeys(target).length === 0);
    this.registerBuiltinMethod("Map", "Remove", (target, args) => this.removeMapKey(target, args[0]));
    this.registerBuiltinMethod("Map", "Clear", (target) => this.clearMap(target));
  }
  getMapKeys(target) {
    return target instanceof Map ? Array.from(target.keys()).map(String) : Object.keys(target);
  }
  getMapValues(target) {
    return target instanceof Map ? Array.from(target.values()) : Object.values(target);
  }
  getMapValue(target, key) {
    return target instanceof Map ? target.get(key) : target[key];
  }
  hasMapKey(target, key) {
    return target instanceof Map ? target.has(key) : Object.prototype.hasOwnProperty.call(target, key);
  }
  removeMapKey(target, key) {
    if (target instanceof Map) {
      return target.delete(key);
    }
    const exists = this.hasMapKey(target, key);
    delete target[key];
    return exists;
  }
  clearMap(target) {
    if (target instanceof Map) {
      target.clear();
      return 0;
    }
    for (const key of Object.keys(target)) {
      delete target[key];
    }
    return 0;
  }
}
// ../runtime/lib/RuntimeInterpreter/RuntimeInterpreter.ts
class RuntimeTypeCheckError extends Error {
  Result;
  constructor(Result) {
    super(`RuntimeInterpreter type check failed: ${Result.Diagnostics.map((diagnostic) => `${diagnostic.Code}: ${diagnostic.Message}`).join("; ")}`);
    this.Result = Result;
  }
}

class RuntimeInterpreter {
  static CreateRuntime() {
    const runtime = new RuntimeState;
    RuntimeInterpreter.RegisterDefault(runtime);
    return runtime;
  }
  static RegisterDefault(runtime) {
    runtime.registerInstructionHandler(RuntimeOpCode.PushValue, ({ instruction, operandStack }) => {
      operandStack.push(instruction.memo);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.RunNode, ({ runtime: runtime2, instruction }) => {
      RuntimeInterpreter.ExpandNode(runtime2, instruction.memo);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.RunBlock, ({ runtime: runtime2, instruction }) => {
      const block = Array.isArray(instruction.memo) ? instruction.memo : [instruction.memo];
      if (block.length === 0) {
        runtime2.addOpDirectly(RuntimeOpCode.PushValue, null);
      } else {
        RuntimeInterpreter.ExpandBlock(runtime2, block);
      }
    });
    runtime.registerInstructionHandler(RuntimeOpCode.MakeArray, ({ instruction, operandStack }) => {
      const count = Number(instruction.memo ?? 0);
      const values = [];
      for (let i = 0;i < count; i++) {
        values.unshift(operandStack.pop());
      }
      operandStack.push(values);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.MakeMap, ({ instruction, operandStack }) => {
      const count = Number(instruction.memo ?? 0);
      const map = new KnUnorderedMap;
      for (let i = 0;i < count; i++) {
        const value = operandStack.pop();
        const key = operandStack.pop();
        map[String(key)] = value;
      }
      operandStack.push(map);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.ExpandChain, ({ runtime: runtime2, instruction }) => {
      RuntimeInterpreter.ExpandChain(runtime2, instruction.memo);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.ChainStep, ({ runtime: runtime2, instruction }) => {
      RuntimeInterpreter.ExpandChainStep(runtime2, instruction.memo);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.IterEvalChainNode, ({ runtime: runtime2, instruction }) => {
      RuntimeInterpreter.ExpandChainStep(runtime2, instruction.memo);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.RunLastVal, ({ operandStack }) => {
      const values = operandStack.popFrameAllValues();
      operandStack.push(values.length === 0 ? null : values[values.length - 1]);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.ApplyToFrameTop, ({ runtime: runtime2, instruction, operandStack }) => {
      const func = operandStack.pop();
      const args = RuntimeInterpreter.PeekAndClearCurrentOperandFrame(runtime2);
      if (RuntimeInterpreter.TryScheduleResolvedCallable(runtime2, func, args, "<frame-top>")) {
        return;
      }
      operandStack.push(RuntimeInterpreter.CallResolvedCallable(runtime2, func, args, "<frame-top>"));
    });
    runtime.registerInstructionHandler(RuntimeOpCode.ApplyToFrameBottom, ({ runtime: runtime2, operandStack }) => {
      const values = RuntimeInterpreter.PeekAndClearCurrentOperandFrame(runtime2);
      if (values.length === 0) {
        return;
      }
      const func = values[0];
      const args = values.slice(1);
      if (RuntimeInterpreter.TryScheduleResolvedCallable(runtime2, func, args, "<frame-bottom>")) {
        return;
      }
      operandStack.push(RuntimeInterpreter.CallResolvedCallable(runtime2, func, args, "<frame-bottom>"));
    });
    runtime.registerInstructionHandler(RuntimeOpCode.ApplyCallable, ({ runtime: runtime2, instruction, operandStack }) => {
      const {
        callableNode,
        argCount,
        callableFromStack = false
      } = instruction.memo ?? {};
      const callable = callableFromStack ? null : RuntimeInterpreter.ResolveCallable(runtime2, callableNode);
      const count = argCount ?? RuntimeInterpreter.GetCallableArity(runtime2, callableNode, callable);
      const args = [];
      for (let i = 0;i < count; i++) {
        args.unshift(operandStack.pop());
      }
      const actualCallable = callableFromStack ? operandStack.pop() : callable;
      if (RuntimeInterpreter.TryScheduleResolvedCallable(runtime2, actualCallable, args, callableNode == null ? "<stack-callable>" : RuntimeInterpreter.GetWordName(callableNode))) {
        return;
      }
      operandStack.push(RuntimeInterpreter.CallResolvedCallable(runtime2, actualCallable, args, callableNode == null ? "<stack-callable>" : RuntimeInterpreter.GetWordName(callableNode)));
    });
    runtime.registerInstructionHandler(RuntimeOpCode.CompleteFunctionCall, ({ runtime: runtime2, operandStack }) => {
      const result = operandStack.popFrameAndPushTopValue();
      const frame = runtime2.popControlFrame();
      if (frame?.kind !== "function") {
        throw new Error("Function call frame missing during normal return");
      }
      runtime2.changeEnvById(frame.callerEnvId);
      runtime2.restoreActiveEffectHandlerMaps(frame.activeEffectHandlerMaps ?? []);
      if (frame.resultOverride !== undefined) {
        operandStack.pop();
        operandStack.push(frame.resultOverride);
      } else if (result === undefined) {
        operandStack.push(null);
      }
    });
    runtime.registerInstructionHandler(RuntimeOpCode.ReturnFromFunction, ({ runtime: runtime2, operandStack }) => {
      const result = operandStack.pop();
      RuntimeInterpreter.RestoreEnvContinuation(runtime2, "return", [result ?? null]);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.CaptureContinuation, ({ runtime: runtime2, instruction, operandStack }) => {
      operandStack.push(runtime2.captureContinuation(Number(instruction.memo ?? 0)));
    });
    runtime.registerInstructionHandler(RuntimeOpCode.MakeContExcludeTopNInstruction, ({ runtime: runtime2, instruction, operandStack }) => {
      operandStack.push(runtime2.captureContinuation(Number(instruction.memo ?? 0)));
    });
    runtime.registerInstructionHandler(RuntimeOpCode.Jump, ({ instructionStack, instruction }) => {
      const count = Number(instruction.memo ?? 0);
      for (let i = 0;i < count; i++) {
        instructionStack.pop();
      }
    });
    runtime.registerInstructionHandler(RuntimeOpCode.JumpIfFalse, ({ instructionStack, instruction, operandStack }) => {
      const condition = operandStack.pop();
      if (!RuntimeInterpreter.IsTruthy(condition)) {
        const count = Number(instruction.memo ?? 0);
        for (let i = 0;i < count; i++) {
          instructionStack.pop();
        }
      }
    });
    runtime.registerInstructionHandler(RuntimeOpCode.IterConditionPairs, ({ runtime: runtime2, instruction }) => {
      const memo = instruction.memo ?? {};
      const branches = memo.branches ?? [];
      const index = memo.index ?? 0;
      const branch = branches[index];
      if (branch == null) {
        runtime2.addOpDirectly(RuntimeOpCode.RunBlock, memo.fallbackBody ?? []);
        return;
      }
      runtime2.addOpsInOrder([
        RuntimeInterpreter.Op(RuntimeOpCode.RunNode, branch.condition),
        RuntimeInterpreter.Op(RuntimeOpCode.SelectConditionBranch, {
          ...memo,
          branch,
          index
        })
      ]);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.SelectConditionBranch, ({ runtime: runtime2, instruction, operandStack }) => {
      const memo = instruction.memo ?? {};
      const condition = operandStack.pop();
      if (RuntimeInterpreter.IsTruthy(condition)) {
        runtime2.addOpDirectly(RuntimeOpCode.RunBlock, memo.branch?.body ?? []);
        return;
      }
      runtime2.addOpDirectly(RuntimeOpCode.IterConditionPairs, {
        ...memo,
        index: (memo.index ?? 0) + 1
      });
    });
    runtime.registerInstructionHandler(RuntimeOpCode.IterForEachLoop, ({ runtime: runtime2, instruction, operandStack }) => {
      const memo = instruction.memo ?? {};
      const items = operandStack.peek() ?? [];
      const index = memo.index ?? 0;
      if (typeof items.length !== "number") {
        throw new Error(`foreach expects an array to iterate, got ` + `${items === null ? "null" : typeof items} — provide a vector/list.`);
      }
      if (index >= items.length) {
        return;
      }
      if (runtime2.getCurrentEnv().Lookup(memo.itemName) == null) {
        runtime2.define(memo.itemName, items[index]);
      } else {
        runtime2.setVar(memo.itemName, items[index]);
      }
      runtime2.addOpsInOrder([
        RuntimeInterpreter.Op(RuntimeOpCode.MakeContExcludeTopNInstruction, 3),
        RuntimeInterpreter.Op("Env_SetLocalEnv", "continue"),
        RuntimeInterpreter.Op(RuntimeOpCode.RunBlock, memo.body ?? []),
        RuntimeInterpreter.Op("ValStack_PopValue"),
        RuntimeInterpreter.Op(RuntimeOpCode.IterForEachLoop, {
          ...memo,
          index: index + 1
        })
      ]);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.IterForLoop, ({ runtime: runtime2, instruction }) => {
      const memo = instruction.memo ?? {};
      runtime2.addOpsInOrder([
        RuntimeInterpreter.Op(RuntimeOpCode.RunNode, memo.conditionNode),
        RuntimeInterpreter.Op(RuntimeOpCode.IterForLoopAfterCondition, memo)
      ]);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.IterForLoopAfterCondition, ({ runtime: runtime2, instruction, operandStack }) => {
      const memo = instruction.memo ?? {};
      const condition = operandStack.pop();
      if (!RuntimeInterpreter.IsTruthy(condition)) {
        return;
      }
      runtime2.addOpsInOrder([
        RuntimeInterpreter.Op(RuntimeOpCode.MakeContExcludeTopNInstruction, 3),
        RuntimeInterpreter.Op("Env_SetLocalEnv", "continue"),
        RuntimeInterpreter.Op(RuntimeOpCode.RunBlock, memo.body ?? []),
        RuntimeInterpreter.Op("ValStack_PopValue"),
        ...RuntimeInterpreter.BuildLoopStepOps(memo.stepNode),
        RuntimeInterpreter.Op(RuntimeOpCode.IterForLoop, memo)
      ]);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.ReturnOperands, ({ operandStack }) => {
      const values = operandStack.popFrameAllValues();
      operandStack.push(values.length === 0 ? null : values[values.length - 1]);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.RunGetProperty, ({ runtime: runtime2, instruction, operandStack }) => {
      const { target, key } = instruction.memo ?? {};
      const actualTarget = target ?? operandStack.pop();
      const typed = RuntimeInterpreter.TryHandleTypedPropertyGet(runtime2, actualTarget, key);
      if (typed.handled) {
        if (!typed.scheduled) {
          operandStack.push(typed.value);
        }
        return;
      }
      if (RuntimeInterpreter.TrySchedulePropertyGet(runtime2, actualTarget, key)) {
        return;
      }
      operandStack.push(runtime2.getProperty(actualTarget, key));
    });
    runtime.registerInstructionHandler(RuntimeOpCode.RunSetProperty, ({ runtime: runtime2, instruction, operandStack }) => {
      const memo = instruction.memo ?? {};
      const hasTarget = Object.prototype.hasOwnProperty.call(memo, "target");
      const hasValue = Object.prototype.hasOwnProperty.call(memo, "value");
      const actualTarget = hasTarget ? memo.target : operandStack.pop();
      const actualValue = hasValue ? memo.value : operandStack.pop();
      const typed = RuntimeInterpreter.TryHandleTypedPropertySet(runtime2, actualTarget, memo.key, actualValue);
      if (typed.handled) {
        if (!typed.scheduled) {
          operandStack.push(typed.value);
        }
        return;
      }
      if (RuntimeInterpreter.TrySchedulePropertySet(runtime2, actualTarget, memo.key, actualValue)) {
        return;
      }
      runtime2.setProperty(actualTarget, memo.key, actualValue);
      operandStack.push(actualValue);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.RunGetSubscript, ({ runtime: runtime2, instruction, operandStack }) => {
      const { target, key } = instruction.memo ?? {};
      const actualKey = key ?? operandStack.pop();
      const actualTarget = target ?? operandStack.pop();
      operandStack.push(runtime2.getSubscript(actualTarget, actualKey));
    });
    runtime.registerInstructionHandler(RuntimeOpCode.RunSetSubscript, ({ runtime: runtime2, instruction, operandStack }) => {
      const memo = instruction.memo ?? {};
      const hasTarget = Object.prototype.hasOwnProperty.call(memo, "target");
      const hasKey = Object.prototype.hasOwnProperty.call(memo, "key");
      const hasValue = Object.prototype.hasOwnProperty.call(memo, "value");
      const actualKey = hasKey ? memo.key : operandStack.pop();
      const actualTarget = hasTarget ? memo.target : operandStack.pop();
      const actualValue = hasValue ? memo.value : operandStack.pop();
      runtime2.setSubscript(actualTarget, actualKey, actualValue);
      operandStack.push(actualValue);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.CallInstance, ({ runtime: runtime2, instruction, operandStack }) => {
      const { methodName, argCount = 0, projectionTargetName } = instruction.memo ?? {};
      const args = [];
      for (let i = 0;i < argCount; i++) {
        args.unshift(operandStack.pop());
      }
      const target = operandStack.pop();
      if (methodName === "as" && RuntimeInterpreter.IsTypedObject(target) && runtime2.typedRuntimeContext != null) {
        operandStack.push(runtime2.typedRuntimeContext.Project(target, projectionTargetName ?? RuntimeInterpreter.ReadProjectionTargetName(args[0])));
        return;
      }
      if (RuntimeInterpreter.TryScheduleInstanceCall(runtime2, target, methodName, args)) {
        return;
      }
      operandStack.push(RuntimeInterpreter.CallInstance(runtime2, target, methodName, args));
    });
    runtime.registerInstructionHandler(RuntimeOpCode.ApplyLogicalOperator, ({ runtime: runtime2, instruction, operandStack }) => {
      const { name, phase = "apply", rightNode, nextNode } = instruction.memo ?? {};
      if (phase === "apply") {
        const right = operandStack.pop();
        const left2 = operandStack.pop();
        operandStack.push(RuntimeInterpreter.ApplyLogicalOperator(name, left2, right));
        if (nextNode != null) {
          runtime2.addOpDirectly(RuntimeOpCode.ChainStep, nextNode);
        }
        return;
      }
      const left = operandStack.pop();
      if (RuntimeInterpreter.ShouldShortCircuitLogicalOperator(name, left)) {
        operandStack.push(RuntimeInterpreter.ApplyShortCircuitLogicalOperator(name, left));
        if (nextNode != null) {
          runtime2.addOpDirectly(RuntimeOpCode.ChainStep, nextNode);
        }
        return;
      }
      operandStack.push(left);
      runtime2.addOpsInOrder([
        RuntimeInterpreter.Op(RuntimeOpCode.RunNode, rightNode),
        RuntimeInterpreter.Op(RuntimeOpCode.ApplyLogicalOperator, {
          name,
          phase: "apply",
          nextNode
        })
      ]);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.BuildInterpolatedString, ({ instruction, operandStack }) => {
      const count = Number(instruction.memo ?? 0);
      const parts = [];
      for (let i = 0;i < count; i++) {
        parts.unshift(operandStack.pop());
      }
      operandStack.push(parts.map((part) => String(part)).join(""));
    });
    runtime.registerInstructionHandler("ValStack_PushFrame", ({ operandStack }) => {
      operandStack.pushFrame();
    });
    runtime.registerInstructionHandler("ValStack_PushValue", ({ instruction, operandStack }) => {
      operandStack.push(instruction.memo);
    });
    runtime.registerInstructionHandler("ValStack_PopValue", ({ operandStack }) => {
      operandStack.pop();
    });
    runtime.registerInstructionHandler(RuntimeOpCode.Duplicate, ({ operandStack }) => {
      operandStack.push(operandStack.peek());
    });
    runtime.registerInstructionHandler(RuntimeOpCode.SwapTop, ({ operandStack }) => {
      const right = operandStack.pop();
      const left = operandStack.pop();
      operandStack.push(right);
      operandStack.push(left);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.CollectTopN, ({ instruction, operandStack }) => {
      const count = Number(instruction.memo ?? 0);
      const values = [];
      for (let i = 0;i < count; i++) {
        values.unshift(operandStack.pop());
      }
      operandStack.push(values);
    });
    runtime.registerInstructionHandler("ValStack_PopFrameAndPushTopVal", ({ operandStack }) => {
      operandStack.popFrameAndPushTopValue();
    });
    runtime.registerInstructionHandler("ValStack_PopFrameIgnoreResult", ({ operandStack }) => {
      operandStack.popFrameAllValues();
    });
    runtime.registerInstructionHandler("Env_DeclareLocalVar", ({ runtime: runtime2, instruction, operandStack }) => {
      const key = typeof instruction.memo === "string" ? instruction.memo : instruction.memo.key;
      const value = typeof instruction.memo === "string" ? operandStack.pop() : instruction.memo.value;
      runtime2.define(key, value);
    });
    runtime.registerInstructionHandler("Env_DeclareGlobalVar", ({ runtime: runtime2, instruction, operandStack }) => {
      const key = typeof instruction.memo === "string" ? instruction.memo : instruction.memo.key;
      const value = typeof instruction.memo === "string" ? operandStack.pop() : instruction.memo.value;
      runtime2.defineGlobal(key, value);
    });
    runtime.registerInstructionHandler("Env_SetLocalEnv", ({ runtime: runtime2, instruction, operandStack }) => {
      const key = typeof instruction.memo === "string" ? instruction.memo : instruction.memo.key;
      const value = typeof instruction.memo === "string" ? operandStack.pop() : instruction.memo.value;
      runtime2.setVar(key, value);
    });
    runtime.registerInstructionHandler("Env_SetGlobalEnv", ({ runtime: runtime2, instruction, operandStack }) => {
      const key = typeof instruction.memo === "string" ? instruction.memo : instruction.memo.key;
      const value = typeof instruction.memo === "string" ? operandStack.pop() : instruction.memo.value;
      runtime2.setGlobal(key, value);
    });
    runtime.registerInstructionHandler("Env_Lookup", ({ runtime: runtime2, instruction, operandStack }) => {
      operandStack.push(runtime2.lookup(instruction.memo));
    });
    runtime.registerInstructionHandler("Env_DiveProcessEnv", ({ runtime: runtime2, instruction }) => {
      runtime2.diveProcessEnv(instruction.memo ?? "process");
    });
    runtime.registerInstructionHandler("Env_DiveLocalEnv", ({ runtime: runtime2, instruction }) => {
      const memo = instruction.memo;
      if (memo != null && typeof memo === "object" && memo.parentEnvId != null) {
        runtime2.makeSubLocalEnvUnderEnv(memo.parentEnvId, memo.name ?? "local");
        for (const [key, value] of Object.entries(memo.bindings ?? {})) {
          runtime2.define(key, value);
        }
        return;
      }
      runtime2.diveLocalEnv(instruction.memo ?? "local");
    });
    runtime.registerInstructionHandler("Env_Rise", ({ runtime: runtime2 }) => {
      runtime2.riseEnv();
    });
    runtime.registerInstructionHandler("Env_ChangeEnvById", ({ runtime: runtime2, instruction }) => {
      runtime2.changeEnvById(instruction.memo);
    });
    runtime.registerInstructionHandler("Env_BindEnvByMap", ({ runtime: runtime2, instruction, operandStack }) => {
      runtime2.bindEnvByMap(instruction.memo ?? operandStack.pop());
    });
    runtime.registerInstructionHandler("Fiber_CurrentToIdle", ({ runtime: runtime2, operandStack }) => {
      operandStack.push(runtime2.currentFiberToIdle());
    });
    runtime.registerInstructionHandler("Fiber_CurrentToSuspended", ({ runtime: runtime2, operandStack }) => {
      operandStack.push(runtime2.suspendCurrentFiber());
    });
    runtime.registerInstructionHandler("Fiber_AwakenMulti", ({ runtime: runtime2, instruction }) => {
      runtime2.awakenFibers(instruction.memo ?? []);
    });
    runtime.registerInstructionHandler("Fiber_YieldToParentAndChangeCurrentFiberState", ({ runtime: runtime2, instruction }) => {
      runtime2.yieldToParentAndChangeCurrentFiberState(instruction.memo?.status ?? "Runnable" /* Runnable */);
    });
    runtime.registerInstructionHandler("Fiber_YieldToFiberAndChangeCurrentFiberState", ({ runtime: runtime2, instruction }) => {
      runtime2.yieldToFiberAndChangeCurrentFiberState(instruction.memo?.fiberId, instruction.memo?.status ?? "Runnable" /* Runnable */);
    });
    runtime.registerInstructionHandler("Fiber_FinalizeCurrent", ({ runtime: runtime2, operandStack }) => {
      operandStack.push(runtime2.finalizeCurrentFiber());
    });
    runtime.registerInstructionHandler("Fiber_AddResumeToken", ({ runtime: runtime2, instruction }) => {
      runtime2.addResumeFiberToken(instruction.memo);
    });
    runtime.registerInstructionHandler("Fiber_ConsumeResumeToken", ({ runtime: runtime2 }) => {
      runtime2.consumeResumeFiberToken();
    });
    runtime.registerInstructionHandler(RuntimeOpCode.WorkflowDispatch, ({ runtime: runtime2, instruction, operandStack }) => {
      const {
        name,
        args = [],
        argCount,
        fixity = "prefix",
        sourceNodeId = `${fixity}:${name}`,
        sourceNode
      } = instruction.memo ?? {};
      const actualArgs = [...args];
      for (let i = 0;i < (argCount ?? 0); i++) {
        actualArgs.unshift(operandStack.pop());
      }
      const effect = runtime2.invokeWorkflowExtension(name, actualArgs, {
        fixity,
        sourceNode,
        sourceNodeId
      });
      return {
        effects: [effect],
        yield: true,
        yieldReason: `workflow:${name}`
      };
    });
    runtime.registerInstructionHandler(RuntimeOpCode.InvokeWorkflowExtension, ({ runtime: runtime2, instruction, operandStack }) => {
      const {
        name,
        argCount = 0,
        fixity = "prefix",
        sourceNodeId = `${fixity}:${name}`,
        sourceNode
      } = instruction.memo ?? {};
      const args = [];
      for (let i = 0;i < argCount; i++) {
        args.unshift(operandStack.pop());
      }
      operandStack.push(runtime2.invokeWorkflowExtension(name, args, {
        fixity,
        sourceNode,
        sourceNodeId
      }));
    });
    runtime.registerInstructionHandler("Runtime_IncrementVar", ({ runtime: runtime2, instruction, operandStack }) => {
      operandStack.push(RuntimeInterpreter.EvaluateIncrementByName(runtime2, String(instruction.memo)));
    });
    runtime.registerInstructionHandler("Ctrl_RunIfBranches", ({ runtime: runtime2, instruction, operandStack }) => {
      const condition = operandStack.pop();
      runtime2.addOpDirectly(RuntimeOpCode.RunBlock, RuntimeInterpreter.IsTruthy(condition) ? instruction.memo?.thenBody ?? [] : instruction.memo?.elseBody ?? []);
    });
    runtime.registerInstructionHandler("Runtime_PushControlFrame", ({ runtime: runtime2, instruction }) => {
      runtime2.pushControlFrame(instruction.memo);
    });
    runtime.registerInstructionHandler("Runtime_PopControlFrame", ({ runtime: runtime2 }) => {
      runtime2.popControlFrame();
    });
    runtime.registerInstructionHandler("Runtime_PushExceptionFrame", ({ runtime: runtime2, instruction }) => {
      const handlerMap = instruction.memo?.handlerMap ?? {};
      runtime2.pushControlFrame({
        kind: "exception",
        frameId: instruction.memo?.frameId ?? "try",
        envId: runtime2.currentEnvId
      });
      runtime2.pushActiveEffectHandlerMap(handlerMap);
    });
    runtime.registerInstructionHandler("Runtime_BuildTryHandlerMap", ({ instruction, operandStack }) => {
      const entries = instruction.memo?.entries ?? [];
      const handlerMap = {};
      for (let i = entries.length - 1;i >= 0; i--) {
        const handler = operandStack.pop();
        handlerMap[entries[i].effectName] = handler;
      }
      operandStack.push(handlerMap);
    });
    runtime.registerInstructionHandler("Runtime_PushExceptionFrameFromStack", ({ runtime: runtime2, instruction, operandStack }) => {
      const handlerMap = operandStack.pop() ?? {};
      runtime2.pushControlFrame({
        kind: "exception",
        frameId: instruction.memo?.frameId ?? "try",
        envId: runtime2.currentEnvId
      });
      runtime2.pushActiveEffectHandlerMap(handlerMap);
      operandStack.push(handlerMap);
    });
    runtime.registerInstructionHandler("Runtime_PopExceptionFrame", ({ runtime: runtime2 }) => {
      runtime2.popActiveEffectHandlerMap();
      runtime2.popControlFrame();
    });
    runtime.registerInstructionHandler("Runtime_PushActiveEffectHandlerMap", ({ runtime: runtime2, instruction }) => {
      runtime2.pushActiveEffectHandlerMap(instruction.memo ?? {});
    });
    runtime.registerInstructionHandler("Runtime_PopActiveEffectHandlerMap", ({ runtime: runtime2 }) => {
      runtime2.popActiveEffectHandlerMap();
    });
    runtime.registerInstructionHandler("Runtime_PushActiveEffectHandlerMapFromEnv", ({ runtime: runtime2, instruction }) => {
      const map = runtime2.lookup(instruction.memo ?? "__EffectHandlerMap") ?? {};
      runtime2.pushActiveEffectHandlerMap(map);
    });
    runtime.registerInstructionHandler("Runtime_RestoreContinuationFromEnv", ({ runtime: runtime2, instruction, operandStack }) => {
      const memo = instruction.memo ?? {};
      const values = [];
      const count = Number(memo.valueCount ?? 0);
      for (let i = 0;i < count; i++) {
        values.unshift(operandStack.pop());
      }
      RuntimeInterpreter.RestoreEnvContinuation(runtime2, memo.name, values);
    });
    runtime.registerInstructionHandler("Runtime_PushValueIfTopNullish", ({ instruction, operandStack }) => {
      const value = operandStack.pop();
      operandStack.push(value == null ? instruction.memo : value);
    });
    runtime.registerInstructionHandler("Runtime_SaveOperands", ({ operandStack }) => {
      operandStack.push(operandStack.popFrameAllValues());
    });
    runtime.registerInstructionHandler("Runtime_AssignChainTarget", ({ runtime: runtime2, operandStack }) => {
      const value = operandStack.pop();
      const selector = operandStack.pop();
      const target = operandStack.pop();
      if (selector?.kind === "subscript") {
        runtime2.setSubscript(target, selector.key, value);
      } else {
        runtime2.setProperty(target, selector?.key ?? selector, value);
      }
      operandStack.push(value);
    });
    runtime.registerInstructionHandler("Runtime_JsCallAlias", ({ runtime: runtime2, instruction, operandStack }) => {
      const argCount = Number(instruction.memo?.argCount ?? 0);
      const args = [];
      for (let i = 0;i < argCount; i++) {
        args.unshift(operandStack.pop());
      }
      const methodName = operandStack.pop();
      const target = operandStack.pop();
      operandStack.push(runtime2.callHostObjectMethod(target, String(methodName), args));
    });
    runtime.registerInstructionHandler("Runtime_JsApplyAlias", ({ runtime: runtime2, operandStack }) => {
      const args = operandStack.pop();
      const methodName = operandStack.pop();
      const target = operandStack.pop();
      operandStack.push(runtime2.applyHostObjectMethod(target, String(methodName), args ?? []));
    });
    runtime.registerInstructionHandler("Runtime_BuildSubscriptSelector", ({ operandStack }) => {
      const marker = operandStack.pop();
      const key = operandStack.pop();
      operandStack.push({ ...marker, key });
    });
    runtime.registerInstructionHandler("Runtime_AwaitHostFunction", ({ runtime: runtime2, operandStack }) => {
      const argsValue = operandStack.pop();
      const callable = operandStack.pop();
      const args = Array.isArray(argsValue) ? argsValue : [argsValue];
      const fiberId = runtime2.getCurrentFiber().id;
      Promise.resolve().then(() => RuntimeInterpreter.CallResolvedCallable(runtime2, callable, args, "await_host_fn")).then((result) => runtime2.addResumeFiberToken({ fiberId, result: [result] }), (error) => runtime2.addResumeFiberToken({ fiberId, result: [error] }));
      runtime2.suspendCurrentFiber();
      return { yield: true, yieldReason: "await_host_fn" };
    });
    runtime.registerInstructionHandler("Runtime_SetTimeout", ({ runtime: runtime2, operandStack }) => {
      const timeout = Number(operandStack.pop() ?? 0);
      const callable = operandStack.pop();
      const fiberId = runtime2.getCurrentFiber().id;
      const timerHost = runtime2.getTimerHost();
      timerHost.setTimeout?.(() => {
        runtime2.addResumeFiberToken({
          fiberId,
          result: [callable],
          beforeResumeOps: [RuntimeInterpreter.Op(RuntimeOpCode.ApplyCallable, {
            callableFromStack: true,
            argCount: 0
          })]
        });
      }, timeout);
      runtime2.suspendCurrentFiber();
      return { yield: true, yieldReason: "set_timeout" };
    });
    runtime.registerInstructionHandler("Runtime_SetInterval", ({ runtime: runtime2, operandStack }) => {
      const interval = Number(operandStack.pop() ?? 0);
      const callable = operandStack.pop();
      const timerHost = runtime2.getTimerHost();
      const handle = timerHost.setInterval?.(() => {
        const parent = runtime2.getCurrentFiber();
        const child = runtime2.createFiber(parent, "Runnable" /* Runnable */);
        RuntimeInterpreter.PushOpsToFiber(child, [
          RuntimeInterpreter.Op(RuntimeOpCode.PushValue, callable),
          RuntimeInterpreter.Op(RuntimeOpCode.ApplyCallable, {
            callableFromStack: true,
            argCount: 0
          }),
          RuntimeInterpreter.Op("Fiber_FinalizeCurrent")
        ]);
      }, interval);
      operandStack.push(handle);
    });
    runtime.registerHostFunction("+", (...args) => args.reduce((sum, item) => sum + item, 0), 2);
    runtime.registerHostFunction("*", (...args) => args.reduce((product, item) => product * item, 1), 2);
    runtime.registerHostFunction("-", (left, right) => left - right, 2);
    runtime.registerHostFunction("/", (left, right) => left / right, 2);
    runtime.registerHostFunction("gt", (left, right) => left > right, 2);
    runtime.registerHostFunction("lt", (left, right) => left < right, 2);
    runtime.registerHostFunction("==", (left, right) => left === right, 2);
    runtime.registerHostFunction("and", (left, right) => RuntimeInterpreter.IsTruthy(left) && RuntimeInterpreter.IsTruthy(right), 2);
    runtime.registerHostFunction("or", (left, right) => RuntimeInterpreter.IsTruthy(left) || RuntimeInterpreter.IsTruthy(right), 2);
    runtime.registerHostFunction("or_else", (left, right) => RuntimeInterpreter.IsTruthy(left) ? left : right, 2);
    runtime.registerHostFunction("ArrayLength", (value) => value?.length ?? 0, 1);
    runtime.registerHostFunction("HostCall", (target, methodName, arg) => runtime.callHostObjectMethod(target, String(methodName), [arg]), 3);
    runtime.registerHostFunction("HostApply", (target, methodName, args) => runtime.applyHostObjectMethod(target, String(methodName), args), 3);
    runtime.registerHostFunction("Writeln", (value) => {
      runtime.getIoHost().writeLine?.(String(value));
      return null;
    }, 1);
    runtime.registerHostFunction("append", (target, value) => {
      if (typeof target?.push === "function") {
        return target.push(value);
      }
      return String(target) + String(value);
    }, 2);
    runtime.registerHostFunction(">=", (left, right) => left >= right, 2);
    runtime.registerHostFunction("<=", (left, right) => left <= right, 2);
    runtime.registerHostFunction("console", (value) => {
      runtime.getIoHost().writeLine?.(String(value));
      return value;
    }, 1);
    runtime.registerHostFunction("clear_interval", (handle) => {
      runtime.getTimerHost().clearInterval?.(handle);
      return null;
    }, 1);
    runtime.registerHostFunction("Concat", (...args) => args.join(""), 2, { variadic: true });
    runtime.registerHostFunction("Length", (value) => String(value).length, 1);
    runtime.registerHostFunction("ToUpper", (value) => String(value).toUpperCase(), 1);
    runtime.registerHostFunction("ToLower", (value) => String(value).toLowerCase(), 1);
    runtime.registerHostFunction("Trim", (value) => String(value).trim(), 1);
    runtime.registerHostFunction("ToString", (value) => String(value), 1);
    runtime.registerHostFunction("ToInt", (value) => Number.parseInt(String(value), 10), 1);
    runtime.registerHostFunction("ToFloat", (value) => Number.parseFloat(String(value)), 1);
    runtime.registerHostFunction("ToBoolean", (value) => Boolean(value), 1);
    runtime.registerHostFunction("Write", (value) => {
      runtime.getIoHost().write?.(String(value));
      return null;
    }, 1);
    runtime.registerHostFunction("WriteLine", (value) => {
      runtime.getIoHost().writeLine?.(String(value));
      return null;
    }, 1);
    runtime.registerHostFunction("ReadLine", () => runtime.getIoHost().readLine?.() ?? "", 0);
    runtime.registerNodeExpander("Knot" /* Knot */, (activeRuntime, node) => {
      activeRuntime.addOpDirectly(RuntimeOpCode.ExpandChain, node);
    });
    runtime.registerNodeExpander("Vector" /* Vector */, (activeRuntime, node) => RuntimeInterpreter.ExpandVector(activeRuntime, node));
    runtime.registerNodeExpander("UnorderedMap" /* UnorderedMap */, (activeRuntime, node) => RuntimeInterpreter.ExpandMap(activeRuntime, node));
    runtime.registerNodeExpander("Word" /* Word */, (activeRuntime, node) => {
      const name = RuntimeInterpreter.GetWordName(node);
      activeRuntime.addOpDirectly(RuntimeOpCode.PushValue, activeRuntime.hasHostFunction(name) ? activeRuntime.getHostFunction(name) : activeRuntime.lookup(name));
    });
  }
  static EvalSync(source) {
    const runtime = RuntimeInterpreter.CreateRuntime();
    return RuntimeInterpreter.EvalWithRuntimeSync(runtime, source);
  }
  static EvalWithRuntimeSync(runtime, source, options = {}) {
    RuntimeInterpreter.TypeCheckSourceIfRequested(source, options);
    const nodesToRun = RuntimeInterpreter.ParseSourceBlock(source);
    return RuntimeInterpreter.ExecBlockWithRuntimeSync(runtime, nodesToRun);
  }
  static EvalBlockSourceSync(source, options = {}) {
    const runtime = RuntimeInterpreter.CreateRuntime();
    return RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, source, options);
  }
  static EvalBlockSourceTypedSync(source) {
    return RuntimeInterpreter.EvaluateTypedBlockSync(source);
  }
  static EvaluateTypedBlockSync(source) {
    const typeCheck = RuntimeInterpreter.TypeCheckSource(source);
    if (!typeCheck.Success) {
      throw new RuntimeTypeCheckError(typeCheck);
    }
    const binding = RequireTypeSystemBridge().BindSource(source);
    if (!binding.Success) {
      throw new Error(`Typed runtime binding failed: ${binding.Diagnostics.map((diagnostic) => `${diagnostic.Code}: ${diagnostic.Message}`).join("; ")}`);
    }
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.setTypedRuntimeContext(binding.Context);
    binding.Context.PrototypeResolver = (name) => {
      const value = runtime.lookup(name);
      return value instanceof RuntimeObject ? value : null;
    };
    const nodesToRun = RuntimeInterpreter.ParseSourceBlock(source).filter((node) => !RuntimeInterpreter.IsPureTypeSystemDeclaration(node));
    return RuntimeInterpreter.ExecBlockWithRuntimeSync(runtime, nodesToRun);
  }
  static EvalBlockSourceWithRuntimeSync(runtime, source, options = {}) {
    RuntimeInterpreter.TypeCheckSourceIfRequested(source, options);
    return RuntimeInterpreter.ExecBlockWithRuntimeSync(runtime, RuntimeInterpreter.ParseSourceBlock(source));
  }
  static TypeCheckSource(source) {
    return RequireTypeSystemBridge().CheckSource(source);
  }
  static TypeCheckSourceIfRequested(source, options) {
    if (options?.typeCheck !== true) {
      return;
    }
    const result = RuntimeInterpreter.TypeCheckSource(source);
    options.onTypeChecked?.(result);
    if (!result.Success) {
      throw new RuntimeTypeCheckError(result);
    }
  }
  static ExecSync(nodeToRun) {
    const runtime = RuntimeInterpreter.CreateRuntime();
    return RuntimeInterpreter.ExecWithRuntimeSync(runtime, nodeToRun);
  }
  static ExecWithRuntimeSync(runtime, nodeToRun) {
    const fiber = runtime.getCurrentFiber();
    const operandStack = fiber.operandStack;
    const instructionStackSnapshot = fiber.instructionStack.snapshot();
    const initialFrameCount = operandStack.snapshot().frameBottoms.length;
    operandStack.pushFrame();
    runtime.addOpDirectly(RuntimeOpCode.LandSuccess);
    runtime.addOpDirectly(RuntimeOpCode.RunNode, nodeToRun);
    try {
      RuntimeInterpreter.StartLoopSync(runtime);
      return operandStack.popFrameAndPushTopValue();
    } catch (error) {
      RuntimeInterpreter.PopOperandFramesAfterAbrupt(runtime, initialFrameCount);
      fiber.instructionStack.loadSnapshot(instructionStackSnapshot);
      throw error;
    }
  }
  static ExecBlockSync(nodesToRun) {
    const runtime = RuntimeInterpreter.CreateRuntime();
    return RuntimeInterpreter.ExecBlockWithRuntimeSync(runtime, nodesToRun);
  }
  static async ExecBlockAsync(nodesToRun) {
    const runtime = RuntimeInterpreter.CreateRuntime();
    return RuntimeInterpreter.ExecBlockWithRuntimeAsync(runtime, nodesToRun);
  }
  static ExecBlockWithRuntimeSync(runtime, nodesToRun) {
    const fiber = runtime.getCurrentFiber();
    const operandStack = fiber.operandStack;
    const instructionStackSnapshot = fiber.instructionStack.snapshot();
    const initialFrameCount = operandStack.snapshot().frameBottoms.length;
    operandStack.pushFrame();
    runtime.addOpDirectly(RuntimeOpCode.LandSuccess);
    runtime.addOpDirectly(RuntimeOpCode.RunBlock, nodesToRun);
    try {
      RuntimeInterpreter.StartLoopSync(runtime);
      RuntimeInterpreter.AssertNoUnboundTopLevelWords(runtime, nodesToRun);
      return operandStack.popFrameAndPushTopValue();
    } catch (error) {
      RuntimeInterpreter.PopOperandFramesAfterAbrupt(runtime, initialFrameCount);
      fiber.instructionStack.loadSnapshot(instructionStackSnapshot);
      throw error;
    }
  }
  static MakeFuncSync(runtime, sourceOrNode, options = false) {
    const callable = typeof sourceOrNode === "string" ? RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, sourceOrNode) : RuntimeInterpreter.ExecWithRuntimeSync(runtime, sourceOrNode);
    if (!RuntimeInterpreter.IsCallable(callable)) {
      throw new Error("RuntimeInterpreter.MakeFuncSync source does not evaluate to a callable");
    }
    if (RuntimeInterpreter.IsRuntimeContinuation(callable)) {
      throw new Error("RuntimeInterpreter.MakeFuncSync source does not evaluate to a callable");
    }
    const reusable = typeof options === "boolean" ? options : options?.reusable === true;
    if (!reusable) {
      return (...args) => RuntimeInterpreter.CallRuntimeCallableSync(runtime, callable, args, "<embedded>");
    }
    let reusableSnapshot = runtime.captureSnapshot();
    return (...args) => {
      runtime.hydrateSnapshot(reusableSnapshot);
      const result = RuntimeInterpreter.CallRuntimeCallableSync(runtime, callable, args, "<embedded>");
      reusableSnapshot = runtime.captureSnapshot();
      return result;
    };
  }
  static async ExecBlockWithRuntimeAsync(runtime, nodesToRun) {
    const fiber = runtime.getCurrentFiber();
    const operandStack = fiber.operandStack;
    const instructionStackSnapshot = fiber.instructionStack.snapshot();
    const initialFrameCount = operandStack.snapshot().frameBottoms.length;
    operandStack.pushFrame();
    runtime.addOpDirectly(RuntimeOpCode.LandSuccess);
    runtime.addOpDirectly(RuntimeOpCode.RunBlock, nodesToRun);
    try {
      await RuntimeInterpreter.StartLoopAsync(runtime);
      return operandStack.popFrameAndPushTopValue();
    } catch (error) {
      RuntimeInterpreter.PopOperandFramesAfterAbrupt(runtime, initialFrameCount);
      fiber.instructionStack.loadSnapshot(instructionStackSnapshot);
      throw error;
    }
  }
  static CallRuntimeCallableSync(runtime, callable, args, name = "<callable>") {
    if (!RuntimeInterpreter.IsCallable(callable)) {
      throw new Error(`Callable not found: ${name}`);
    }
    if (!RuntimeInterpreter.IsInstructionStackLambda(callable)) {
      return RuntimeInterpreter.CallResolvedCallable(runtime, callable, args, name);
    }
    const fiber = runtime.getCurrentFiber();
    const operandStack = fiber.operandStack;
    const instructionStackSnapshot = fiber.instructionStack.snapshot();
    const initialFrameCount = operandStack.snapshot().frameBottoms.length;
    operandStack.pushFrame();
    runtime.addOpDirectly(RuntimeOpCode.LandSuccess);
    RuntimeInterpreter.ScheduleRuntimeLambdaCall(runtime, callable, args, { name });
    try {
      RuntimeInterpreter.StartLoopSync(runtime);
      return operandStack.popFrameAndPushTopValue();
    } catch (error) {
      RuntimeInterpreter.PopOperandFramesAfterAbrupt(runtime, initialFrameCount);
      fiber.instructionStack.loadSnapshot(instructionStackSnapshot);
      throw error;
    }
  }
  static EvaluateNode(runtime, nodeToRun) {
    if (nodeToRun?.__runtimeForm != null) {
      return RuntimeInterpreter.EvaluateRuntimeForm(runtime, nodeToRun);
    }
    if (KnNodeHelper.GetType(nodeToRun) === "RawString" /* RawString */) {
      return nodeToRun.Value;
    }
    if (KnNodeHelper.GetType(nodeToRun) === "InterpolatedString" /* InterpolatedString */) {
      return RuntimeInterpreter.EvaluateInterpolatedString(runtime, nodeToRun);
    }
    if (KnNodeHelper.GetType(nodeToRun) === "Knot" /* Knot */) {
      return RuntimeInterpreter.EvaluateChain(runtime, nodeToRun);
    }
    if (KnNodeHelper.GetType(nodeToRun) === "Word" /* Word */) {
      const name = RuntimeInterpreter.GetWordName(nodeToRun);
      if (runtime.hasHostFunction(name)) {
        return runtime.getHostFunction(name);
      }
      return runtime.lookup(name);
    }
    if (Array.isArray(nodeToRun)) {
      return nodeToRun.map((item) => RuntimeInterpreter.EvaluateNode(runtime, item));
    }
    return nodeToRun;
  }
  static Op(opcode, memo = null, comment) {
    return { opcode, memo, comment };
  }
  static PushOpsToFiber(fiber, ops) {
    for (let i = ops.length - 1;i >= 0; i--) {
      fiber.instructionStack.push({ ...ops[i] });
    }
  }
  static PeekAndClearCurrentOperandFrame(runtime) {
    const operandStack = runtime.getCurrentFiber().operandStack;
    const snapshot = operandStack.snapshot();
    const frameBottom = snapshot.frameBottoms.at(-1) ?? 0;
    const values = snapshot.items.slice(frameBottom);
    operandStack.loadSnapshot({
      items: snapshot.items.slice(0, frameBottom),
      frameBottoms: [...snapshot.frameBottoms]
    });
    return values;
  }
  static PopOperandFramesAfterAbrupt(runtime, initialFrameCount) {
    const operandStack = runtime.getCurrentFiber().operandStack;
    while (operandStack.snapshot().frameBottoms.length > initialFrameCount) {
      operandStack.popFrameAllValues();
    }
  }
  static BuildLoopStepOps(stepNode) {
    return stepNode == null ? [] : [
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, stepNode),
      RuntimeInterpreter.Op("ValStack_PopValue")
    ];
  }
  static ScheduleRuntimeLambdaCall(runtime, fn, args, options = {}) {
    const activeEffectHandlerMaps = runtime.captureSnapshot().activeEffectHandlerMaps;
    const bindings = { ...fn.closureValues ?? {} };
    for (let i = 0;i < fn.params.length; i++) {
      bindings[fn.params[i]] = args[i] ?? null;
    }
    if (activeEffectHandlerMaps.length > 0) {
      bindings.__EffectHandlerMap = Object.assign({}, ...activeEffectHandlerMaps);
    }
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op("Env_DiveLocalEnv", {
        parentEnvId: fn.definitionEnvId,
        name: `lambda:${options.name ?? fn.name ?? "anonymous"}`,
        bindings
      }),
      RuntimeInterpreter.Op(RuntimeOpCode.MakeContExcludeTopNInstruction, 2),
      RuntimeInterpreter.Op("Env_SetLocalEnv", "return"),
      RuntimeInterpreter.Op(RuntimeOpCode.RunBlock, fn.body ?? []),
      ...options.resultOverride !== undefined ? [RuntimeInterpreter.Op("Runtime_PushValueIfTopNullish", options.resultOverride)] : [],
      RuntimeInterpreter.Op("Env_Rise")
    ]);
  }
  static ScheduleRuntimeMemberLambdaCall(runtime, fn, args, options = {}) {
    const callerEnvId = runtime.currentEnvId;
    const activeEffectHandlerMaps = runtime.captureSnapshot().activeEffectHandlerMaps;
    const bindings = { ...fn.closureValues ?? {} };
    for (let i = 0;i < fn.params.length; i++) {
      bindings[fn.params[i]] = args[i] ?? null;
    }
    if (activeEffectHandlerMaps.length > 0) {
      bindings.__EffectHandlerMap = Object.assign({}, ...activeEffectHandlerMaps);
    }
    const childEnv = runtime.makeSubLocalEnvUnderEnv(fn.definitionEnvId, `member:${options.name ?? fn.name ?? "anonymous"}`);
    for (const [key, value] of Object.entries(bindings)) {
      runtime.define(key, value);
    }
    runtime.changeEnvById(callerEnvId);
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op("Env_ChangeEnvById", childEnv.Id),
      RuntimeInterpreter.Op(RuntimeOpCode.RunBlock, fn.body ?? []),
      ...options.resultOverride !== undefined ? [RuntimeInterpreter.Op("Runtime_PushValueIfTopNullish", options.resultOverride)] : [],
      RuntimeInterpreter.Op("Env_ChangeEnvById", callerEnvId)
    ]);
  }
  static RestoreEnvContinuation(runtime, name, values = []) {
    const continuation = runtime.lookup(name);
    if (!RuntimeInterpreter.IsRuntimeContinuation(continuation)) {
      throw new Error(`${name} continuation not found`);
    }
    runtime.restoreContinuation(continuation, values);
  }
  static IsInstructionStackLambda(fn) {
    return fn?.kind === "RuntimeLambdaFunction" && !(fn.body ?? []).some((item) => typeof item === "function");
  }
  static ExpandNode(runtime, nodeToRun) {
    if (nodeToRun?.__runtimeForm != null) {
      RuntimeInterpreter.ExpandRuntimeForm(runtime, nodeToRun);
      return;
    }
    const nodeType = KnNodeHelper.GetType(nodeToRun);
    if (nodeType === "RawString" /* RawString */) {
      runtime.addOpDirectly(RuntimeOpCode.PushValue, nodeToRun.Value);
      return;
    }
    if (nodeType === "InterpolatedString" /* InterpolatedString */) {
      RuntimeInterpreter.ExpandInterpolatedString(runtime, nodeToRun);
      return;
    }
    const expander = runtime.getNodeExpander(nodeType);
    if (expander != null) {
      expander(runtime, nodeToRun);
      return;
    }
    if (KnNodeHelper.IsEvaluated(nodeToRun)) {
      runtime.addOpDirectly(RuntimeOpCode.PushValue, nodeToRun);
      return;
    }
    runtime.addOpDirectly(RuntimeOpCode.PushValue, nodeToRun);
  }
  static ExpandVector(runtime, nodeToRun) {
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op("ValStack_PushFrame"),
      ...nodeToRun.map((item) => RuntimeInterpreter.Op(RuntimeOpCode.RunNode, item)),
      RuntimeInterpreter.Op(RuntimeOpCode.MakeArray, nodeToRun.length),
      RuntimeInterpreter.Op("ValStack_PopFrameAndPushTopVal", null, "end make array")
    ]);
  }
  static ExpandMap(runtime, nodeToRun) {
    const entries = Object.entries(nodeToRun).filter(([key]) => key !== "_Type");
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op("ValStack_PushFrame"),
      ...entries.flatMap(([key, value]) => [
        RuntimeInterpreter.Op(RuntimeOpCode.PushValue, key),
        RuntimeInterpreter.Op(RuntimeOpCode.RunNode, value)
      ]),
      RuntimeInterpreter.Op(RuntimeOpCode.MakeMap, entries.length),
      RuntimeInterpreter.Op("ValStack_PopFrameAndPushTopVal", null, "end make map")
    ]);
  }
  static ExpandInterpolatedString(runtime, nodeToRun) {
    runtime.addOpsInOrder([
      ...nodeToRun.Parts.map((part) => part.kind === "text" ? RuntimeInterpreter.Op(RuntimeOpCode.PushValue, part.value) : RuntimeInterpreter.Op(RuntimeOpCode.RunNode, part.value)),
      RuntimeInterpreter.Op(RuntimeOpCode.BuildInterpolatedString, nodeToRun.Parts.length)
    ]);
  }
  static ExpandBlock(runtime, block) {
    const ops = [];
    for (let i = 0;i < block.length; i++) {
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, block[i]));
      if (i < block.length - 1) {
        ops.push(RuntimeInterpreter.Op("ValStack_PopValue", null, `body index:${i}`));
      }
    }
    runtime.addOpsInOrder(ops);
  }
  static ExpandChain(runtime, knot) {
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op("ValStack_PushFrame"),
      RuntimeInterpreter.Op(RuntimeOpCode.ChainStep, knot),
      RuntimeInterpreter.Op("ValStack_PopFrameAndPushTopVal", null, "end chain expr")
    ]);
  }
  static ExpandChainStep(runtime, knot) {
    if (knot == null) {
      return;
    }
    const keyword = RuntimeInterpreter.GetKnotCoreWordName(knot);
    if (knot.CallType == null && RuntimeInterpreter.TryExpandPrefixSpecial(runtime, knot, keyword)) {
      return;
    }
    const ops = [];
    const nextNode = RuntimeInterpreter.AppendChainCurrentOps(runtime, ops, knot);
    if (nextNode != null) {
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.ChainStep, nextNode));
    }
    runtime.addOpsInOrder(ops);
  }
  static TryExpandPrefixSpecial(runtime, knot, keyword) {
    const prefixExpander = runtime.getPrefixKeywordExpander(keyword);
    if (prefixExpander != null) {
      prefixExpander(runtime, {
        knot,
        sourceNodeId: `prefix:${keyword}`
      });
      return true;
    }
    if (runtime.hasWorkflowExtension(keyword, "prefix")) {
      const args = RuntimeInterpreter.KnotToArray(knot).slice(1);
      runtime.addOpsInOrder([
        ...args.map((arg) => RuntimeInterpreter.Op(RuntimeOpCode.RunNode, arg.Core)),
        RuntimeInterpreter.Op(RuntimeOpCode.InvokeWorkflowExtension, {
          name: keyword,
          fixity: "prefix",
          argCount: args.length,
          sourceNode: knot,
          sourceNodeId: `prefix:${keyword}`
        })
      ]);
      return true;
    }
    switch (keyword) {
      case "class":
        runtime.addOpDirectly(RuntimeOpCode.PushValue, RuntimeInterpreter.EvaluateClassDefinition(runtime, knot));
        return true;
      case "var":
        RuntimeInterpreter.ExpandVar(runtime, knot);
        return true;
      case "set":
        RuntimeInterpreter.ExpandSet(runtime, knot);
        return true;
      case "fn":
        runtime.addOpDirectly(RuntimeOpCode.PushValue, RuntimeInterpreter.EvaluateFunctionDefinition(runtime, knot));
        return true;
      case "func":
        runtime.addOpDirectly(RuntimeOpCode.PushValue, RuntimeInterpreter.EvaluateFunctionDefinition(runtime, knot));
        return true;
      case "do":
      case "main":
        if (knot.Body != null) {
          runtime.addOpDirectly(RuntimeOpCode.RunBlock, knot.Body);
        } else {
          runtime.addOpDirectly(RuntimeOpCode.RunNode, knot.Next?.Core ?? []);
        }
        return true;
      case "if":
        RuntimeInterpreter.ExpandIf(runtime, knot);
        return true;
      case "cond":
        RuntimeInterpreter.ExpandCond(runtime, knot);
        return true;
      case "foreach":
        RuntimeInterpreter.ExpandForeach(runtime, knot);
        return true;
      case "for":
        RuntimeInterpreter.ExpandFor(runtime, knot);
        return true;
      case "++":
        RuntimeInterpreter.ExpandIncrement(runtime, knot);
        return true;
      case "--":
      case "+=":
      case "-=":
      case "*=":
      case "/=":
        RuntimeInterpreter.ExpandSelfUpdate(runtime, knot, keyword);
        return true;
      case "await_host_fn":
        RuntimeInterpreter.ExpandAwaitHostFunction(runtime, knot);
        return true;
      case "set_timeout":
        RuntimeInterpreter.ExpandSetTimeout(runtime, knot);
        return true;
      case "set_interval":
        RuntimeInterpreter.ExpandSetInterval(runtime, knot);
        return true;
      case "js_call":
        RuntimeInterpreter.ExpandJsCallAlias(runtime, knot, false);
        return true;
      case "js_apply":
        RuntimeInterpreter.ExpandJsCallAlias(runtime, knot, true);
        return true;
      case "try":
        RuntimeInterpreter.ExpandTry(runtime, knot);
        return true;
      case "perform":
        RuntimeInterpreter.ExpandPerform(runtime, knot);
        return true;
      case "break":
        runtime.addOpDirectly("Runtime_RestoreContinuationFromEnv", {
          name: "break",
          valueCount: 0
        });
        return true;
      case "continue":
        runtime.addOpDirectly("Runtime_RestoreContinuationFromEnv", {
          name: "continue",
          valueCount: 0
        });
        return true;
      case "return":
        RuntimeInterpreter.ExpandReturn(runtime, knot);
        return true;
      default:
        return false;
    }
  }
  static AppendChainCurrentOps(runtime, ops, knot) {
    const keyword = RuntimeInterpreter.GetKnotCoreWordName(knot);
    if (keyword === "++") {
      ops.push(RuntimeInterpreter.Op("Runtime_IncrementVar", RuntimeInterpreter.GetWordName(RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable)[0])));
      return knot.Next;
    }
    if (keyword === "return") {
      RuntimeInterpreter.AppendReturnOps(ops, knot);
      return null;
    }
    if (RuntimeInterpreter.IsAbruptControlKeyword(keyword)) {
      RuntimeInterpreter.AppendAbruptControlOps(ops, keyword, knot);
      return null;
    }
    if (knot.CallType === 7 /* Assignment */) {
      RuntimeInterpreter.AppendChainAssignmentOps(ops, knot);
      return null;
    }
    if (knot.CallType === 1 /* InfixCall */ || knot.CallType === 6 /* Operator */) {
      const name = RuntimeInterpreter.GetWordName(knot.Core);
      const inputNodes = RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable);
      if (RuntimeInterpreter.IsSelfUpdateOperator(name)) {
        RuntimeInterpreter.AppendSelfUpdateOps(ops, knot, name);
        return knot.Next;
      }
      if (name === "def_to" || name === "set_to") {
        RuntimeInterpreter.AppendDefineSetToOps(ops, knot, name);
        return knot.Next;
      }
      if (name === "save_operands") {
        ops.push(RuntimeInterpreter.Op("Runtime_SaveOperands"));
        return knot.Next;
      }
      if (RuntimeInterpreter.IsLogicalOperator(name)) {
        return RuntimeInterpreter.AppendLogicalOperatorOps(runtime, ops, knot, name, inputNodes);
      }
      if (runtime.getInfixKeywordExpander(name) != null) {
        const expander = runtime.getInfixKeywordExpander(name);
        runtime.addOpsInOrder(ops);
        expander(runtime, {
          knot,
          sourceNodeId: `infix:${name}`
        });
        return null;
      }
      if (runtime.hasWorkflowExtension(name, "infix")) {
        for (const inputNode of inputNodes) {
          ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, inputNode));
        }
        let nextNode2 = knot.Next;
        let argCount2 = Math.max(inputNodes.length, 2);
        if (inputNodes.length === 0) {
          let needed = Math.max(2 - RuntimeInterpreter.GetCurrentFrameValueCount(runtime), 0);
          while (needed > 0 && nextNode2 != null) {
            ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, nextNode2.Core));
            nextNode2 = nextNode2.Next;
            needed -= 1;
          }
        }
        ops.push(RuntimeInterpreter.Op(RuntimeOpCode.InvokeWorkflowExtension, {
          name,
          fixity: "infix",
          argCount: argCount2,
          sourceNode: knot,
          sourceNodeId: `infix:${name}`
        }));
        return nextNode2;
      }
      const callable = RuntimeInterpreter.ResolveCallable(runtime, knot.Core);
      const arity = RuntimeInterpreter.GetCallableArity(runtime, knot.Core, callable);
      for (const inputNode of inputNodes) {
        ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, inputNode));
      }
      let nextNode = knot.Next;
      let argCount = Math.max(arity, inputNodes.length);
      if (inputNodes.length === 0) {
        let needed = Math.max(arity - RuntimeInterpreter.GetCurrentFrameValueCount(runtime), 0);
        while (needed > 0 && nextNode != null) {
          ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, nextNode.Core));
          nextNode = nextNode.Next;
          needed -= 1;
        }
      }
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.ApplyCallable, {
        callableNode: knot.Core,
        argCount
      }));
      return nextNode;
    }
    if (knot.CallType === 0 /* PrefixCall */ || knot.CallType === 3 /* PostfixCall */) {
      const inputNodes = RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable);
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, knot.Core));
      for (const inputNode of inputNodes) {
        ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, inputNode));
      }
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.ApplyCallable, {
        callableFromStack: true,
        argCount: inputNodes.length
      }));
      return knot.Next;
    }
    if (knot.CallType === 2 /* InstanceCall */) {
      const inputNodes = RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable);
      const methodName = RuntimeInterpreter.GetWordName(knot.Core);
      for (const inputNode of inputNodes) {
        ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, inputNode));
      }
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.CallInstance, {
        methodName,
        argCount: inputNodes.length,
        projectionTargetName: methodName === "as" && inputNodes.length > 0 ? RuntimeInterpreter.ReadProjectionTargetName(inputNodes[0]) : undefined
      }));
      return knot.Next;
    }
    if (knot.CallType === 5 /* StaticIndex */) {
      if (knot.Next?.CallType === 7 /* Assignment */) {
        ops.push(RuntimeInterpreter.Op(RuntimeOpCode.PushValue, {
          kind: "property",
          key: RuntimeInterpreter.GetWordName(knot.Core)
        }));
        return knot.Next;
      }
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunGetProperty, { key: RuntimeInterpreter.GetWordName(knot.Core) }));
      return knot.Next;
    }
    if (knot.CallType === 4 /* Subscript */) {
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, knot.Core));
      if (knot.Next?.CallType === 7 /* Assignment */) {
        ops.push(RuntimeInterpreter.Op(RuntimeOpCode.PushValue, { kind: "subscript" }));
        ops.push(RuntimeInterpreter.Op("Runtime_BuildSubscriptSelector"));
        return knot.Next;
      }
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunGetSubscript, {}));
      return knot.Next;
    }
    if (knot.Core == null && knot.Body != null) {
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunBlock, knot.Body));
      return knot.Next;
    }
    if (KnNodeHelper.GetType(knot.Core) === "Word" /* Word */) {
      const callable = RuntimeInterpreter.TryResolveCallable(runtime, knot.Core);
      if (RuntimeInterpreter.IsCallable(callable)) {
        const headName = RuntimeInterpreter.GetWordName(knot.Core);
        const arity = RuntimeInterpreter.GetCallableArity(runtime, knot.Core, callable);
        const existingCount = RuntimeInterpreter.GetCurrentFrameValueCount(runtime);
        if (runtime.hasHostFunction(headName) && runtime.isHostFunctionVariadic(headName)) {
          let nextNode2 = knot.Next;
          let consumed = 0;
          while (nextNode2 != null) {
            ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, nextNode2.Core));
            nextNode2 = nextNode2.Next;
            consumed += 1;
          }
          const argCount = Math.max(existingCount + consumed, arity);
          ops.push(RuntimeInterpreter.Op(RuntimeOpCode.ApplyCallable, {
            callableNode: knot.Core,
            argCount
          }));
          return nextNode2;
        }
        let needed = Math.max(arity - existingCount, 0);
        let nextNode = knot.Next;
        while (needed > 0 && nextNode != null) {
          ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, nextNode.Core));
          nextNode = nextNode.Next;
          needed -= 1;
        }
        if (needed === 0) {
          ops.push(RuntimeInterpreter.Op(RuntimeOpCode.ApplyCallable, {
            callableNode: knot.Core,
            argCount: arity
          }));
          return nextNode;
        }
      }
      if (RuntimeInterpreter.IsUnboundName(runtime, knot.Core)) {
        throw new Error(`Unbound name: ${RuntimeInterpreter.GetWordName(knot.Core)}`);
      }
    }
    ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, knot.Core));
    return knot.Next;
  }
  static AppendLogicalOperatorOps(runtime, ops, knot, name, inputNodes) {
    if (RuntimeInterpreter.GetCurrentFrameValueCount(runtime) >= 2) {
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.ApplyLogicalOperator, { name, phase: "apply" }));
      return knot.Next;
    }
    if (RuntimeInterpreter.GetCurrentFrameValueCount(runtime) === 0 && inputNodes.length >= 2) {
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, inputNodes[0]));
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.ApplyLogicalOperator, {
        name,
        phase: "decide",
        rightNode: inputNodes[1],
        nextNode: knot.Next
      }));
      return null;
    }
    const rightNode = inputNodes[0] ?? knot.Next?.Core ?? null;
    if (rightNode == null) {
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.ApplyLogicalOperator, {
        name,
        phase: "apply"
      }));
      return knot.Next;
    }
    ops.push(RuntimeInterpreter.Op(RuntimeOpCode.ApplyLogicalOperator, {
      name,
      phase: "decide",
      rightNode,
      nextNode: inputNodes.length > 0 ? knot.Next : knot.Next?.Next
    }));
    return null;
  }
  static IsAbruptControlKeyword(name) {
    return name === "break" || name === "continue" || name === "return";
  }
  static ThrowAbruptControlSignal(runtime, name, knot) {
    if (name === "break") {
      throw new RuntimeBreakSignal;
    }
    if (name === "continue") {
      throw new RuntimeContinueSignal;
    }
    throw new RuntimeReturnSignal(RuntimeInterpreter.EvaluateParamValues(runtime, knot)[0] ?? null);
  }
  static ExpandReturn(runtime, knot) {
    const ops = [];
    RuntimeInterpreter.AppendReturnOps(ops, knot);
    runtime.addOpsInOrder(ops);
  }
  static AppendReturnOps(ops, knot) {
    const args = RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable);
    if (args.length === 0) {
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.PushValue, null));
    } else {
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, args[0]));
    }
    ops.push(RuntimeInterpreter.Op("Runtime_RestoreContinuationFromEnv", {
      name: "return",
      valueCount: 1
    }));
  }
  static AppendChainAssignmentOps(ops, knot) {
    ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, knot.Core));
    ops.push(RuntimeInterpreter.Op("Runtime_AssignChainTarget"));
  }
  static AppendDefineSetToOps(ops, knot, name) {
    const targetName = RuntimeInterpreter.GetDefineSetToTargetName(knot);
    ops.push(RuntimeInterpreter.Op(RuntimeOpCode.Duplicate));
    ops.push(RuntimeInterpreter.Op(name === "def_to" ? "Env_DeclareLocalVar" : "Env_SetLocalEnv", targetName));
  }
  static GetDefineSetToTargetName(knot) {
    const selector = knot.Selector;
    if (selector != null) {
      return selector;
    }
    const inputNodes = RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable);
    if (inputNodes[0] != null) {
      return RuntimeInterpreter.GetWordName(inputNodes[0]);
    }
    if (knot.Next?.Core != null) {
      return RuntimeInterpreter.GetWordName(knot.Next.Core);
    }
    return RuntimeInterpreter.GetWordName(knot.Core);
  }
  static AppendAbruptControlOps(ops, keyword, knot) {
    if (keyword === "return") {
      RuntimeInterpreter.AppendReturnOps(ops, knot);
      return;
    }
    ops.push(RuntimeInterpreter.Op("Runtime_RestoreContinuationFromEnv", {
      name: keyword,
      valueCount: 0
    }));
  }
  static GetCurrentFrameValueCount(runtime) {
    const snapshot = runtime.getCurrentFiber().operandStack.snapshot();
    const frameBottom = snapshot.frameBottoms.at(-1) ?? 0;
    return snapshot.items.length - frameBottom;
  }
  static AssertVarNameIsPlainBinding(nameNode) {
    if (nameNode != null && (nameNode.InOutTable != null || nameNode.Body != null)) {
      const declaredName = RuntimeInterpreter.GetWordName(nameNode.Core) ?? "<name>";
      throw new Error(`var "${declaredName}" attaches a parameter list or block to the name but binds ` + `no value — a function literal needs the fn keyword, e.g. ` + `(var ${declaredName} (fn |..| :[ .. ])).`);
    }
  }
  static ExpandVar(runtime, knot) {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    RuntimeInterpreter.AssertVarNameIsPlainBinding(nodes[1]);
    const name = RuntimeInterpreter.GetWordName(nodes[1]?.Core);
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, nodes[2]?.Core),
      RuntimeInterpreter.Op(RuntimeOpCode.Duplicate),
      RuntimeInterpreter.Op("Env_DeclareLocalVar", name)
    ]);
  }
  static ExpandSet(runtime, knot) {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    const placeNodes = nodes.slice(1, -1);
    const valueNode = nodes.at(-1)?.Core;
    if (placeNodes.length === 1 && KnNodeHelper.GetType(placeNodes[0].Core) === "Word" /* Word */) {
      runtime.addOpsInOrder([
        RuntimeInterpreter.Op(RuntimeOpCode.RunNode, valueNode),
        RuntimeInterpreter.Op(RuntimeOpCode.Duplicate),
        RuntimeInterpreter.Op("Env_SetLocalEnv", RuntimeInterpreter.GetWordName(placeNodes[0].Core))
      ]);
      return;
    }
    const ops = [RuntimeInterpreter.Op(RuntimeOpCode.RunNode, valueNode)];
    RuntimeInterpreter.AppendSetPlaceOps(ops, placeNodes);
    runtime.addOpsInOrder(ops);
  }
  static AppendSetPlaceOps(ops, placeNodes) {
    if (placeNodes.length === 0) {
      throw new Error("set requires an assignment target");
    }
    ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, placeNodes[0].Core));
    for (let i = 1;i < placeNodes.length; i++) {
      const node = placeNodes[i];
      const isFinal = i === placeNodes.length - 1;
      if (node.CallType === 4 /* Subscript */) {
        ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, node.Core));
        ops.push(RuntimeInterpreter.Op(isFinal ? RuntimeOpCode.RunSetSubscript : RuntimeOpCode.RunGetSubscript, {}));
      } else {
        ops.push(RuntimeInterpreter.Op(isFinal ? RuntimeOpCode.RunSetProperty : RuntimeOpCode.RunGetProperty, { key: RuntimeInterpreter.GetWordName(node.Core) }));
      }
    }
  }
  static ExpandIncrement(runtime, knot) {
    const targetName = RuntimeInterpreter.GetWordName(RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable)[0]);
    runtime.addOpDirectly(RuntimeOpCode.PushValue, RuntimeInterpreter.EvaluateIncrementByName(runtime, targetName));
  }
  static ExpandSelfUpdate(runtime, knot, operator) {
    const ops = [];
    RuntimeInterpreter.AppendSelfUpdateOps(ops, knot, operator);
    runtime.addOpsInOrder(ops);
  }
  static AppendSelfUpdateOps(ops, knot, operator) {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    const inputNodes = RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable);
    const targetNode = inputNodes[0] ?? nodes[1]?.Core ?? knot.Next?.Core;
    const valueNode = operator === "++" || operator === "--" ? 1 : inputNodes[1] ?? nodes[2]?.Core ?? knot.Next?.Next?.Core;
    const targetName = RuntimeInterpreter.GetWordName(targetNode);
    const mathName = operator === "--" || operator === "-=" ? "-" : operator === "*=" ? "*" : operator === "/=" ? "/" : "+";
    ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, new KnWord(targetName)), RuntimeInterpreter.Op(typeof valueNode === "number" ? RuntimeOpCode.PushValue : RuntimeOpCode.RunNode, valueNode ?? 1), RuntimeInterpreter.Op(RuntimeOpCode.ApplyCallable, {
      callableNode: new KnWord(mathName),
      argCount: 2
    }), RuntimeInterpreter.Op(RuntimeOpCode.Duplicate), RuntimeInterpreter.Op("Env_SetLocalEnv", targetName));
  }
  static IsSelfUpdateOperator(operator) {
    return operator === "++" || operator === "--" || operator === "+=" || operator === "-=" || operator === "*=" || operator === "/=";
  }
  static ExpandAwaitHostFunction(runtime, knot) {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    const callableNode = nodes[1]?.Core;
    const argsNode = nodes[2]?.Core;
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, callableNode),
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, argsNode),
      RuntimeInterpreter.Op("Runtime_AwaitHostFunction")
    ]);
  }
  static ExpandSetTimeout(runtime, knot) {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, nodes[1]?.Core),
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, nodes[2]?.Core),
      RuntimeInterpreter.Op("Runtime_SetTimeout")
    ]);
  }
  static ExpandSetInterval(runtime, knot) {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, nodes[1]?.Core),
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, nodes[2]?.Core),
      RuntimeInterpreter.Op("Runtime_SetInterval")
    ]);
  }
  static ExpandJsCallAlias(runtime, knot, apply) {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    const targetNode = nodes[1]?.Core;
    const methodNode = nodes[2]?.Core;
    const argNodes = nodes.slice(3).map((node) => node.Core);
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, targetNode),
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, methodNode),
      ...apply ? [RuntimeInterpreter.Op(RuntimeOpCode.RunNode, argNodes[0] ?? [])] : argNodes.map((arg) => RuntimeInterpreter.Op(RuntimeOpCode.RunNode, arg)),
      RuntimeInterpreter.Op(apply ? "Runtime_JsApplyAlias" : "Runtime_JsCallAlias", {
        argCount: apply ? 1 : argNodes.length
      })
    ]);
  }
  static ExpandIf(runtime, knot) {
    const conditionNode = knot.Next;
    const elseNode = conditionNode?.Next != null && RuntimeInterpreter.GetKnotCoreWordName(conditionNode.Next) === "else" ? conditionNode.Next : null;
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op("ValStack_PushFrame"),
      RuntimeInterpreter.Op(RuntimeOpCode.IterConditionPairs, {
        branches: [{
          condition: conditionNode?.Core,
          body: conditionNode?.Body ?? []
        }],
        index: 0,
        fallbackBody: elseNode?.Body ?? []
      }),
      RuntimeInterpreter.Op("ValStack_PopFrameAndPushTopVal", null, "end if")
    ]);
  }
  static ExpandCond(runtime, knot) {
    const branches = [];
    let fallbackBody = [];
    let current = knot.Next;
    while (current != null) {
      if (RuntimeInterpreter.GetKnotCoreWordName(current) === "else") {
        fallbackBody = current.Body ?? [];
      } else {
        branches.push({
          condition: current.Core,
          body: current.Body ?? []
        });
      }
      current = current.Next;
    }
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op("ValStack_PushFrame"),
      RuntimeInterpreter.Op(RuntimeOpCode.IterConditionPairs, {
        branches,
        index: 0,
        fallbackBody
      }),
      RuntimeInterpreter.Op("ValStack_PopFrameAndPushTopVal", null, "end condition")
    ]);
  }
  static ExpandForeach(runtime, knot) {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    const itemName = RuntimeInterpreter.GetWordName(nodes[1]?.Core);
    const itemsNode = nodes[3];
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op("ValStack_PushFrame"),
      RuntimeInterpreter.Op("Env_DiveLocalEnv", "foreach"),
      RuntimeInterpreter.Op(RuntimeOpCode.MakeContExcludeTopNInstruction, 3),
      RuntimeInterpreter.Op("Env_SetLocalEnv", "break"),
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, itemsNode?.Core),
      RuntimeInterpreter.Op(RuntimeOpCode.IterForEachLoop, {
        index: 0,
        itemName,
        body: itemsNode?.Body ?? [],
        frameId: `foreach:${itemName}`
      }),
      RuntimeInterpreter.Op("Env_Rise"),
      RuntimeInterpreter.Op("ValStack_PopFrameAndPushTopVal", null, "end foreach")
    ]);
  }
  static ExpandFor(runtime, knot) {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    const conditionNode = nodes[1]?.Core;
    const stepNode = nodes[2]?.Core;
    const body = nodes[2]?.Body ?? [];
    const initOps = [];
    for (const [key, value] of Object.entries(knot.Conf ?? {})) {
      initOps.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, value));
      initOps.push(RuntimeInterpreter.Op("Env_SetLocalEnv", key));
    }
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op("ValStack_PushFrame"),
      RuntimeInterpreter.Op("Env_DiveLocalEnv", "for"),
      ...initOps,
      RuntimeInterpreter.Op(RuntimeOpCode.MakeContExcludeTopNInstruction, 2),
      RuntimeInterpreter.Op("Env_SetLocalEnv", "break"),
      RuntimeInterpreter.Op(RuntimeOpCode.IterForLoop, {
        conditionNode,
        stepNode,
        body,
        frameId: "for"
      }),
      RuntimeInterpreter.Op("Env_Rise"),
      RuntimeInterpreter.Op("ValStack_PopFrameAndPushTopVal", null, "end for")
    ]);
  }
  static ExpandTry(runtime, knot) {
    const handlerEntries = RuntimeInterpreter.ParseTryHandlerEntries(knot);
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op("Env_DiveLocalEnv", "try"),
      ...handlerEntries.map((entry) => RuntimeInterpreter.Op(RuntimeOpCode.RunNode, entry.handlerNode)),
      RuntimeInterpreter.Op("Runtime_BuildTryHandlerMap", { entries: handlerEntries }),
      RuntimeInterpreter.Op("Env_SetLocalEnv", "__EffectHandlerMap"),
      RuntimeInterpreter.Op(RuntimeOpCode.MakeContExcludeTopNInstruction, 4),
      RuntimeInterpreter.Op("Env_SetLocalEnv", "__ContinuationAfterTry"),
      RuntimeInterpreter.Op("Runtime_PushActiveEffectHandlerMapFromEnv", "__EffectHandlerMap"),
      RuntimeInterpreter.Op(RuntimeOpCode.RunBlock, knot.Body ?? []),
      RuntimeInterpreter.Op("Runtime_PopActiveEffectHandlerMap"),
      RuntimeInterpreter.Op("Env_Rise")
    ]);
  }
  static ExpandPerform(runtime, knot) {
    const effectName = RuntimeInterpreter.GetPerformEffectName(knot);
    const effectHandlerMap = runtime.lookup("__EffectHandlerMap") ?? runtime.getActiveEffectHandlerMap();
    const handler = effectHandlerMap?.[effectName];
    if (handler == null) {
      throw new Error(`Unhandled effect: ${effectName}`);
    }
    const args = RuntimeInterpreter.GetPerformArgNodes(knot);
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op("ValStack_PushFrame"),
      RuntimeInterpreter.Op("Env_DiveLocalEnv", "perform"),
      RuntimeInterpreter.Op(RuntimeOpCode.MakeContExcludeTopNInstruction, args.length + 2),
      ...args.map((arg) => RuntimeInterpreter.Op(RuntimeOpCode.RunNode, arg)),
      RuntimeInterpreter.Op("ValStack_PushValue", handler),
      RuntimeInterpreter.Op(RuntimeOpCode.ApplyToFrameTop),
      RuntimeInterpreter.Op("Env_Rise"),
      RuntimeInterpreter.Op("ValStack_PopFrameAndPushTopVal", null, "end perform")
    ]);
  }
  static GetPerformEffectName(knot) {
    if (knot.Name != null) {
      return RuntimeInterpreter.GetWordName(knot.Name);
    }
    const firstArg = RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable)[0];
    return RuntimeInterpreter.GetWordName(firstArg);
  }
  static GetPerformArgNodes(knot) {
    const args = RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable);
    if (args.length > 0) {
      return knot.Name == null ? args.slice(1) : args;
    }
    const result = [];
    let current = knot.Name == null ? knot.Next?.Next : knot.Next;
    while (current != null) {
      result.push(current.Core);
      current = current.Next;
    }
    return result;
  }
  static ContainsWorkflowExtension(runtime, nodes) {
    for (const node of nodes ?? []) {
      if (KnNodeHelper.GetType(node) === "Knot" /* Knot */) {
        const knot = node;
        const name = RuntimeInterpreter.GetKnotCoreWordName(knot);
        if (runtime.hasWorkflowExtension(name)) {
          return true;
        }
        if (RuntimeInterpreter.ContainsWorkflowExtension(runtime, knot.Body ?? [])) {
          return true;
        }
        if (knot.Next != null && RuntimeInterpreter.ContainsWorkflowExtension(runtime, [knot.Next])) {
          return true;
        }
      }
    }
    return false;
  }
  static EvaluateInterpolatedString(runtime, nodeToRun) {
    return nodeToRun.Parts.map((part) => {
      if (part.kind === "text") {
        return part.value;
      }
      return String(RuntimeInterpreter.EvaluateNode(runtime, part.value));
    }).join("");
  }
  static EvaluateRuntimeForm(runtime, form) {
    if (form.__runtimeForm === "effectHandlerDeclaration") {
      runtime.registerNamedEffectHandler(form.handlerName, form.effectNames);
      return null;
    }
    if (form.__runtimeForm === "postfixEffectHandle") {
      const handlerMap = RuntimeInterpreter.BuildNamedEffectHandlerMap(runtime, form.handlerNames);
      return runtime.withActiveEffectHandlerMap(handlerMap, () => RuntimeInterpreter.ExecWithRuntimeSync(runtime, form.body));
    }
    throw new Error(`Unknown runtime form: ${form.__runtimeForm}`);
  }
  static ExpandRuntimeForm(runtime, form) {
    if (form.__runtimeForm === "effectHandlerDeclaration") {
      runtime.registerNamedEffectHandler(form.handlerName, form.effectNames);
      runtime.addOpDirectly(RuntimeOpCode.PushValue, null);
      return;
    }
    if (form.__runtimeForm === "postfixEffectHandle") {
      const handlerMap = RuntimeInterpreter.BuildNamedEffectHandlerMap(runtime, form.handlerNames);
      runtime.addOpsInOrder([
        RuntimeInterpreter.Op("Runtime_PushActiveEffectHandlerMap", handlerMap),
        RuntimeInterpreter.Op(RuntimeOpCode.RunNode, form.body),
        RuntimeInterpreter.Op("Runtime_PopActiveEffectHandlerMap")
      ]);
      return;
    }
    throw new Error(`Unknown runtime form: ${form.__runtimeForm}`);
  }
  static BuildNamedEffectHandlerMap(runtime, handlerNames) {
    const handlerMap = {};
    for (const handlerName of handlerNames) {
      const effectNames = runtime.getNamedEffectHandlerEffects(handlerName);
      if (effectNames.length === 0) {
        throw new Error(`Unknown effect handler: ${handlerName}`);
      }
      for (const effectName of effectNames) {
        handlerMap[effectName] = RuntimeInterpreter.LookupNamedEffectImplementation(runtime, handlerName, effectName);
      }
    }
    return handlerMap;
  }
  static LookupNamedEffectImplementation(runtime, handlerName, effectName) {
    const candidates = [
      RuntimeInterpreter.ToPascalCase(effectName) + "Handler",
      RuntimeInterpreter.ToPascalCase(handlerName)
    ];
    for (const candidate of candidates) {
      try {
        return runtime.lookup(candidate);
      } catch (error) {}
    }
    throw new Error(`Effect implementation not found for handler ${handlerName} and effect ${effectName}`);
  }
  static ToPascalCase(name) {
    if (name.length === 0) {
      return name;
    }
    return name[0].toUpperCase() + name.slice(1);
  }
  static EvaluateChain(runtime, knot) {
    const specialResult = RuntimeInterpreter.TryEvaluateSpecialForm(runtime, knot);
    if (specialResult.handled) {
      return specialResult.value;
    }
    const values = [];
    const nodes = [];
    let current = knot;
    while (current != null) {
      nodes.push(current);
      current = current.Next;
    }
    for (let i = 0;i < nodes.length; i++) {
      const consumed = RuntimeInterpreter.EvaluateChainKnot(runtime, nodes[i], values, nodes, i + 1);
      i += consumed;
    }
    return values.length === 0 ? null : values[values.length - 1];
  }
  static EvaluateChainKnot(runtime, knot, values, chainNodes, lookaheadStart) {
    const keyword = RuntimeInterpreter.GetKnotCoreWordName(knot);
    if (RuntimeInterpreter.IsAbruptControlKeyword(keyword)) {
      RuntimeInterpreter.ThrowAbruptControlSignal(runtime, keyword, knot);
    }
    if (knot.CallType === 1 /* InfixCall */ || knot.CallType === 6 /* Operator */) {
      const name = RuntimeInterpreter.GetWordName(knot.Core);
      if (runtime.getInfixKeywordExpander(name) != null) {
        const left = values.pop();
        const argsFromParams2 = RuntimeInterpreter.EvaluateParamValues(runtime, knot);
        values.push(runtime.getInfixKeywordExpander(name)(runtime, {
          knot,
          args: [left, ...argsFromParams2],
          sourceNodeId: `infix:${name}`
        }));
        return 0;
      }
      if (runtime.hasWorkflowExtension(name, "infix")) {
        const left = values.pop();
        const argsFromParams2 = RuntimeInterpreter.EvaluateParamValues(runtime, knot);
        values.push(runtime.invokeWorkflowExtension(name, [left, ...argsFromParams2], {
          fixity: "infix",
          sourceNode: knot,
          sourceNodeId: `infix:${name}`
        }));
        return 0;
      }
      if (RuntimeInterpreter.IsLogicalOperator(name)) {
        return RuntimeInterpreter.EvaluateLogicalOperator(runtime, name, values, knot, lookaheadStart, chainNodes);
      }
      const argsFromParams = RuntimeInterpreter.EvaluateParamValues(runtime, knot);
      return RuntimeInterpreter.ApplyCallable(runtime, knot.Core, values, argsFromParams, lookaheadStart, chainNodes);
    }
    if (knot.CallType === 0 /* PrefixCall */) {
      const argsFromParams = RuntimeInterpreter.EvaluateParamValues(runtime, knot);
      values.push(RuntimeInterpreter.CallCallable(runtime, knot.Core, argsFromParams));
      return 0;
    }
    if (knot.CallType === 2 /* InstanceCall */) {
      const target = values.pop();
      const methodName = RuntimeInterpreter.GetWordName(knot.Core);
      const args = RuntimeInterpreter.EvaluateParamValues(runtime, knot);
      values.push(RuntimeInterpreter.CallInstance(runtime, target, methodName, args));
      return 0;
    }
    if (knot.CallType === 5 /* StaticIndex */) {
      const target = values.pop();
      values.push(runtime.getProperty(target, RuntimeInterpreter.GetWordName(knot.Core)));
      return 0;
    }
    if (knot.CallType === 4 /* Subscript */) {
      const target = values.pop();
      values.push(runtime.getSubscript(target, RuntimeInterpreter.EvaluateNode(runtime, knot.Core)));
      return 0;
    }
    return RuntimeInterpreter.EvaluateChainItem(runtime, knot.Core, values, chainNodes, lookaheadStart);
  }
  static IsLogicalOperator(name) {
    return name === "and" || name === "or" || name === "or_else";
  }
  static EvaluateLogicalOperator(runtime, name, values, knot, lookaheadStart, chainNodes) {
    if (values.length >= 2) {
      const right2 = values.pop();
      const left2 = values.pop();
      values.push(RuntimeInterpreter.ApplyLogicalOperator(name, left2, right2));
      return 0;
    }
    const paramNodes = RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable);
    if (values.length === 0 && paramNodes.length >= 2) {
      const left2 = RuntimeInterpreter.EvaluateNode(runtime, paramNodes[0]);
      if (RuntimeInterpreter.ShouldShortCircuitLogicalOperator(name, left2)) {
        values.push(RuntimeInterpreter.ApplyShortCircuitLogicalOperator(name, left2));
        return 0;
      }
      const right2 = RuntimeInterpreter.EvaluateNode(runtime, paramNodes[1]);
      values.push(RuntimeInterpreter.ApplyLogicalOperator(name, left2, right2));
      return 0;
    }
    const left = values.pop();
    const skipCount = RuntimeInterpreter.HasDeferredRightOperand(knot, lookaheadStart, chainNodes) ? 1 : 0;
    if (name === "and" && !RuntimeInterpreter.IsTruthy(left)) {
      values.push(false);
      return skipCount;
    }
    if (name === "or" && RuntimeInterpreter.IsTruthy(left)) {
      values.push(true);
      return skipCount;
    }
    if (name === "or_else" && RuntimeInterpreter.IsTruthy(left)) {
      values.push(left);
      return skipCount;
    }
    const right = RuntimeInterpreter.EvaluateDeferredRightOperand(runtime, knot, values, lookaheadStart, chainNodes);
    values.push(RuntimeInterpreter.ApplyLogicalOperator(name, left, right.value));
    return right.consumed;
  }
  static HasDeferredRightOperand(knot, lookaheadStart, chainNodes) {
    return RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable).length > 0 || lookaheadStart < chainNodes.length;
  }
  static EvaluateDeferredRightOperand(runtime, knot, values, lookaheadStart, chainNodes) {
    const explicitArgs = RuntimeInterpreter.EvaluateParamValues(runtime, knot);
    if (explicitArgs.length > 0) {
      return { value: explicitArgs[0], consumed: 0 };
    }
    if (lookaheadStart >= chainNodes.length) {
      return { value: null, consumed: 0 };
    }
    const consumed = 1 + RuntimeInterpreter.EvaluateChainItem(runtime, chainNodes[lookaheadStart].Core, values, chainNodes, lookaheadStart + 1);
    return { value: values.pop(), consumed };
  }
  static ApplyLogicalOperator(name, left, right) {
    if (name === "and") {
      return RuntimeInterpreter.IsTruthy(left) && RuntimeInterpreter.IsTruthy(right);
    }
    if (name === "or") {
      return RuntimeInterpreter.IsTruthy(left) || RuntimeInterpreter.IsTruthy(right);
    }
    return RuntimeInterpreter.IsTruthy(left) ? left : right;
  }
  static ShouldShortCircuitLogicalOperator(name, left) {
    if (name === "and") {
      return !RuntimeInterpreter.IsTruthy(left);
    }
    if (name === "or" || name === "or_else") {
      return RuntimeInterpreter.IsTruthy(left);
    }
    return false;
  }
  static ApplyShortCircuitLogicalOperator(name, left) {
    if (name === "and") {
      return false;
    }
    if (name === "or") {
      return true;
    }
    return left;
  }
  static EvaluateChainItem(runtime, nodeToRun, values, chainNodes = [], lookaheadStart = 0) {
    if (KnNodeHelper.GetType(nodeToRun) === "Word" /* Word */) {
      const name = RuntimeInterpreter.GetWordName(nodeToRun);
      if (runtime.hasHostFunction(name)) {
        const arity = runtime.getHostFunctionArity(name);
        const variadic = runtime.isHostFunctionVariadic(name);
        let consumed = 0;
        while ((variadic || values.length < arity) && lookaheadStart + consumed < chainNodes.length) {
          const nextCore = chainNodes[lookaheadStart + consumed].Core;
          consumed += 1 + RuntimeInterpreter.EvaluateChainItem(runtime, nextCore, values, chainNodes, lookaheadStart + consumed + 1);
        }
        const takeCount = variadic ? values.length : arity;
        const args = values.splice(Math.max(values.length - takeCount, 0), takeCount);
        values.push(runtime.callHostFunction(name, args));
        return consumed;
      }
      const callable = RuntimeInterpreter.TryResolveCallable(runtime, nodeToRun);
      if (RuntimeInterpreter.IsCallable(callable)) {
        const arity = RuntimeInterpreter.GetCallableArity(runtime, nodeToRun, callable);
        let consumed = 0;
        while (values.length < arity && lookaheadStart + consumed < chainNodes.length) {
          const nextCore = chainNodes[lookaheadStart + consumed].Core;
          consumed += 1 + RuntimeInterpreter.EvaluateChainItem(runtime, nextCore, values, chainNodes, lookaheadStart + consumed + 1);
        }
        const args = values.splice(Math.max(values.length - arity, 0), arity);
        values.push(RuntimeInterpreter.CallResolvedCallable(runtime, callable, args, name));
        return consumed;
      }
      if (RuntimeInterpreter.IsUnboundName(runtime, nodeToRun)) {
        throw new Error(`Unbound name: ${name}`);
      }
    }
    values.push(RuntimeInterpreter.EvaluateNode(runtime, nodeToRun));
    return 0;
  }
  static ApplyCallable(runtime, callableNode, values, explicitArgs, lookaheadStart, chainNodes) {
    const name = RuntimeInterpreter.GetWordName(callableNode);
    const callable = RuntimeInterpreter.ResolveCallable(runtime, callableNode);
    const arity = RuntimeInterpreter.GetCallableArity(runtime, callableNode, callable, explicitArgs.length);
    let consumed = 0;
    while (values.length + explicitArgs.length < arity && lookaheadStart + consumed < chainNodes.length) {
      const nextCore = chainNodes[lookaheadStart + consumed].Core;
      consumed += 1 + RuntimeInterpreter.EvaluateChainItem(runtime, nextCore, values, chainNodes, lookaheadStart + consumed + 1);
    }
    const existingArgCount = Math.max(arity - explicitArgs.length, 0);
    const existingArgs = values.splice(Math.max(values.length - existingArgCount, 0), existingArgCount);
    values.push(RuntimeInterpreter.CallResolvedCallable(runtime, callable, [...existingArgs, ...explicitArgs], name));
    return consumed;
  }
  static CallCallable(runtime, callableNode, args) {
    const name = RuntimeInterpreter.GetWordName(callableNode);
    if (runtime.hasHostFunction(name)) {
      return runtime.callHostFunction(name, args);
    }
    const fn = RuntimeInterpreter.EvaluateNode(runtime, callableNode);
    if (typeof fn === "function" || fn?.kind === "RuntimeLambdaFunction") {
      return runtime.callRuntimeFunction(fn, args);
    }
    throw new Error(`Callable not found: ${name}`);
  }
  static ResolveCallable(runtime, callableNode) {
    const name = RuntimeInterpreter.GetWordName(callableNode);
    if (runtime.hasHostFunction(name)) {
      return runtime.getHostFunction(name);
    }
    return RuntimeInterpreter.EvaluateNode(runtime, callableNode);
  }
  static TryResolveCallable(runtime, callableNode) {
    try {
      return RuntimeInterpreter.ResolveCallable(runtime, callableNode);
    } catch (error) {
      return null;
    }
  }
  static IsCallable(value) {
    return typeof value === "function" || value?.kind === "RuntimeLambdaFunction" || RuntimeInterpreter.IsRuntimeContinuation(value);
  }
  static IsUnboundName(runtime, node) {
    if (KnNodeHelper.GetType(node) !== "Word" /* Word */) {
      return false;
    }
    const name = RuntimeInterpreter.GetWordName(node);
    return !runtime.hasHostFunction(name) && !runtime.hasWorkflowExtension(name) && !runtime.hasBinding(name);
  }
  static AssertNoUnboundTopLevelWords(runtime, nodes) {
    if (!Array.isArray(nodes)) {
      return;
    }
    for (const node of nodes) {
      if (RuntimeInterpreter.IsUnboundName(runtime, node)) {
        throw new Error(`Unbound name: ${RuntimeInterpreter.GetWordName(node)}`);
      }
    }
  }
  static GetCallableArity(runtime, callableNode, callable, fallbackArity = 0) {
    const name = RuntimeInterpreter.GetWordName(callableNode);
    if (runtime.hasHostFunction(name)) {
      return runtime.getHostFunctionArity(name);
    }
    if (callable?.kind === "RuntimeLambdaFunction") {
      return callable.params.length;
    }
    if (typeof callable === "function") {
      return callable.length;
    }
    if (RuntimeInterpreter.IsRuntimeContinuation(callable)) {
      return Math.max(fallbackArity, 1);
    }
    return fallbackArity;
  }
  static CallResolvedCallable(runtime, callable, args, name) {
    if (typeof callable === "function" || callable?.kind === "RuntimeLambdaFunction") {
      return runtime.callRuntimeFunction(callable, args);
    }
    if (RuntimeInterpreter.IsRuntimeContinuation(callable)) {
      runtime.restoreContinuation(callable, args);
      throw new RuntimeContinuationResumeSignal(args.length === 0 ? null : args[args.length - 1], callable.currentEnvId);
    }
    throw new Error(`Callable not found: ${name}`);
  }
  static TryScheduleResolvedCallable(runtime, callable, args, name) {
    if (callable?.kind === "RuntimeLambdaFunction" && RuntimeInterpreter.IsInstructionStackLambda(callable)) {
      RuntimeInterpreter.ScheduleRuntimeLambdaCall(runtime, callable, args, { name });
      return true;
    }
    if (RuntimeInterpreter.IsRuntimeContinuation(callable)) {
      runtime.restoreContinuation(callable, args);
      return true;
    }
    return false;
  }
  static IsRuntimeContinuation(value) {
    return value != null && Array.isArray(value.operandItems) && Array.isArray(value.operandFrameBottoms) && Array.isArray(value.instructionItems) && Array.isArray(value.instructionFrameBottoms);
  }
  static CallInstance(runtime, target, methodName, args) {
    if (target instanceof RuntimeClassDefinition && methodName === "new") {
      return RuntimeInterpreter.InstantiateClass(runtime, target, args);
    }
    if (target instanceof RuntimeObject && methodName === "new" && RuntimeInterpreter.IsClassPrototype(target) && runtime.typedRuntimeContext != null) {
      return RuntimeInterpreter.InstantiateTypedPrototypeDirect(runtime, target, args);
    }
    if (target instanceof RuntimeObject && methodName === "new" && RuntimeInterpreter.IsClassPrototype(target)) {
      return RuntimeInterpreter.InstantiatePrototypeDirect(runtime, target, args);
    }
    if (RuntimeInterpreter.IsTypedObject(target) && runtime.typedRuntimeContext != null) {
      if (methodName === "as") {
        return runtime.typedRuntimeContext.Project(target, RuntimeInterpreter.ReadProjectionTargetName(args[0]));
      }
      const method = runtime.typedRuntimeContext.GetMethodImplementation(target, methodName);
      if (typeof method === "function") {
        return method(target, ...args);
      }
      return RuntimeInterpreter.CallRuntimeCallableSync(runtime, method, [target, ...args], methodName);
    }
    if (target instanceof RuntimeObject && target.hasMethod(methodName)) {
      return runtime.callBoundMethod(target, methodName, args);
    }
    return runtime.callBuiltinMethod(target, RuntimeInterpreter.NormalizeMethodName(methodName), args);
  }
  static TryScheduleInstanceCall(runtime, target, methodName, args) {
    if (target instanceof RuntimeClassDefinition && methodName === "new") {
      const scheduled = RuntimeInterpreter.TryScheduleClassInstantiation(runtime, target, args);
      return scheduled;
    }
    if (target instanceof RuntimeObject && methodName === "new" && RuntimeInterpreter.IsClassPrototype(target) && runtime.typedRuntimeContext != null) {
      RuntimeInterpreter.ScheduleTypedPrototypeInstantiation(runtime, target, args);
      return true;
    }
    if (target instanceof RuntimeObject && methodName === "new" && RuntimeInterpreter.IsClassPrototype(target)) {
      RuntimeInterpreter.SchedulePrototypeInstantiation(runtime, target, args);
      return true;
    }
    if (RuntimeInterpreter.IsTypedObject(target) && runtime.typedRuntimeContext != null) {
      if (methodName === "as") {
        return false;
      }
      const method = runtime.typedRuntimeContext.GetMethodImplementation(target, methodName);
      if (RuntimeInterpreter.IsInstructionStackLambda(method)) {
        RuntimeInterpreter.ScheduleRuntimeMemberLambdaCall(runtime, method, [target, ...args], { name: methodName });
        return true;
      }
    }
    if (target instanceof RuntimeObject && target.hasMethod(methodName)) {
      const method = target.getMethod(methodName);
      if (RuntimeInterpreter.IsInstructionStackLambda(method)) {
        RuntimeInterpreter.ScheduleRuntimeMemberLambdaCall(runtime, method, [target, ...args], { name: methodName });
        return true;
      }
    }
    return false;
  }
  static NormalizeMethodName(methodName) {
    if (methodName.length === 0) {
      return methodName;
    }
    return methodName[0].toUpperCase() + methodName.slice(1);
  }
  static EvaluateParamValues(runtime, knot) {
    const raw = RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable);
    return raw.map((node) => RuntimeInterpreter.EvaluateNode(runtime, node));
  }
  static GetInputNodes(tuple) {
    if (tuple == null) {
      return [];
    }
    if (Array.isArray(tuple.RawValue)) {
      if (typeof tuple.IsTupleRows === "function" && tuple.IsTupleRows()) {
        const firstValue = tuple.RawValue[0]?.[2];
        return Array.isArray(firstValue) ? firstValue : tuple.Value;
      }
      return tuple.RawValue;
    }
    return Array.isArray(tuple) ? tuple : [];
  }
  static GetParamNames(tuple) {
    return RuntimeInterpreter.GetInputNodes(tuple).map((node) => RuntimeInterpreter.GetWordName(node));
  }
  static TryEvaluateSpecialForm(runtime, knot) {
    const keyword = RuntimeInterpreter.GetKnotCoreWordName(knot);
    const prefixExpander = runtime.getPrefixKeywordExpander(keyword);
    if (prefixExpander != null) {
      return {
        handled: true,
        value: prefixExpander(runtime, {
          knot,
          args: RuntimeInterpreter.EvaluateFollowingKnotCores(runtime, knot),
          sourceNodeId: `prefix:${keyword}`
        })
      };
    }
    if (runtime.hasWorkflowExtension(keyword, "prefix")) {
      return {
        handled: true,
        value: runtime.invokeWorkflowExtension(keyword, RuntimeInterpreter.EvaluateFollowingKnotCores(runtime, knot), {
          fixity: "prefix",
          sourceNode: knot,
          sourceNodeId: `prefix:${keyword}`
        })
      };
    }
    switch (keyword) {
      case "class":
        return { handled: true, value: RuntimeInterpreter.EvaluateClassDefinition(runtime, knot) };
      case "var":
        return { handled: true, value: RuntimeInterpreter.EvaluateVar(runtime, knot) };
      case "set":
        return { handled: true, value: RuntimeInterpreter.EvaluateSet(runtime, knot) };
      case "fn":
        return { handled: true, value: RuntimeInterpreter.EvaluateFunctionDefinition(runtime, knot) };
      case "if":
        return { handled: true, value: RuntimeInterpreter.EvaluateIfForm(runtime, knot) };
      case "cond":
        return { handled: true, value: RuntimeInterpreter.EvaluateCondForm(runtime, knot) };
      case "foreach":
        return { handled: true, value: RuntimeInterpreter.EvaluateForeachForm(runtime, knot) };
      case "for":
        return { handled: true, value: RuntimeInterpreter.EvaluateForForm(runtime, knot) };
      case "++":
        return { handled: true, value: RuntimeInterpreter.EvaluateIncrement(runtime, knot) };
      case "break":
        throw new RuntimeBreakSignal;
      case "continue":
        throw new RuntimeContinueSignal;
      case "return":
        throw new RuntimeReturnSignal(RuntimeInterpreter.EvaluateParamValues(runtime, knot)[0] ?? null);
      case "try":
        return { handled: true, value: RuntimeInterpreter.EvaluateTry(runtime, knot) };
      case "perform":
        return { handled: true, value: RuntimeInterpreter.EvaluatePerform(runtime, knot) };
      default:
        return { handled: false };
    }
  }
  static EvaluateFunctionDefinition(runtime, knot) {
    const name = RuntimeInterpreter.GetWordName(knot.Name);
    const fn = runtime.createLambda(RuntimeInterpreter.GetParamNames(knot.InOutTable), knot.Body ?? [], name);
    runtime.define(name, fn);
    return fn;
  }
  static EvaluateIfForm(runtime, knot) {
    const conditionNode = knot.Next;
    if (conditionNode == null) {
      return null;
    }
    const elseNode = conditionNode.Next != null && RuntimeInterpreter.GetKnotCoreWordName(conditionNode.Next) === "else" ? conditionNode.Next : null;
    return RuntimeInterpreter.EvaluateIf(runtime, RuntimeInterpreter.EvaluateNode(runtime, conditionNode.Core), conditionNode.Body ?? [], elseNode?.Body ?? []);
  }
  static EvaluateCondForm(runtime, knot) {
    const branches = [];
    let current = knot.Next;
    while (current != null) {
      const isElse = RuntimeInterpreter.GetKnotCoreWordName(current) === "else";
      branches.push({
        condition: isElse ? true : RuntimeInterpreter.EvaluateNode(runtime, current.Core),
        body: current.Body ?? [],
        else: isElse
      });
      current = current.Next;
    }
    return RuntimeInterpreter.EvaluateCond(runtime, branches);
  }
  static EvaluateForeachForm(runtime, knot) {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    const itemName = RuntimeInterpreter.GetWordName(nodes[1]?.Core);
    const itemsNode = nodes[3];
    return RuntimeInterpreter.EvaluateForeach(runtime, RuntimeInterpreter.EvaluateNode(runtime, itemsNode?.Core) ?? [], itemName, itemsNode?.Body ?? []);
  }
  static EvaluateForForm(runtime, knot) {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    const conditionNode = nodes[1]?.Core;
    const stepNode = nodes[2]?.Core;
    const body = nodes[2]?.Body ?? [];
    const previousEnvId = runtime.currentEnvId;
    runtime.diveLocalEnv("for");
    try {
      for (const [key, value] of Object.entries(knot.Conf ?? {})) {
        runtime.define(key, RuntimeInterpreter.EvaluateNode(runtime, value));
      }
      let result = null;
      while (RuntimeInterpreter.IsTruthy(RuntimeInterpreter.EvaluateNode(runtime, conditionNode))) {
        try {
          result = RuntimeInterpreter.EvaluateBlockDirect(runtime, body);
        } catch (error) {
          if (error instanceof RuntimeBreakSignal) {
            break;
          }
          if (!(error instanceof RuntimeContinueSignal)) {
            throw error;
          }
        }
        RuntimeInterpreter.EvaluateNode(runtime, stepNode);
      }
      return result;
    } finally {
      runtime.changeEnvById(previousEnvId);
    }
  }
  static EvaluateIncrement(runtime, knot) {
    const targetName = RuntimeInterpreter.GetWordName(RuntimeInterpreter.GetInputNodes(knot.Params)[0]);
    return RuntimeInterpreter.EvaluateIncrementByName(runtime, targetName);
  }
  static EvaluateIncrementByName(runtime, targetName) {
    const value = runtime.lookup(targetName) + 1;
    runtime.setVar(targetName, value);
    return value;
  }
  static EvaluateBlockDirect(runtime, body) {
    let result = null;
    for (const item of body) {
      result = typeof item === "function" ? item(runtime) : RuntimeInterpreter.EvaluateNode(runtime, item);
    }
    return result;
  }
  static EvaluateTry(runtime, knot) {
    const previousEnvId = runtime.currentEnvId;
    runtime.diveLocalEnv("try");
    const handlerMap = RuntimeInterpreter.ParseTryHandlerMap(runtime, knot);
    runtime.define("__EffectHandlerMap", handlerMap);
    runtime.define("__ContinuationAfterTry", runtime.captureContinuation());
    try {
      return runtime.withActiveEffectHandlerMap(handlerMap, () => RuntimeInterpreter.EvaluateBlockDirect(runtime, knot.Body ?? []));
    } finally {
      runtime.changeEnvById(previousEnvId);
    }
  }
  static ParseTryHandlerMap(runtime, knot) {
    const handlerMap = {};
    for (const entry of RuntimeInterpreter.ParseTryHandlerEntries(knot)) {
      handlerMap[entry.effectName] = RuntimeInterpreter.EvaluateNode(runtime, entry.handlerNode);
    }
    return handlerMap;
  }
  static ParseTryHandlerEntries(knot) {
    const entries = [];
    let current = knot.Next;
    while (current != null) {
      if (RuntimeInterpreter.GetKnotCoreWordName(current) !== "handle") {
        current = current.Next;
        continue;
      }
      const handlerNode = current.Next;
      if (handlerNode == null) {
        break;
      }
      entries.push({
        effectName: RuntimeInterpreter.GetWordName(current.Name),
        handlerNode: handlerNode.Core
      });
      current = handlerNode.Next;
    }
    return entries;
  }
  static EvaluatePerform(runtime, knot) {
    const effectName = RuntimeInterpreter.GetWordName(knot.Name);
    const handler = runtime.getActiveEffectHandler(effectName);
    if (handler == null) {
      throw new Error(`Unhandled effect: ${effectName}`);
    }
    const args = RuntimeInterpreter.EvaluateParamValues(runtime, knot);
    const continuation = runtime.captureContinuation(args.length + 2);
    return RuntimeInterpreter.CallResolvedCallable(runtime, handler, [continuation, ...args], effectName);
  }
  static EvaluateClassDefinition(runtime, knot) {
    const name = RuntimeInterpreter.GetWordName(knot.Name);
    const classDef = new RuntimeClassDefinition(name);
    for (const member of knot.Body ?? []) {
      if (KnNodeHelper.GetType(member) !== "Knot" /* Knot */) {
        continue;
      }
      const memberName = RuntimeInterpreter.GetKnotCoreWordName(member);
      if (memberName === "field") {
        RuntimeInterpreter.AddClassField(classDef, member);
      } else if (memberName === "new") {
        classDef.constructorDef = {
          params: RuntimeInterpreter.GetParamNames(member.InOutTable),
          body: member.Body ?? []
        };
      } else if (memberName === "method") {
        if (RuntimeInterpreter.GetMemberQualifier(member) === "inherit" && (member.Body ?? []).length === 0) {
          continue;
        }
        classDef.methods[RuntimeInterpreter.GetWordName(member.Name)] = {
          params: RuntimeInterpreter.GetParamNames(member.InOutTable),
          body: member.Body ?? []
        };
      } else if (memberName === "prop") {
        classDef.properties[RuntimeInterpreter.GetWordName(member.Name)] = RuntimeInterpreter.ParseClassProperty(member);
      }
    }
    const prototype = RuntimeInterpreter.BuildClassPrototype(runtime, classDef);
    runtime.define(name, prototype);
    return prototype;
  }
  static BuildClassPrototype(runtime, classDef) {
    const prototype = new RuntimeObject;
    prototype.setField("__class_name__", classDef.name);
    prototype.setField("__fields__", classDef.fields.map((field) => field.name));
    for (const field of classDef.fields) {
      prototype.setField(field.name, field.defaultValue ?? null);
    }
    prototype.addMethod("constructor", runtime.createLambda(["self", ...classDef.constructorDef.params], RuntimeInterpreter.BuildConstructorBody(classDef), `${classDef.name}.constructor`));
    for (const [methodName, method] of Object.entries(classDef.methods)) {
      prototype.addMethod(methodName, runtime.createLambda(["self", ...method.params], method.body, methodName));
    }
    for (const [propertyName, property] of Object.entries(classDef.properties)) {
      if (property.getBody != null) {
        prototype.setField(`get_${propertyName}`, runtime.createLambda(["self"], property.getBody, `get_${propertyName}`));
      }
      if (property.setBody != null) {
        prototype.setField(`set_${propertyName}`, runtime.createLambda(["self", ...property.setParams ?? ["value"]], property.setBody, `set_${propertyName}`));
      }
    }
    return prototype;
  }
  static BuildConstructorBody(classDef) {
    return [
      ...classDef.fields.map((field, index) => RuntimeInterpreter.BuildSetSelfFieldNode(field.name, field.defaultValue ?? (classDef.constructorDef.params[index] != null ? new KnWord(classDef.constructorDef.params[index]) : null))),
      ...classDef.constructorDef.body ?? [],
      new KnWord("self")
    ];
  }
  static BuildSetSelfFieldNode(fieldName, valueNode) {
    return KnKnot.MakeByNodes([
      new KnKnot({ Core: new KnWord("set") }),
      new KnKnot({ Core: new KnWord("self") }),
      new KnKnot({ CallType: 5 /* StaticIndex */, Core: new KnWord(fieldName) }),
      new KnKnot({ Core: valueNode })
    ]);
  }
  static AddClassField(classDef, member) {
    if (member.Name != null) {
      classDef.fields.push({ name: RuntimeInterpreter.GetWordName(member.Name) });
      return;
    }
    const metadata = member.Metadata;
    if (metadata == null || metadata.size === 0) {
      return;
    }
    for (const [key, value] of metadata.entries()) {
      classDef.fields.push({ name: RuntimeInterpreter.GetWordName(key), defaultValue: value });
    }
  }
  static GetMemberQualifier(member) {
    return RuntimeInterpreter.GetWordName(member.Attr?.qualifier ?? member.Attr?.mode);
  }
  static ParseClassProperty(member) {
    const prop = {};
    let current = member.Next;
    while (current != null) {
      const name = RuntimeInterpreter.GetKnotCoreWordName(current);
      if (name === "get") {
        prop.getBody = current.Body ?? [];
      } else if (name === "set") {
        prop.setParams = RuntimeInterpreter.GetParamNames(current.InOutTable);
        prop.setBody = current.Body ?? [];
      }
      current = current.Next;
    }
    return prop;
  }
  static InstantiateClass(runtime, classDef, args) {
    return RuntimeInterpreter.InstantiatePrototypeDirect(runtime, RuntimeInterpreter.BuildClassPrototype(runtime, classDef), args);
  }
  static TryScheduleClassInstantiation(runtime, classDef, args) {
    RuntimeInterpreter.SchedulePrototypeInstantiation(runtime, RuntimeInterpreter.BuildClassPrototype(runtime, classDef), args);
    return true;
  }
  static IsClassPrototype(target) {
    return target.hasField("__class_name__") || target.hasMethod("constructor");
  }
  static IsTypedObject(target) {
    const bridge = GetTypeSystemBridge();
    return bridge != null && bridge.IsTypedObject(target);
  }
  static ReadProjectionTargetName(value) {
    if (value instanceof RuntimeObject && value.hasField("__class_name__")) {
      return String(value.getField("__class_name__"));
    }
    return RuntimeInterpreter.GetWordName(value) ?? String(value);
  }
  static InstantiatePrototypeDirect(runtime, prototype, args) {
    const instance = RuntimeInterpreter.CreateInstanceFromPrototype(prototype);
    const constructor = prototype.getMethod("constructor");
    if (constructor != null) {
      RuntimeInterpreter.CallRuntimeCallableSync(runtime, constructor, [instance, ...args], `${prototype.getField("__class_name__")}.constructor`);
    }
    return instance;
  }
  static InstantiateTypedPrototypeDirect(runtime, prototype, args) {
    const className = String(prototype.getField("__class_name__"));
    const instance = runtime.typedRuntimeContext.CreateObject(className, prototype);
    const constructor = prototype.getMethod("constructor");
    if (constructor != null) {
      RuntimeInterpreter.CallRuntimeCallableSync(runtime, constructor, [instance, ...args], `${className}.constructor`);
    }
    return instance;
  }
  static SchedulePrototypeInstantiation(runtime, prototype, args) {
    const instance = RuntimeInterpreter.CreateInstanceFromPrototype(prototype);
    const constructor = prototype.getMethod("constructor");
    if (constructor == null) {
      runtime.getCurrentFiber().operandStack.push(instance);
      return;
    }
    RuntimeInterpreter.ScheduleRuntimeMemberLambdaCall(runtime, constructor, [instance, ...args], {
      name: `${prototype.getField("__class_name__")}.constructor`,
      resultOverride: instance
    });
  }
  static ScheduleTypedPrototypeInstantiation(runtime, prototype, args) {
    const className = String(prototype.getField("__class_name__"));
    const instance = runtime.typedRuntimeContext.CreateObject(className, prototype);
    const constructor = prototype.getMethod("constructor");
    if (constructor == null) {
      runtime.getCurrentFiber().operandStack.push(instance);
      return;
    }
    RuntimeInterpreter.ScheduleRuntimeMemberLambdaCall(runtime, constructor, [instance, ...args], {
      name: `${className}.constructor`,
      resultOverride: instance
    });
  }
  static CreateInstanceFromPrototype(prototype) {
    const instance = new RuntimeObject;
    for (const methodName of prototype.getMethodNames()) {
      if (methodName !== "constructor") {
        instance.addMethod(methodName, prototype.getMethod(methodName));
      }
    }
    for (const fieldName of prototype.getFieldNames()) {
      if (fieldName === "__fields__" || fieldName === "__class_name__") {
        continue;
      }
      const value = prototype.getField(fieldName);
      if (fieldName.startsWith("get_") || fieldName.startsWith("set_")) {
        instance.setField(fieldName, value);
      } else {
        instance.setField(fieldName, null);
      }
    }
    return instance;
  }
  static TrySchedulePropertyGet(runtime, target, key) {
    if (!(target instanceof RuntimeObject)) {
      return false;
    }
    const getter = target.getField(`get_${key}`);
    if (RuntimeInterpreter.IsInstructionStackLambda(getter)) {
      RuntimeInterpreter.ScheduleRuntimeMemberLambdaCall(runtime, getter, [target], { name: `get_${key}` });
      return true;
    }
    return false;
  }
  static TryHandleTypedPropertyGet(runtime, target, key) {
    if (!RuntimeInterpreter.IsTypedObject(target) || runtime.typedRuntimeContext == null) {
      return { handled: false };
    }
    const getter = runtime.typedRuntimeContext.GetPropertyGetter(target, key);
    if (RuntimeInterpreter.IsInstructionStackLambda(getter)) {
      RuntimeInterpreter.ScheduleRuntimeMemberLambdaCall(runtime, getter, [target], { name: `get_${key}` });
      return { handled: true, scheduled: true };
    }
    if (typeof getter === "function") {
      return { handled: true, value: getter(target) };
    }
    return { handled: true, value: runtime.typedRuntimeContext.ReadField(target, key) };
  }
  static TrySchedulePropertySet(runtime, target, key, value) {
    if (!(target instanceof RuntimeObject)) {
      return false;
    }
    const setter = target.getField(`set_${key}`);
    if (RuntimeInterpreter.IsInstructionStackLambda(setter)) {
      RuntimeInterpreter.ScheduleRuntimeMemberLambdaCall(runtime, setter, [target, value], {
        name: `set_${key}`,
        resultOverride: value
      });
      return true;
    }
    return false;
  }
  static TryHandleTypedPropertySet(runtime, target, key, value) {
    if (!RuntimeInterpreter.IsTypedObject(target) || runtime.typedRuntimeContext == null) {
      return { handled: false };
    }
    const setter = runtime.typedRuntimeContext.GetPropertySetter(target, key);
    if (RuntimeInterpreter.IsInstructionStackLambda(setter)) {
      RuntimeInterpreter.ScheduleRuntimeMemberLambdaCall(runtime, setter, [target, value], {
        name: `set_${key}`,
        resultOverride: value
      });
      return { handled: true, scheduled: true };
    }
    if (typeof setter === "function") {
      setter(target, value);
    } else {
      runtime.typedRuntimeContext.WriteField(target, key, value);
    }
    return { handled: true, value };
  }
  static WithObjectEnv(runtime, self, params, args, body) {
    const previousEnvId = runtime.currentEnvId;
    runtime.diveLocalEnv("object");
    runtime.define("self", self);
    for (let i = 0;i < params.length; i++) {
      runtime.define(params[i], args[i]);
    }
    try {
      return body();
    } finally {
      runtime.changeEnvById(previousEnvId);
    }
  }
  static EvaluateVar(runtime, knot) {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    RuntimeInterpreter.AssertVarNameIsPlainBinding(nodes[1]);
    const name = RuntimeInterpreter.GetWordName(nodes[1]?.Core);
    const value = RuntimeInterpreter.EvaluateNode(runtime, nodes[2]?.Core);
    runtime.define(name, value);
    return value;
  }
  static EvaluateSet(runtime, knot) {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    const value = RuntimeInterpreter.EvaluateNode(runtime, nodes.at(-1)?.Core);
    RuntimeInterpreter.AssignPlace(runtime, nodes.slice(1, -1), value);
    return value;
  }
  static AssignPlace(runtime, placeNodes, value) {
    if (placeNodes.length === 1 && KnNodeHelper.GetType(placeNodes[0].Core) === "Word" /* Word */) {
      runtime.setVar(RuntimeInterpreter.GetWordName(placeNodes[0].Core), value);
      return false;
    }
    let target = RuntimeInterpreter.EvaluateNode(runtime, placeNodes[0].Core);
    for (let i = 1;i < placeNodes.length; i++) {
      const node = placeNodes[i];
      const key = RuntimeInterpreter.GetWordName(node.Core);
      if (i === placeNodes.length - 1) {
        if (node.CallType === 4 /* Subscript */) {
          runtime.setSubscript(target, RuntimeInterpreter.EvaluateNode(runtime, node.Core), value);
        } else {
          if (RuntimeInterpreter.TrySchedulePropertySet(runtime, target, key, value)) {
            return true;
          }
          runtime.setProperty(target, key, value);
        }
      } else {
        target = node.CallType === 4 /* Subscript */ ? runtime.getSubscript(target, RuntimeInterpreter.EvaluateNode(runtime, node.Core)) : runtime.getProperty(target, key);
      }
    }
    return false;
  }
  static KnotToArray(knot) {
    const nodes = [];
    let current = knot;
    while (current != null) {
      nodes.push(current);
      current = current.Next;
    }
    return nodes;
  }
  static EvaluateFollowingKnotCores(runtime, knot) {
    const values = [];
    let current = knot.Next;
    while (current != null) {
      values.push(RuntimeInterpreter.EvaluateNode(runtime, current.Core));
      current = current.Next;
    }
    return values;
  }
  static GetKnotCoreWordName(knot) {
    return RuntimeInterpreter.GetWordName(knot?.Core);
  }
  static GetWordName(word) {
    if (typeof word?.GetFullNameStr === "function") {
      return word.GetFullNameStr();
    }
    if (word != null && typeof word === "object" && typeof word.Value === "string") {
      const name = [...word.Qualifiers ?? [], word.Value].join(".");
      return word.SourceQualifier == null ? name : `${word.SourceQualifier}:::${name}`;
    }
    return String(word);
  }
  static ParseKonSourceBlock(source) {
    return RuntimeInterpreter.BuildPostfixRuntimeForms(RuntimeInterpreter.SplitTopLevelExpressions(source).map((expr) => RuntimeInterpreter.ParseKonExpression(expr)));
  }
  static ParseSourceBlock(source) {
    const expressions = RuntimeInterpreter.SplitTopLevelExpressions(source);
    try {
      return RuntimeInterpreter.BuildPostfixRuntimeForms(expressions.map((expr) => RuntimeInterpreter.ParseKonExpression(expr)));
    } catch (error) {
      return expressions.map((expr) => KnConverter.Knl.Parser.Parse(expr));
    }
  }
  static ParseKonExpression(expression) {
    if (expression.startsWith("#(")) {
      return RuntimeInterpreter.ParseEffectHandlerDeclaration(expression);
    }
    if (expression.startsWith("%(")) {
      return RuntimeInterpreter.ParsePostfixEffectHandle(expression);
    }
    return KnConverter.Kon.Parser.Parse(expression);
  }
  static BuildPostfixRuntimeForms(nodes) {
    const result = [];
    for (const node of nodes) {
      if (node?.__runtimeForm === "postfixEffectHandle") {
        const body = result.pop();
        if (body == null) {
          throw new Error("effect handle postfix requires a previous expression");
        }
        result.push({ ...node, body });
      } else {
        result.push(node);
      }
    }
    return result;
  }
  static ParseEffectHandlerDeclaration(expression) {
    const nameMatch = expression.match(/effect\s+handler\s+#([A-Za-z_][A-Za-z0-9_]*)/);
    const handlesMatch = expression.match(/handles\s*:?\[([\s\S]*)\]\s*\)$/);
    if (nameMatch == null || handlesMatch == null) {
      throw new Error("Invalid effect handler declaration");
    }
    return {
      __runtimeForm: "effectHandlerDeclaration",
      handlerName: nameMatch[1],
      effectNames: handlesMatch[1].split(/\s+/).map((item) => item.trim()).filter((item) => item.length > 0)
    };
  }
  static ParsePostfixEffectHandle(expression) {
    const handlerNames = Array.from(expression.matchAll(/#([A-Za-z_][A-Za-z0-9_]*)/g)).map((match) => match[1]);
    if (handlerNames.length === 0) {
      throw new Error("effect handle postfix requires a named handler");
    }
    return {
      __runtimeForm: "postfixEffectHandle",
      handlerNames,
      body: null
    };
  }
  static SplitTopLevelExpressions(source) {
    const result = [];
    let start = -1;
    let depth = 0;
    let quote = null;
    let escape = false;
    for (let i = 0;i < source.length; i++) {
      const ch = source[i];
      if (quote != null) {
        if (escape) {
          escape = false;
        } else if (ch === "\\") {
          if (quote === '"' && (source[i + 1] === "(" || source[i + 1] === "[")) {
            i = RuntimeInterpreter.SkipInterpolationBlockEnd(source, i + 1) - 1;
            continue;
          }
          escape = true;
        } else if (ch === quote) {
          quote = null;
        }
        continue;
      }
      if (ch === "/" && source[i + 1] === "/") {
        let j = i + 2;
        while (j < source.length && source[j] !== `
`) {
          j += 1;
        }
        i = j;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        if (start < 0) {
          start = i;
        }
        continue;
      }
      if (/\s/.test(ch) && depth === 0) {
        continue;
      }
      if (start < 0) {
        start = i;
      }
      if ((ch === "#" || ch === "%") && source[i + 1] === "(" && depth === 0) {
        continue;
      }
      if (ch === "$" && depth === 0) {
        const next = source[i + 1];
        if (next === "(" || next === "[" || next === "{") {
          continue;
        }
        if (next === "<") {
          const end = RuntimeInterpreter.SkipAngleMacroBlockEnd(source, i + 1);
          result.push(source.slice(start, end));
          i = end - 1;
          start = -1;
          continue;
        }
      }
      if (ch === "(" || ch === "[" || ch === "{") {
        depth += 1;
      } else if (ch === ")" || ch === "]" || ch === "}") {
        depth -= 1;
        if (depth === 0 && start >= 0) {
          result.push(source.slice(start, i + 1));
          start = -1;
        }
      } else if (depth === 0) {
        let end = i + 1;
        while (end < source.length && !/\s/.test(source[end])) {
          end += 1;
        }
        result.push(source.slice(start, end));
        i = end;
        start = -1;
      }
    }
    if (start >= 0) {
      result.push(source.slice(start).trim());
    }
    return result.filter((item) => item.length > 0);
  }
  static SkipInterpolationBlockEnd(source, openIndex) {
    const open = source[openIndex];
    const close = open === "(" ? ")" : "]";
    let depth = 0;
    let index = openIndex;
    while (index < source.length) {
      const ch = source[index];
      if (ch === '"' || ch === "'") {
        const triple = source.startsWith(ch.repeat(3), index);
        const delimiter = triple ? ch.repeat(3) : ch;
        index += delimiter.length;
        while (index < source.length) {
          if (ch === '"' && source[index] === "\\") {
            index += 2;
            continue;
          }
          if (source.startsWith(delimiter, index)) {
            index += delimiter.length;
            break;
          }
          index += 1;
        }
        continue;
      }
      if (ch === open) {
        depth += 1;
      } else if (ch === close) {
        depth -= 1;
        if (depth === 0) {
          return index + 1;
        }
      }
      index += 1;
    }
    return source.length;
  }
  static SkipAngleMacroBlockEnd(source, openIndex) {
    let depth = 0;
    let index = openIndex;
    while (index < source.length) {
      const ch = source[index];
      if (ch === '"' || ch === "'") {
        const triple = source.startsWith(ch.repeat(3), index);
        const delimiter = triple ? ch.repeat(3) : ch;
        index += delimiter.length;
        while (index < source.length) {
          if (ch === '"' && source[index] === "\\") {
            index += 2;
            continue;
          }
          if (source.startsWith(delimiter, index)) {
            index += delimiter.length;
            break;
          }
          index += 1;
        }
        continue;
      }
      if (ch === "<") {
        depth += 1;
      } else if (ch === ">") {
        depth -= 1;
        if (depth === 0) {
          return index + 1;
        }
      }
      index += 1;
    }
    return source.length;
  }
  static EvaluateIf(runtime, condition, thenBody, elseBody = []) {
    return RuntimeInterpreter.ExecBlockWithRuntimeSync(runtime, RuntimeInterpreter.IsTruthy(condition) ? thenBody : elseBody);
  }
  static EvaluateCond(runtime, branches) {
    for (const branch of branches) {
      if (branch.else === true || RuntimeInterpreter.IsTruthy(branch.condition)) {
        return RuntimeInterpreter.ExecBlockWithRuntimeSync(runtime, branch.body);
      }
    }
    return null;
  }
  static EvaluateForeach(runtime, items, itemName, body) {
    let result = null;
    for (const item of items) {
      if (runtime.getCurrentEnv().Lookup(itemName) == null) {
        runtime.define(itemName, item);
      } else {
        runtime.setVar(itemName, item);
      }
      try {
        for (const node of body) {
          result = typeof node === "function" ? node(runtime) : RuntimeInterpreter.EvaluateNode(runtime, node);
        }
      } catch (error) {
        if (error instanceof RuntimeBreakSignal) {
          break;
        }
        if (error instanceof RuntimeContinueSignal) {
          continue;
        }
        throw error;
      }
    }
    return result;
  }
  static SetTo(runtime, key, value) {
    runtime.setVar(key, value);
    return value;
  }
  static IsTruthy(value) {
    if (KnNodeHelper.GetType(value) === "Unknown" /* Unknown */ || KnNodeHelper.GetType(value) === "Undefined" /* Undefined */) {
      return false;
    }
    return value !== false && value != null;
  }
  static IsPureTypeSystemDeclaration(node) {
    return node instanceof KnKnot && node.CallType == null && ["type", "trait"].includes(RuntimeInterpreter.GetKnotCoreWordName(node));
  }
  static DispatchUntilStop(runtime, maxInstructions = 1e6) {
    const result = dispatchInstructions(runtime.makeDispatchContext(), (opcode) => runtime.resolveHandler(opcode), { maxInstructions });
    if (result.stopReason === "error") {
      throw result.error;
    }
    if (result.stopReason === "missing_handler") {
      throw new Error("Instruction handler not found during dispatch");
    }
    return { stopReason: result.stopReason, effects: result.effects ?? [] };
  }
  static StartLoopSync(runtime) {
    while (runtime.getResumeFiberTokenCount() > 0) {
      runtime.consumeResumeFiberToken();
    }
    let fiber = runtime.switchToNextRunnableFiberWithWork();
    if (fiber == null) {
      return runtime.getCurrentFiber().operandStack.peekBottomOfAllFrames();
    }
    let yielded = false;
    while (fiber.instructionStack.peek()?.opcode !== RuntimeOpCode.LandSuccess && fiber.instructionStack.peek()?.opcode !== RuntimeOpCode.LandFail && fiber.instructionStack.peek() != null) {
      const before = fiber.instructionStack.peek();
      const dispatchResult = dispatchInstructions(runtime.makeDispatchContext(), (opcode) => runtime.resolveHandler(opcode), { maxInstructions: 1 });
      if (dispatchResult.stopReason === "error") {
        throw dispatchResult.error;
      }
      if (dispatchResult.stopReason === "missing_handler") {
        throw new Error(`Instruction handler not found: ${before?.opcode}`);
      }
      if (before != null) {
        runtime.instructionHistory.push({
          fiberId: fiber.id,
          instruction: before
        });
      }
      if (dispatchResult.stopReason === "yield_requested") {
        yielded = true;
        break;
      }
      while (runtime.getResumeFiberTokenCount() > 0) {
        runtime.consumeResumeFiberToken();
      }
      const selected = runtime.switchToNextRunnableFiberWithWork();
      if (selected == null) {
        break;
      }
      fiber = selected;
    }
    if (!yielded && (fiber.instructionStack.peek()?.opcode === RuntimeOpCode.LandSuccess || fiber.instructionStack.peek()?.opcode === RuntimeOpCode.LandFail)) {
      fiber.instructionStack.pop();
    }
    return fiber.operandStack.peekBottomOfAllFrames();
  }
  static async StartLoopAsync(runtime) {
    while (runtime.hasLiveFiberWork() || runtime.getResumeFiberTokenCount() > 0) {
      RuntimeInterpreter.StartLoopSync(runtime);
      if (!runtime.hasLiveFiberWork() && runtime.getResumeFiberTokenCount() === 0) {
        break;
      }
      if (runtime.switchToNextRunnableFiberWithWork() == null) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      } else {
        await Promise.resolve();
      }
    }
    return runtime.getCurrentFiber().operandStack.peekBottomOfAllFrames();
  }
}
// ../type-system/lib/Types.ts
class PrimitiveTypeSymbol {
  Name;
  constructor(Name) {
    this.Name = Name;
  }
}

class AnyTypeSymbol {
  Name = "any";
}

class NeverTypeSymbol {
  Name = "never";
}

class TypeReferenceSymbol {
  BaseName;
  TypeArguments;
  Name;
  constructor(BaseName, TypeArguments = []) {
    this.BaseName = BaseName;
    this.TypeArguments = TypeArguments;
    this.Name = TypeArguments.length === 0 ? BaseName : `${BaseName}<${TypeArguments.map((type) => type.Name).join(" ")}>`;
  }
}

class FunctionTypeSymbol {
  Name;
  Parameters;
  Outputs;
  EffectRow;
  constructor(Name, Parameters, Outputs, effectRow) {
    this.Name = Name;
    this.Parameters = Parameters;
    this.Outputs = Outputs;
    this.EffectRow = effectRow ?? EffectRow.EmptyClosed;
  }
  get ReturnType() {
    return this.Outputs.length === 0 ? new NeverTypeSymbol : this.Outputs[this.Outputs.length - 1];
  }
  get Effects() {
    return this.EffectRow.Effects;
  }
}

class MethodBody {
  Member;
  Implementation;
  constructor(Member, Implementation) {
    this.Member = Member;
    this.Implementation = Implementation;
  }
}

class MethodBuilder {
  static FromFunction(member, implementation) {
    return new MethodBody(member, implementation);
  }
  static FromLambda(owner, name, signature, implementation, qualifier = "default" /* Default */, access = "public" /* Public */) {
    return new MethodBody(RowMemberBuilder.Method(owner, name, signature, qualifier, access), implementation);
  }
}

class GenericFunctionTypeSymbol {
  Name;
  TypeParameters;
  Signature;
  constructor(Name, TypeParameters, Signature) {
    this.Name = Name;
    this.TypeParameters = TypeParameters;
    this.Signature = Signature;
  }
}

class EffectSymbol {
  Name;
  constructor(Name) {
    this.Name = Name;
  }
}

class BrandedScalarTypeSymbol {
  Name;
  Representation;
  Metadata;
  constructor(Name, Representation, Metadata = {}) {
    this.Name = Name;
    this.Representation = Representation;
    this.Metadata = Metadata;
  }
}

class EnumTypeSymbol {
  Name;
  Representation;
  Metadata;
  Values = [];
  IsClosed = true;
  constructor(Name, Representation, Metadata = {}) {
    this.Name = Name;
    this.Representation = Representation;
    this.Metadata = Metadata;
  }
  AddValue(name, code, metadata = {}) {
    if (this.Values.some((value2) => value2.ValueName === name)) {
      throw new Error(`Enum '${this.Name}' already contains value '${name}'.`);
    }
    const value = new EnumValueSymbol(name, this, code, metadata);
    this.Values.push(value);
    return value;
  }
  RequireValue(name) {
    const value = this.Values.find((candidate) => candidate.ValueName === name);
    if (value == null) {
      throw new Error(`Enum '${this.Name}' does not contain value '${name}'.`);
    }
    return value;
  }
}

class EnumValueSymbol {
  ValueName;
  Owner;
  Code;
  Metadata;
  Name;
  QualifiedName;
  constructor(ValueName, Owner, Code = ValueName, Metadata = {}) {
    this.ValueName = ValueName;
    this.Owner = Owner;
    this.Code = Code;
    this.Metadata = Metadata;
    this.QualifiedName = `${Owner.Name}.${ValueName}`;
    this.Name = this.QualifiedName;
  }
}
var RowQualifier;
((RowQualifier2) => {
  RowQualifier2["Default"] = "default";
  RowQualifier2["Virtual"] = "virtual";
  RowQualifier2["Final"] = "final";
  RowQualifier2["Override"] = "override";
  RowQualifier2["Inherit"] = "inherit";
})(RowQualifier ||= {});
var AccessModifier;
((AccessModifier2) => {
  AccessModifier2["Public"] = "public";
  AccessModifier2["Protected"] = "protected";
  AccessModifier2["Private"] = "private";
  AccessModifier2["Internal"] = "internal";
})(AccessModifier ||= {});

class EffectRow {
  Effects;
  IsOpen;
  static EmptyClosed = new EffectRow([], false);
  constructor(Effects, IsOpen) {
    this.Effects = Effects;
    this.IsOpen = IsOpen;
  }
  get IsClosed() {
    return !this.IsOpen;
  }
  get IsEmpty() {
    return this.Effects.length === 0;
  }
  static FromEffects(effects, isOpen = false) {
    const map = new Map;
    for (const effect of effects) {
      if (!map.has(effect.Name)) {
        map.set(effect.Name, effect);
      }
    }
    const distinct = Array.from(map.values()).sort((lhs, rhs) => lhs.Name.localeCompare(rhs.Name));
    if (distinct.length === 0 && !isOpen) {
      return EffectRow.EmptyClosed;
    }
    return new EffectRow(distinct, isOpen);
  }
  Contains(effect) {
    return this.Effects.some((candidate) => candidate.Name === effect.Name);
  }
  IsSubsetOf(target) {
    if (target.IsOpen) {
      return true;
    }
    return this.Effects.every((effect) => target.Contains(effect));
  }
  Subtract(handled) {
    return EffectRow.FromEffects(this.Effects.filter((effect) => !handled.Contains(effect)), this.IsOpen);
  }
  Union(other) {
    return EffectRow.FromEffects(this.Effects.concat(other.Effects), this.IsOpen || other.IsOpen);
  }
  ToDisplayString() {
    const items = this.Effects.map((effect) => effect.Name).join(" ");
    if (this.IsOpen) {
      return items.length === 0 ? "[..]" : `[${items} ..]`;
    }
    return `[${items}]`;
  }
}

class RowMember {
  Name;
  Type;
  Qualifier;
  Origin;
  IsMethod;
  Access;
  EffectContext;
  constructor(Name, Type, Qualifier, Origin, IsMethod, options = {}) {
    this.Name = Name;
    this.Type = Type;
    this.Qualifier = Qualifier;
    this.Origin = Origin;
    this.IsMethod = IsMethod;
    this.Access = options.Access ?? "public" /* Public */;
    this.EffectContext = options.EffectContext;
    this.Metadata = options.Metadata ?? {};
  }
  Metadata;
  get IsVirtual() {
    return this.Qualifier === "virtual" /* Virtual */;
  }
  get IsFinal() {
    return this.Qualifier === "final" /* Final */;
  }
  get IsOverride() {
    return this.Qualifier === "override" /* Override */;
  }
  get IsInherit() {
    return this.Qualifier === "inherit" /* Inherit */;
  }
  get ShouldForward() {
    return this.Qualifier === "default" /* Default */ || this.Qualifier === "inherit" /* Inherit */ || this.Qualifier === "override" /* Override */;
  }
  get IsSpreadParameter() {
    return this.Name.startsWith("..");
  }
  get EffectContextKey() {
    return this.EffectContext?.ToDisplayString() ?? "";
  }
  WithEffectContext(effectContext) {
    return new RowMember(this.Name, this.Type, this.Qualifier, this.Origin, this.IsMethod, {
      Access: this.Access,
      EffectContext: effectContext,
      Metadata: this.Metadata
    });
  }
  WithType(type) {
    return new RowMember(this.Name, type, this.Qualifier, this.Origin, this.IsMethod, {
      Access: this.Access,
      EffectContext: this.EffectContext,
      Metadata: this.Metadata
    });
  }
}

class RowMemberBuilder {
  static Method(origin, name, type, qualifier = "default" /* Default */, access = "public" /* Public */, metadata = {}) {
    return new RowMember(name, type, qualifier, origin, true, { Access: access, Metadata: metadata });
  }
  static Field(origin, name, type, qualifier = "default" /* Default */, access = "public" /* Public */, metadata = {}) {
    return new RowMember(name, type, qualifier, origin, false, { Access: access, Metadata: metadata });
  }
  static Spread(origin, name, type, metadata = {}) {
    return new RowMember(`..${name}`, type, "default" /* Default */, origin, false, { Metadata: metadata });
  }
}
var RowMemberResolutionStatus;
((RowMemberResolutionStatus2) => {
  RowMemberResolutionStatus2["Success"] = "success";
  RowMemberResolutionStatus2["NotFound"] = "not_found";
  RowMemberResolutionStatus2["Ambiguous"] = "ambiguous";
})(RowMemberResolutionStatus ||= {});

class RowMemberResolutionResult {
  Status;
  Member;
  Candidates;
  constructor(Status, Member, Candidates) {
    this.Status = Status;
    this.Member = Member;
    this.Candidates = Candidates;
  }
  get Success() {
    return this.Status === "success" /* Success */;
  }
}

class RowTypeSymbol {
  Name;
  Members;
  IsOpen;
  constructor(Name, Members, IsOpen) {
    this.Name = Name;
    this.Members = Members;
    this.IsOpen = IsOpen;
  }
  Resolve(name, origin) {
    for (const member of this.Members) {
      if (member.Name === name && (origin == null || member.Origin === origin)) {
        if (member.IsVirtual) {
          throw new Error(`Member '${name}' declared virtual in ${member.Origin} requires an override.`);
        }
        return member;
      }
    }
    return null;
  }
  ResolveWithEffectContext(name, activeEffectContext) {
    const candidates = this.EnumerateByName(name).filter((member) => !member.IsVirtual).filter((member) => member.EffectContext == null || member.EffectContext.IsSubsetOf(activeEffectContext));
    if (candidates.length === 0) {
      return new RowMemberResolutionResult("not_found" /* NotFound */, null, candidates);
    }
    if (candidates.length === 1) {
      return new RowMemberResolutionResult("success" /* Success */, candidates[0], candidates);
    }
    return new RowMemberResolutionResult("ambiguous" /* Ambiguous */, null, candidates);
  }
  Append(other) {
    return new RowTypeSymbol(`${this.Name}&${other.Name}`, this.Members.concat(other.Members), this.IsOpen || other.IsOpen);
  }
  EnumerateByName(name) {
    return this.Members.filter((member) => member.Name === name);
  }
}

class SchemaMixinSymbol {
  Name;
  Row;
  Metadata;
  constructor(Name, Row, Metadata = {}) {
    this.Name = Name;
    this.Row = Row;
    this.Metadata = Metadata;
  }
}

class SchemaTypeSymbol {
  Name;
  DeclaredRow;
  EffectiveRow;
  Parent;
  Mixins;
  Metadata;
  constructor(Name, DeclaredRow, EffectiveRow, Parent, Mixins = [], Metadata = {}) {
    this.Name = Name;
    this.DeclaredRow = DeclaredRow;
    this.EffectiveRow = EffectiveRow;
    this.Parent = Parent;
    this.Mixins = Mixins;
    this.Metadata = Metadata;
  }
}

class RelationTypeSymbol {
  Name;
  From;
  To;
  Directed;
  Metadata;
  constructor(Name, From, To, Directed = true, Metadata = {}) {
    this.Name = Name;
    this.From = From;
    this.To = To;
    this.Directed = Directed;
    this.Metadata = Metadata;
  }
}

class GenericTypeSymbol {
  Name;
  TypeParameters;
  constructor(Name, TypeParameters) {
    this.Name = Name;
    this.TypeParameters = TypeParameters;
  }
  ValidateTypeArguments(typeArguments) {
    if (typeArguments.length !== this.TypeParameters.length) {
      throw new Error(`Generic type '${this.Name}' expects ${this.TypeParameters.length} type arguments, got ${typeArguments.length}.`);
    }
  }
}

class GenericRowTypeSymbol extends GenericTypeSymbol {
  Members;
  IsOpen;
  constructor(name, typeParameters, Members, IsOpen) {
    super(name, typeParameters);
    this.Members = Members;
    this.IsOpen = IsOpen;
  }
  Instantiate(typeArguments) {
    this.ValidateTypeArguments(typeArguments);
    const substitutions = new Map;
    for (let i = 0;i < this.TypeParameters.length; i++) {
      const parameter = this.TypeParameters[i];
      const argument = typeArguments[i];
      if (parameter.IsRowParameter && !(argument instanceof RowTypeSymbol)) {
        throw new Error(`Type argument '${argument.Name}' for parameter '${parameter.Name}' must be a row type.`);
      }
      substitutions.set(parameter.Name, argument);
    }
    const members = [];
    const spreadRows = [];
    for (const member of this.Members) {
      if (member.IsSpreadParameter) {
        const parameterName = member.Name.slice(2);
        const substitution = substitutions.get(parameterName);
        if (substitution instanceof RowTypeSymbol) {
          spreadRows.push(substitution);
        }
        continue;
      }
      members.push(member.WithType(substituteType(member.Type, substitutions)));
    }
    const typeArgumentNames = typeArguments.map((type) => type.Name).join(",");
    const name = `${this.Name}<${typeArgumentNames}>`;
    let result = new RowTypeSymbol(name, members, this.IsOpen);
    for (const row of spreadRows) {
      result = new RowTypeSymbol(name, result.Members.concat(row.Members), result.IsOpen || row.IsOpen);
    }
    return result;
  }
}
function substituteType(type, substitutions) {
  const replacement = substitutions.get(type.Name);
  if (replacement != null) {
    return replacement;
  }
  if (type instanceof FunctionTypeSymbol) {
    return new FunctionTypeSymbol(type.Name, type.Parameters.map((parameter) => substituteType(parameter, substitutions)), type.Outputs.map((output) => substituteType(output, substitutions)), type.EffectRow);
  }
  if (type instanceof TypeReferenceSymbol && type.TypeArguments.length > 0) {
    return new TypeReferenceSymbol(type.BaseName, type.TypeArguments.map((argument) => substituteType(argument, substitutions)));
  }
  return type;
}
var InheritanceKind;
((InheritanceKind2) => {
  InheritanceKind2["Real"] = "real";
  InheritanceKind2["Virtual"] = "virtual";
})(InheritanceKind ||= {});

class ClassTypeSymbol {
  Name;
  DeclaredRows;
  Bases;
  ImplementedTraits;
  IsTrait;
  TypeParameters;
  rowsCache;
  mroCache;
  constructor(Name, DeclaredRows, Bases, ImplementedTraits, IsTrait, TypeParameters = []) {
    this.Name = Name;
    this.DeclaredRows = DeclaredRows;
    this.Bases = Bases;
    this.ImplementedTraits = ImplementedTraits;
    this.IsTrait = IsTrait;
    this.TypeParameters = TypeParameters;
  }
  get MethodResolutionOrder() {
    if (this.mroCache == null) {
      this.mroCache = computeC3Linearization(this);
    }
    return this.mroCache;
  }
  get Rows() {
    if (this.rowsCache == null) {
      this.rowsCache = buildRowsForClass(this);
    }
    return this.rowsCache;
  }
  Instantiate(typeArguments) {
    if (typeArguments.length !== this.TypeParameters.length) {
      throw new Error(`Generic class '${this.Name}' expects ${this.TypeParameters.length} type arguments, got ${typeArguments.length}.`);
    }
    const substitutions = new Map;
    for (let i = 0;i < this.TypeParameters.length; i++) {
      substitutions.set(this.TypeParameters[i].Name, typeArguments[i]);
    }
    const typeArgumentNames = typeArguments.map((type) => type.Name).join(",");
    const name = `${this.Name}<${typeArgumentNames}>`;
    const declaredRows = new RowTypeSymbol(`${name}.decl`, this.DeclaredRows.Members.map((member) => member.WithType(substituteType(member.Type, substitutions))), this.DeclaredRows.IsOpen);
    return new ClassTypeSymbol(name, declaredRows, this.Bases, this.ImplementedTraits, this.IsTrait);
  }
}

class ClassDefinition {
  Type;
  Methods;
  constructor(Type, Methods) {
    this.Type = Type;
    this.Methods = Methods;
  }
  get Name() {
    return this.Type.Name;
  }
  get DeclaredRows() {
    return this.Type.DeclaredRows;
  }
  get Bases() {
    return this.Type.Bases;
  }
  get ImplementedTraits() {
    return this.Type.ImplementedTraits;
  }
  get IsTrait() {
    return this.Type.IsTrait;
  }
  get MethodResolutionOrder() {
    return this.Type.MethodResolutionOrder;
  }
  get Rows() {
    return this.Type.Rows;
  }
}

class TypeProjection {
  SourceType;
  TargetType;
  Name;
  constructor(SourceType, TargetType) {
    this.SourceType = SourceType;
    this.TargetType = TargetType;
    this.Name = `${SourceType.Name} as ${TargetType.Name}`;
  }
  IsValidProjection(typeSystem) {
    const source = this.SourceType;
    const target = this.TargetType;
    if (source instanceof ClassTypeSymbol && target instanceof ClassTypeSymbol) {
      if (target.IsTrait) {
        return source.MethodResolutionOrder.some((candidate) => candidate === target) || source.MethodResolutionOrder.some((candidate) => candidate.ImplementedTraits.includes(target));
      }
      return typeSystem.IsSubtype(source, target) || source.MethodResolutionOrder.includes(target);
    }
    if (source instanceof RowTypeSymbol && target instanceof RowTypeSymbol) {
      return typeSystem.IsSubtype(source, target);
    }
    if (source instanceof ClassTypeSymbol && target instanceof RowTypeSymbol) {
      return typeSystem.IsSubtype(source.Rows, target);
    }
    if (source instanceof RowTypeSymbol && target instanceof ClassTypeSymbol) {
      return typeSystem.IsSubtype(source, target.Rows);
    }
    return false;
  }
}
function computeC3Linearization(type) {
  if (type.Bases.length === 0) {
    return [type];
  }
  const sequences = [[type]];
  for (const baseRef of type.Bases) {
    sequences.push(baseRef.Type.MethodResolutionOrder.slice());
  }
  sequences.push(type.Bases.map((baseRef) => baseRef.Type));
  const result = [];
  while (sequences.length > 0) {
    let candidate = null;
    for (const seq of sequences) {
      if (seq.length === 0) {
        continue;
      }
      const head = seq[0];
      const appearsInAnyTail = sequences.some((other) => other !== seq && other.slice(1).includes(head));
      if (!appearsInAnyTail) {
        candidate = head;
        break;
      }
    }
    if (candidate == null) {
      throw new Error(`Cannot compute consistent MRO for ${type.Name}.`);
    }
    result.push(candidate);
    for (let i = sequences.length - 1;i >= 0; i--) {
      sequences[i] = sequences[i].filter((item) => item !== candidate);
      if (sequences[i].length === 0) {
        sequences.splice(i, 1);
      }
    }
  }
  return result;
}
function buildRowsForClass(type) {
  const members = [];
  const existing = new Set;
  const blockedByVirtual = new Set;
  const finalMembers = new Set;
  const overridesAwaitingBase = new Set;
  const inheritsAwaitingBase = new Set;
  for (const ancestor of type.MethodResolutionOrder.concat(type.ImplementedTraits)) {
    for (const original of ancestor.DeclaredRows.Members) {
      const member = applyEffectiveAccess(type, original);
      const key = memberKey(member);
      if (existing.has(key)) {
        continue;
      }
      if (finalMembers.has(member.Name)) {
        if (member.IsOverride || member.IsInherit || member.Origin !== ancestor.Name) {
          throw new Error(`Cannot override final member '${member.Name}' in ${type.Name}.`);
        }
        continue;
      }
      if (member.IsVirtual) {
        blockedByVirtual.add(member.Name);
        removeExistingMembers(type, ancestor, members, existing, member.Name);
        members.push(member);
        existing.add(key);
        overridesAwaitingBase.delete(member.Name);
        continue;
      }
      if (member.IsOverride || member.IsInherit) {
        if (!blockedByVirtual.has(member.Name) && members.every((candidate) => candidate.Name !== member.Name)) {
          if (member.IsOverride) {
            overridesAwaitingBase.add(member.Name);
          } else {
            inheritsAwaitingBase.add(member.Name);
          }
        } else {
          blockedByVirtual.delete(member.Name);
          overridesAwaitingBase.delete(member.Name);
          inheritsAwaitingBase.delete(member.Name);
        }
        members.push(member);
        existing.add(key);
      } else if (blockedByVirtual.has(member.Name)) {
        continue;
      } else {
        if (member.IsFinal && members.some((candidate) => candidate.Name === member.Name && candidate.Origin !== member.Origin)) {
          throw new Error(`Cannot override final member '${member.Name}' in ${type.Name}.`);
        }
        members.push(member);
        existing.add(key);
        overridesAwaitingBase.delete(member.Name);
        inheritsAwaitingBase.delete(member.Name);
      }
      if (member.IsFinal) {
        finalMembers.add(member.Name);
      }
    }
  }
  if (overridesAwaitingBase.size > 0) {
    throw new Error(`Override specified without base implementation for: ${Array.from(overridesAwaitingBase).join(", ")}`);
  }
  if (inheritsAwaitingBase.size > 0) {
    throw new Error(`inherit specified without base implementation for: ${Array.from(inheritsAwaitingBase).join(", ")}`);
  }
  return new RowTypeSymbol(`${type.Name}.rows`, members, type.DeclaredRows.IsOpen);
}
function removeExistingMembers(targetType, ancestor, members, existing, name) {
  for (let i = members.length - 1;i >= 0; i--) {
    const candidate = members[i];
    if (candidate.Name !== name) {
      continue;
    }
    const originClass = targetType.MethodResolutionOrder.find((item) => item.Name === candidate.Origin);
    let keep = candidate.Origin === targetType.Name;
    if (!keep && originClass != null && originClass !== ancestor) {
      keep = originClass.MethodResolutionOrder.includes(ancestor);
    }
    if (keep && candidate.Origin !== ancestor.Name) {
      continue;
    }
    existing.delete(memberKey(candidate));
    members.splice(i, 1);
  }
}
function applyEffectiveAccess(type, member) {
  const pathAccess = computeAccessModifier(type, member.Origin);
  const effective = minAccess(member.Access, pathAccess);
  if (effective === member.Access) {
    return member;
  }
  return new RowMember(member.Name, member.Type, member.Qualifier, member.Origin, member.IsMethod, {
    Access: effective,
    EffectContext: member.EffectContext
  });
}
function computeAccessModifier(type, ancestorName) {
  if (type.Name === ancestorName) {
    return "public" /* Public */;
  }
  return tryComputeAccess(type, ancestorName) ?? "public" /* Public */;
}
function tryComputeAccess(type, targetName) {
  for (const baseRef of type.Bases) {
    if (baseRef.Type.Name === targetName) {
      return baseRef.Access;
    }
    const downstream = tryComputeAccess(baseRef.Type, targetName);
    if (downstream != null) {
      return minAccess(baseRef.Access, downstream);
    }
  }
  return null;
}
function minAccess(first, second) {
  return accessRank(first) <= accessRank(second) ? first : second;
}
function accessRank(access) {
  switch (access) {
    case "private" /* Private */:
      return 0;
    case "protected" /* Protected */:
      return 1;
    case "internal" /* Internal */:
      return 2;
    case "public" /* Public */:
    default:
      return 3;
  }
}
function memberKey(member) {
  return `${member.Name}\x00${member.Origin}\x00${member.EffectContext?.ToDisplayString() ?? ""}`;
}
// ../type-system/lib/TypeRegistry.ts
class TypeRegistry {
  symbols = new Map;
  lazySymbols = new Map;
  effects = new Map;
  Any = new AnyTypeSymbol;
  Never = new NeverTypeSymbol;
  Int = new PrimitiveTypeSymbol("int");
  String = new PrimitiveTypeSymbol("str");
  Bool = new PrimitiveTypeSymbol("bool");
  constructor() {
    this.Register(this.Any);
    this.Register(this.Never);
    this.Register(this.Int);
    this.Register(this.String);
    this.Register(this.Bool);
  }
  Register(symbol) {
    this.symbols.set(symbol.Name, symbol);
    return symbol;
  }
  RegisterLazy(name, factory) {
    this.lazySymbols.set(name, factory);
  }
  Require(name) {
    const direct = this.symbols.get(name);
    if (direct != null) {
      return direct;
    }
    const lazy = this.lazySymbols.get(name);
    if (lazy != null) {
      const symbol = lazy();
      this.Register(symbol);
      this.lazySymbols.delete(name);
      return symbol;
    }
    throw new Error(`Type '${name}' is not registered.`);
  }
  TryGet(name) {
    try {
      return this.Require(name);
    } catch {
      return null;
    }
  }
  CreateFunctionType(name, parameters, outputs, effectRow) {
    return new FunctionTypeSymbol(name, parameters, Array.isArray(outputs) ? outputs : [outputs], effectRow);
  }
  GetOrCreateEffect(name) {
    const existing = this.effects.get(name);
    if (existing != null) {
      return existing;
    }
    const effect = new EffectSymbol(name);
    this.effects.set(name, effect);
    this.Register(effect);
    return effect;
  }
  TryGetEffect(name) {
    return this.effects.get(name) ?? null;
  }
}
// ../type-system/lib/KonTypeComputationRuntime.ts
var TypeComputationOps = {
  DefineRowType: "type.compute.define_row_type",
  DefineGenericRowType: "type.compute.define_generic_row_type",
  InstantiateGenericRowType: "type.compute.instantiate_generic_row_type",
  DefineClass: "type.compute.define_class",
  DefineEnum: "type.compute.define_enum",
  InstantiateGenericClass: "type.compute.instantiate_generic_class",
  MergeRows: "type.compute.merge_rows",
  IsSubtype: "type.compute.is_subtype",
  AreTypesCompatible: "type.compute.are_types_compatible"
};

class KonTypeComputationRuntime {
  Runtime;
  Trace = [];
  constructor() {
    this.Runtime = new RuntimeState;
    this.RegisterOperations();
  }
  defineRowType(typeSystem, name, members, isOpen) {
    return this.call(TypeComputationOps.DefineRowType, [typeSystem, name, members, isOpen]);
  }
  defineGenericRowType(typeSystem, name, typeParameters, members, isOpen) {
    return this.call(TypeComputationOps.DefineGenericRowType, [typeSystem, name, typeParameters, members, isOpen]);
  }
  instantiateGenericRowType(typeSystem, genericType, typeArguments) {
    return this.call(TypeComputationOps.InstantiateGenericRowType, [typeSystem, genericType, typeArguments]);
  }
  defineClass(typeSystem, name, members, isOpen, bases, methodBodies, isTrait, typeParameters) {
    return this.call(TypeComputationOps.DefineClass, [
      typeSystem,
      name,
      members,
      isOpen,
      bases,
      methodBodies,
      isTrait,
      typeParameters
    ]);
  }
  defineEnum(typeSystem, name, values, options) {
    return this.call(TypeComputationOps.DefineEnum, [typeSystem, name, values, options]);
  }
  instantiateGenericClass(typeSystem, classType, typeArguments) {
    return this.call(TypeComputationOps.InstantiateGenericClass, [typeSystem, classType, typeArguments]);
  }
  mergeRows(typeSystem, resultName, rows) {
    return this.call(TypeComputationOps.MergeRows, [typeSystem, resultName, rows]);
  }
  isSubtype(typeSystem, candidate, target) {
    return this.call(TypeComputationOps.IsSubtype, [typeSystem, candidate, target]);
  }
  areTypesCompatible(typeSystem, candidate, required) {
    return this.call(TypeComputationOps.AreTypesCompatible, [typeSystem, candidate, required]);
  }
  call(op, args) {
    this.Trace.push({ op, args });
    return this.Runtime.callHostFunction(op, args);
  }
  RegisterOperations() {
    this.Runtime.registerHostFunction(TypeComputationOps.DefineRowType, (typeSystem, name, members, isOpen) => typeSystem.defineRowTypeDirect(name, members, isOpen), 4);
    this.Runtime.registerHostFunction(TypeComputationOps.DefineGenericRowType, (typeSystem, name, typeParameters, members, isOpen) => typeSystem.defineGenericRowTypeDirect(name, typeParameters, members, isOpen), 5);
    this.Runtime.registerHostFunction(TypeComputationOps.InstantiateGenericRowType, (typeSystem, genericType, typeArguments) => typeSystem.instantiateGenericRowTypeDirect(genericType, ...typeArguments), 3);
    this.Runtime.registerHostFunction(TypeComputationOps.DefineClass, (typeSystem, name, members, isOpen, bases, methodBodies, isTrait, typeParameters) => typeSystem.defineClassDirect(name, members, isOpen, bases, methodBodies, isTrait, typeParameters), 8);
    this.Runtime.registerHostFunction(TypeComputationOps.DefineEnum, (typeSystem, name, values, options) => typeSystem.defineEnumDirect(name, values, options), 4);
    this.Runtime.registerHostFunction(TypeComputationOps.InstantiateGenericClass, (typeSystem, classType, typeArguments) => typeSystem.instantiateGenericClassDirect(classType, ...typeArguments), 3);
    this.Runtime.registerHostFunction(TypeComputationOps.MergeRows, (typeSystem, resultName, rows) => typeSystem.mergeRowsDirect(resultName, ...rows), 3);
    this.Runtime.registerHostFunction(TypeComputationOps.IsSubtype, (typeSystem, candidate, target) => typeSystem.isSubtypeDirect(candidate, target), 3);
    this.Runtime.registerHostFunction(TypeComputationOps.AreTypesCompatible, (typeSystem, candidate, required) => typeSystem.areTypesCompatibleDirect(candidate, required), 3);
  }
}

// ../type-system/lib/TypeSystem.ts
class TypeSystem {
  classes = new Map;
  enums = new Map;
  brandedScalars = new Map;
  schemaMixins = new Map;
  schemaTypes = new Map;
  relations = new Map;
  schemaTypeAliases = new Map;
  relationAliases = new Map;
  attributeAliases = new Map;
  computationRuntime;
  Registry = new TypeRegistry;
  constructor(computationRuntime = new KonTypeComputationRuntime) {
    this.computationRuntime = computationRuntime;
    this.DefineClass("object", [], true, [], [], false);
  }
  get TypeComputationRuntime() {
    return this.computationRuntime;
  }
  DefineRowType(name, members, isOpen) {
    return this.computationRuntime.defineRowType(this, name, members, isOpen);
  }
  defineRowTypeDirect(name, members, isOpen) {
    const row = new RowTypeSymbol(name, members, isOpen);
    this.Registry.Register(row);
    return row;
  }
  DefineGenericRowType(name, typeParameters, members, isOpen) {
    return this.computationRuntime.defineGenericRowType(this, name, typeParameters, members, isOpen);
  }
  defineGenericRowTypeDirect(name, typeParameters, members, isOpen) {
    const generic = new GenericRowTypeSymbol(name, typeParameters, members, isOpen);
    this.Registry.Register(generic);
    return generic;
  }
  InstantiateGenericRowType(genericType, ...typeArguments) {
    return this.computationRuntime.instantiateGenericRowType(this, genericType, typeArguments);
  }
  instantiateGenericRowTypeDirect(genericType, ...typeArguments) {
    const row = genericType.Instantiate(typeArguments);
    this.Registry.Register(row);
    return row;
  }
  DefineClass(name, members, isOpen, bases, methodBodies = [], isTrait = false, typeParameters = []) {
    return this.computationRuntime.defineClass(this, name, members, isOpen, bases, methodBodies, isTrait, typeParameters);
  }
  defineClassDirect(name, members, isOpen, bases, methodBodies = [], isTrait = false, typeParameters = []) {
    const declared = new RowTypeSymbol(`${name}.decl`, members, isOpen);
    const typedMethodBodies = methodBodies;
    const baseRefs = [];
    const implementedTraits = [];
    for (const entry of bases) {
      const base = this.classes.get(entry.Name)?.Type;
      if (base == null) {
        throw new Error(`Base type '${entry.Name}' is not defined.`);
      }
      if (base.IsTrait && !isTrait) {
        implementedTraits.push(base);
      } else {
        baseRefs.push({
          Type: base,
          Inheritance: entry.Inheritance ?? "real" /* Real */,
          Access: entry.Access ?? "public" /* Public */
        });
      }
    }
    if (!isTrait && baseRefs.length === 0 && name !== "object") {
      const object = this.classes.get("object")?.Type;
      if (object != null) {
        baseRefs.push({ Type: object, Inheritance: "real" /* Real */, Access: "public" /* Public */ });
      }
    }
    const cls = new ClassTypeSymbol(name, declared, baseRefs, implementedTraits, isTrait, typeParameters);
    const definition = new ClassDefinition(cls, typedMethodBodies);
    this.classes.set(name, definition);
    this.Registry.Register(cls);
    this.Registry.RegisterLazy(`${name}.rows`, () => cls.Rows);
    return definition;
  }
  InstantiateGenericClass(classType, ...typeArguments) {
    return this.computationRuntime.instantiateGenericClass(this, classType, typeArguments);
  }
  instantiateGenericClassDirect(classType, ...typeArguments) {
    const instance = classType.Instantiate(typeArguments);
    this.Registry.Register(instance);
    this.Registry.RegisterLazy(`${instance.Name}.rows`, () => instance.Rows);
    return instance;
  }
  RequireClassSymbol(name) {
    return this.RequireClass(name).Type;
  }
  RequireClass(name) {
    const definition = this.classes.get(name);
    if (definition == null) {
      throw new Error(`Class '${name}' is not registered.`);
    }
    return definition;
  }
  DefineEnum(name, values, options = {}) {
    return this.computationRuntime.defineEnum(this, name, values, options);
  }
  defineEnumDirect(name, values, options = {}) {
    if (this.enums.has(name)) {
      throw new Error(`Enum '${name}' is already registered.`);
    }
    const enumType = new EnumTypeSymbol(name, options.Representation ?? this.Registry.String, options.Metadata ?? {});
    const seen = new Set;
    const seenCodes = new Set;
    for (const item of values) {
      const input = typeof item === "string" ? { Name: item } : item;
      if (seen.has(input.Name)) {
        throw new Error(`Enum '${name}' contains duplicate value '${input.Name}'.`);
      }
      seen.add(input.Name);
      if (input.Code != null) {
        if (seenCodes.has(input.Code)) {
          throw new Error(`Enum '${name}' contains duplicate code '${input.Code}'.`);
        }
        seenCodes.add(input.Code);
      }
      enumType.AddValue(input.Name, input.Code, input.Metadata);
    }
    this.enums.set(name, enumType);
    this.Registry.Register(enumType);
    for (const value of enumType.Values) {
      this.Registry.Register(value);
    }
    return enumType;
  }
  RequireEnum(name) {
    const symbol = this.enums.get(name) ?? this.Registry.TryGet(name);
    if (symbol instanceof EnumTypeSymbol) {
      return symbol;
    }
    throw new Error(`Enum '${name}' is not registered.`);
  }
  DefineBrandedScalar(name, representation = this.Registry.String, metadata = {}) {
    if (this.brandedScalars.has(name)) {
      throw new Error(`Branded scalar '${name}' is already registered.`);
    }
    const scalar = new BrandedScalarTypeSymbol(name, representation, metadata);
    this.brandedScalars.set(name, scalar);
    this.Registry.Register(scalar);
    return scalar;
  }
  RequireBrandedScalar(name) {
    const scalar = this.brandedScalars.get(name) ?? this.Registry.TryGet(name);
    if (scalar instanceof BrandedScalarTypeSymbol) {
      return scalar;
    }
    throw new Error(`Branded scalar '${name}' is not registered.`);
  }
  DefineSchemaMixin(name, members, isOpen = true, metadata = {}) {
    if (this.schemaMixins.has(name)) {
      throw new Error(`Schema mixin '${name}' is already registered.`);
    }
    const row = new RowTypeSymbol(`${name}.mixin`, members, isOpen);
    const mixin = new SchemaMixinSymbol(name, row, metadata);
    this.schemaMixins.set(name, mixin);
    this.Registry.Register(mixin);
    this.Registry.Register(row);
    return mixin;
  }
  RequireSchemaMixin(name) {
    const mixin = this.schemaMixins.get(name);
    if (mixin == null) {
      throw new Error(`Schema mixin '${name}' is not registered.`);
    }
    return mixin;
  }
  DefineSchemaType(name, members, options = {}) {
    if (this.schemaTypes.has(name)) {
      throw new Error(`Schema type '${name}' is already registered.`);
    }
    const parent = typeof options.Parent === "string" ? this.RequireSchemaType(options.Parent) : options.Parent;
    const mixins = (options.Mixins ?? []).map((mixin) => typeof mixin === "string" ? this.RequireSchemaMixin(mixin) : mixin);
    const declared = new RowTypeSymbol(`${name}.schema.decl`, members, options.IsOpen ?? true);
    const effective = this.BuildSchemaEffectiveRow(name, declared, parent, mixins);
    const schema = new SchemaTypeSymbol(name, declared, effective, parent, mixins, options.Metadata ?? {});
    this.schemaTypes.set(name, schema);
    this.Registry.Register(schema);
    this.Registry.RegisterLazy(`${name}.schema.rows`, () => schema.EffectiveRow);
    return schema;
  }
  RequireSchemaType(name) {
    const canonical = this.ResolveSchemaTypeName(name);
    const schema = this.schemaTypes.get(canonical);
    if (schema == null) {
      throw new Error(`Schema type '${name}' is not registered.`);
    }
    return schema;
  }
  IsSchemaSubtype(candidate, target) {
    let current = candidate;
    while (current != null) {
      if (current === target || current.Name === target.Name) {
        return true;
      }
      current = current.Parent;
    }
    return false;
  }
  DefineRelation(name, from, to, directed = true, metadata = {}) {
    if (this.relations.has(name)) {
      throw new Error(`Relation '${name}' is already registered.`);
    }
    const relation = new RelationTypeSymbol(name, typeof from === "string" ? this.RequireSchemaType(from) : from, typeof to === "string" ? this.RequireSchemaType(to) : to, directed, metadata);
    this.relations.set(name, relation);
    this.Registry.Register(relation);
    return relation;
  }
  RequireRelation(name) {
    const canonical = this.ResolveRelationName(name);
    const relation = this.relations.get(canonical);
    if (relation == null) {
      throw new Error(`Relation '${name}' is not registered.`);
    }
    return relation;
  }
  CheckRelationEndpoints(relation, from, to) {
    const forward = this.IsSchemaSubtype(from, relation.From) && this.IsSchemaSubtype(to, relation.To);
    if (relation.Directed || forward) {
      return forward;
    }
    return this.IsSchemaSubtype(from, relation.To) && this.IsSchemaSubtype(to, relation.From);
  }
  GetSchemaTypeSet(type, options = {}) {
    const root = typeof type === "string" ? this.RequireSchemaType(type) : type;
    if (options.exact) {
      return [root];
    }
    return Array.from(this.schemaTypes.values()).filter((candidate) => this.IsSchemaSubtype(candidate, root));
  }
  DefineSchemaTypeAlias(alias, canonical) {
    this.schemaTypeAliases.set(alias, canonical);
    this.ResolveAlias(alias, this.schemaTypeAliases, "schema type");
  }
  DefineRelationAlias(alias, canonical) {
    this.relationAliases.set(alias, canonical);
    this.ResolveAlias(alias, this.relationAliases, "relation");
  }
  DefineAttributeAlias(typeName, alias, canonical) {
    const type = this.ResolveSchemaTypeName(typeName);
    const aliases = this.attributeAliases.get(type) ?? new Map;
    aliases.set(alias, canonical);
    this.attributeAliases.set(type, aliases);
    this.ResolveAlias(alias, aliases, `attribute for ${type}`);
  }
  ResolveSchemaTypeName(name) {
    return this.ResolveAlias(name, this.schemaTypeAliases, "schema type");
  }
  ResolveRelationName(name) {
    return this.ResolveAlias(name, this.relationAliases, "relation");
  }
  ResolveAttributeName(typeName, name) {
    let current = this.RequireSchemaType(typeName);
    while (current != null) {
      const aliases = this.attributeAliases.get(current.Name);
      if (aliases?.has(name)) {
        return this.ResolveAlias(name, aliases, `attribute for ${current.Name}`);
      }
      current = current.Parent;
    }
    return name;
  }
  BuildSchemaEffectiveRow(name, declared, parent, mixins = []) {
    const members = [];
    for (const mixin of mixins) {
      members.push(...mixin.Row.Members);
    }
    const ancestors = [];
    let current = parent;
    while (current != null) {
      ancestors.unshift(current);
      current = current.Parent;
    }
    for (const ancestor of ancestors) {
      members.push(...ancestor.DeclaredRow.Members);
    }
    for (const member of declared.Members) {
      const inherited = members.find((candidate) => candidate.Name === member.Name);
      if (inherited != null && !this.AreTypesCompatible(member.Type, inherited.Type)) {
        throw new Error(`Schema member '${member.Name}' in '${name}' cannot change inherited type '${inherited.Type.Name}' to '${member.Type.Name}'.`);
      }
      members.push(member);
    }
    return new RowTypeSymbol(`${name}.schema.rows`, members, declared.IsOpen || mixins.some((mixin) => mixin.Row.IsOpen) || ancestors.some((ancestor) => ancestor.EffectiveRow.IsOpen));
  }
  ResolveAlias(name, aliases, kind) {
    const seen = new Set;
    let current = name;
    while (aliases.has(current)) {
      if (seen.has(current)) {
        throw new Error(`Alias cycle detected for ${kind} '${name}'.`);
      }
      seen.add(current);
      current = aliases.get(current);
    }
    return current;
  }
  MergeRows(resultName, ...rows) {
    return this.computationRuntime.mergeRows(this, resultName, rows);
  }
  mergeRowsDirect(resultName, ...rows) {
    if (rows.length === 0) {
      throw new Error("At least one row type is required.");
    }
    let merged = rows[0];
    for (let i = 1;i < rows.length; i++) {
      merged = merged.Append(rows[i]);
    }
    return new RowTypeSymbol(resultName, merged.Members, merged.IsOpen);
  }
  IsSubtype(candidate, target) {
    return this.computationRuntime.isSubtype(this, candidate, target);
  }
  isSubtypeDirect(candidate, target) {
    const candidateRows = candidate instanceof ClassTypeSymbol ? candidate.Rows : candidate;
    const targetRows = target instanceof ClassTypeSymbol ? target.Rows : target;
    const remaining = candidateRows.Members.filter((member) => !member.IsVirtual);
    for (const required of targetRows.Members) {
      const index = remaining.findIndex((candidateMember) => candidateMember.Name === required.Name && this.MemberTypesAreCompatible(candidateMember, required));
      if (index < 0) {
        return false;
      }
      remaining.splice(index, 1);
    }
    return targetRows.IsOpen || remaining.length === 0;
  }
  MemberTypesAreCompatible(candidate, required) {
    if (this.areTypesCompatibleDirect(candidate.Type, required.Type)) {
      return true;
    }
    if (!candidate.IsMethod && required.IsMethod && required.Type instanceof FunctionTypeSymbol && required.Type.Parameters.length === 0 && required.Type.Outputs.length === 1) {
      return this.areTypesCompatibleDirect(candidate.Type, required.Type.ReturnType);
    }
    return false;
  }
  AreTypesCompatible(candidate, required) {
    return this.computationRuntime.areTypesCompatible(this, candidate, required);
  }
  areTypesCompatibleDirect(candidate, required) {
    if (candidate === required || candidate.Name === required.Name) {
      return true;
    }
    if (candidate.Owner instanceof EnumTypeSymbol && required instanceof EnumTypeSymbol) {
      return candidate.Owner.Name === required.Name;
    }
    if (candidate instanceof BrandedScalarTypeSymbol || required instanceof BrandedScalarTypeSymbol) {
      return false;
    }
    if (candidate instanceof SchemaTypeSymbol && required instanceof SchemaTypeSymbol) {
      return this.IsSchemaSubtype(candidate, required);
    }
    if (candidate instanceof FunctionTypeSymbol && required instanceof FunctionTypeSymbol) {
      if (candidate.Parameters.length !== required.Parameters.length || candidate.Outputs.length !== required.Outputs.length) {
        return false;
      }
      for (let i = 0;i < candidate.Parameters.length; i++) {
        if (!this.areTypesCompatibleDirect(candidate.Parameters[i], required.Parameters[i])) {
          return false;
        }
      }
      for (let i = 0;i < candidate.Outputs.length; i++) {
        if (!this.areTypesCompatibleDirect(candidate.Outputs[i], required.Outputs[i])) {
          return false;
        }
      }
      return candidate.EffectRow.IsSubsetOf(required.EffectRow);
    }
    if (candidate instanceof RowTypeSymbol && required instanceof RowTypeSymbol) {
      return this.isSubtypeDirect(candidate, required);
    }
    if (candidate instanceof ClassTypeSymbol && required instanceof ClassTypeSymbol) {
      return this.isSubtypeDirect(candidate, required);
    }
    return false;
  }
}
// ../type-system/lib/KonSource.ts
function ParseKonSourceItems(source) {
  return SplitTopLevelExpressions(source).map((expr) => KnConverter.Kon.Parser.Parse(expr));
}
function SplitTopLevelExpressions(source) {
  const result = [];
  let start = -1;
  let depth = 0;
  let quote = null;
  let escape = false;
  let pendingAnnotationPrefix = false;
  for (let i = 0;i < source.length; i++) {
    const ch = source[i];
    if (quote != null) {
      if (escape) {
        escape = false;
      } else if (quote === '"' && ch === "\\") {
        escape = true;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === "/" && source[i + 1] === "/") {
      if (depth === 0 && start >= 0) {
        const expr = source.slice(start, i).trim();
        if (isStandaloneAnnotationPrefix(expr, source, i)) {
          pendingAnnotationPrefix = true;
        } else {
          if (pendingAnnotationPrefix && expr.length > 0 && expr.startsWith("#(")) {
            result.push(expr);
            pendingAnnotationPrefix = false;
          } else if (expr.length > 0) {
            result.push(expr);
            pendingAnnotationPrefix = false;
          }
        }
        start = -1;
      }
      while (i < source.length && source[i] !== `
`) {
        i++;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      if (start < 0) {
        start = i;
      }
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      if (depth === 0 && start < 0) {
        start = i;
      }
      depth++;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        const expr = source.slice(start, i + 1).trim();
        if (isStandaloneAnnotationPrefix(expr, source, i + 1)) {
          pendingAnnotationPrefix = true;
          continue;
        }
        if (expr.length > 0) {
          result.push(expr);
        }
        pendingAnnotationPrefix = false;
        start = -1;
      }
      continue;
    }
    if (!/\s/.test(ch) && start < 0) {
      start = i;
    }
    if (depth === 0 && start >= 0 && /\s/.test(ch)) {
      const expr = source.slice(start, i).trim();
      if (isStandaloneAnnotationPrefix(expr, source, i)) {
        pendingAnnotationPrefix = true;
        continue;
      }
      if (pendingAnnotationPrefix && expr.length > 0 && expr.startsWith("#(")) {
        result.push(expr);
        pendingAnnotationPrefix = false;
        start = -1;
        continue;
      }
      if (expr.length > 0) {
        result.push(expr);
      }
      pendingAnnotationPrefix = false;
      start = -1;
    }
  }
  if (start >= 0) {
    const expr = source.slice(start).trim();
    if (expr.length > 0) {
      result.push(expr);
    }
  }
  return result;
}
function isStandaloneAnnotationPrefix(expr, source, nextIndex) {
  if (!expr.startsWith("#(")) {
    return false;
  }
  if (!containsOnlyOneTopLevelForm(expr.slice(1))) {
    return false;
  }
  let index = nextIndex;
  while (index < source.length && /\s/.test(source[index])) {
    index++;
  }
  return source[index] === "(";
}
function containsOnlyOneTopLevelForm(source) {
  let depth = 0;
  let closedAt = -1;
  for (let i = 0;i < source.length; i++) {
    const ch = source[i];
    if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
    } else if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) {
        closedAt = i;
        break;
      }
    }
  }
  if (closedAt < 0) {
    return false;
  }
  return source.slice(closedAt + 1).trim().length === 0;
}
// ../type-system/lib/KonTypeBinder.ts
class TypeBindingDiagnostic {
  Code;
  Message;
  Location;
  constructor(Code, Message, Location) {
    this.Code = Code;
    this.Message = Message;
    this.Location = Location;
  }
}

class TypeBindingResult {
  TypeSystem;
  Diagnostics;
  Functions;
  GenericFunctions;
  EffectHandlers;
  constructor(TypeSystem2, Diagnostics, Functions, GenericFunctions, EffectHandlers) {
    this.TypeSystem = TypeSystem2;
    this.Diagnostics = Diagnostics;
    this.Functions = Functions;
    this.GenericFunctions = GenericFunctions;
    this.EffectHandlers = EffectHandlers;
  }
  get Success() {
    return this.Diagnostics.length === 0;
  }
  ApplyEffectHandler(row, handlerName) {
    const handler = this.EffectHandlers.find((candidate) => candidate.Name === handlerName);
    if (handler == null) {
      this.Diagnostics.push(new TypeBindingDiagnostic("KTB096", `Unknown effect handler '${handlerName}'.`, handlerName));
      return row;
    }
    const residual = row.Subtract(handler.HandledEffects);
    if (residual.Effects.length === row.Effects.length && residual.IsOpen === row.IsOpen) {
      this.Diagnostics.push(new TypeBindingDiagnostic("KTB097", `Effect handler '${handlerName}' does not handle any residual effects in ${row.ToDisplayString()}.`, handlerName));
    }
    return residual;
  }
  ApplyEffectHandlers(row, handlerNames) {
    return handlerNames.reduce((current, name) => this.ApplyEffectHandler(current, name), row);
  }
  ValidateClosedEffectBoundary(functionName, residualEffects) {
    if (!residualEffects.IsEmpty) {
      this.Diagnostics.push(new TypeBindingDiagnostic("KTB098", `Boundary '${functionName}' has unhandled residual effects ${residualEffects.ToDisplayString()}.`, functionName));
    }
  }
}

class KonTypeBinder {
  typeSystem;
  diagnostics = [];
  activeTypeParameters = new Map;
  functions = {};
  genericFunctions = {};
  effectHandlers = [];
  pendingFunctionEffectRow = null;
  pendingHandler = null;
  constructor(typeSystem = new TypeSystem) {
    this.typeSystem = typeSystem;
  }
  static BindSource(source) {
    return new KonTypeBinder().Bind(ParseKonSourceItems(source));
  }
  Bind(declarations) {
    for (const declaration of declarations) {
      this.BindTopLevelDeclaration(declaration);
    }
    return new TypeBindingResult(this.typeSystem, this.diagnostics.slice(), { ...this.functions }, { ...this.genericFunctions }, this.effectHandlers.slice());
  }
  BindTopLevelDeclaration(declaration) {
    if (!(declaration instanceof KnKnot)) {
      this.AddDiagnostic("KTB002", "Top-level type-system declarations must be knot nodes.", String(declaration));
      return;
    }
    this.ReadEffectPrefixes(declaration);
    const keyword = getWord(declaration.Core);
    if (this.pendingHandler != null && keyword !== "fn") {
      this.AddDiagnostic("KTB095", "Effect handler declaration must be followed by a function declaration.", keyword);
      this.ClearPendingFunctionMetadata();
    }
    switch (keyword) {
      case "type":
        this.BindTypeDeclaration(declaration);
        break;
      case "fn":
        this.BindFunctionDeclaration(declaration);
        break;
      case "class":
        this.BindClassDeclaration(declaration, false);
        break;
      case "trait":
        this.BindClassDeclaration(declaration, true);
        break;
      case "enum":
        this.BindEnumDeclaration(declaration);
        break;
      case "scalar":
        this.BindScalarDeclaration(declaration);
        break;
      case "mixin":
        this.BindSchemaMixinDeclaration(declaration);
        break;
      case "schema":
        this.BindSchemaDeclaration(declaration);
        break;
      case "relation":
        this.BindRelationDeclaration(declaration);
        break;
      case "attr":
        this.BindTopLevelAttributeDeclaration(declaration);
        break;
      default:
        this.AddDiagnostic("KTB002", `Unsupported top-level type-system declaration '${keyword ?? "<missing>"}'.`, keyword);
        break;
    }
  }
  BindTypeDeclaration(knot) {
    const name = this.GetDeclarationName(knot, "type");
    if (name == null) {
      return;
    }
    const bodyItems = knot.Body ?? [];
    const genericParams = this.CreateTypeParameters(knot.GenericParams, bodyItems);
    const previous = this.PushTypeParameters(genericParams);
    try {
      const members = [];
      let isOpen = readBoolAttr(knot, "open", true);
      for (const item of bodyItems) {
        this.ReadEffectPrefixes(item);
        if (this.IsClosedRowMarker(item)) {
          isOpen = false;
          continue;
        }
        const spread = this.TryBindSpreadMember(name, item, genericParams);
        if (spread != null) {
          members.push(spread);
          continue;
        }
        const member = this.BindMember(name, item);
        if (member != null) {
          members.push(member);
        }
      }
      const mergeTargets = readArrayAttr(knot, "merge");
      if (mergeTargets != null) {
        this.BindMergedRowType(name, mergeTargets, members, isOpen);
        return;
      }
      if (genericParams.length > 0) {
        this.typeSystem.DefineGenericRowType(name, genericParams, members, isOpen);
      } else {
        this.typeSystem.DefineRowType(name, members, isOpen);
      }
    } finally {
      this.RestoreTypeParameters(previous);
    }
  }
  BindMergedRowType(name, mergeTargets, declaredMembers, isOpen) {
    const rows = [];
    let hasError = false;
    for (const target of mergeTargets) {
      const targetName = getTypeName(target);
      const row = targetName == null ? null : this.TryRequireRow(targetName);
      if (targetName == null || row == null) {
        this.AddDiagnostic("KTB021", `Row merge target '${targetName ?? "<invalid>"}' is not defined.`, targetName);
        hasError = true;
        continue;
      }
      rows.push(row);
    }
    if (hasError) {
      return;
    }
    const mergedMembers = rows.reduce((members, row) => members.concat(row.Members), []).concat(declaredMembers);
    const mergedOpen = rows.some((row) => row.IsOpen) || isOpen;
    this.typeSystem.DefineRowType(name, mergedMembers, mergedOpen);
  }
  BindClassDeclaration(knot, isTrait) {
    const name = this.GetDeclarationName(knot, isTrait ? "trait" : "class");
    if (name == null) {
      return;
    }
    const bodyItems = knot.Body ?? [];
    const genericParams = this.CreateTypeParameters(knot.GenericParams, bodyItems);
    const previous = this.PushTypeParameters(genericParams);
    try {
      const members = [];
      for (const item of bodyItems) {
        this.ReadEffectPrefixes(item);
        const member = this.BindMember(name, item);
        if (member != null) {
          members.push(member);
        }
      }
      const bases = this.ReadBaseReferences(knot, "inherits").concat(this.ReadBaseReferences(knot, "implements"));
      this.typeSystem.DefineClass(name, members, readBoolAttr(knot, "open", true), bases, [], isTrait, genericParams);
    } catch (error) {
      this.AddDiagnostic("KTB030", error?.message ?? String(error), name);
    } finally {
      this.RestoreTypeParameters(previous);
    }
  }
  BindEnumDeclaration(knot) {
    const name = this.GetDeclarationName(knot, "enum");
    if (name == null) {
      return;
    }
    const values = [];
    const seen = new Set;
    for (const item of knot.Body ?? []) {
      if (!(item instanceof KnKnot) || getWord(item.Core) !== "value") {
        this.AddDiagnostic("KTB110", `Enum '${name}' body items must be value declarations.`, name);
        continue;
      }
      const valueName = this.GetDeclarationName(item, "value");
      if (valueName == null) {
        continue;
      }
      if (seen.has(valueName)) {
        this.AddDiagnostic("KTB111", `Enum '${name}' contains duplicate value '${valueName}'.`, valueName);
        continue;
      }
      seen.add(valueName);
      const valueMetadata = this.ReadTypeMetadata(item);
      values.push({
        Name: valueName,
        Code: readConfigValue(item, "code"),
        Metadata: valueMetadata
      });
    }
    if (values.length === 0) {
      this.AddDiagnostic("KTB112", `Enum '${name}' must declare at least one value.`, name);
      return;
    }
    const reprName = getTypeName(readConfigValue(knot, "repr"));
    const representation = reprName == null ? this.typeSystem.Registry.String : this.TryResolvePrimitiveAlias(reprName) ?? this.typeSystem.Registry.TryGet(reprName);
    if (representation == null) {
      this.AddDiagnostic("KTB113", `Enum '${name}' representation '${reprName}' is not defined.`, reprName);
      return;
    }
    try {
      this.typeSystem.DefineEnum(name, values, {
        Representation: representation,
        Metadata: this.ReadTypeMetadata(knot)
      });
    } catch (error) {
      this.AddDiagnostic("KTB114", error?.message ?? String(error), name);
    }
  }
  BindScalarDeclaration(knot) {
    const name = this.GetDeclarationName(knot, "scalar");
    if (name == null) {
      return;
    }
    const reprName = getTypeName(readConfigValue(knot, "repr"));
    const representation = reprName == null ? this.typeSystem.Registry.String : this.TryResolvePrimitiveAlias(reprName) ?? this.typeSystem.Registry.TryGet(reprName);
    if (representation == null) {
      this.AddDiagnostic("KTB115", `Scalar '${name}' representation '${reprName}' is not defined.`, reprName);
      return;
    }
    try {
      this.typeSystem.DefineBrandedScalar(name, representation, this.ReadTypeMetadata(knot));
    } catch (error) {
      this.AddDiagnostic("KTB116", error?.message ?? String(error), name);
    }
  }
  BindSchemaMixinDeclaration(knot) {
    const name = this.GetDeclarationName(knot, "mixin");
    if (name == null) {
      return;
    }
    const members = this.BindSchemaMembers(name, knot.Body ?? []);
    try {
      this.typeSystem.DefineSchemaMixin(name, members, readBoolConfig(knot, "open", true), this.ReadTypeMetadata(knot));
    } catch (error) {
      this.AddDiagnostic("KTB120", error?.message ?? String(error), name);
    }
  }
  BindSchemaDeclaration(knot) {
    const name = this.GetDeclarationName(knot, "schema");
    if (name == null) {
      return;
    }
    const aliasTarget = getTypeName(readConfigValue(knot, "alias_of"));
    if (aliasTarget != null) {
      this.BindSchemaAliasDeclaration(name, aliasTarget, knot);
      return;
    }
    const members = this.BindSchemaMembers(name, knot.Body ?? []);
    const parent = getTypeName(readConfigValue(knot, "extends"));
    const mixins = readConfigItems(knot, "mixins").map((item) => getTypeName(item)).filter((item) => item != null);
    try {
      this.typeSystem.DefineSchemaType(name, members, {
        IsOpen: readBoolConfig(knot, "open", true),
        Parent: parent,
        Mixins: mixins,
        Metadata: this.ReadTypeMetadata(knot)
      });
    } catch (error) {
      this.AddDiagnostic("KTB123", error?.message ?? String(error), name);
    }
  }
  BindSchemaAliasDeclaration(name, aliasTarget, knot) {
    if ((knot.Body?.length ?? 0) > 0 || hasConfigValue(knot, "extends") || hasConfigValue(knot, "mixins")) {
      this.AddDiagnostic("KTB130", `Schema alias '${name}' must not include body, extends, or mixins.`, name);
      return;
    }
    try {
      this.typeSystem.DefineSchemaTypeAlias(name, aliasTarget);
      this.typeSystem.RequireSchemaType(name);
    } catch (error) {
      this.AddDiagnostic("KTB132", error?.message ?? String(error), name);
    }
  }
  BindRelationDeclaration(knot) {
    const name = this.GetDeclarationName(knot, "relation");
    if (name == null) {
      return;
    }
    const aliasTarget = getTypeName(readConfigValue(knot, "alias_of"));
    if (aliasTarget != null) {
      this.BindRelationAliasDeclaration(name, aliasTarget, knot);
      return;
    }
    const from = getTypeName(readConfigValue(knot, "from"));
    const to = getTypeName(readConfigValue(knot, "to"));
    if (from == null || to == null) {
      this.AddDiagnostic("KTB141", `Relation '${name}' must include from and to schema targets in :{ ... }.`, name);
      return;
    }
    try {
      this.typeSystem.DefineRelation(name, from, to, readBoolConfig(knot, "directed", true), this.ReadTypeMetadata(knot));
    } catch (error) {
      this.AddDiagnostic("KTB140", error?.message ?? String(error), name);
    }
  }
  BindRelationAliasDeclaration(name, aliasTarget, knot) {
    if (hasConfigValue(knot, "from") || hasConfigValue(knot, "to")) {
      this.AddDiagnostic("KTB141", `Relation alias '${name}' must not include from or to config.`, name);
      return;
    }
    try {
      this.typeSystem.DefineRelationAlias(name, aliasTarget);
      this.typeSystem.RequireRelation(name);
    } catch (error) {
      this.AddDiagnostic("KTB142", error?.message ?? String(error), name);
    }
  }
  BindTopLevelAttributeDeclaration(knot) {
    const name = this.GetDeclarationName(knot, "attr");
    if (name == null) {
      return;
    }
    const aliasTarget = getTypeName(readConfigValue(knot, "alias_of"));
    if (aliasTarget == null) {
      this.AddDiagnostic("KTB150", `Top-level attr declaration '${name}' must use alias_of in :{ ... }.`, name);
      return;
    }
    const target = this.ParseAttributeAliasTarget(aliasTarget);
    if (target == null) {
      this.AddDiagnostic("KTB151", `Attribute alias '${name}' target must be SchemaName.attributeName.`, aliasTarget);
      return;
    }
    try {
      const schema = this.typeSystem.RequireSchemaType(target.Schema);
      if (!schema.EffectiveRow.Members.some((member) => member.Name === target.Attribute)) {
        this.AddDiagnostic("KTB153", `Schema '${target.Schema}' has no attribute '${target.Attribute}'.`, aliasTarget);
        return;
      }
      this.typeSystem.DefineAttributeAlias(target.Schema, name, target.Attribute);
    } catch (error) {
      this.AddDiagnostic("KTB152", error?.message ?? String(error), name);
    }
  }
  BindFunctionDeclaration(knot) {
    const name = this.GetDeclarationName(knot, "fn");
    if (name == null) {
      this.ClearPendingFunctionMetadata();
      return;
    }
    if (knot.InOutTable == null) {
      this.AddDiagnostic("KTB080", `Function '${name}' must include an in/out table.`, name);
      this.ClearPendingFunctionMetadata();
      return;
    }
    const genericParams = this.CreateTypeParameters(knot.GenericParams, []);
    const previous = this.PushTypeParameters(genericParams);
    try {
      const signature = this.BindFunctionSignature(name, knot.InOutTable, this.pendingFunctionEffectRow);
      this.functions[name] = signature;
      if (genericParams.length > 0) {
        this.genericFunctions[name] = new GenericFunctionTypeSymbol(name, genericParams, signature);
      }
      if (this.pendingHandler != null) {
        this.effectHandlers.push({
          Name: this.pendingHandler.Name,
          FunctionName: name,
          ImplementationFunctionName: name,
          HandledEffects: this.pendingHandler.HandledEffects
        });
      }
    } finally {
      this.RestoreTypeParameters(previous);
      this.ClearPendingFunctionMetadata();
    }
  }
  BindMember(owner, item) {
    if (!(item instanceof KnKnot)) {
      this.AddDiagnostic("KTB040", "Type body item must be a knot node.", String(item));
      return null;
    }
    const keyword = getWord(item.Core);
    switch (keyword) {
      case "method":
      case "op":
        return this.BindMethodMember(owner, item);
      case "field":
        return this.BindFieldMember(owner, item);
      default:
        return null;
    }
  }
  BindSchemaMembers(owner, bodyItems) {
    const members = [];
    for (const item of bodyItems) {
      this.ReadEffectPrefixes(item);
      if (item instanceof KnKnot && getWord(item.Core) === "attr" && hasConfigValue(item, "alias_of")) {
        this.AddDiagnostic("KTB122", "Attribute aliases must be top-level attr declarations, not schema body items.", getTypeName(item.Name) ?? owner);
        continue;
      }
      const member = this.BindMember(owner, item);
      if (member != null) {
        members.push(member);
      }
    }
    return members;
  }
  BindMethodMember(owner, knot) {
    const memberInfo = this.ReadMemberName(owner, knot);
    const inOutTable = this.GetMemberInOutTable(knot);
    if (memberInfo == null || inOutTable == null) {
      this.AddDiagnostic("KTB042", "Method declaration must include a member name and in/out table.", owner);
      return null;
    }
    const effectContext = this.pendingFunctionEffectRow;
    const signature = this.BindFunctionSignature(`${memberInfo.origin}::${memberInfo.name}`, inOutTable, effectContext);
    this.pendingFunctionEffectRow = null;
    const member = RowMemberBuilder.Method(memberInfo.origin, memberInfo.name, signature, readQualifier(knot), readAccess(knot), this.ReadTypeMetadata(knot));
    return effectContext == null ? member : member.WithEffectContext(effectContext);
  }
  BindFieldMember(owner, knot) {
    const memberInfo = this.ReadMemberName(owner, knot);
    if (memberInfo == null) {
      this.AddDiagnostic("KTB043", "Field declaration must include a member name.", owner);
      return null;
    }
    const fieldType = firstTypePrefix(knot) ?? this.firstInOutInput(knot) ?? this.typeSystem.Registry.Any;
    return RowMemberBuilder.Field(memberInfo.origin, memberInfo.name, this.BindTypeNode(fieldType), readQualifier(knot), readAccess(knot), this.ReadTypeMetadata(knot));
  }
  BindFunctionSignature(name, table, effectRow) {
    const rows = table.RawValue;
    const inputNodes = rows[0]?.[2] ?? [];
    const outputNodes = rows[1]?.[2] ?? [];
    const parameters = inputNodes.map((node) => this.BindInOutItemType(node));
    const outputs = outputNodes.length === 0 ? [this.typeSystem.Registry.Never] : outputNodes.map((node) => this.BindInOutItemType(node));
    return new FunctionTypeSymbol(name, parameters, outputs, effectRow ?? EffectRow.EmptyClosed);
  }
  BindInOutItemType(node) {
    const typePrefix = firstTypePrefix(node);
    return this.BindTypeNode(typePrefix ?? node);
  }
  BindTypeNode(node) {
    if (node instanceof KnWord) {
      const name2 = node.Value;
      const parameter = this.activeTypeParameters.get(name2);
      if (parameter != null && node.GenericArgs == null) {
        return parameter;
      }
      const primitive = this.TryResolvePrimitiveAlias(name2);
      if (primitive != null && node.GenericArgs == null) {
        return primitive;
      }
      const typeArgs = (node.GenericArgs ?? []).map((arg) => this.BindTypeNode(arg));
      const registered = this.typeSystem.Registry.TryGet(name2);
      if (registered != null) {
        if (typeArgs.length === 0) {
          return registered;
        }
        if (registered instanceof GenericRowTypeSymbol) {
          try {
            return registered.Instantiate(typeArgs);
          } catch (error) {
            this.AddDiagnostic("KTB101", error?.message ?? String(error), name2);
            return new TypeReferenceSymbol(name2, typeArgs);
          }
        }
        if (registered instanceof ClassTypeSymbol) {
          if (registered.TypeParameters.length === 0) {
            this.AddDiagnostic("KTB100", `Type '${name2}' is not generic.`, name2);
            return new TypeReferenceSymbol(name2, typeArgs);
          }
          try {
            return this.typeSystem.InstantiateGenericClass(registered, ...typeArgs);
          } catch (error) {
            this.AddDiagnostic("KTB101", error?.message ?? String(error), name2);
            return new TypeReferenceSymbol(name2, typeArgs);
          }
        }
        this.AddDiagnostic("KTB100", `Type '${name2}' is not generic.`, name2);
        return new TypeReferenceSymbol(name2, typeArgs);
      }
      return new TypeReferenceSymbol(name2, typeArgs);
    }
    const name = getTypeName(node);
    return name == null ? new TypeReferenceSymbol(String(node)) : this.BindTypeNode(new KnWord(name));
  }
  TryResolvePrimitiveAlias(name) {
    switch (name) {
      case "Unit":
      case "unit":
      case "Never":
      case "never":
        return this.typeSystem.Registry.Never;
      case "Int":
      case "int":
        return this.typeSystem.Registry.Int;
      case "String":
      case "str":
        return this.typeSystem.Registry.String;
      case "Bool":
      case "bool":
        return this.typeSystem.Registry.Bool;
      case "Any":
      case "any":
        return this.typeSystem.Registry.Any;
      default:
        return null;
    }
  }
  ReadEffectPrefixes(node) {
    const knots = node?.PreModifiers?.Knots ?? [];
    for (const marker of knots) {
      if (getWord(marker.Core) !== "effect") {
        continue;
      }
      const command = getWord(marker.Next?.Core);
      switch (command) {
        case "decl":
          {
            const effectName = getTypeName(marker.Next?.Name ?? marker.Next?.Next?.Core);
            if (effectName == null) {
              this.AddDiagnostic("KTB091", "Effect declaration must use #(effect decl #Name).", command);
            } else {
              this.typeSystem.Registry.GetOrCreateEffect(effectName);
            }
          }
          break;
        case "row":
          this.pendingFunctionEffectRow = this.BindEffectRowMarker(marker.Next);
          break;
        case "handler":
          this.pendingHandler = this.BindEffectHandlerPrefix(marker.Next);
          break;
        default:
          this.AddDiagnostic("KTB090", `Unsupported effect prefix command '${command ?? "<missing>"}'.`, command);
          break;
      }
    }
  }
  BindEffectHandlerPrefix(commandNode) {
    const handlerName = getTypeName(commandNode?.Name ?? commandNode?.Next?.Core);
    const handlesNode = commandNode?.Next;
    if (handlerName == null || getWord(handlesNode?.Core) !== "handles") {
      this.AddDiagnostic("KTB092", "Effect handler declaration must use #(effect handler #handlerName handles :[ ... ]).", handlerName);
      return null;
    }
    return {
      Name: handlerName,
      HandledEffects: this.BindEffectRowMarker(handlesNode)
    };
  }
  BindEffectRowMarker(commandNode) {
    const items = commandNode?.Body ?? commandNode?.Next?.Body ?? [];
    const effects = items.map((item) => getTypeName(item)).filter((name) => name != null).map((name) => this.typeSystem.Registry.GetOrCreateEffect(name));
    return EffectRow.FromEffects(effects);
  }
  CreateTypeParameters(genericParams, bodyItems) {
    const params = genericParams?.Value?.[0] ?? [];
    const rowParameterNames = new Set;
    for (const item of bodyItems) {
      const spreadName = this.TryReadSpreadName(item);
      if (spreadName != null && spreadName.toLowerCase() !== "never") {
        rowParameterNames.add(spreadName);
      }
    }
    return params.map((param) => getTypeName(param)).filter((name) => name != null).map((name) => ({ Name: name, IsRowParameter: rowParameterNames.has(name) }));
  }
  TryBindSpreadMember(owner, item, parameters) {
    const spreadName = this.TryReadSpreadName(item);
    if (spreadName == null || spreadName.toLowerCase() === "never") {
      return null;
    }
    const parameter = parameters.find((p) => p.Name === spreadName);
    if (parameter != null) {
      return RowMemberBuilder.Spread(owner, spreadName, parameter);
    }
    const effect = this.typeSystem.Registry.TryGetEffect(spreadName);
    if (effect != null) {
      return RowMemberBuilder.Spread(owner, spreadName, effect);
    }
    this.AddDiagnostic("KTB061", `Spread parameter '${spreadName}' must be declared as a generic parameter or effect.`, spreadName);
    return null;
  }
  IsClosedRowMarker(item) {
    return this.TryReadSpreadName(item)?.toLowerCase() === "never";
  }
  TryReadSpreadName(item) {
    if (item instanceof KnQuoteWrapper && item._Type === "RowSpread" /* RowSpread */) {
      return getTypeName(item.Inner);
    }
    if (item instanceof KnWord && item.Value.startsWith("..")) {
      return item.Value.slice(2);
    }
    if (item instanceof KnKnot && getWord(item.Core) === "spread") {
      return getTypeName(item.Next?.Core);
    }
    return null;
  }
  ReadBaseReferences(knot, attrName) {
    const attr = knot.Attr?.[attrName];
    if (attr == null) {
      return [];
    }
    const items = Array.isArray(attr) ? attr : [attr];
    return items.map((item) => {
      if (item instanceof KnUnorderedMap) {
        const typeName = getTypeName(item.type);
        if (typeName == null) {
          this.AddDiagnostic("KTB070", "Inheritance metadata map requires a type entry.", String(item));
          return null;
        }
        return {
          Name: typeName,
          Inheritance: parseInheritanceKind(getTypeName(item.mode)),
          Access: parseAccessModifier(getTypeName(item.visibility))
        };
      }
      const name = getTypeName(item);
      if (name == null) {
        this.AddDiagnostic("KTB071", "Base reference must be a type name or metadata map.", String(item));
        return null;
      }
      return {
        Name: name,
        Inheritance: "real" /* Real */,
        Access: "public" /* Public */
      };
    }).filter((item) => item?.Name != null);
  }
  ReadMemberName(owner, knot) {
    if (knot.Name instanceof KnWord) {
      return {
        name: knot.Name.Value,
        origin: knot.Name.SourceQualifier ?? owner
      };
    }
    const metadataName = this.ReadMetadataMemberName(knot);
    if (metadataName != null) {
      return {
        name: metadataName.name,
        origin: metadataName.origin ?? owner
      };
    }
    return null;
  }
  ReadMetadataMemberName(knot) {
    if (!(knot.Metadata instanceof Map)) {
      return null;
    }
    const first = knot.Metadata.keys().next();
    if (first.done) {
      return null;
    }
    const key = first.value;
    if (key instanceof KnWord) {
      return { name: key.Value, origin: key.SourceQualifier };
    }
    const name = getTypeName(key);
    return name == null ? null : { name };
  }
  GetMemberInOutTable(knot) {
    return knot.InOutTable ?? knot.Next?.InOutTable ?? null;
  }
  GetDeclarationName(knot, keyword) {
    if (knot.Name instanceof KnWord) {
      return knot.Name.Value;
    }
    this.AddDiagnostic("KTB010", `${keyword} declaration must include a symbol name.`, keyword);
    return null;
  }
  ParseAttributeAliasTarget(target) {
    const index = target.lastIndexOf(".");
    if (index <= 0 || index === target.length - 1) {
      return null;
    }
    return {
      Schema: target.slice(0, index),
      Attribute: target.slice(index + 1)
    };
  }
  ReadTypeMetadata(knot) {
    const metadata = {
      ...knot.Attr ?? {},
      ...readConfigMap(knot) ?? {}
    };
    if (knot.Metadata instanceof Map) {
      for (const [key, value] of knot.Metadata.entries()) {
        const name = getTypeName(key);
        if (name != null) {
          metadata[name] = value;
        }
      }
    }
    const sourceAnnotations = this.ReadSourceAnnotations(knot);
    if (sourceAnnotations != null) {
      metadata.source_annotations = sourceAnnotations;
    }
    return metadata;
  }
  ReadSourceAnnotations(knot) {
    const sourceAnnotations = {};
    if (hasModifierContent(knot.PreModifiers)) {
      sourceAnnotations.PreModifiers = knot.PreModifiers;
    }
    if (hasModifierContent(knot.PostModifiers)) {
      sourceAnnotations.PostModifiers = knot.PostModifiers;
    }
    return Object.keys(sourceAnnotations).length === 0 ? null : sourceAnnotations;
  }
  firstInOutInput(knot) {
    const rows = knot.InOutTable?.RawValue;
    return rows?.[0]?.[2]?.[0] ?? null;
  }
  TryRequireRow(name) {
    const symbol = this.typeSystem.Registry.TryGet(name);
    return symbol instanceof RowTypeSymbol ? symbol : null;
  }
  PushTypeParameters(parameters) {
    const previous = new Map(this.activeTypeParameters);
    this.activeTypeParameters.clear();
    for (const parameter of parameters) {
      this.activeTypeParameters.set(parameter.Name, parameter);
    }
    return previous;
  }
  RestoreTypeParameters(previous) {
    this.activeTypeParameters.clear();
    for (const [name, parameter] of previous.entries()) {
      this.activeTypeParameters.set(name, parameter);
    }
  }
  ClearPendingFunctionMetadata() {
    this.pendingFunctionEffectRow = null;
    this.pendingHandler = null;
  }
  AddDiagnostic(code, message, location) {
    this.diagnostics.push(new TypeBindingDiagnostic(code, message, location));
  }
}
function firstTypePrefix(node) {
  return node?.PreModifiers?.Identifiers?.[0] ?? node?.Core?.PreModifiers?.Identifiers?.[0] ?? null;
}
function getWord(node) {
  if (node instanceof KnWord) {
    return node.Value;
  }
  if (node instanceof KnSymbol) {
    return node.Value;
  }
  if (typeof node === "string") {
    return node;
  }
  return null;
}
function getTypeName(node) {
  if (node instanceof KnWord) {
    return node.GetFullNameStr();
  }
  if (node instanceof KnSymbol) {
    return node.Value;
  }
  if (typeof node === "string") {
    return node;
  }
  return null;
}
function readArrayAttr(knot, attrName) {
  const attr = knot.Attr?.[attrName];
  return Array.isArray(attr) ? attr : null;
}
function readConfigMap(knot) {
  if (knot.Conf == null) {
    return null;
  }
  const result = {};
  for (const [key, value] of Object.entries(knot.Conf)) {
    if (typeof value !== "function") {
      result[key] = value;
    }
  }
  return result;
}
function readConfigValue(knot, name) {
  const conf = readConfigMap(knot);
  return conf?.[name] ?? knot.Attr?.[name];
}
function hasConfigValue(knot, name) {
  return readConfigValue(knot, name) != null;
}
function readConfigItems(knot, name) {
  const value = readConfigValue(knot, name);
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
function readBoolConfig(knot, name, defaultValue) {
  return readBoolValue(readConfigValue(knot, name), defaultValue);
}
function readBoolAttr(knot, attrName, defaultValue) {
  return readBoolValue(knot.Attr?.[attrName], defaultValue);
}
function readBoolValue(value, defaultValue) {
  if (value == null) {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const name = getTypeName(value);
  if (name != null) {
    switch (name.toLowerCase()) {
      case "true":
        return true;
      case "false":
        return false;
    }
  }
  return Boolean(value);
}
function hasModifierContent(group) {
  if (group == null) {
    return false;
  }
  return (group.Identifiers?.length ?? 0) > 0 || (group.NamedValues?.size ?? 0) > 0 || (group.Knots?.length ?? 0) > 0 || group.UnorderedMap != null || group.OrderedMap != null || group.Vector != null;
}
function readQualifier(knot) {
  const raw = getTypeName(knot.Attr?.qualifier ?? knot.Attr?.mode);
  switch (raw?.toLowerCase()) {
    case "virtual":
      return "virtual" /* Virtual */;
    case "final":
      return "final" /* Final */;
    case "override":
      return "override" /* Override */;
    case "inherit":
      return "inherit" /* Inherit */;
    default:
      return "default" /* Default */;
  }
}
function readAccess(knot) {
  return parseAccessModifier(getTypeName(knot.Attr?.visibility ?? knot.Attr?.access));
}
function parseInheritanceKind(value) {
  return value?.toLowerCase() === "virtual" ? "virtual" /* Virtual */ : "real" /* Real */;
}
function parseAccessModifier(value) {
  switch (value?.toLowerCase()) {
    case "private":
      return "private" /* Private */;
    case "protected":
    case "protect":
      return "protected" /* Protected */;
    case "internal":
      return "internal" /* Internal */;
    default:
      return "public" /* Public */;
  }
}
// ../type-system/lib/KonTypeChecker.ts
class TypeCheckingResult {
  Binding;
  Diagnostics;
  constructor(Binding, Diagnostics) {
    this.Binding = Binding;
    this.Diagnostics = Diagnostics;
  }
  get TypeSystem() {
    return this.Binding.TypeSystem;
  }
  get Functions() {
    return this.Binding.Functions;
  }
  get Success() {
    return this.Diagnostics.length === 0;
  }
}

class KonTypeChecker {
  binding;
  diagnostics;
  constructor(binding) {
    this.binding = binding;
    this.diagnostics = binding.Diagnostics.slice();
  }
  static CheckSource(source) {
    const nodes = ParseKonSourceItems(source);
    const binding = new KonTypeBinder().Bind(nodes.filter(isTypeSystemDeclarationOrFunction));
    const checker = new KonTypeChecker(binding);
    checker.Check(nodes.filter(isFunctionDeclaration));
    checker.CheckClassBodies(nodes.filter(isClassDeclaration));
    return new TypeCheckingResult(binding, checker.diagnostics);
  }
  Check(functionDeclarations) {
    for (const node of functionDeclarations) {
      if (node instanceof KnKnot) {
        this.CheckFunction(node);
      }
    }
  }
  CheckFunction(fn) {
    const functionName = fn.Name?.Value;
    const signature = functionName == null ? null : this.binding.Functions[functionName];
    if (signature == null) {
      return;
    }
    const environment = this.BuildParameterEnvironment(fn, signature);
    let last = null;
    let residualEffects = EffectRow.EmptyClosed;
    for (const bodyItem of fn.Body ?? []) {
      if (this.IsPostfixEffectHandle(bodyItem)) {
        for (const handlerName of this.ReadHandlerPostfixes(bodyItem)) {
          residualEffects = this.ApplyHandler(residualEffects, handlerName, String(handlerName));
        }
        continue;
      }
      last = this.CheckExpression(bodyItem, environment, signature.EffectRow);
      if (last != null) {
        residualEffects = residualEffects.Union(last.EffectRow);
      }
    }
    if (last != null && !this.AreOutputStacksCompatible(last.Outputs, signature.Outputs)) {
      this.AddDiagnostic("KTC040", `Return expression output stack '${formatTypeList(last.Outputs)}' is not compatible with expected '${formatTypeList(signature.Outputs)}'.`, last.Location);
    }
    if (!residualEffects.IsSubsetOf(signature.EffectRow)) {
      this.AddDiagnostic("KTC050", `Function '${functionName}' has unhandled residual effects ${residualEffects.Subtract(signature.EffectRow).ToDisplayString()}.`, functionName);
    }
  }
  BuildParameterEnvironment(fn, signature) {
    const environment = new Map;
    const rows = fn.InOutTable?.RawValue;
    const inputs = rows?.[0]?.[2] ?? [];
    for (let i = 0;i < inputs.length; i++) {
      const input = inputs[i];
      const parameterName = getWord(input) ?? `arg${i}`;
      const parameterType = firstTypePrefix(input) != null ? this.ResolveTypeNode(firstTypePrefix(input)) : signature.Parameters[i] ?? this.binding.TypeSystem.Registry.Any;
      environment.set(parameterName, parameterType);
    }
    return environment;
  }
  CheckClassBodies(classDeclarations) {
    for (const declaration of classDeclarations) {
      if (!(declaration instanceof KnKnot) || !(declaration.Name instanceof KnWord)) {
        continue;
      }
      const classType = this.ResolveTypeName(declaration.Name.Value);
      if (!(classType instanceof ClassTypeSymbol)) {
        continue;
      }
      for (const member of declaration.Body ?? []) {
        if (!(member instanceof KnKnot)) {
          continue;
        }
        const keyword = getWord(member.Core);
        if (keyword === "method") {
          this.CheckClassMethodBody(classType, member);
        } else if (keyword === "new") {
          this.CheckConstructorBody(classType, member);
        } else if (keyword === "prop") {
          this.CheckPropertyBody(classType, member);
        }
      }
    }
  }
  CheckClassMethodBody(classType, member) {
    const memberName = getTypeName(member.Name);
    const typedMember = memberName == null ? null : classType.DeclaredRows.EnumerateByName(memberName).find((candidate) => candidate.IsMethod);
    if (!(typedMember?.Type instanceof FunctionTypeSymbol) || member.Body == null) {
      return;
    }
    const environment = this.BuildMemberEnvironment(classType, member, typedMember.Type);
    this.CheckBodyAgainstSignature(member.Body, environment, typedMember.Type, {
      CurrentClass: classType,
      InClassBody: true
    }, `${classType.Name}.${memberName}`);
  }
  CheckConstructorBody(classType, member) {
    if (member.Body == null) {
      return;
    }
    const environment = this.BuildMemberEnvironment(classType, member, new FunctionTypeSymbol(`${classType.Name}::new`, [], [classType]));
    for (const bodyItem of member.Body) {
      this.CheckExpression(bodyItem, environment, EffectRow.EmptyClosed, {
        CurrentClass: classType,
        InClassBody: true
      });
    }
  }
  CheckPropertyBody(classType, member) {
    const propertyName = getTypeName(member.Name);
    let current = member.Next;
    while (current != null) {
      const section = getWord(current.Core);
      if (section === "get" && current.Body != null) {
        const getter = classType.DeclaredRows.EnumerateByName(`get_${propertyName}`).find((candidate) => candidate.IsMethod) ?? classType.DeclaredRows.EnumerateByName(propertyName).find((candidate) => candidate.IsMethod);
        const signature = getter?.Type instanceof FunctionTypeSymbol ? getter.Type : null;
        const environment = this.BuildMemberEnvironment(classType, current, signature ?? new FunctionTypeSymbol(`${classType.Name}::get_${propertyName}`, [], [this.binding.TypeSystem.Registry.Any]));
        if (signature == null) {
          for (const bodyItem of current.Body) {
            this.CheckExpression(bodyItem, environment, EffectRow.EmptyClosed, {
              CurrentClass: classType,
              InClassBody: true
            });
          }
          current = current.Next;
          continue;
        }
        this.CheckBodyAgainstSignature(current.Body, environment, signature, {
          CurrentClass: classType,
          InClassBody: true
        }, `${classType.Name}.${propertyName}.get`);
      } else if (section === "set" && current.Body != null) {
        const setter = classType.DeclaredRows.EnumerateByName(`set_${propertyName}`).find((candidate) => candidate.IsMethod) ?? classType.DeclaredRows.EnumerateByName(propertyName).find((candidate) => candidate.IsMethod);
        const signature = setter?.Type instanceof FunctionTypeSymbol ? setter.Type : new FunctionTypeSymbol(`${classType.Name}::set_${propertyName}`, [this.binding.TypeSystem.Registry.Any], [this.binding.TypeSystem.Registry.Never]);
        const environment = this.BuildMemberEnvironment(classType, current, signature);
        for (const bodyItem of current.Body) {
          this.CheckExpression(bodyItem, environment, signature.EffectRow, {
            CurrentClass: classType,
            InClassBody: true
          });
        }
      }
      current = current.Next;
    }
  }
  BuildMemberEnvironment(classType, member, signature) {
    const environment = new Map;
    environment.set("self", classType);
    const rows = member.InOutTable?.RawValue;
    const inputs = rows?.[0]?.[2] ?? [];
    const offset = this.SignatureHasImplicitReceiver(classType, signature, inputs.length) ? 1 : 0;
    for (let i = 0;i < inputs.length; i++) {
      const input = inputs[i];
      const parameterName = getWord(input) ?? `arg${i}`;
      const parameterType = firstTypePrefix(input) != null ? this.ResolveTypeNode(firstTypePrefix(input)) : signature.Parameters[i + offset] ?? this.binding.TypeSystem.Registry.Any;
      environment.set(parameterName, parameterType);
    }
    return environment;
  }
  SignatureHasImplicitReceiver(classType, signature, inputCount) {
    if (signature.Parameters.length !== inputCount + 1) {
      return false;
    }
    const receiver = signature.Parameters[0];
    return receiver === classType || receiver.Name === classType.Name || receiver.Name === "self";
  }
  CheckBodyAgainstSignature(body, environment, signature, context, locationPrefix) {
    let last = null;
    for (const bodyItem of body) {
      last = this.CheckExpression(bodyItem, environment, signature.EffectRow, context);
    }
    if (last != null && !this.AreOutputStacksCompatible(last.Outputs, signature.Outputs, true)) {
      this.AddDiagnostic("KTC040", `Return expression output stack '${formatTypeList(last.Outputs)}' is not compatible with expected '${formatTypeList(signature.Outputs)}'.`, `${locationPrefix}: ${last.Location}`);
    }
  }
  CheckExpression(node, environment, activeEffectRow, context = {}) {
    const literalType = this.GetLiteralType(node);
    if (literalType != null) {
      return single(literalType, String(node), EffectRow.EmptyClosed);
    }
    if (node instanceof KnKnot) {
      if (getWord(node.Core) === "set") {
        return this.CheckSet(node, environment, activeEffectRow, context);
      }
      if (getWord(node.Core) === "perform") {
        return this.CheckPerform(node, environment, context);
      }
      return this.CheckChain(node, environment, activeEffectRow, context);
    }
    if (node instanceof KnWord) {
      const variableType = environment.get(node.Value);
      if (variableType != null) {
        return single(variableType, node.Value, EffectRow.EmptyClosed);
      }
      const functionType = this.binding.Functions[node.Value];
      if (functionType != null) {
        return { Outputs: functionType.Outputs, Location: node.Value, EffectRow: functionType.EffectRow };
      }
      const genericFunction = this.binding.GenericFunctions[node.Value];
      if (genericFunction != null) {
        const signature = this.InstantiateGenericFunction(genericFunction, node, [], node.Value);
        return signature == null ? null : { Outputs: signature.Outputs, Location: node.GetFullNameStr(), EffectRow: signature.EffectRow };
      }
      const registered = this.binding.TypeSystem.Registry.TryGet(node.GetFullNameStr());
      if (registered instanceof EnumValueSymbol) {
        return single(registered.Owner, registered.QualifiedName, EffectRow.EmptyClosed);
      }
    }
    return null;
  }
  CheckChain(knot, environment, activeEffectRow, context = {}) {
    if (knot.Next == null) {
      const functionName = getWord(knot.Core);
      const fn = functionName == null ? null : this.binding.Functions[functionName];
      if (fn != null) {
        return { Outputs: fn.Outputs, Location: functionName, EffectRow: fn.EffectRow };
      }
      return this.CheckExpression(knot.Core, environment, activeEffectRow, context);
    }
    let target = this.CheckExpression(knot.Core, environment, activeEffectRow, context);
    let current = knot.Next;
    while (current != null && target != null) {
      target = this.CheckChainSegment(target, current, activeEffectRow, context);
      current = current.Next;
    }
    return target;
  }
  CheckChainSegment(target, segment, activeEffectRow, context = {}) {
    if (segment.CallType === 5 /* StaticIndex */) {
      return this.CheckSlotAccess(target, segment, context);
    }
    if (segment.CallType === 2 /* InstanceCall */) {
      const memberName = getWord(segment.Core);
      if (memberName === "as") {
        return this.CheckProjectionSegment(target, segment);
      }
      return this.CheckReceiverCall(target, segment, activeEffectRow, context);
    }
    return this.CheckFunctionCallSegment(target, segment);
  }
  CheckFunctionCallSegment(target, segment) {
    const functionName = getWord(segment.Core);
    const fn = functionName == null ? null : this.ResolveFunctionSignature(functionName, segment.Core, target.Outputs, `${target.Location} ${functionName}`);
    if (fn == null) {
      return target;
    }
    const location = `${target.Location} ${functionName}`;
    if (!this.AreOutputStacksCompatible(target.Outputs, fn.Parameters)) {
      this.AddDiagnostic("KTC041", `Call '${functionName}' expects input stack '${formatTypeList(fn.Parameters)}' but received '${formatTypeList(target.Outputs)}'.`, location);
      return null;
    }
    return {
      Outputs: fn.Outputs,
      Location: location,
      EffectRow: target.EffectRow.Union(fn.EffectRow)
    };
  }
  CheckSet(knot, environment, activeEffectRow, context) {
    const nodes = this.KnotToArray(knot);
    if (nodes.length < 3) {
      return null;
    }
    const placeNodes = nodes.slice(1, -1);
    const valueNode = nodes[nodes.length - 1]?.Core;
    const value = this.CheckExpression(valueNode, environment, activeEffectRow, context);
    if (value == null) {
      return null;
    }
    if (placeNodes.length === 1 && placeNodes[0]?.Core instanceof KnWord) {
      const targetName = placeNodes[0].Core.Value;
      const targetType = environment.get(targetName);
      if (targetType != null && !this.AreOutputStacksCompatible(value.Outputs, [targetType], true)) {
        this.AddDiagnostic("KTC041", `Assignment '${targetName}' expects value stack '${formatTypeList([targetType])}' but received '${formatTypeList(value.Outputs)}'.`, `set ${targetName}`);
        return null;
      }
      return value;
    }
    let target = this.CheckExpression(placeNodes[0]?.Core, environment, activeEffectRow, context);
    for (let i = 1;i < placeNodes.length && target != null; i++) {
      const place = placeNodes[i];
      if (place.CallType !== 5 /* StaticIndex */) {
        target = this.CheckChainSegment(target, place, activeEffectRow, context);
        continue;
      }
      const memberRef = this.ReadMemberReference(place.Core);
      const location = `${target.Location}.:${memberRef.DisplayName}`;
      const member = this.ResolveMember(target.Outputs[target.Outputs.length - 1], memberRef, false, location, undefined, context);
      if (member == null) {
        return null;
      }
      if (i === placeNodes.length - 1) {
        if (!this.AreOutputStacksCompatible(value.Outputs, [member.Type], true)) {
          this.AddDiagnostic("KTC041", `Assignment '${memberRef.DisplayName}' expects value stack '${formatTypeList([member.Type])}' but received '${formatTypeList(value.Outputs)}'.`, location);
          return null;
        }
        return value;
      }
      target = single(member.Type, location, target.EffectRow);
    }
    return value;
  }
  CheckSlotAccess(target, segment, context = {}) {
    const memberRef = this.ReadMemberReference(segment.Core);
    const location = `${target.Location}.:${memberRef.DisplayName}`;
    const member = this.ResolveMember(target.Outputs[target.Outputs.length - 1], memberRef, false, location, undefined, context);
    return member == null ? null : single(member.Type, location, target.EffectRow);
  }
  CheckReceiverCall(target, segment, activeEffectRow, context = {}) {
    const memberRef = this.ReadMemberReference(segment.Core);
    const location = `${target.Location} ~${memberRef.DisplayName}`;
    const member = this.ResolveMember(target.Outputs[target.Outputs.length - 1], memberRef, true, location, activeEffectRow, context);
    if (member?.Type instanceof FunctionTypeSymbol) {
      return {
        Outputs: member.Type.Outputs,
        Location: location,
        EffectRow: target.EffectRow.Union(member.Type.EffectRow)
      };
    }
    return null;
  }
  CheckPerform(knot, environment, context = {}) {
    const operation = this.ResolvePerformOperation(knot);
    const location = `perform ${operation.DisplayName}`;
    if (operation.Member == null || !(operation.Member.Type instanceof FunctionTypeSymbol)) {
      this.AddDiagnostic("KTC070", `Typed perform operation '${operation.DisplayName}' is not declared.`, location);
      return null;
    }
    const argTypes = this.ReadPerformArgNodes(knot).map((arg) => this.CheckExpression(arg, environment, operation.EffectRow, context)).map((arg) => arg?.Outputs ?? []);
    const actual = [].concat(...argTypes);
    const signature = operation.Member.Type;
    if (!this.AreOutputStacksCompatible(actual, signature.Parameters)) {
      this.AddDiagnostic("KTC071", `Perform '${operation.DisplayName}' expects input stack '${formatTypeList(signature.Parameters)}' but received '${formatTypeList(actual)}'.`, location);
      return null;
    }
    return {
      Outputs: signature.Outputs,
      Location: location,
      EffectRow: operation.EffectRow
    };
  }
  CheckProjectionSegment(target, segment) {
    const targetTypeName = getTypeName(segment.Params?.Value?.[0] ?? segment.InOutTable?.RawValue?.[0]?.[2]?.[0] ?? segment.Next?.Core);
    const location = `${target.Location} ~as ${targetTypeName}`;
    const targetType = this.ResolveTypeName(targetTypeName);
    if (targetType == null) {
      this.AddDiagnostic("KTC020", `Projection target '${targetTypeName}' is not defined.`, location);
      return null;
    }
    const projection = new TypeProjection(target.Outputs[target.Outputs.length - 1], targetType);
    if (!projection.IsValidProjection(this.binding.TypeSystem)) {
      this.AddDiagnostic("KTC020", `Invalid projection: ${target.Outputs[target.Outputs.length - 1].Name} cannot be viewed as ${targetType.Name}.`, location);
      return null;
    }
    return single(new TypeProjection(target.Outputs[target.Outputs.length - 1], targetType), location, target.EffectRow, targetType);
  }
  ResolveMember(type, memberRef, requireMethod, location, activeEffectRow, context = {}) {
    const rows = this.GetRows(type);
    if (rows == null) {
      this.AddDiagnostic("KTC010", `Type '${type?.Name}' does not expose slot '${memberRef.DisplayName}'.`, location);
      return null;
    }
    let candidates = rows.EnumerateByName(memberRef.Name).filter((member) => !member.IsVirtual).filter((member) => memberRef.Origin == null || member.Origin === memberRef.Origin).filter((member) => !requireMethod || member.IsMethod);
    if (activeEffectRow != null && candidates.some((member) => member.EffectContext != null)) {
      candidates = candidates.filter((member) => member.EffectContext == null || member.EffectContext.IsSubsetOf(activeEffectRow));
    }
    if (candidates.length === 0) {
      this.AddDiagnostic("KTC010", `Slot '${memberRef.DisplayName}' is not exposed by type '${type.Name}'.`, location);
      return null;
    }
    if (memberRef.Origin == null && candidates.length > 1 && !(type instanceof ClassTypeSymbol)) {
      const accessKind = requireMethod ? "Receiver call" : "Slot access";
      this.AddDiagnostic("KTC030", `${accessKind} '${memberRef.Name}' is ambiguous across origins: ${candidates.map((member) => member.Origin).join(", ")}.`, location);
      return null;
    }
    const selected = candidates[0];
    if (!this.IsMemberAccessible(type, selected, context)) {
      this.AddDiagnostic("KTC080", `Member '${memberRef.DisplayName}' is not accessible from this context.`, location);
      return null;
    }
    return selected;
  }
  IsMemberAccessible(type, member, context) {
    if (member.Access === "public" /* Public */) {
      return true;
    }
    if (context.InClassBody && context.CurrentClass != null) {
      const owner = type instanceof TypeProjection ? type.SourceType : type;
      if (owner instanceof ClassTypeSymbol && owner.MethodResolutionOrder.includes(context.CurrentClass)) {
        return true;
      }
      if (owner === context.CurrentClass) {
        return true;
      }
    }
    return false;
  }
  ReadMemberReference(node) {
    if (node instanceof KnWord) {
      return {
        Name: node.Value,
        Origin: node.SourceQualifier,
        DisplayName: node.GetFullNameStr()
      };
    }
    const name = getWord(node);
    return { Name: name, Origin: null, DisplayName: name };
  }
  GetRows(type) {
    if (type instanceof TypeProjection) {
      return this.GetRows(type.TargetType);
    }
    if (type instanceof RowTypeSymbol) {
      return type;
    }
    if (type instanceof ClassTypeSymbol) {
      return type.Rows;
    }
    return null;
  }
  ResolveTypeNode(node) {
    if (node instanceof KnWord && node.GenericArgs != null && node.GenericArgs.length > 0) {
      const base = this.ResolveTypeName(node.Value);
      const typeArgs = node.GenericArgs.map((arg) => this.ResolveTypeNode(arg));
      if (base instanceof ClassTypeSymbol) {
        if (base.TypeParameters.length === 0) {
          this.AddDiagnostic("KTC070", `Type '${base.Name}' is not generic.`, node.GetFullNameStr());
          return new TypeReferenceSymbol(node.Value, typeArgs);
        }
        try {
          return this.binding.TypeSystem.InstantiateGenericClass(base, ...typeArgs);
        } catch (error) {
          this.AddDiagnostic("KTC070", error?.message ?? String(error), node.GetFullNameStr());
          return new TypeReferenceSymbol(node.Value, typeArgs);
        }
      }
      return new TypeReferenceSymbol(node.Value, typeArgs);
    }
    return this.ResolveTypeName(getTypeName(node)) ?? new TypeReferenceSymbol(getTypeName(node) ?? String(node));
  }
  ResolveTypeName(name) {
    if (name == null) {
      return null;
    }
    const primitive = this.ResolvePrimitiveAlias(name);
    if (primitive != null) {
      return primitive;
    }
    const registered = this.binding.TypeSystem.Registry.TryGet(name);
    if (registered != null) {
      return registered;
    }
    try {
      return this.binding.TypeSystem.RequireClassSymbol(name);
    } catch {
      return null;
    }
  }
  ResolvePrimitiveAlias(name) {
    switch (name) {
      case "Unit":
      case "unit":
      case "Never":
      case "never":
        return this.binding.TypeSystem.Registry.Never;
      case "Int":
      case "int":
        return this.binding.TypeSystem.Registry.Int;
      case "String":
      case "str":
        return this.binding.TypeSystem.Registry.String;
      case "Bool":
      case "bool":
        return this.binding.TypeSystem.Registry.Bool;
      case "Any":
      case "any":
        return this.binding.TypeSystem.Registry.Any;
      default:
        return null;
    }
  }
  AreOutputStacksCompatible(actual, expected, allowAnyActual = false) {
    if (actual.length !== expected.length) {
      return false;
    }
    for (let i = 0;i < actual.length; i++) {
      if (allowAnyActual && actual[i] === this.binding.TypeSystem.Registry.Any) {
        continue;
      }
      if (!this.binding.TypeSystem.AreTypesCompatible(actual[i], expected[i])) {
        return false;
      }
    }
    return true;
  }
  ApplyHandler(residualEffects, handlerName, location) {
    const handler = this.binding.EffectHandlers.find((candidate) => candidate.Name === handlerName);
    if (handler == null) {
      this.AddDiagnostic("KTC060", `Unknown effect handler '${handlerName}'.`, location);
      return residualEffects;
    }
    const residual = residualEffects.Subtract(handler.HandledEffects);
    if (residual.Effects.length === residualEffects.Effects.length && residual.IsOpen === residualEffects.IsOpen) {
      this.AddDiagnostic("KTC061", `Effect handler '${handlerName}' does not affect residual effects ${residualEffects.ToDisplayString()}.`, location);
    }
    return residual;
  }
  IsPostfixEffectHandle(node) {
    return node instanceof KnKnot && node.CallType === 3 /* PostfixCall */ && getWord(node.Core) === "effect";
  }
  ReadHandlerPostfixes(node) {
    if (!this.IsPostfixEffectHandle(node)) {
      return [];
    }
    const names = [];
    let current = node.Next;
    while (current != null) {
      const name = getTypeName(current.Name ?? current.Core);
      if (name != null && name !== "handle") {
        names.push(name);
      }
      current = current.Next;
    }
    return names;
  }
  ResolveFunctionSignature(functionName, node, actualInputs, location) {
    const generic = this.binding.GenericFunctions[functionName];
    if (generic != null) {
      return this.InstantiateGenericFunction(generic, node, actualInputs, location);
    }
    return this.binding.Functions[functionName] ?? null;
  }
  InstantiateGenericFunction(generic, node, actualInputs, location) {
    const explicitArgs = node instanceof KnWord && node.GenericArgs != null ? node.GenericArgs.map((arg) => this.ResolveTypeNode(arg)) : null;
    const substitutions = new Map;
    if (explicitArgs != null) {
      if (explicitArgs.length !== generic.TypeParameters.length) {
        this.AddDiagnostic("KTC070", `Generic function '${generic.Name}' expects ${generic.TypeParameters.length} type arguments but received ${explicitArgs.length}.`, location);
        return null;
      }
      for (let i = 0;i < generic.TypeParameters.length; i++) {
        substitutions.set(generic.TypeParameters[i].Name, explicitArgs[i]);
      }
    } else {
      for (let i = 0;i < generic.Signature.Parameters.length && i < actualInputs.length; i++) {
        if (!this.InferGenericType(generic.Signature.Parameters[i], actualInputs[i], generic.TypeParameters, substitutions)) {
          this.AddDiagnostic("KTC071", `Generic function '${generic.Name}' cannot infer a consistent type argument for parameter stack '${formatTypeList(generic.Signature.Parameters)}'.`, location);
          return null;
        }
      }
      for (const parameter of generic.TypeParameters) {
        if (!substitutions.has(parameter.Name)) {
          substitutions.set(parameter.Name, this.binding.TypeSystem.Registry.Any);
        }
      }
    }
    return new FunctionTypeSymbol(generic.Signature.Name, generic.Signature.Parameters.map((type) => this.SubstituteGenericType(type, substitutions)), generic.Signature.Outputs.map((type) => this.SubstituteGenericType(type, substitutions)), generic.Signature.EffectRow);
  }
  InferGenericType(expected, actual, parameters, substitutions) {
    const parameter = parameters.find((item) => item.Name === expected.Name);
    if (parameter != null) {
      const existing = substitutions.get(parameter.Name);
      if (existing == null) {
        substitutions.set(parameter.Name, actual);
        return true;
      }
      return this.binding.TypeSystem.AreTypesCompatible(actual, existing) && this.binding.TypeSystem.AreTypesCompatible(existing, actual);
    }
    if (expected instanceof TypeReferenceSymbol && actual instanceof TypeReferenceSymbol) {
      if (expected.BaseName !== actual.BaseName || expected.TypeArguments.length !== actual.TypeArguments.length) {
        return false;
      }
      for (let i = 0;i < expected.TypeArguments.length; i++) {
        if (!this.InferGenericType(expected.TypeArguments[i], actual.TypeArguments[i], parameters, substitutions)) {
          return false;
        }
      }
    }
    return true;
  }
  SubstituteGenericType(type, substitutions) {
    const replacement = substitutions.get(type.Name);
    if (replacement != null) {
      return replacement;
    }
    if (type instanceof TypeReferenceSymbol && type.TypeArguments.length > 0) {
      return new TypeReferenceSymbol(type.BaseName, type.TypeArguments.map((argument) => this.SubstituteGenericType(argument, substitutions)));
    }
    if (type instanceof FunctionTypeSymbol) {
      return new FunctionTypeSymbol(type.Name, type.Parameters.map((parameter) => this.SubstituteGenericType(parameter, substitutions)), type.Outputs.map((output) => this.SubstituteGenericType(output, substitutions)), type.EffectRow);
    }
    return type;
  }
  ResolvePerformOperation(knot) {
    const nameNode = knot.Name ?? this.ReadTupleInputNodes(knot.Params ?? knot.InOutTable)[0];
    const displayName = getTypeName(nameNode) ?? "<missing>";
    if (!(nameNode instanceof KnWord)) {
      return { DisplayName: displayName, Member: null, EffectRow: EffectRow.EmptyClosed };
    }
    const effectName = nameNode.SourceQualifier ?? (nameNode.Qualifiers.length > 0 ? nameNode.Qualifiers.join(".") : null);
    const operationName = nameNode.Value;
    if (effectName == null) {
      return { DisplayName: displayName, Member: null, EffectRow: EffectRow.EmptyClosed };
    }
    const effectType = this.binding.TypeSystem.Registry.TryGet(effectName);
    const effectRow = this.binding.TypeSystem.Registry.GetOrCreateEffect(effectName);
    const row = effectType instanceof RowTypeSymbol ? effectType : null;
    const member = row?.EnumerateByName(operationName).find((candidate) => candidate.IsMethod) ?? null;
    return {
      DisplayName: displayName,
      Member: member,
      EffectRow: EffectRow.FromEffects([effectRow])
    };
  }
  ReadPerformArgNodes(knot) {
    const nodes = this.ReadTupleInputNodes(knot.Params ?? knot.InOutTable);
    return knot.Name == null ? nodes.slice(1) : nodes;
  }
  KnotToArray(knot) {
    const nodes = [];
    let current = knot;
    while (current != null) {
      nodes.push(current);
      current = current.Next;
    }
    return nodes;
  }
  ReadTupleInputNodes(tuple) {
    const rows = tuple?.RawValue;
    return rows?.[0]?.[2] ?? [];
  }
  GetLiteralType(node) {
    if (typeof node === "number") {
      return this.binding.TypeSystem.Registry.Int;
    }
    if (typeof node === "string") {
      return this.binding.TypeSystem.Registry.String;
    }
    if (typeof node === "boolean") {
      return this.binding.TypeSystem.Registry.Bool;
    }
    return null;
  }
  AddDiagnostic(code, message, location) {
    this.diagnostics.push(new TypeBindingDiagnostic(code, message, location));
  }
}
function isTypeSystemDeclarationOrFunction(node) {
  return node instanceof KnKnot && ["type", "class", "trait", "fn"].includes(getWord(node.Core));
}
function isFunctionDeclaration(node) {
  return node instanceof KnKnot && getWord(node.Core) === "fn";
}
function isClassDeclaration(node) {
  return node instanceof KnKnot && ["class", "trait"].includes(getWord(node.Core));
}
function single(type, location, effectRow, projectionTarget) {
  const output = projectionTarget == null ? type : new TypeProjection(type, projectionTarget);
  return { Outputs: [output], Location: location, EffectRow: effectRow, ProjectionTarget: projectionTarget };
}
function formatTypeList(types) {
  return types.length === 0 ? "never" : types.map((type) => type.Name).join(", ");
}
// ../type-system/lib/KonTypedExecutionContext.ts
class TypedValue {
  Type;
  constructor(Type) {
    this.Type = Type;
  }
}

class IntValue extends TypedValue {
  Value;
  constructor(Value, typeSystem) {
    super(resolveRuntimeTypeSystem(typeSystem).Registry.Int);
    this.Value = Value;
  }
}

class StringValue extends TypedValue {
  Value;
  constructor(Value, typeSystem) {
    super(resolveRuntimeTypeSystem(typeSystem).Registry.String);
    this.Value = Value;
  }
}

class BoolValue extends TypedValue {
  Value;
  constructor(Value, typeSystem) {
    super(resolveRuntimeTypeSystem(typeSystem).Registry.Bool);
    this.Value = Value;
  }
}

class ListValue extends TypedValue {
  Elements;
  constructor(Elements, typeSystem) {
    super(resolveRuntimeTypeSystem(typeSystem).Registry.Any);
    this.Elements = Elements;
  }
}

class MapValue extends TypedValue {
  Properties;
  constructor(Properties, typeSystem) {
    super(resolveRuntimeTypeSystem(typeSystem).Registry.Any);
    this.Properties = Properties;
  }
}

class AnyValue extends TypedValue {
  Value;
  constructor(Value, typeSystem) {
    super(resolveRuntimeTypeSystem(typeSystem).Registry.Any);
    this.Value = Value;
  }
}

class FunctionValue extends TypedValue {
  Signature;
  Body;
  constructor(Signature, Body) {
    super(Signature);
    this.Signature = Signature;
    this.Body = Body;
  }
}

class ObjectValue extends TypedValue {
  Class;
  Rows;
  Fields;
  Parents;
  constructor(Class, Rows, Fields, Parents) {
    super(Class.Rows);
    this.Class = Class;
    this.Rows = Rows;
    this.Fields = Fields;
    this.Parents = Parents;
  }
}

class ProjectedObjectValue extends TypedValue {
  Instance;
  TargetType;
  constructor(Instance, TargetType) {
    super(TargetType.Rows);
    this.Instance = Instance;
    this.TargetType = TargetType;
  }
}

class RowImplementation {
  Member;
  Function;
  constructor(Member, Function) {
    this.Member = Member;
    this.Function = Function;
  }
  WithFunction(fn) {
    return new RowImplementation(this.Member, fn);
  }
}

class FieldStorage {
  Member;
  Value;
  constructor(Member, Value) {
    this.Member = Member;
    this.Value = Value;
  }
}

class InvocationContext {
  Execution;
  Self;
  constructor(Execution, Self) {
    this.Execution = Execution;
    this.Self = Self;
  }
  get Context() {
    return this.Execution;
  }
}

class KonTypedExecutionContext {
  TypeSystem;
  static runtimeTypeSystem;
  globals = new Map;
  effectScopes = [];
  constructor(TypeSystem2) {
    this.TypeSystem = TypeSystem2;
    KonTypedExecutionContext.InitializeRuntimeTypes(TypeSystem2);
  }
  static InitializeRuntimeTypes(typeSystem) {
    KonTypedExecutionContext.runtimeTypeSystem = typeSystem;
  }
  static GetRuntimeTypeSystem() {
    if (KonTypedExecutionContext.runtimeTypeSystem == null) {
      KonTypedExecutionContext.runtimeTypeSystem = new TypeSystem;
    }
    return KonTypedExecutionContext.runtimeTypeSystem;
  }
  GetGlobal(name) {
    return this.globals.get(name);
  }
  SetGlobal(name, value) {
    this.globals.set(name, value);
  }
  PushEffectScope(...effects) {
    const row = EffectRow.FromEffects(effects.map((effect) => typeof effect === "string" ? this.TypeSystem.Registry.GetOrCreateEffect(effect) : effect));
    this.effectScopes.push(row);
    let disposed = false;
    return {
      dispose: () => {
        if (disposed) {
          return;
        }
        disposed = true;
        const current = this.effectScopes.pop();
        if (current !== row) {
          throw new Error("Effect scope imbalance detected.");
        }
      }
    };
  }
  Instantiate(className) {
    const classDefinition = this.TypeSystem.RequireClass(className);
    const rows = {};
    const fields = this.CreateFieldStorage(classDefinition.Type);
    const parents = this.CreateParentStorage(classDefinition.Type);
    const pendingTraits = [];
    const pendingVirtualBases = [];
    const inheritPlaceholders = [];
    const nextMethodBodyByMember = new Map;
    for (const member of classDefinition.Type.Rows.Members) {
      if (!member.IsMethod) {
        continue;
      }
      rows[member.Name] = rows[member.Name] ?? [];
      const list = rows[member.Name];
      const originDefinition = this.TypeSystem.RequireClass(member.Origin);
      if (originDefinition.Type.IsTrait) {
        pendingTraits.push(member);
        continue;
      }
      if (this.RequiresVirtualOverride(classDefinition.Type, member)) {
        pendingVirtualBases.push(member);
        continue;
      }
      const method = this.TakeNextMethodBody(originDefinition.Methods, member, nextMethodBodyByMember);
      if (method == null) {
        if (member.IsInherit) {
          const signature = this.RequireFunctionSignature(member);
          inheritPlaceholders.push({ list, index: list.length, member });
          list.push(new RowImplementation(member, new FunctionValue(signature, () => {
            throw new Error("Inherited method forwarding unresolved.");
          })));
          continue;
        }
        throw new Error(`No method body found for ${member.Origin}::${member.Name}.`);
      }
      list.push(new RowImplementation(member, new FunctionValue(this.RequireFunctionSignature(member), (context, args) => method.Implementation(context, args))));
    }
    for (const placeholder of inheritPlaceholders) {
      const target = placeholder.list.slice(placeholder.index + 1).find((candidate) => !candidate.Member.IsVirtual) ?? placeholder.list.find((candidate, index) => index !== placeholder.index && !candidate.Member.IsVirtual);
      if (target == null) {
        const fallback = this.FindInheritedMethodTarget(classDefinition.Type, placeholder.member);
        if (fallback == null) {
          throw new Error(`Inherited member ${placeholder.member.Origin}::${placeholder.member.Name} has no target implementation to forward to.`);
        }
        const signature2 = this.RequireFunctionSignature(placeholder.member);
        placeholder.list[placeholder.index] = placeholder.list[placeholder.index].WithFunction(new FunctionValue(signature2, (context, args) => fallback.Function.Body(context, args)));
        continue;
      }
      const signature = this.RequireFunctionSignature(placeholder.member);
      placeholder.list[placeholder.index] = placeholder.list[placeholder.index].WithFunction(new FunctionValue(signature, (context, args) => target.Function.Body(context, args)));
    }
    for (const traitMember of pendingTraits) {
      const list = rows[traitMember.Name];
      if (list == null || list.length === 0) {
        throw new Error(`Trait member ${traitMember.Origin}::${traitMember.Name} has no backing implementation.`);
      }
      const forwarded = new RowMember(traitMember.Name, traitMember.Type, "default" /* Default */, traitMember.Origin, traitMember.IsMethod, { Access: traitMember.Access, EffectContext: traitMember.EffectContext });
      list.unshift(new RowImplementation(forwarded, list[0].Function));
    }
    for (const virtualMember of pendingVirtualBases) {
      const list = rows[virtualMember.Name];
      if (list == null || list.length === 0) {
        throw new Error(`Virtual base member ${virtualMember.Origin}::${virtualMember.Name} requires an override.`);
      }
    }
    return new ObjectValue(classDefinition.Type, rows, fields, parents);
  }
  CreateObject(className) {
    const classDefinition = this.TypeSystem.RequireClass(className);
    return new ObjectValue(classDefinition.Type, {}, this.CreateFieldStorage(classDefinition.Type), {});
  }
  Project(instance, targetTypeName) {
    const targetType = this.TypeSystem.RequireClassSymbol(targetTypeName);
    const projection = new TypeProjection(instance.Class, targetType);
    if (!projection.IsValidProjection(this.TypeSystem)) {
      throw new Error(`Invalid projection: ${instance.Class.Name} cannot be viewed as ${targetTypeName}`);
    }
    return new ProjectedObjectValue(instance, targetType);
  }
  InvokeWithProjection(instance, targetTypeName, memberName, ...args) {
    return this.Invoke(this.Project(instance, targetTypeName), memberName, ...args);
  }
  InvokeOrigin(instance, memberName, origin, ...args) {
    return this.InvokeObject(instance, memberName, origin, args);
  }
  Invoke(target, memberName, ...args) {
    if (target instanceof ProjectedObjectValue) {
      if (target.TargetType.IsTrait) {
        return this.InvokeTraitMember(target.Instance, target.TargetType, memberName, args);
      }
      return this.InvokeObject(target.Instance, memberName, target.TargetType.Name, args);
    }
    const overloaded = splitOriginOverloadArgs(args);
    if (overloaded.origin != null) {
      return this.InvokeObject(target, memberName, overloaded.origin, overloaded.values);
    }
    return this.InvokeObject(target, memberName, null, args);
  }
  ReadField(target, memberName, origin) {
    if (target instanceof ProjectedObjectValue) {
      if (target.TargetType.IsTrait) {
        this.EnsureProjectionExposesField(target.TargetType, memberName);
        return this.ReadFieldFromObject(target.Instance, memberName, null);
      }
      return this.ReadFieldFromObject(target.Instance, memberName, target.TargetType.Name);
    }
    if (origin != null) {
      return this.ReadFieldFromObject(target, memberName, origin);
    }
    return this.ReadFieldFromObject(target, memberName, null);
  }
  ReadFieldOrigin(instance, memberName, origin) {
    return this.ReadFieldFromObject(instance, memberName, origin ?? null);
  }
  WriteField(target, memberName, value, origin) {
    if (target instanceof ProjectedObjectValue) {
      if (target.TargetType.IsTrait) {
        this.EnsureProjectionExposesField(target.TargetType, memberName);
        this.WriteFieldToObject(target.Instance, memberName, value, null);
        return;
      }
      this.WriteFieldToObject(target.Instance, memberName, value, target.TargetType.Name);
      return;
    }
    if (origin != null) {
      this.WriteFieldToObject(target, memberName, value, origin);
      return;
    }
    this.WriteFieldToObject(target, memberName, value, null);
  }
  WriteFieldOrigin(instance, memberName, value, origin) {
    this.WriteFieldToObject(instance, memberName, value, origin ?? null);
  }
  ToTypedValue(value) {
    if (value instanceof TypedValue) {
      return value;
    }
    if (typeof value === "number") {
      return new IntValue(value, this.TypeSystem);
    }
    if (typeof value === "string") {
      return new StringValue(value, this.TypeSystem);
    }
    if (typeof value === "boolean") {
      return new BoolValue(value, this.TypeSystem);
    }
    if (Array.isArray(value)) {
      return new ListValue(value.map((item) => this.ToTypedValue(item)), this.TypeSystem);
    }
    if (value != null && isPlainObject(value)) {
      const properties = {};
      for (const key of Object.keys(value)) {
        properties[key] = this.ToTypedValue(value[key]);
      }
      return new MapValue(properties, this.TypeSystem);
    }
    return new AnyValue(value, this.TypeSystem);
  }
  FromTypedValue(value) {
    if (value instanceof IntValue || value instanceof StringValue || value instanceof BoolValue || value instanceof AnyValue) {
      return value.Value;
    }
    if (value instanceof ListValue) {
      return value.Elements.map((item) => this.FromTypedValue(item));
    }
    if (value instanceof MapValue) {
      const result = {};
      for (const key of Object.keys(value.Properties)) {
        result[key] = this.FromTypedValue(value.Properties[key]);
      }
      return result;
    }
    return value;
  }
  CreateFieldStorage(cls) {
    const fields = {};
    for (const member of cls.Rows.Members) {
      if (member.IsMethod) {
        continue;
      }
      fields[member.Name] = fields[member.Name] ?? [];
      fields[member.Name].push(new FieldStorage(member));
    }
    return fields;
  }
  CreateParentStorage(cls) {
    const parents = {};
    for (const baseRef of cls.Bases) {
      if (baseRef.Inheritance === "real") {
        parents[baseRef.Type.Name] = this.Instantiate(baseRef.Type.Name);
      }
    }
    return parents;
  }
  RequiresVirtualOverride(cls, member) {
    if (member.Origin === cls.Name) {
      return false;
    }
    const baseRef = cls.Bases.find((candidate) => candidate.Type.Name === member.Origin);
    return baseRef?.Inheritance === "virtual";
  }
  TakeNextMethodBody(methods, member, indexes) {
    const key = `${member.Origin}::${member.Name}`;
    const start = indexes.get(key) ?? 0;
    for (let i = start;i < methods.length; i++) {
      const method = methods[i];
      if (method.Member.Origin === member.Origin && method.Member.Name === member.Name) {
        indexes.set(key, i + 1);
        return method;
      }
    }
    indexes.set(key, methods.length);
    return null;
  }
  FindInheritedMethodTarget(cls, member) {
    for (const candidate of cls.MethodResolutionOrder.slice(1)) {
      if (candidate.IsTrait) {
        continue;
      }
      const definition = this.TypeSystem.RequireClass(candidate.Name);
      const method = definition.Methods.find((body) => body.Member.Name === member.Name && body.Member.Origin === candidate.Name);
      if (method == null) {
        continue;
      }
      return new RowImplementation(method.Member, new FunctionValue(this.RequireFunctionSignature(method.Member), (context, args) => method.Implementation(context, args)));
    }
    return null;
  }
  InvokeTraitMember(instance, traitType, memberName, args) {
    this.EnsureProjectionExposesMethod(traitType, memberName);
    const implementations = instance.Rows[memberName];
    if (implementations == null || implementations.length === 0) {
      throw new Error(`Member '${memberName}' does not exist on ${instance.Class.Name}.`);
    }
    const implementation = implementations[0];
    this.EnsureEffectsAllowed(implementation.Function.Signature);
    return implementation.Function.Body(new InvocationContext(this, instance), args);
  }
  InvokeObject(instance, memberName, origin, args) {
    const implementations = instance.Rows[memberName];
    if (implementations == null || implementations.length === 0) {
      throw new Error(`Member '${memberName}' does not exist on ${instance.Class.Name}.`);
    }
    const originSpecified = origin != null;
    for (const implementation of this.SelectImplementationsForActiveEffectContext(implementations)) {
      if (originSpecified && implementation.Member.Origin !== origin) {
        continue;
      }
      if (!this.IsAccessible(implementation.Member, instance.Class, originSpecified)) {
        if (originSpecified && implementation.Member.Origin === origin) {
          throw new Error(`Member '${memberName}' from ${implementation.Member.Origin} is not accessible.`);
        }
        continue;
      }
      if (implementation.Member.IsVirtual) {
        if (originSpecified) {
          throw new Error(`Member '${memberName}' from ${implementation.Member.Origin} is declared virtual and cannot be invoked.`);
        }
        continue;
      }
      this.EnsureEffectsAllowed(implementation.Function.Signature);
      return implementation.Function.Body(new InvocationContext(this, instance), args);
    }
    if (!originSpecified && implementations.some((implementation) => implementation.Member.IsVirtual)) {
      throw new Error(`Member '${memberName}' requires an override but none was provided.`);
    }
    if (originSpecified) {
      const fallback = this.FindMethodImplementationByOrigin(instance.Class, origin, memberName);
      if (fallback != null) {
        this.EnsureEffectsAllowed(fallback.Function.Signature);
        return fallback.Function.Body(new InvocationContext(this, instance), args);
      }
    }
    throw new Error(`No matching member '${memberName}' found for origin '${origin ?? "<default>"}'.`);
  }
  FindMethodImplementationByOrigin(cls, origin, memberName) {
    if (!cls.MethodResolutionOrder.some((type) => type.Name === origin)) {
      return null;
    }
    const definition = this.TypeSystem.RequireClass(origin);
    const method = definition.Methods.find((body) => body.Member.Origin === origin && body.Member.Name === memberName);
    if (method == null) {
      return null;
    }
    return new RowImplementation(method.Member, new FunctionValue(this.RequireFunctionSignature(method.Member), (context, args) => method.Implementation(context, args)));
  }
  ReadFieldFromObject(instance, memberName, origin) {
    const storage = this.ResolveFieldStorage(instance, memberName, origin);
    if (storage.Value == null) {
      throw new Error(`Field '${memberName}' from ${storage.Member.Origin} has not been initialized.`);
    }
    return storage.Value;
  }
  WriteFieldToObject(instance, memberName, value, origin) {
    const storage = this.ResolveFieldStorage(instance, memberName, origin);
    storage.Value = value;
  }
  ResolveFieldStorage(instance, memberName, origin) {
    const fields = instance.Fields[memberName];
    if (fields == null || fields.length === 0) {
      throw new Error(`Field '${memberName}' does not exist on ${instance.Class.Name}.`);
    }
    const originSpecified = origin != null;
    for (const field of fields) {
      if (originSpecified && field.Member.Origin !== origin) {
        continue;
      }
      if (!this.IsAccessible(field.Member, instance.Class, originSpecified)) {
        if (originSpecified && field.Member.Origin === origin) {
          throw new Error(`Field '${memberName}' from ${field.Member.Origin} is not accessible.`);
        }
        continue;
      }
      return field;
    }
    throw new Error(`No matching field '${memberName}' found for origin '${origin ?? "<default>"}'.`);
  }
  EnsureProjectionExposesField(targetType, memberName) {
    if (targetType.Rows.Members.some((member) => !member.IsMethod && member.Name === memberName)) {
      return;
    }
    throw new Error(`Field '${memberName}' is not exposed by projected view ${targetType.Name}.`);
  }
  EnsureProjectionExposesMethod(targetType, memberName) {
    if (targetType.Rows.Members.some((member) => member.IsMethod && member.Name === memberName)) {
      return;
    }
    throw new Error(`Member '${memberName}' is not exposed by projected view ${targetType.Name}.`);
  }
  SelectImplementationsForActiveEffectContext(implementations) {
    if (implementations.every((implementation) => implementation.Member.EffectContext == null)) {
      return implementations;
    }
    const active = this.GetAllowedEffects();
    if (active.IsEmpty) {
      return implementations;
    }
    const contextual = implementations.filter((implementation) => implementation.Member.EffectContext == null || implementation.Member.EffectContext.IsSubsetOf(active));
    return contextual.length === 0 ? implementations : contextual;
  }
  GetAllowedEffects() {
    return this.effectScopes.reduce((current, scope) => current.Union(scope), EffectRow.EmptyClosed);
  }
  EnsureEffectsAllowed(signature) {
    if (signature.EffectRow.IsEmpty) {
      return;
    }
    const active = this.GetAllowedEffects();
    if (!signature.EffectRow.IsSubsetOf(active)) {
      throw new Error(`Effect '${signature.EffectRow.ToDisplayString()}' required by '${signature.Name}' is not permitted in the current scope.`);
    }
  }
  IsAccessible(member, cls, originSpecified) {
    switch (member.Access) {
      case "public":
      case "internal":
        return true;
      case "protected":
        return originSpecified && this.IsDerivedFrom(cls, member.Origin);
      case "private":
        return originSpecified && cls.Name === member.Origin;
      default:
        return false;
    }
  }
  IsDerivedFrom(candidate, ancestorName) {
    if (candidate.Name === ancestorName) {
      return true;
    }
    return this.TypeSystem.IsSubtype(candidate, this.TypeSystem.RequireClassSymbol(ancestorName));
  }
  RequireFunctionSignature(member) {
    if (!(member.Type instanceof FunctionTypeSymbol)) {
      throw new Error(`Member ${member.Origin}::${member.Name} must be a method.`);
    }
    return member.Type;
  }
}
function resolveRuntimeTypeSystem(typeSystem) {
  return typeSystem ?? KonTypedExecutionContext.GetRuntimeTypeSystem();
}
function splitOriginOverloadArgs(args) {
  if (typeof args[0] === "string") {
    return {
      origin: args[0],
      values: args.slice(1)
    };
  }
  return { values: args };
}
function isPlainObject(value) {
  if (value == null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype == null;
}

// ../type-system/lib/KonTypedRuntimeContext.ts
function WrapTypedRuntimeValue(value, typeSystem) {
  if (value instanceof KonTypedObject) {
    return {
      kind: value.Projection == null ? "object" : "projected-object",
      value,
      type: value.Projection?.Rows ?? value.Class.Rows
    };
  }
  if (typeof value === "function") {
    return { kind: "function", value };
  }
  if (Array.isArray(value)) {
    return { kind: "list", value, type: typeSystem?.Registry.Any };
  }
  if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return { kind: "primitive", value, type: inferPrimitiveType(value, typeSystem) };
  }
  if (typeof value === "object") {
    return { kind: "map", value, type: typeSystem?.Registry.Any };
  }
  return { kind: "any", value, type: typeSystem?.Registry.Any };
}
function UnwrapTypedRuntimeValue(value) {
  return value?.value;
}

class KonTypedRuntimeBindingResult {
  Binding;
  Context;
  constructor(Binding, Context) {
    this.Binding = Binding;
    this.Context = Context;
  }
  get Diagnostics() {
    return this.Binding.Diagnostics;
  }
  get Success() {
    return this.Binding.Success && this.Context != null;
  }
}

class KonTypedObject {
  Class;
  Fields;
  Parents;
  Prototype;
  Projection;
  _Type = "KonTypedObject" /* KonTypedObject */;
  constructor(Class, Fields, Parents = {}, Prototype, Projection) {
    this.Class = Class;
    this.Fields = Fields;
    this.Parents = Parents;
    this.Prototype = Prototype;
    this.Projection = Projection;
  }
}

class KonTypedRuntimeContext {
  TypeSystem;
  PrototypeResolver;
  effectScopes = [];
  globals = new Map;
  Execution;
  constructor(TypeSystem2) {
    this.TypeSystem = TypeSystem2;
    this.Execution = new KonTypedExecutionContext(TypeSystem2);
  }
  static BindSource(source) {
    const nodes = ParseKonSourceItems(source);
    return KonTypedRuntimeContext.Bind(nodes);
  }
  static Bind(nodes) {
    const declarations = nodes.filter(isTypeSystemDeclaration);
    const binding = new KonTypeBinder().Bind(declarations);
    const context = binding.Success ? new KonTypedRuntimeContext(binding.TypeSystem) : null;
    return new KonTypedRuntimeBindingResult(binding, context);
  }
  static BindSourceOptional(source) {
    return KonTypedRuntimeContext.BindSource(source);
  }
  CreateObject(className, prototype) {
    const cls = this.TypeSystem.RequireClassSymbol(className);
    const typed = new KonTypedObject(cls, this.CreateFieldStorage(cls), this.CreateParentStorage(cls), prototype);
    if (prototype != null) {
      this.HydrateFieldsFromPrototype(typed, prototype);
    }
    return typed;
  }
  Instantiate(className) {
    return this.Execution.Instantiate(className);
  }
  ToTypedValue(value) {
    return this.Execution.ToTypedValue(value);
  }
  FromTypedValue(value) {
    return this.Execution.FromTypedValue(value);
  }
  Project(target, targetTypeName) {
    const targetType = this.TypeSystem.RequireClassSymbol(targetTypeName);
    const projection = new TypeProjection(target.Class, targetType);
    if (!projection.IsValidProjection(this.TypeSystem)) {
      throw new Error(`Invalid projection: ${target.Class.Name} cannot be viewed as ${targetTypeName}`);
    }
    return new KonTypedObject(target.Class, target.Fields, target.Parents, target.Prototype, targetType);
  }
  ReadField(target, memberName) {
    const storage = this.ResolveFieldStorage(target, memberName);
    if (!storage.Initialized) {
      throw new Error(`Field '${memberName}' from ${storage.Member.Origin} has not been initialized.`);
    }
    return UnwrapTypedRuntimeValue(storage.Value);
  }
  WriteField(target, memberName, value) {
    const storage = this.ResolveFieldStorage(target, memberName);
    storage.Value = WrapTypedRuntimeValue(value, this.TypeSystem);
    storage.Initialized = true;
  }
  ReadValueField(target, memberName) {
    return this.Execution.ToTypedValue(this.ReadField(target, memberName));
  }
  WriteValueField(target, memberName, value) {
    this.WriteField(target, memberName, this.Execution.FromTypedValue(value));
  }
  WriteNodeField(target, memberName, value) {
    this.WriteKonField(target, memberName, value);
  }
  SetGlobal(name, value) {
    this.globals.set(name, WrapTypedRuntimeValue(value, this.TypeSystem));
    this.Execution.SetGlobal(name, this.Execution.ToTypedValue(value));
  }
  GetGlobal(name) {
    const value = this.GetGlobalValue(name);
    return value == null ? undefined : UnwrapTypedRuntimeValue(value);
  }
  GetGlobalValue(name) {
    return this.globals.get(name);
  }
  GetCoreGlobal(name) {
    return this.Execution.GetGlobal(name);
  }
  ReadKonField(target, memberName) {
    return this.ToKonValue(this.ReadField(target, memberName));
  }
  WriteKonField(target, memberName, value) {
    this.WriteField(target, memberName, this.ToRuntimeValue(value));
  }
  PushEffectScope(...effects) {
    const row = EffectRow.FromEffects(effects.map((effect) => typeof effect === "string" ? this.TypeSystem.Registry.GetOrCreateEffect(effect) : effect));
    this.effectScopes.push(row);
    let disposed = false;
    return {
      dispose: () => {
        if (disposed) {
          return;
        }
        disposed = true;
        const current = this.effectScopes.pop();
        if (current !== row) {
          throw new Error("Effect scope imbalance detected.");
        }
      }
    };
  }
  Invoke(target, memberName, ...args) {
    const fn = this.GetMethodImplementation(target, memberName);
    if (typeof fn !== "function") {
      throw new Error(`No method implementation found for '${memberName}'.`);
    }
    return fn(target, ...args);
  }
  InvokeWithProjection(target, targetTypeName, memberName, ...args) {
    return this.Invoke(this.Project(target, targetTypeName), memberName, ...args);
  }
  GetMethodImplementation(target, memberName) {
    const member = this.ResolveMethodMember(target, memberName);
    this.EnsureEffectsAllowed(member);
    const fn = this.ResolvePrototypeMethod(target, member);
    if (fn == null) {
      throw new Error(`No method implementation found for ${member.Origin}::${member.Name}.`);
    }
    return fn;
  }
  GetPropertyGetter(target, memberName) {
    return this.ResolvePropertyAccessor(target, memberName, "get_");
  }
  GetPropertySetter(target, memberName) {
    return this.ResolvePropertyAccessor(target, memberName, "set_");
  }
  CreateFieldStorage(cls) {
    const fields = {};
    for (const member of cls.Rows.Members) {
      if (member.IsMethod) {
        continue;
      }
      fields[member.Name] = fields[member.Name] ?? [];
      fields[member.Name].push({ Member: member, Value: undefined, Initialized: false });
    }
    return fields;
  }
  CreateParentStorage(cls) {
    const parents = {};
    for (const baseRef of cls.Bases) {
      if (baseRef.Inheritance === "real" /* Real */) {
        parents[baseRef.Type.Name] = this.CreateObject(baseRef.Type.Name);
      }
    }
    return parents;
  }
  HydrateFieldsFromPrototype(target, prototype) {
    for (const fieldName of getPrototypeFieldNames(prototype)) {
      if (fieldName.startsWith("__") || fieldName.startsWith("get_") || fieldName.startsWith("set_")) {
        continue;
      }
      const value = getPrototypeValue(prototype, fieldName);
      if (value == null) {
        continue;
      }
      if (!this.TargetExposesField(target, fieldName)) {
        continue;
      }
      this.WriteField(target, fieldName, value);
    }
  }
  ResolveFieldStorage(target, memberName) {
    this.EnsureProjectionExposesField(target, memberName);
    const fields = target.Fields[memberName];
    if (fields == null || fields.length === 0) {
      throw new Error(`Field '${memberName}' does not exist on ${target.Class.Name}.`);
    }
    const origin = target.Projection?.IsTrait === true ? null : target.Projection?.Name;
    const originSpecified = origin != null;
    for (const field of fields) {
      if (originSpecified && field.Member.Origin !== origin) {
        continue;
      }
      if (!this.IsAccessible(field.Member, target.Class, originSpecified)) {
        continue;
      }
      return field;
    }
    throw new Error(`No matching field '${memberName}' found for origin '${origin ?? "<default>"}'.`);
  }
  ResolvePropertyAccessor(target, memberName, prefix) {
    const accessorName = prefix + memberName;
    if (!this.ViewExposesMethod(target, accessorName)) {
      return null;
    }
    const prototype = this.ResolvePrototypeForAccessor(target, accessorName);
    return getPrototypeValue(prototype, accessorName);
  }
  ResolveMethodMember(target, memberName) {
    this.EnsureProjectionExposesMethod(target, memberName);
    const rows = target.Projection?.IsTrait === true ? target.Class.Rows : target.Projection?.Rows ?? target.Class.Rows;
    let candidates = rows.Members.filter((member) => member.IsMethod && member.Name === memberName).filter((member) => target.Projection?.IsTrait === true || target.Projection == null || member.Origin === target.Projection.Name).filter((member) => this.IsAccessible(member, target.Class, target.Projection != null));
    if (candidates.length === 0) {
      throw new Error(`Member '${memberName}' is not exposed by ${target.Projection?.Name ?? target.Class.Name}.`);
    }
    const contextual = this.SelectByActiveEffectContext(candidates);
    if (contextual.length === 0) {
      throw new Error(`No method '${memberName}' is compatible with active effect scope.`);
    }
    if (contextual.length > 1 && contextual.some((member) => member.EffectContext != null)) {
      throw new Error(`Method '${memberName}' is ambiguous for active effect scope: ${contextual.map((member) => member.Origin).join(", ")}.`);
    }
    return contextual[0];
  }
  SelectByActiveEffectContext(candidates) {
    if (candidates.every((member) => member.EffectContext == null)) {
      return candidates;
    }
    const active = this.GetActiveEffectRow();
    if (active.IsEmpty) {
      return candidates;
    }
    const contextual = candidates.filter((member) => member.EffectContext == null || member.EffectContext.IsSubsetOf(active));
    return contextual.length === 0 ? candidates : contextual;
  }
  GetActiveEffectRow() {
    return this.effectScopes.reduce((current, scope) => current.Union(scope), EffectRow.EmptyClosed);
  }
  EnsureEffectsAllowed(member) {
    const signature = member.Type instanceof FunctionTypeSymbol ? member.Type : null;
    if (signature == null || signature.EffectRow.IsEmpty) {
      return;
    }
    const active = this.GetActiveEffectRow();
    if (!signature.EffectRow.IsSubsetOf(active)) {
      throw new Error(`Effect ${signature.EffectRow.ToDisplayString()} required by '${signature.Name}' is not permitted in the current scope.`);
    }
  }
  ResolvePrototypeMethod(target, member) {
    const prototypes = this.EnumeratePrototypeCandidates(target, member);
    const contextualKey = `${member.Origin}::${member.Name}${member.EffectContext?.ToDisplayString() ?? ""}`;
    const originKey = `${member.Origin}::${member.Name}`;
    for (const prototype of prototypes) {
      if (prototype == null) {
        continue;
      }
      const contextual = getPrototypeValue(prototype, contextualKey);
      if (contextual != null) {
        return contextual;
      }
      const origin = getPrototypeValue(prototype, originKey);
      if (origin != null) {
        return origin;
      }
      const fallback = getPrototypeValue(prototype, member.Name);
      if (fallback != null) {
        return fallback;
      }
    }
    if (member.IsInherit) {
      return this.ResolveInheritedPrototypeMethod(target, member);
    }
    return null;
  }
  ResolveInheritedPrototypeMethod(target, member) {
    const mro = target.Class.MethodResolutionOrder;
    const originIndex = mro.findIndex((type) => type.Name === member.Origin);
    const searchStart = originIndex < 0 ? 0 : originIndex + 1;
    for (const type of mro.slice(searchStart)) {
      const prototype = this.PrototypeResolver?.(type.Name);
      if (prototype == null) {
        continue;
      }
      const origin = getPrototypeValue(prototype, `${type.Name}::${member.Name}`);
      if (origin != null) {
        return origin;
      }
      const fallback = getPrototypeValue(prototype, member.Name);
      if (fallback != null) {
        return fallback;
      }
    }
    return null;
  }
  EnumeratePrototypeCandidates(target, member) {
    if (target.Projection?.IsTrait === true) {
      return target.Class.MethodResolutionOrder.map((type) => this.PrototypeResolver?.(type.Name)).concat([target.Prototype]);
    }
    if (target.Projection != null) {
      return [this.PrototypeResolver?.(target.Projection.Name), target.Prototype];
    }
    return [this.PrototypeResolver?.(member.Origin), target.Prototype];
  }
  ResolvePrototypeForAccessor(target, accessorName) {
    if (target.Projection != null) {
      if (!target.Projection.IsTrait) {
        return this.PrototypeResolver?.(target.Projection.Name);
      }
      for (const type of target.Class.MethodResolutionOrder) {
        const prototype = this.PrototypeResolver?.(type.Name);
        if (prototype != null && getPrototypeValue(prototype, accessorName) != null) {
          return prototype;
        }
      }
    }
    return target.Prototype;
  }
  TargetExposesField(target, memberName) {
    const rows = target.Projection?.Rows ?? target.Class.Rows;
    return rows.Members.some((member) => !member.IsMethod && member.Name === memberName);
  }
  EnsureProjectionExposesField(target, memberName) {
    if (target.Projection == null || this.TargetExposesField(target, memberName)) {
      return;
    }
    throw new Error(`Field '${memberName}' is not exposed by projected view ${target.Projection.Name}.`);
  }
  ViewExposesMethod(target, memberName) {
    const rows = target.Projection?.Rows ?? target.Class.Rows;
    return rows.Members.some((member) => member.IsMethod && member.Name === memberName);
  }
  EnsureProjectionExposesMethod(target, memberName) {
    if (target.Projection == null || this.ViewExposesMethod(target, memberName)) {
      return;
    }
    throw new Error(`Member '${memberName}' is not exposed by projected view ${target.Projection.Name}.`);
  }
  IsAccessible(member, cls, originSpecified) {
    switch (member.Access) {
      case "public":
      case "internal":
        return true;
      case "protected":
        return originSpecified && this.IsDerivedFrom(cls, member.Origin);
      case "private":
        return originSpecified && cls.Name === member.Origin;
      default:
        return false;
    }
  }
  IsDerivedFrom(candidate, ancestorName) {
    if (candidate.Name === ancestorName) {
      return true;
    }
    const ancestor = this.TypeSystem.RequireClassSymbol(ancestorName);
    return this.TypeSystem.IsSubtype(candidate, ancestor);
  }
  ToRuntimeValue(value) {
    if (Array.isArray(value)) {
      throw new Error(`Kon value 'Array' cannot be converted to a typed runtime value.`);
    }
    return value;
  }
  ToKonValue(value) {
    if (Array.isArray(value)) {
      throw new Error(`Typed runtime value 'Array' cannot be converted to a Kon value.`);
    }
    return value;
  }
}
function getPrototypeFieldNames(prototype) {
  if (prototype == null) {
    return [];
  }
  if (typeof prototype.getFieldNames === "function") {
    return prototype.getFieldNames();
  }
  return Object.keys(prototype);
}
function getPrototypeValue(prototype, name) {
  if (prototype == null || name == null) {
    return null;
  }
  if (typeof prototype.getField === "function") {
    const field = prototype.getField(name);
    if (field != null) {
      return field;
    }
  }
  if (typeof prototype.getMethod === "function") {
    const method = prototype.getMethod(name);
    if (method != null) {
      return method;
    }
  }
  return prototype[name] ?? null;
}
function inferPrimitiveType(value, typeSystem) {
  if (typeSystem == null) {
    return;
  }
  if (typeof value === "string") {
    return typeSystem.Registry.String;
  }
  if (typeof value === "number") {
    return typeSystem.Registry.Int;
  }
  if (typeof value === "boolean") {
    return typeSystem.Registry.Bool;
  }
  return typeSystem.Registry.Any;
}
function isTypeSystemDeclaration(node) {
  return node instanceof KnKnot && ["type", "class", "trait"].includes(getWord(node.Core));
}
// ../type-system/lib/KonTypedBlockEvaluator.ts
class KonTypedBlockError extends Error {
  constructor(message) {
    super(message);
  }
}

class KonTypedBlockEvaluator {
  static EvaluateSync(source) {
    const typeCheck = KonTypeChecker.CheckSource(source);
    if (!typeCheck.Success) {
      throw new KonTypedBlockTypeCheckError(typeCheck);
    }
    const nodes = ParseKonSourceItems(source);
    const binding = KonTypedRuntimeContext.BindSource(source);
    if (!binding.Success) {
      throw new KonTypedBlockError(`Typed runtime binding failed: ${binding.Diagnostics.map((diagnostic) => `${diagnostic.Code}: ${diagnostic.Message}`).join("; ")}`);
    }
    const state = {
      context: binding.Context,
      prototypes: new Map
    };
    for (const declaration of nodes.filter(isClassDeclaration2)) {
      this.RegisterClassPrototype(state, declaration);
    }
    state.context.PrototypeResolver = (className) => state.prototypes.get(className)?.prototype ?? null;
    const env = new Map;
    let result = null;
    for (const node of nodes) {
      if (isTypeSystemDeclaration2(node)) {
        continue;
      }
      result = this.EvaluateNode(state, node, env);
    }
    return result;
  }
  static RegisterClassPrototype(state, declaration) {
    const className = getTypeName(declaration.Name);
    if (className == null) {
      return;
    }
    const prototype = {
      className,
      prototype: {}
    };
    for (const item of declaration.Body ?? []) {
      if (!(item instanceof KnKnot)) {
        continue;
      }
      const keyword = getWord(item.Core);
      if (keyword === "field") {
        const defaultValue = this.ReadFieldDefaultValue(item);
        if (defaultValue != null) {
          prototype.prototype[this.ReadFieldName(item)] = this.EvaluateLiteral(defaultValue);
        }
        continue;
      }
      if (keyword === "new") {
        prototype.constructorNode = item;
        continue;
      }
      if (keyword === "method") {
        const methodName = getTypeName(item.Name);
        if (methodName != null) {
          prototype.prototype[`${className}::${methodName}`] = (target, ...args) => this.InvokeBody(state, item, target, args);
        }
        continue;
      }
      if (keyword === "prop") {
        this.RegisterPropertyPrototype(state, prototype, item);
      }
    }
    state.prototypes.set(className, prototype);
  }
  static RegisterPropertyPrototype(state, prototype, property) {
    const propertyName = getTypeName(property.Name);
    if (propertyName == null) {
      return;
    }
    let section = property.Next;
    while (section != null) {
      const current = section;
      const keyword = getWord(section.Core);
      if (keyword === "get") {
        prototype.prototype[`get_${propertyName}`] = (target) => this.InvokeBody(state, current, target, []);
      } else if (keyword === "set") {
        prototype.prototype[`set_${propertyName}`] = (target, ...args) => this.InvokeBody(state, current, target, args);
      }
      section = section.Next;
    }
  }
  static InvokeBody(state, bodyOwner, self, args) {
    const env = new Map;
    env.set("self", self);
    const paramNames = this.ReadInputParameterNames(bodyOwner.InOutTable).filter((name) => name !== "self");
    for (let i = 0;i < paramNames.length; i++) {
      env.set(paramNames[i], args[i]);
    }
    return this.EvaluateBlock(state, bodyOwner.Body ?? [], env);
  }
  static EvaluateBlock(state, nodes, env) {
    let result = null;
    for (const node of nodes) {
      result = this.EvaluateNode(state, node, env);
    }
    return result;
  }
  static EvaluateNode(state, node, env) {
    if (node instanceof KnKnot) {
      const keyword = getWord(node.Core);
      if (keyword === "var") {
        return this.EvaluateVar(state, node, env);
      }
      if (keyword === "set") {
        return this.EvaluateSet(state, node, env);
      }
      return this.EvaluateChain(state, node, env);
    }
    return this.EvaluateAtom(state, node, env);
  }
  static EvaluateVar(state, node, env) {
    const name = getWord(node.Next?.Core);
    if (name == null) {
      throw new KonTypedBlockError("Typed var declaration requires a variable name.");
    }
    const valueNode = node.Next?.Next?.Core;
    const value = this.EvaluateNode(state, valueNode, env);
    env.set(name, value);
    return value;
  }
  static EvaluateSet(state, node, env) {
    const parsed = this.ReadSetTarget(node.Next);
    const value = this.EvaluateNode(state, parsed.valueNode, env);
    const target = this.EvaluateChainParts(state, parsed.baseCore, parsed.baseSegments, env);
    if (!(target instanceof KonTypedObject)) {
      throw new KonTypedBlockError(`Set target for '${parsed.memberName}' is not a typed object.`);
    }
    const setter = state.context.GetPropertySetter(target, parsed.memberName);
    if (typeof setter === "function") {
      setter(target, value);
    } else {
      state.context.WriteField(target, parsed.memberName, value);
    }
    return value;
  }
  static EvaluateChain(state, knot, env) {
    return this.EvaluateChainParts(state, knot.Core, this.CollectSegments(knot.Next), env);
  }
  static EvaluateChainParts(state, core, segments, env) {
    let current = this.EvaluateAtom(state, core, env);
    for (const segment of segments) {
      current = this.EvaluateSegment(state, current, segment, env);
    }
    return current;
  }
  static EvaluateSegment(state, target, segment, env) {
    if (segment.CallType === 5 /* StaticIndex */) {
      const memberName = getWord(segment.Core);
      if (!(target instanceof KonTypedObject) || memberName == null) {
        throw new KonTypedBlockError(`Slot '${memberName ?? "<missing>"}' requires a typed object target.`);
      }
      const getter = state.context.GetPropertyGetter(target, memberName);
      return typeof getter === "function" ? getter(target) : state.context.ReadField(target, memberName);
    }
    if (segment.CallType === 2 /* InstanceCall */) {
      const memberName = getWord(segment.Core);
      const args = this.ReadCallArguments(segment).map((arg) => this.EvaluateNode(state, arg, env));
      if (memberName === "new") {
        const className = this.ReadClassReference(target);
        const instance = state.context.CreateObject(className, state.prototypes.get(className)?.prototype);
        const constructorNode = state.prototypes.get(className)?.constructorNode;
        if (constructorNode != null) {
          this.InvokeBody(state, constructorNode, instance, args);
        }
        return instance;
      }
      if (memberName === "as") {
        const targetTypeName = getTypeName(this.ReadCallArguments(segment)[0]);
        if (!(target instanceof KonTypedObject) || targetTypeName == null) {
          throw new KonTypedBlockError("Typed projection requires an object target and target type.");
        }
        return state.context.Project(target, targetTypeName);
      }
      if (!(target instanceof KonTypedObject) || memberName == null) {
        throw new KonTypedBlockError(`Method '${memberName ?? "<missing>"}' requires a typed object target.`);
      }
      return state.context.Invoke(target, memberName, ...args);
    }
    return this.EvaluateNode(state, segment.Core, env);
  }
  static EvaluateAtom(state, node, env) {
    if (node instanceof KnKnot) {
      return this.EvaluateNode(state, node, env);
    }
    if (node instanceof KnWord) {
      if (env.has(node.Value)) {
        return env.get(node.Value);
      }
      if (state.context.TypeSystem.Registry.TryGet(node.Value) != null) {
        return { kind: "class", name: node.Value };
      }
      return node.Value;
    }
    return this.EvaluateLiteral(node);
  }
  static EvaluateLiteral(node) {
    return node;
  }
  static ReadSetTarget(head) {
    if (head == null) {
      throw new KonTypedBlockError("Set requires a target and a value.");
    }
    const segments = this.CollectSegments(head.Next);
    if (segments.length < 2) {
      throw new KonTypedBlockError("Set requires a slot target and a value.");
    }
    const valueHolder = segments[segments.length - 1];
    const slot = segments[segments.length - 2];
    if (slot.CallType !== 5 /* StaticIndex */) {
      throw new KonTypedBlockError("Set currently supports typed slot assignment targets.");
    }
    const memberName = getWord(slot.Core);
    if (memberName == null) {
      throw new KonTypedBlockError("Set slot target requires a member name.");
    }
    return {
      baseCore: head.Core,
      baseSegments: segments.slice(0, -2),
      memberName,
      valueNode: valueHolder.Core
    };
  }
  static CollectSegments(first) {
    const segments = [];
    let current = first;
    while (current != null) {
      segments.push(current);
      current = current.Next;
    }
    return segments;
  }
  static ReadCallArguments(segment) {
    const params = segment.Params;
    const raw = params?.RawValue ?? params?.Value ?? [];
    return Array.isArray(raw) ? raw : [];
  }
  static ReadInputParameterNames(table) {
    const inputNodes = table?.RawValue?.[0]?.[2] ?? [];
    return inputNodes.map((node) => getWord(node)).filter((name) => name != null);
  }
  static ReadClassReference(value) {
    if (value?.kind === "class") {
      return value.name;
    }
    throw new KonTypedBlockError("Typed constructor call requires a class target.");
  }
  static ReadFieldName(field) {
    if (field.Name != null) {
      return getTypeName(field.Name);
    }
    if (field.Metadata instanceof Map) {
      const first = field.Metadata.keys().next();
      if (!first.done) {
        return getTypeName(first.value);
      }
    }
    return null;
  }
  static ReadFieldDefaultValue(field) {
    if (!(field.Metadata instanceof Map)) {
      return null;
    }
    const first = field.Metadata.values().next();
    return first.done ? null : first.value;
  }
}

class KonTypedBlockTypeCheckError extends Error {
  Result;
  constructor(Result) {
    super(`Typed block type check failed: ${Result.Diagnostics.map((diagnostic) => `${diagnostic.Code}: ${diagnostic.Message}`).join("; ")}`);
    this.Result = Result;
  }
}
function isTypeSystemDeclaration2(node) {
  return node instanceof KnKnot && ["type", "class", "trait"].includes(getWord(node.Core));
}
function isClassDeclaration2(node) {
  return node instanceof KnKnot && getWord(node.Core) === "class";
}
// ../type-system/lib/RuntimeTypeSystemBridge.ts
function registerTypeSystemBridge() {
  RegisterTypeSystemBridge({
    CheckSource: (source) => KonTypeChecker.CheckSource(source),
    BindSource: (source) => KonTypedRuntimeContext.BindSource(source),
    IsTypedObject: (target) => target instanceof KonTypedObject
  });
}
// ../type-system/lib/index.ts
registerTypeSystemBridge();
// ../type-annotations/lib/Annotations.ts
var BuiltInAnnotationNames = {
  Required: "required",
  Description: "description",
  Storage: "storage",
  Label: "label",
  Source: "source",
  Migration: "migration"
};

class AnnotationExtractor {
  Extract(node) {
    const entries = [];
    this.ReadMetadata(entries, node?.Metadata);
    this.ReadConfig(entries, node?.Conf);
    this.ReadAttr(entries, node?.Attr);
    this.ReadNamedAttr(entries, node?.NamedAttr);
    this.ReadModifierGroup(entries, "preModifier", node?.PreModifiers);
    this.ReadModifierGroup(entries, "postModifier", node?.PostModifiers);
    return { Entries: entries };
  }
  Get(node, name) {
    return this.Extract(node).Entries.filter((entry) => entry.Name === name);
  }
  GetFirstValue(node, name) {
    return this.Get(node, name)[0]?.Value;
  }
  IsRequired(node) {
    return this.GetFirstValue(node, BuiltInAnnotationNames.Required) === true;
  }
  ReadMetadata(entries, metadata) {
    if (metadata == null) {
      return;
    }
    if (metadata instanceof Map) {
      for (const [key, value] of metadata.entries()) {
        entries.push({
          Source: "metadata",
          Name: wordName(key),
          Value: value
        });
      }
      return;
    }
    for (const [key, value] of Object.entries(metadata)) {
      entries.push({
        Source: "metadata",
        Name: key,
        Value: value
      });
    }
  }
  ReadAttr(entries, attr) {
    if (attr == null) {
      return;
    }
    for (const [name, value] of Object.entries(attr)) {
      entries.push({
        Source: "attr",
        Name: name,
        Value: value
      });
    }
  }
  ReadConfig(entries, config) {
    if (config == null) {
      return;
    }
    for (const [name, value] of Object.entries(config)) {
      if (typeof value === "function") {
        continue;
      }
      entries.push({
        Source: "config",
        Name: name,
        Value: configValue(value)
      });
    }
  }
  ReadNamedAttr(entries, namedAttr) {
    if (namedAttr == null) {
      return;
    }
    for (const [target, values] of Object.entries(namedAttr)) {
      for (const [name, value] of Object.entries(values)) {
        entries.push({
          Source: "namedAttr",
          Target: target,
          Name: name,
          Value: value
        });
      }
    }
  }
  ReadModifierGroup(entries, source, group) {
    if (group == null) {
      return;
    }
    for (const identifier of group.Identifiers ?? []) {
      entries.push({
        Source: source,
        Name: wordName(identifier),
        Value: true
      });
    }
    for (const [key, value] of group.NamedValues?.entries?.() ?? []) {
      entries.push({
        Source: source,
        Name: wordName(key),
        Value: value
      });
    }
    for (const knot of group.Knots ?? []) {
      const name = wordName(knot.Name) ?? wordName(knot.Core);
      if (name != null) {
        entries.push({
          Source: source,
          Name: name,
          Value: knot
        });
      }
    }
    if (group.UnorderedMap != null) {
      this.ReadAttr(entries, group.UnorderedMap);
    }
  }
}

class SchemaConstraintProfile {
  ValidateRequiredOverride(parent, child) {
    const extractor = new AnnotationExtractor;
    const parentRequired = extractor.IsRequired(parent);
    const childRequired = extractor.IsRequired(child);
    if (parentRequired && !childRequired) {
      return ["Required annotation cannot be loosened by an overriding declaration."];
    }
    return [];
  }
}
function wordName(node) {
  if (node instanceof KnWord) {
    return node.GetFullNameStr();
  }
  if (node instanceof KnKnot && node.Name instanceof KnWord) {
    return node.Name.GetFullNameStr();
  }
  if (node instanceof KnKnot && node.Core instanceof KnWord) {
    return node.Core.GetFullNameStr();
  }
  return typeof node === "string" ? node : null;
}
function configValue(node) {
  if (node instanceof KnWord) {
    const name = node.GetFullNameStr();
    if (name === "true") {
      return true;
    }
    if (name === "false") {
      return false;
    }
    return name;
  }
  return node;
}
// ../type-annotations/lib/OrmEntityAnnotations.ts
class OrmEntityAnnotationProfile {
  Parse(nodeOrMarker) {
    const diagnostics = [];
    const descriptor = {
      PrimaryKey: []
    };
    const marker = findMarker(nodeOrMarker, "entity");
    if (marker == null) {
      diagnostics.push({
        Code: "ORMENTITY001",
        Message: "ORM entity annotation must use #(orm #entity :{ ... })."
      });
      return { Descriptor: descriptor, Diagnostics: diagnostics };
    }
    for (const item of annotationItems(marker)) {
      switch (item.Name) {
        case "type":
          descriptor.Type = directString(item.Value);
          break;
        case "primary_key":
        case "primaryKey":
          descriptor.PrimaryKey = stringListValue(item.Value);
          break;
        case "db":
          descriptor.Db = parseDb(item.Value);
          break;
        case "logical_delete":
        case "logicalDelete":
          descriptor.LogicalDelete = parseLogicalDelete(item.Value);
          break;
        case "datasource":
        case "data_source":
        case "dataSource":
          descriptor.DataSource = directString(item.Value);
          break;
        default:
          diagnostics.push({
            Code: "ORMENTITY004",
            Message: `Unsupported ORM entity annotation item '${item.Name ?? "<missing>"}'.`,
            Location: item.Name
          });
          break;
      }
    }
    return { Descriptor: descriptor, Diagnostics: diagnostics };
  }
}

class OrmDataSourceAnnotationProfile {
  Parse(nodeOrMarker) {
    const diagnostics = [];
    const descriptor = {};
    const marker = findMarker(nodeOrMarker, "datasource");
    if (marker == null) {
      diagnostics.push({
        Code: "ORMDATASOURCE001",
        Message: "ORM datasource annotation must use #(orm #datasource :{ ... })."
      });
      return { Descriptor: descriptor, Diagnostics: diagnostics };
    }
    for (const item of annotationItems(marker)) {
      switch (item.Name) {
        case "key":
          descriptor.Key = directString(item.Value);
          break;
        case "name":
          descriptor.Name = directString(item.Value);
          break;
        case "kind":
          descriptor.Kind = directString(item.Value);
          break;
        case "env_conn":
        case "envConn":
          descriptor.EnvConn = directString(item.Value);
          break;
        case "options":
          descriptor.Options = objectValue(item.Value);
          break;
        default:
          diagnostics.push({
            Code: "ORMDATASOURCE004",
            Message: `Unsupported ORM datasource annotation item '${item.Name ?? "<missing>"}'.`,
            Location: item.Name
          });
          break;
      }
    }
    return { Descriptor: descriptor, Diagnostics: diagnostics };
  }
}
function parseDb(source) {
  const db = {};
  setIfDefined(db, "Name", stringProp(source, "name") ?? directString(source));
  setIfDefined(db, "Schema", stringProp(source, "schema"));
  return db;
}
function parseLogicalDelete(source) {
  const logicalDelete = {};
  setIfDefined(logicalDelete, "Field", stringProp(source, "field"));
  setIfDefined(logicalDelete, "Value", valueProp(source, "value"));
  return logicalDelete;
}
function findMarker(nodeOrMarker, markerName) {
  if (nodeOrMarker instanceof KnKnot && wordName2(nodeOrMarker.Core) === "orm" && wordName2(nodeOrMarker.Name) === markerName) {
    return nodeOrMarker;
  }
  const annotationSource = nodeOrMarker?.Metadata?.source_annotations ?? nodeOrMarker;
  const entry = new AnnotationExtractor().Extract(annotationSource).Entries.find((candidate) => candidate.Source === "preModifier" && candidate.Name === markerName && candidate.Value instanceof KnKnot && wordName2(candidate.Value.Core) === "orm");
  return entry?.Value ?? null;
}
function annotationItems(marker) {
  if (marker.Conf != null) {
    return Object.entries(marker.Conf).filter(([_, value]) => typeof value !== "function").map(([name, value]) => ({ Name: name, Value: value }));
  }
  return (marker.Body ?? []).filter((item) => item instanceof KnKnot).map((item) => ({ Name: wordName2(item.Core), Value: item }));
}
function setIfDefined(target, key, value) {
  if (value !== undefined && value !== null) {
    target[key] = value;
  }
}
function directString(source) {
  if (source instanceof KnKnot) {
    return stringProp(source, "value");
  }
  const value = valueToPrimitive(source);
  return value == null ? undefined : String(value);
}
function stringProp(source, name) {
  const value = valueProp(source, name);
  return value == null ? undefined : String(value);
}
function valueProp(source, name) {
  if (source instanceof KnKnot) {
    const confValue = source.Conf?.[name];
    return confValue === undefined ? valueToPrimitive(source.Attr?.[name]) : valueToPrimitive(confValue);
  }
  return valueToPrimitive(source?.[name]);
}
function stringListValue(value) {
  const primitive = valueToPrimitive(value);
  if (Array.isArray(primitive)) {
    return primitive.map((item) => valueToPrimitive(item)).filter((item) => item != null).map(String);
  }
  return primitive == null ? [] : [String(primitive)];
}
function objectValue(value) {
  const primitive = valueToPrimitive(value);
  if (primitive == null || typeof primitive !== "object" || Array.isArray(primitive)) {
    return;
  }
  const result = {};
  for (const [key, item] of Object.entries(primitive)) {
    if (typeof item !== "function") {
      result[key] = valueToPrimitive(item);
    }
  }
  return result;
}
function valueToPrimitive(value) {
  if (value instanceof KnWord) {
    return value.GetFullNameStr();
  }
  if (value instanceof KnSymbol) {
    return value.Value;
  }
  if (value instanceof KnKnot) {
    return wordName2(value.Name) ?? wordName2(value.Core);
  }
  if (Array.isArray(value)) {
    return value.map((item) => valueToPrimitive(item));
  }
  return value;
}
function wordName2(node) {
  if (node instanceof KnWord) {
    return node.GetFullNameStr();
  }
  if (node instanceof KnSymbol) {
    return node.Value;
  }
  if (typeof node === "string") {
    return node;
  }
  return null;
}
// ../type-annotations/lib/OrmFieldAnnotations.ts
class OrmFieldAnnotationProfile {
  Parse(nodeOrMarker) {
    const diagnostics = [];
    const descriptor = {
      Properties: []
    };
    const marker = this.FindMarker(nodeOrMarker);
    if (marker == null) {
      diagnostics.push({
        Code: "ORMFIELD001",
        Message: "ORM field annotation must use #(orm #field :{ ... })."
      });
      return { Descriptor: descriptor, Diagnostics: diagnostics };
    }
    for (const item of annotationItems2(marker)) {
      switch (item.Name) {
        case "type":
          descriptor.Type = this.ParseFieldType(item.Value);
          if (descriptor.Type.Code == null) {
            diagnostics.push({
              Code: "ORMFIELD002",
              Message: "ORM field type annotation should include code in :{ ... }.",
              Location: "type"
            });
          }
          break;
        case "db":
          descriptor.Db = this.ParseDb(item.Value);
          break;
        case "items":
          descriptor.Items = this.ParseFieldType(item.Value);
          break;
        case "properties":
        case "property":
          for (const property of asArray(item.Value)) {
            descriptor.Properties.push({
              Name: property instanceof KnKnot ? wordName3(property.Name) : stringProp2(property, "name"),
              ...this.ParseFieldType(property)
            });
          }
          break;
        case "format":
          descriptor.Format = directString2(item.Value);
          break;
        default:
          diagnostics.push({
            Code: "ORMFIELD004",
            Message: `Unsupported ORM field annotation item '${item.Name ?? "<missing>"}'.`,
            Location: item.Name
          });
          break;
      }
    }
    return { Descriptor: descriptor, Diagnostics: diagnostics };
  }
  FindMarker(nodeOrMarker) {
    return findFieldMarker(nodeOrMarker, "orm");
  }
  ParseFieldType(source) {
    const type = {};
    setIfDefined2(type, "Code", stringProp2(source, "code"));
    setIfDefined2(type, "Base", stringProp2(source, "base"));
    setIfDefined2(type, "RefType", stringProp2(source, "ref_type") ?? stringProp2(source, "refType"));
    setIfDefined2(type, "Multiple", boolProp(source, "multiple"));
    return type;
  }
  ParseDb(source) {
    const db = {};
    setIfDefined2(db, "Name", stringProp2(source, "name"));
    setIfDefined2(db, "Type", stringProp2(source, "type"));
    return db;
  }
}

class DomainFieldAnnotationProfile {
  Parse(nodeOrMarker) {
    const diagnostics = [];
    const descriptor = {
      Validations: []
    };
    const marker = this.FindMarker(nodeOrMarker);
    if (marker == null) {
      diagnostics.push({
        Code: "DOMAINFIELD001",
        Message: "Domain field annotation must use #(domain #field :{ ... })."
      });
      return { Descriptor: descriptor, Diagnostics: diagnostics };
    }
    for (const item of annotationItems2(marker)) {
      switch (item.Name) {
        case "type":
          descriptor.Type = this.ParseDomainType(item.Value);
          if (descriptor.Type.Name == null) {
            diagnostics.push({
              Code: "DOMAINFIELD002",
              Message: "Domain field type annotation should include @name.",
              Location: "type"
            });
          }
          break;
        case "validate":
          for (const validation of asArray(item.Value)) {
            descriptor.Validations.push(this.ParseValidation(validation));
          }
          break;
        default:
          diagnostics.push({
            Code: "DOMAINFIELD004",
            Message: `Unsupported domain field annotation item '${item.Name ?? "<missing>"}'.`,
            Location: item.Name
          });
          break;
      }
    }
    return { Descriptor: descriptor, Diagnostics: diagnostics };
  }
  FindMarker(nodeOrMarker) {
    return findFieldMarker(nodeOrMarker, "domain");
  }
  ParseDomainType(source) {
    const type = {};
    setIfDefined2(type, "Name", stringProp2(source, "name"));
    setIfDefined2(type, "Base", stringProp2(source, "base"));
    return type;
  }
  ParseValidation(source) {
    const validation = {};
    setIfDefined2(validation, "Kind", stringProp2(source, "kind"));
    setIfDefined2(validation, "Value", valueProp2(source, "value"));
    setIfDefined2(validation, "Pattern", stringProp2(source, "pattern"));
    return validation;
  }
}
function findFieldMarker(nodeOrMarker, coreName) {
  if (nodeOrMarker instanceof KnKnot && wordName3(nodeOrMarker.Core) === coreName && wordName3(nodeOrMarker.Name) === "field") {
    return nodeOrMarker;
  }
  const annotationSource = nodeOrMarker?.Metadata?.source_annotations ?? nodeOrMarker;
  const entry = new AnnotationExtractor().Extract(annotationSource).Entries.find((candidate) => candidate.Source === "preModifier" && candidate.Name === "field" && candidate.Value instanceof KnKnot && wordName3(candidate.Value.Core) === coreName);
  return entry?.Value ?? null;
}
function annotationItems2(marker) {
  if (marker.Conf != null) {
    return Object.entries(marker.Conf).filter(([_, value]) => typeof value !== "function").map(([name, value]) => ({ Name: name, Value: value }));
  }
  return (marker.Body ?? []).filter((item) => item instanceof KnKnot).map((item) => ({ Name: wordName3(item.Core), Value: item }));
}
function setIfDefined2(target, key, value) {
  if (value !== undefined && value !== null) {
    target[key] = value;
  }
}
function stringAttr(knot, name) {
  const value = valueAttr(knot, name);
  return value == null ? undefined : String(value);
}
function directString2(source) {
  if (source instanceof KnKnot) {
    return stringAttr(source, "value");
  }
  const value = valueToPrimitive2(source);
  return value == null ? undefined : String(value);
}
function stringProp2(source, name) {
  const value = valueProp2(source, name);
  return value == null ? undefined : String(value);
}
function boolProp(source, name) {
  return boolValue(valueProp2(source, name));
}
function boolValue(value) {
  if (value == null) {
    return;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const stringValue = String(valueToPrimitive2(value)).toLowerCase();
  if (stringValue === "true") {
    return true;
  }
  if (stringValue === "false") {
    return false;
  }
  return Boolean(value);
}
function valueAttr(knot, name) {
  return valueToPrimitive2(knot.Attr?.[name]);
}
function valueProp2(source, name) {
  if (source instanceof KnKnot) {
    const confValue = source.Conf?.[name];
    return confValue === undefined ? valueAttr(source, name) : valueToPrimitive2(confValue);
  }
  return valueToPrimitive2(source?.[name]);
}
function asArray(value) {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
function valueToPrimitive2(value) {
  if (value instanceof KnWord) {
    return value.GetFullNameStr();
  }
  if (value instanceof KnSymbol) {
    return value.Value;
  }
  if (value instanceof KnKnot) {
    return wordName3(value.Name) ?? wordName3(value.Core);
  }
  return value;
}
function wordName3(node) {
  if (node instanceof KnWord) {
    return node.GetFullNameStr();
  }
  if (node instanceof KnSymbol) {
    return node.Value;
  }
  if (typeof node === "string") {
    return node;
  }
  return null;
}
// ../type-annotations/lib/OrmRelationAnnotations.ts
class OrmRelationAnnotationValidator {
  Validate(descriptor, options = {}) {
    const diagnostics = [];
    this.ValidateEnums(descriptor, options, diagnostics);
    this.ValidateEndpoints(descriptor, diagnostics);
    this.ValidateJoinShape(descriptor, diagnostics);
    this.ValidateSchemaFields(descriptor, options, diagnostics);
    return diagnostics;
  }
  ValidateEnums(descriptor, options, diagnostics) {
    if (descriptor.Type != null && !includesNormalized(options.AllowedTypes ?? ["LOOK_UP", "MASTER_DETAIL"], descriptor.Type)) {
      diagnostics.push({
        Code: "ORMRELVAL001",
        Message: `Unsupported depa ORM relation type '${descriptor.Type}'.`,
        Location: "type"
      });
    }
    if (descriptor.Cardinality != null && !includesNormalized(options.AllowedCardinalities ?? ["ONE_TO_ONE", "ONE_TO_MANY", "MANY_TO_ONE", "MANY_TO_MANY"], descriptor.Cardinality)) {
      diagnostics.push({
        Code: "ORMRELVAL002",
        Message: `Unsupported depa ORM relation cardinality '${descriptor.Cardinality}'.`,
        Location: "cardinality"
      });
    }
    if (descriptor.Write?.CascadeDelete != null && !includesNormalized(options.AllowedCascadeDelete ?? ["delete", "none", "restrict", "nullify", "soft_delete"], descriptor.Write.CascadeDelete)) {
      diagnostics.push({
        Code: "ORMRELVAL003",
        Message: `Unsupported depa ORM cascade_delete value '${descriptor.Write.CascadeDelete}'.`,
        Location: "write.cascade_delete"
      });
    }
  }
  ValidateEndpoints(descriptor, diagnostics) {
    this.ValidateEndpoint("from", descriptor.From, diagnostics);
    this.ValidateEndpoint("to", descriptor.To, diagnostics);
  }
  ValidateEndpoint(location, endpoint, diagnostics) {
    if (endpoint == null) {
      diagnostics.push({
        Code: "ORMRELVAL004",
        Message: `ORM relation ${location} endpoint is required for depa ORM validation.`,
        Location: location
      });
      return;
    }
    if (endpoint.Field == null || (endpoint.Keys ?? []).length === 0) {
      diagnostics.push({
        Code: "ORMRELVAL004",
        Message: `ORM relation ${location} endpoint must include field and keys.`,
        Location: location
      });
    }
  }
  ValidateJoinShape(descriptor, diagnostics) {
    const fromKeys = descriptor.From?.Keys ?? [];
    const toKeys = descriptor.To?.Keys ?? [];
    if (descriptor.Through.length === 0) {
      this.ValidateKeyCount("from.keys", fromKeys, "to.keys", toKeys, diagnostics);
      return;
    }
    const first = descriptor.Through[0];
    this.ValidateKeyCount("from.keys", fromKeys, "through[0].from_keys", first.FromKeys ?? [], diagnostics);
    for (let index = 0;index < descriptor.Through.length - 1; index++) {
      const current = descriptor.Through[index];
      const next = descriptor.Through[index + 1];
      this.ValidateKeyCount(`through[${index}].to_keys`, current.ToKeys ?? [], `through[${index + 1}].from_keys`, next.FromKeys ?? [], diagnostics);
    }
    const last = descriptor.Through[descriptor.Through.length - 1];
    this.ValidateKeyCount(`through[${descriptor.Through.length - 1}].to_keys`, last.ToKeys ?? [], "to.keys", toKeys, diagnostics);
  }
  ValidateKeyCount(leftLocation, left, rightLocation, right, diagnostics) {
    if (left.length > 0 && right.length > 0 && left.length !== right.length) {
      diagnostics.push({
        Code: "ORMRELVAL005",
        Message: `Join key count mismatch between ${leftLocation} and ${rightLocation}.`,
        Location: `${leftLocation}:${rightLocation}`
      });
    }
  }
  ValidateSchemaFields(descriptor, options, diagnostics) {
    if (options.Schema?.HasField == null) {
      return;
    }
    this.ValidateEndpointFields(options.FromEntity, "from", descriptor.From, options.Schema, diagnostics);
    this.ValidateEndpointFields(options.ToEntity, "to", descriptor.To, options.Schema, diagnostics);
    for (const [index, through] of descriptor.Through.entries()) {
      this.ValidateFields(through.Entity, `through[${index}]`, [...through.FromKeys ?? [], ...through.ToKeys ?? []], options.Schema, diagnostics);
    }
  }
  ValidateEndpointFields(entityName, location, endpoint, schema, diagnostics) {
    if (entityName == null || endpoint == null) {
      return;
    }
    this.ValidateFields(entityName, location, [endpoint.Field, ...endpoint.Keys ?? []], schema, diagnostics);
  }
  ValidateFields(entityName, location, fields, schema, diagnostics) {
    if (entityName == null) {
      return;
    }
    for (const field of fields.filter((item) => item != null)) {
      if (!schema.HasField(entityName, field)) {
        diagnostics.push({
          Code: "ORMRELVAL006",
          Message: `Field '${field}' does not exist on entity '${entityName}'.`,
          Location: `${location}.${field}`
        });
      }
    }
  }
}
function ValidateDepaOrmRelation(descriptor, options = {}) {
  return new OrmRelationAnnotationValidator().Validate(descriptor, options);
}

class OrmRelationAnnotationProfile {
  Parse(nodeOrMarker) {
    const diagnostics = [];
    const descriptor = {
      Through: []
    };
    const marker = this.FindMarker(nodeOrMarker);
    if (marker == null) {
      diagnostics.push({
        Code: "ORMREL001",
        Message: "ORM relation annotation must use #(orm #relation :{ ... })."
      });
      return { Descriptor: descriptor, Diagnostics: diagnostics };
    }
    for (const item of annotationItems3(marker)) {
      switch (item.Name) {
        case "type":
          descriptor.Type = directString3(item.Value);
          break;
        case "cardinality":
          descriptor.Cardinality = directString3(item.Value);
          break;
        case "from":
          descriptor.From = this.ParseEndpoint(item.Value, "from", diagnostics);
          break;
        case "to":
          descriptor.To = this.ParseEndpoint(item.Value, "to", diagnostics);
          break;
        case "through":
          for (const through of asArray2(item.Value)) {
            descriptor.Through.push(this.ParseThrough(through, diagnostics));
          }
          break;
        case "write":
          descriptor.Write = this.ParseWrite(item.Value);
          break;
        default:
          diagnostics.push({
            Code: "ORMREL004",
            Message: `Unsupported ORM relation annotation item '${item.Name ?? "<missing>"}'.`,
            Location: item.Name
          });
          break;
      }
    }
    if (descriptor.From != null && ((descriptor.From.Keys ?? []).length === 0 || descriptor.From.Field == null)) {
      diagnostics.push({
        Code: "ORMREL002",
        Message: "ORM relation from endpoint must include field and keys.",
        Location: "from"
      });
    }
    if (descriptor.To != null && ((descriptor.To.Keys ?? []).length === 0 || descriptor.To.Field == null)) {
      diagnostics.push({
        Code: "ORMREL002",
        Message: "ORM relation to endpoint must include field and keys.",
        Location: "to"
      });
    }
    return { Descriptor: descriptor, Diagnostics: diagnostics };
  }
  FindMarker(nodeOrMarker) {
    if (nodeOrMarker instanceof KnKnot && wordName4(nodeOrMarker.Core) === "orm" && wordName4(nodeOrMarker.Name) === "relation") {
      return nodeOrMarker;
    }
    const annotationSource = nodeOrMarker?.Metadata?.source_annotations ?? nodeOrMarker;
    const entry = new AnnotationExtractor().Extract(annotationSource).Entries.find((candidate) => candidate.Source === "preModifier" && candidate.Name === "relation" && candidate.Value instanceof KnKnot && wordName4(candidate.Value.Core) === "orm");
    return entry?.Value ?? null;
  }
  ParseEndpoint(source, location, diagnostics) {
    const endpoint = {};
    setIfDefined3(endpoint, "Field", stringProp3(source, "field"));
    setIfDefined3(endpoint, "FieldName", stringProp3(source, "field_name") ?? stringProp3(source, "name"));
    setIfDefined3(endpoint, "Description", stringProp3(source, "description"));
    const keys = stringListProp(source, "keys");
    if (keys.length > 0) {
      endpoint.Keys = keys;
    }
    setIfDefined3(endpoint, "Foreign", boolProp2(source, "foreign"));
    setIfDefined3(endpoint, "Visible", boolProp2(source, "visible"));
    setIfDefined3(endpoint, "EnableWriteBizFields", boolProp2(source, "enable_write_biz_fields"));
    if ((endpoint.Keys ?? []).length === 0 || endpoint.Field == null) {
      diagnostics.push({
        Code: "ORMREL002",
        Message: `ORM relation ${location} endpoint must include field and keys.`,
        Location: location
      });
    }
    return endpoint;
  }
  ParseThrough(source, diagnostics) {
    const through = {
      Entity: source instanceof KnKnot ? wordName4(source.Name) : stringProp3(source, "entity") ?? stringProp3(source, "name"),
      FromKeys: stringListProp(source, "from_keys"),
      ToKeys: stringListProp(source, "to_keys"),
      Constraints: {
        On: [],
        Where: [],
        Order: []
      }
    };
    setIfDefined3(through, "FromForeign", boolProp2(source, "from_foreign"));
    setIfDefined3(through, "ToForeign", boolProp2(source, "to_foreign"));
    this.ParseConstraints(source, through.Constraints);
    if (through.Entity == null || through.FromKeys.length === 0 || through.ToKeys.length === 0) {
      diagnostics.push({
        Code: "ORMREL003",
        Message: "ORM relation through item must include an entity name, from_keys, and to_keys.",
        Location: through.Entity
      });
    }
    return through;
  }
  ParseConstraints(source, constraints) {
    for (const item of source?.Body ?? []) {
      if (!(item instanceof KnKnot)) {
        continue;
      }
      const field = stringProp3(item, "field");
      switch (wordName4(item.Core)) {
        case "on":
          if (field != null) {
            constraints.On.push({ Field: field, Equals: valueProp3(item, "equals") });
          }
          break;
        case "where":
          if (field != null) {
            constraints.Where.push({ Field: field, Equals: valueProp3(item, "equals") });
          }
          break;
        case "order":
          {
            const order = parseOrder(item);
            if (hasOrderValue(order)) {
              constraints.Order.push(order);
            }
          }
          break;
        case "limit":
          {
            const value = valueProp3(item, "value");
            if (typeof value === "number") {
              constraints.Limit = value;
            }
          }
          break;
      }
    }
    for (const item of asArray2(valueProp3(source, "on"))) {
      const field = stringProp3(item, "field");
      if (field != null) {
        constraints.On.push({ Field: field, Equals: valueProp3(item, "equals") });
      }
    }
    for (const item of asArray2(valueProp3(source, "where"))) {
      const field = stringProp3(item, "field");
      if (field != null) {
        constraints.Where.push({ Field: field, Equals: valueProp3(item, "equals") });
      }
    }
    for (const item of asArray2(valueProp3(source, "order"))) {
      const order = parseOrder(item);
      if (hasOrderValue(order)) {
        constraints.Order.push(order);
      }
    }
    const limit = valueProp3(source, "limit");
    if (typeof limit === "number") {
      constraints.Limit = limit;
    }
  }
  ParseWrite(source) {
    const write = {};
    setIfDefined3(write, "CascadeDelete", stringProp3(source, "cascade_delete"));
    return write;
  }
}
function parseOrder(source) {
  const order = {};
  setIfDefined3(order, "Field", stringProp3(source, "field"));
  setIfDefined3(order, "Direction", stringProp3(source, "direction"));
  setIfDefined3(order, "Namespace", stringProp3(source, "namespace"));
  setIfDefined3(order, "Alias", stringProp3(source, "alias"));
  setIfDefined3(order, "OrderSet", stringProp3(source, "order_set") ?? stringProp3(source, "orderSet"));
  setIfDefined3(order, "EntityName", stringProp3(source, "entity_name") ?? stringProp3(source, "entityName"));
  const relativePath = stringListProp(source, "relative_path");
  if (relativePath.length > 0) {
    order.RelativePath = relativePath;
  }
  return order;
}
function hasOrderValue(order) {
  return Object.keys(order).length > 0;
}
function includesNormalized(allowed, value) {
  const normalizedValue = normalizeEnumValue(value);
  return allowed.map(normalizeEnumValue).includes(normalizedValue);
}
function normalizeEnumValue(value) {
  return String(value).replace(/-/g, "_").toUpperCase();
}
function annotationItems3(marker) {
  if (marker.Conf != null) {
    return Object.entries(marker.Conf).filter(([_, value]) => typeof value !== "function").map(([name, value]) => ({ Name: name, Value: value }));
  }
  return (marker.Body ?? []).filter((item) => item instanceof KnKnot).map((item) => ({ Name: wordName4(item.Core), Value: item }));
}
function setIfDefined3(target, key, value) {
  if (value !== undefined && value !== null) {
    target[key] = value;
  }
}
function stringAttr2(knot, name) {
  const value = valueAttr2(knot, name);
  return value == null ? undefined : String(value);
}
function directString3(source) {
  if (source instanceof KnKnot) {
    return stringAttr2(source, "value");
  }
  const value = valueToPrimitive3(source);
  return value == null ? undefined : String(value);
}
function stringProp3(source, name) {
  const value = valueProp3(source, name);
  return value == null ? undefined : String(value);
}
function stringListAttr(knot, name) {
  const value = knot.Attr?.[name];
  if (Array.isArray(value)) {
    return value.map((item) => valueToPrimitive3(item)).filter((item) => item != null).map(String);
  }
  const single2 = valueToPrimitive3(value);
  return single2 == null ? [] : [String(single2)];
}
function stringListProp(source, name) {
  if (source instanceof KnKnot && source.Conf?.[name] === undefined) {
    return stringListAttr(source, name);
  }
  const value = valueProp3(source, name);
  if (Array.isArray(value)) {
    return value.map((item) => valueToPrimitive3(item)).filter((item) => item != null).map(String);
  }
  const single2 = valueToPrimitive3(value);
  return single2 == null ? [] : [String(single2)];
}
function boolProp2(source, name) {
  return boolValue2(valueProp3(source, name));
}
function boolValue2(value) {
  if (value == null) {
    return;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const stringValue = String(valueToPrimitive3(value)).toLowerCase();
  if (stringValue === "true") {
    return true;
  }
  if (stringValue === "false") {
    return false;
  }
  return Boolean(value);
}
function valueAttr2(knot, name) {
  return valueToPrimitive3(knot.Attr?.[name]);
}
function valueProp3(source, name) {
  if (source instanceof KnKnot) {
    const confValue = source.Conf?.[name];
    return confValue === undefined ? valueAttr2(source, name) : valueToPrimitive3(confValue);
  }
  return valueToPrimitive3(source?.[name]);
}
function asArray2(value) {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
function valueToPrimitive3(value) {
  if (value instanceof KnWord) {
    return value.GetFullNameStr();
  }
  if (value instanceof KnSymbol) {
    return value.Value;
  }
  if (value instanceof KnKnot) {
    return wordName4(value.Name) ?? wordName4(value.Core);
  }
  return value;
}
function wordName4(node) {
  if (node instanceof KnWord) {
    return node.GetFullNameStr();
  }
  if (node instanceof KnSymbol) {
    return node.Value;
  }
  if (typeof node === "string") {
    return node;
  }
  return null;
}
export {
  registerTypeSystemBridge,
  getWord,
  getTypeName,
  firstTypePrefix,
  WrapTypedRuntimeValue,
  ValidateDepaOrmRelation,
  UnwrapTypedRuntimeValue,
  TypedValue,
  TypeSystem,
  TypeRegistry,
  TypeReferenceSymbol,
  TypeProjection,
  TypeComputationOps,
  TypeCheckingResult,
  TypeBindingResult,
  TypeBindingDiagnostic,
  TaskQueue,
  TableMeta,
  StringValue,
  SplitTopLevelExpressions,
  SchemaTypeSymbol,
  SchemaMixinSymbol,
  SchemaConstraintProfile,
  RuntimeTypeCheckError,
  RuntimeState,
  RuntimeReturnSignal,
  RuntimeOpCode,
  RuntimeObject,
  RuntimeInterpreter,
  RuntimeFiberStatus,
  RuntimeFiber,
  RuntimeContinueSignal,
  RuntimeContinuationResumeSignal,
  RuntimeClassDefinition,
  RuntimeBreakSignal,
  RowTypeSymbol,
  RowQualifier,
  RowMemberResolutionStatus,
  RowMemberResolutionResult,
  RowMemberBuilder,
  RowMember,
  RowImplementation,
  RequireTypeSystemBridge,
  RelationTypeSymbol,
  RegisterTypeSystemBridge,
  ProjectedObjectValue,
  PrimitiveTypeSymbol,
  ParseKonSourceItems,
  OrmRelationAnnotationValidator,
  OrmRelationAnnotationProfile,
  OrmFieldAnnotationProfile,
  OrmEntityAnnotationProfile,
  OrmDataSourceAnnotationProfile,
  ObjectValue,
  KnNodeHelper as NodeHelper,
  NeverTypeSymbol,
  MethodBuilder,
  MethodBody,
  MapValue,
  ListValue,
  KonTypedRuntimeContext,
  KonTypedRuntimeBindingResult,
  KonTypedObject,
  KonTypedExecutionContext,
  KonTypedBlockTypeCheckError,
  KonTypedBlockEvaluator,
  KonTypedBlockError,
  KonTypeComputationRuntime,
  KonTypeChecker,
  KonTypeBinder,
  KnotCallType,
  KnWrapper,
  KnWord,
  KnUnquote,
  KnUnorderedMap,
  KnUnknown,
  KnTuple,
  KnSymbol,
  KnSubscript,
  KnRawString,
  KnQuoteWrapper,
  KnPropertyFunc,
  KnProperty,
  KnOperandStack,
  KnNodeType,
  KnMethodFunc,
  KnLambdaFunction,
  KnKnot,
  KnInterpolatedString,
  KnHostFunction,
  KnConverter,
  KnCompositeFunctionBase,
  KnActionWrapper,
  InvocationContext,
  IntValue,
  InheritanceKind,
  GetTypeSystemBridge,
  GenericTypeSymbol,
  GenericRowTypeSymbol,
  GenericFunctionTypeSymbol,
  FunctionValue,
  FunctionTypeSymbol,
  FieldStorageMeta,
  FieldStorage,
  FieldPropMeta,
  EnumValueSymbol,
  EnumTypeSymbol,
  EffectSymbol,
  EffectRow,
  DomainFieldAnnotationProfile,
  ClearTypeSystemBridge,
  ClassTypeSymbol,
  ClassDefinition,
  CalcPropMeta,
  BuiltInAnnotationNames,
  BrandedScalarTypeSymbol,
  BoolValue,
  AnyValue,
  AnyTypeSymbol,
  AnnotationExtractor,
  AccessModifier
};
