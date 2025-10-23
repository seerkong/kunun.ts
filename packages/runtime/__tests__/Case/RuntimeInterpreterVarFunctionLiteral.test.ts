import assert from 'assert';

import { RuntimeInterpreter } from 'kunun-runtime';

// Regression: a function literal must be wrapped with the `fn` keyword. Writing
// `(var f |a| :[ a ])` (no `fn`) parses to just `var f` with the parameter list
// and block attached to the *name* node, so the value is missing and `f` would
// silently bind to null — and a later `(:f 1)` then reported the misleading
// "Callable not found: f". `var` now raises a clear diagnostic for this shape,
// while the correct `(var f (fn |a| :[ ... ]))` keeps working (and is callable
// via both `(:f x)` and `(f x)`).
describe('RuntimeInterpreter var function-literal diagnostic', function () {
  const evalBlock = (source: string) => RuntimeInterpreter.EvalBlockSourceSync(source);

  describe('rejects a function literal attached to the var name without fn', function () {
    for (const source of [
      '(var f |a| :[ a ])', // parameter list + block
      '(var f :[ a ])', // block only
      '(var f |a|)', // parameter list only
      '(var f |a| :[ a ]) f', // followed by a use of the bogus binding
      '(var f |a| :[ a ]) (:f 1)', // the original misleading "Callable not found" case
    ]) {
      it(`raises a diagnostic for ${source}`, function () {
        assert.throws(() => evalBlock(source), /needs the fn keyword/);
      });
    }
  });

  describe('keeps correct function-literal and plain var forms working', function () {
    it('binds a wrapped fn literal and invokes it via colon-apply', function () {
      assert.equal(evalBlock('(var f (fn |a| :[ (a 100 :+) ])) (:f 1)'), 101);
    });

    it('binds a wrapped fn literal and invokes it via a bare chain head', function () {
      assert.equal(evalBlock('(var f (fn |a| :[ (a 100 :+) ])) (f 1)'), 101);
    });

    it('keeps a plain value binding', function () {
      assert.equal(evalBlock('(var x 5) x'), 5);
    });

    it('keeps a value-less declaration binding to null', function () {
      assert.equal(evalBlock('(var x) x'), null);
    });
  });
});
