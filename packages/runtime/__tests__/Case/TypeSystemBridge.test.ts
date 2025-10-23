import assert from 'assert';

import {
  ClearTypeSystemBridge,
  GetTypeSystemBridge,
  RegisterTypeSystemBridge,
  RuntimeInterpreter,
  RuntimeTypeCheckError,
  TypeSystemBridge,
} from 'kunun-runtime';

function withBridge(bridge: TypeSystemBridge | null, action: () => void): void {
  const previous = GetTypeSystemBridge();
  ClearTypeSystemBridge();
  if (bridge != null) {
    RegisterTypeSystemBridge(bridge);
  }
  try {
    action();
  } finally {
    ClearTypeSystemBridge();
    if (previous != null) {
      RegisterTypeSystemBridge(previous);
    }
  }
}

describe('TypeSystemBridge', function () {
  it('runs untyped scripts without a bridge', function () {
    withBridge(null, () => {
      const result = RuntimeInterpreter.EvalBlockSourceSync('(+ 1 2)');
      assert.equal(result, 3);
    });
  });

  it('throws a clear error when the typed entry is used without a bridge', function () {
    withBridge(null, () => {
      assert.throws(
        () => RuntimeInterpreter.EvaluateTypedBlockSync('(+ 1 2)'),
        /TypeSystem bridge not registered/,
      );
      assert.throws(
        () => RuntimeInterpreter.TypeCheckSource('(+ 1 2)'),
        /TypeSystem bridge not registered/,
      );
    });
  });

  it('dispatches opt-in type checking through a registered bridge', function () {
    const checked: string[] = [];
    const bridge: TypeSystemBridge = {
      CheckSource: source => {
        checked.push(source);
        return { Success: true, Diagnostics: [] };
      },
      BindSource: () => ({ Success: false, Diagnostics: [] }),
      IsTypedObject: () => false,
    };
    withBridge(bridge, () => {
      const result = RuntimeInterpreter.EvalBlockSourceSync('(+ 1 2)', { typeCheck: true });
      assert.equal(result, 3);
      assert.equal(checked.length, 1);
    });
  });

  it('raises RuntimeTypeCheckError when the bridge reports diagnostics', function () {
    const bridge: TypeSystemBridge = {
      CheckSource: () => ({
        Success: false,
        Diagnostics: [{ Code: 'KN-TEST', Message: 'forced failure' }],
      }),
      BindSource: () => ({ Success: false, Diagnostics: [] }),
      IsTypedObject: () => false,
    };
    withBridge(bridge, () => {
      assert.throws(
        () => RuntimeInterpreter.EvalBlockSourceSync('(+ 1 2)', { typeCheck: true }),
        (error: any) => error instanceof RuntimeTypeCheckError
          && error.Result.Diagnostics[0].Code === 'KN-TEST',
      );
    });
  });
});
