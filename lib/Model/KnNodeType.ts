
export enum KnNodeType {
  Nil = 'Nil',
  Unknown = 'Unknown',
  Undefined = 'Undefined',
  Boolean = 'Boolean',
  Double = 'Double',
  Integer = 'Integer',
  Number = 'Number',
  Word = 'Word',
  Symbol = 'Symbol',
  RawString = 'RawString',
  String = 'String',
  UnorderedMap = 'UnorderedMap',
  OrderedMap = 'OrderedMap',
  Vector = 'Vector',
  Tuple = 'Tuple',
  Knot = 'Knot',

  SyntaxMarcro = 'SyntaxMarcro',
  ActionMarcro = 'ActionMarcro',
  QuoteMarcro = 'QuoteMarcro',
  PrefixMarcro = 'PrefixMarcro',
  PostfixMarcro = 'PostfixMarcro',

  Property = 'Property',
  Subscript = 'Subscript',

  Continuation = 'Continuation',
  OperandStack = 'OperandStack',

  HostAsyncDelegate = 'HostAsyncDelegate',
  HostSyncDelegate = 'HostSyncDelegate',
  HostAsyncFunc = 'HostAsyncFunc',
  HostSyncFunc = 'HostSyncFunc',
  HostSyncMethodDelegate = 'HostSyncMethodDelegate',
  HostStackFunction = 'HostStackFunction',
  Procedure = 'Procedure',
  Lambda = 'Lambda',


  Table = 'Table',
  TableMetadata = 'TableMetadata',
  FieldStorageMetadata = 'FieldStorageMetadata',
  FieldPropMetadata = 'FieldPropMetadata',
  CalcPropMetadata = 'CalcPropMetadata',
  PropertyFunc = 'PropertyFunc',
  MethodMetadata = 'MethodMetadata',
  MethodFunc = 'MethodFunc',

  CloseQuote = 'CloseQuote',
}