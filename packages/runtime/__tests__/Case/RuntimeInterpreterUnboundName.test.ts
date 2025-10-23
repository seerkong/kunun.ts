import assert from 'assert';

import { RuntimeInterpreter } from 'kunun-runtime';

// Regression for triage defect D8: referencing a genuinely-unbound name must
// raise a clear diagnostic instead of silently resolving to null / the trailing
// operand. The check keys on TRUE unbinding of a Word (not host fn, not workflow
// extension, not declared in any env) — so bound-but-non-callable heads and
// literal heads keep working, and type-system names (read syntactically / env
// bound) are unaffected (covered by TypeSystemRuntimeIntegration.test.ts).
describe('RuntimeInterpreter unbound-name diagnostic (D8)', function () {
  const evalBlock = (source: string) => RuntimeInterpreter.EvalBlockSourceSync(source);

  describe('throws on a genuinely unbound name', function () {
    for (const source of [
      '(totallyUnknownWord 1 2)', // was: silently returned 2 (the last operand)
      'totallyUnknownWord', // was: silently returned null
      '(totallyUnknownWord)', // single-knot parenthesized form
    ]) {
      it(`raises Unbound name for ${source}`, function () {
        assert.throws(() => evalBlock(source), /Unbound name: totallyUnknownWord/);
      });
    }

    // The diagnostic also fires on the tree-walk chain evaluator, so unbound
    // chain heads nested as arguments / inside loop bodies / in binding values
    // are caught too (not only top-level statements).
    it('raises Unbound name for a nested unbound chain head in an argument', function () {
      assert.throws(() => evalBlock('(:+ 1 (bogusNested 2 3))'), /Unbound name: bogusNested/);
    });

    it('raises Unbound name for an unbound chain head in a foreach body', function () {
      assert.throws(() => evalBlock('(foreach n in [1] :[ (bogusLoop n) ])'), /Unbound name: bogusLoop/);
    });

    it('raises Unbound name for an unbound chain head in a binding value', function () {
      assert.throws(() => evalBlock('(var r (bogusAssign 1 2)) r'), /Unbound name: bogusAssign/);
    });
  });

  describe('does not fire on bound or non-Word heads', function () {
    it('keeps a bound, non-callable head with siblings -> last operand', function () {
      assert.equal(evalBlock('(var x 5) (x 1 2)'), 2);
    });

    it('keeps a literal head -> last operand', function () {
      assert.equal(evalBlock('(7 1 2)'), 2);
    });

    it('keeps a var-bound fn lambda callable as a chain head', function () {
      // a properly wrapped `(fn ...)` bound to a var is callable as a head and is
      // applied (109 = 9 + 100); the bound name never triggers an unbound error.
      assert.equal(evalBlock('(var f (fn |a| :[ (a 100 :+) ])) (f 9)'), 109);
    });

    it('keeps a bare bound word', function () {
      assert.equal(evalBlock('(var y 3) y'), 3);
    });

    it('keeps host-function references usable', function () {
      assert.equal(evalBlock('(:+ 1 2)'), 3);
    });
  });

  // Bodies that actually execute — invoked function bodies and taken control-flow
  // branches run via RunBlock and reach the same head check, so unbound names
  // inside them are caught too (an uninvoked lambda body is never evaluated, so
  // it is intentionally not checked).
  describe('fires inside executed function bodies and control-flow branches', function () {
    it('catches an unbound chain head in an invoked function body', function () {
      assert.throws(
        () => evalBlock('(fn #fb :|a| :[ (bogusInFn a) ]) (:fb 1)'),
        /Unbound name: bogusInFn/,
      );
    });

    it('catches an unbound chain head in a taken if THEN branch', function () {
      assert.throws(
        () => evalBlock('(if (:gt 5 3) :[ (bogusThen 1 2) ] else :[ 9 ])'),
        /Unbound name: bogusThen/,
      );
    });

    it('catches an unbound chain head in a taken if ELSE branch', function () {
      assert.throws(
        () => evalBlock('(if (:gt 1 5) :[ 1 ] else :[ (bogusElse 1 2) ])'),
        /Unbound name: bogusElse/,
      );
    });

    it('keeps a valid invoked function body and valid if branches working', function () {
      assert.equal(evalBlock('(fn #fok :|a| :[ (a a :+) ]) (:fok 5)'), 10);
      assert.equal(evalBlock('(if (:gt 5 3) :[ 7 ] else :[ 9 ])'), 7);
    });
  });
});
