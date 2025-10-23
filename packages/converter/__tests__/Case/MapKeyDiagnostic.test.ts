import assert from 'assert';
import { KnConverter } from 'kunun-converter/KnConverter';

// Regression for D14: a map pair whose key is not a bare word or string literal
// (e.g. a number `{1 = v}`, found in a codex-generated workflow) used to crash
// the parser with "null is not an object (evaluating 'this.AsPairKey(firstNode).Value')".
// It now raises a bounded, actionable diagnostic. Word/string keys still parse.
describe('Map key diagnostic (D14)', function () {
  const parse = (source: string) => KnConverter.Kon.Parser.Parse(source);

  it('rejects a numeric map key with a clear diagnostic instead of crashing', function () {
    assert.throws(() => parse('{ 1 = "v" }'), /Map key must be a bare word or string literal/);
  });

  it('accepts a bare word key', function () {
    assert.equal((parse('{ k = 1 }') as any)?.constructor?.name, 'KnUnorderedMap');
  });

  it('accepts a string-literal key', function () {
    assert.equal((parse('{ "k" = 1 }') as any)?.constructor?.name, 'KnUnorderedMap');
  });

  it('accepts nested string-literal keys (JSON-schema shape)', function () {
    assert.doesNotThrow(() => parse('{ properties = { "name" = {type = "string"} } }'));
  });
});
