import assert from 'assert';

import * as Kunun from '../../lib';

// Export surface of the pre-split single-package lib/index.ts, captured at
// track refactor-split-bun-workspace-packages P1 baseline (bun -e import dump).
const BASELINE_EXPORTS = [
  'AccessModifier', 'AnyTypeSymbol', 'AnyValue', 'BoolValue', 'CalcPropMeta',
  'ClassDefinition', 'ClassTypeSymbol', 'EffectRow', 'EffectSymbol',
  'FieldPropMeta', 'FieldStorage', 'FieldStorageMeta', 'FunctionTypeSymbol',
  'FunctionValue', 'GenericFunctionTypeSymbol', 'GenericRowTypeSymbol',
  'GenericTypeSymbol', 'InheritanceKind', 'IntValue', 'InvocationContext',
  'KnActionWrapper', 'KnCompositeFunctionBase', 'KnConverter', 'KnHostFunction',
  'KnInterpolatedString', 'KnKnot', 'KnLambdaFunction', 'KnMethodFunc',
  'KnNodeType', 'KnOperandStack', 'KnProperty', 'KnPropertyFunc',
  'KnQuoteWrapper', 'KnRawString', 'KnSubscript', 'KnSymbol', 'KnTuple',
  'KnUnknown', 'KnUnorderedMap', 'KnUnquote', 'KnWord', 'KnWrapper',
  'KnotCallType', 'KonTypeBinder', 'KonTypeChecker', 'KonTypeComputationRuntime',
  'KonTypedBlockError', 'KonTypedBlockEvaluator', 'KonTypedBlockTypeCheckError',
  'KonTypedExecutionContext', 'KonTypedObject', 'KonTypedRuntimeBindingResult',
  'KonTypedRuntimeContext', 'ListValue', 'MapValue', 'MethodBody',
  'MethodBuilder', 'NeverTypeSymbol', 'NodeHelper', 'ObjectValue',
  'ParseKonSourceItems', 'PrimitiveTypeSymbol', 'ProjectedObjectValue',
  'RowImplementation', 'RowMember', 'RowMemberBuilder',
  'RowMemberResolutionResult', 'RowMemberResolutionStatus', 'RowQualifier',
  'RowTypeSymbol', 'RuntimeBreakSignal', 'RuntimeClassDefinition',
  'RuntimeContinuationResumeSignal', 'RuntimeContinueSignal', 'RuntimeFiber',
  'RuntimeFiberStatus', 'RuntimeInterpreter', 'RuntimeObject', 'RuntimeOpCode',
  'RuntimeReturnSignal', 'RuntimeState', 'RuntimeTypeCheckError',
  'SplitTopLevelExpressions', 'StringValue', 'TableMeta', 'TaskQueue',
  'TypeBindingDiagnostic', 'TypeBindingResult',
  'TypeCheckingResult', 'TypeComputationOps', 'TypeProjection',
  'TypeReferenceSymbol', 'TypeRegistry', 'TypeSystem', 'TypedValue',
  'UnwrapTypedRuntimeValue', 'WrapTypedRuntimeValue', 'firstTypePrefix',
  'getTypeName', 'getWord',
];

describe('kunun umbrella package public API', function () {
  it('re-exports every symbol from the pre-split package surface', function () {
    const missing = BASELINE_EXPORTS.filter(name => !(name in Kunun));
    assert.deepEqual(missing, [], `missing exports: ${missing.join(', ')}`);
  });

  it('enables typed execution just by importing the umbrella package', function () {
    const result = (Kunun as any).RuntimeInterpreter.EvaluateTypedBlockSync(`
      (class #Counter :[
        (!Int field #count)
        (new |initial| :[ (set self.:count initial) ])
        (method #get |-> Int| :[ (self.:count) ])
      ])

      (var counter (Counter ~new 7))
      (counter ~get)
    `);
    assert.equal(result, 7);
  });

  it('still runs untyped scripts through the umbrella package', function () {
    assert.equal((Kunun as any).RuntimeInterpreter.EvalBlockSourceSync('(+ 1 2)'), 3);
  });
});
