import assert from 'assert';

import { RuntimeInterpreter } from 'kunun-runtime';

// D9: evaluating an interpreted string whose `\(...)` interpolation contains
// nested double-quoted string literals must not corrupt the top-level split or
// the string parse. Previously a nested `"` closed the outer string early and
// the source was tokenized into a map-like jumble (or threw "Unterminated").
describe('RuntimeInterpreter nested-quote interpolation (D9)', function () {
  it('evaluates an interpolation containing nested double-quoted strings', function () {
    assert.equal(
      RuntimeInterpreter.EvalBlockSourceSync('"hi \\((Concat "a" "b"))"'),
      'hi ab',
    );
  });

  it('evaluates multiple nested-quote interpolations in one string', function () {
    assert.equal(
      RuntimeInterpreter.EvalBlockSourceSync('"x \\((Concat "p" "q")) y \\((Concat "r" "s")) z"'),
      'x pq y rs z',
    );
  });
});

// D10: `\uXXXX` escapes must decode to the corresponding character at runtime.
// Previously EvalBlockSourceSync('"\\u0041"') returned "u0041".
describe('RuntimeInterpreter unicode escape decoding (D10)', function () {
  it('decodes \\u0041 to "A"', function () {
    assert.equal(RuntimeInterpreter.EvalBlockSourceSync('"\\u0041"'), 'A');
  });

  it('decodes multiple \\u escapes within a string', function () {
    assert.equal(RuntimeInterpreter.EvalBlockSourceSync('"\\u0041\\u0042 ok"'), 'AB ok');
  });
});
