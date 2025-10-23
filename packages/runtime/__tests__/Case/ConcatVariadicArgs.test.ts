import assert from 'assert';

import { RuntimeInterpreter } from 'kunun-runtime';

// Regression for D4/T2.2: the host `Concat` function dropped leading arguments
// when invoked with three or more arguments through the bare word-head call form
// (e.g. `(Concat "a" "b" "c")` evaluated to "c" instead of "abc"). Concat is
// variadic and must concatenate every argument it is given, across all call
// forms, while the binary postfix `:Concat` chain idiom keeps working.
describe('Concat variadic arguments', function () {
  it('concatenates two arguments (no regression) in the bare word-head form', function () {
    assert.equal(RuntimeInterpreter.EvalBlockSourceSync('(Concat "a" "b")'), 'ab');
  });

  it('concatenates three arguments in the bare word-head form', function () {
    assert.equal(RuntimeInterpreter.EvalBlockSourceSync('(Concat "a" "b" "c")'), 'abc');
  });

  it('concatenates four arguments in the bare word-head form', function () {
    assert.equal(RuntimeInterpreter.EvalBlockSourceSync('(Concat "a" "b" "c" "d")'), 'abcd');
  });

  it('concatenates three arguments in the colon-apply form', function () {
    assert.equal(RuntimeInterpreter.EvalBlockSourceSync('(:Concat "a" "b" "c")'), 'abc');
  });

  it('keeps the binary postfix :Concat chain idiom working', function () {
    assert.equal(
      RuntimeInterpreter.EvalBlockSourceSync('("John" " " :Concat "Doe" :Concat)'),
      'John Doe',
    );
  });

  it('calls the host function directly with an explicit argument array', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    assert.equal(runtime.callHostFunction('Concat', ['a', 'b', 'c']), 'abc');
    assert.equal(runtime.callHostFunction('Concat', ['a', 'b']), 'ab');
  });
});
