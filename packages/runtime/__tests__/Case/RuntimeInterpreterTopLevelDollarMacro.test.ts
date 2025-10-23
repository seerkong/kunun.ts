import assert from 'assert';

import { RuntimeInterpreter } from 'kunun-runtime';
import { KnConverter } from 'kunun-converter/KnConverter';

// Regression for T2.3 (D6): the block evaluation entry must agree with the
// node evaluation entry for top-level `$`-prefixed syntax macros (`${}`, `$[]`,
// `$()`, `$<>`). Previously SplitTopLevelExpressions did not recognise the `$`
// prefix as part of the following balanced bracket, so it sliced `${a` (etc.)
// into a bogus fragment and EvalBlockSourceSync threw "End of stream" while the
// node entry produced the expected value.
describe('RuntimeInterpreter top-level $ macro entry parity', function () {
  const nodeEval = (source: string) => RuntimeInterpreter.ExecSync(KnConverter.Kon.Parser.Parse(source));

  const cases: string[] = [
    '${a = 1 b = 2}',
    '$[1 2 3]',
    '$(1 2 3)',
    // ordered-map rows are `key = value`; `$<a 1 b 2>` (no `=`) is malformed
    // (it parses to an unclosed-container diagnostic on both entries).
    '$<a = 1 b = 2>',
  ];

  for (const source of cases) {
    it(`EvalBlockSourceSync matches node entry for ${source}`, function () {
      const expected = nodeEval(source);
      const actual = RuntimeInterpreter.EvalBlockSourceSync(source);
      assert.deepStrictEqual(actual, expected);
    });
  }

  it('keeps a top-level $ macro intact when followed by trailing expressions', function () {
    // The block splitter must treat `$[...]` as one expression even when more
    // expressions follow; the last block expression value wins.
    const source = '$[1 2 3]\n[4 5 6]';
    assert.deepStrictEqual(RuntimeInterpreter.EvalBlockSourceSync(source), [4, 5, 6]);
  });
});
