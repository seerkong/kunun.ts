import assert from 'assert';

import { Lexer, TokenType } from 'kunun-converter/Lexer/Lexer';
import { KnConverter } from 'kunun-converter/KnConverter';
import { KnInterpolatedString } from 'kunun-core';

// D9: a double-quoted string literal whose `\(...)` interpolation contains its
// own double-quoted string literals must lex as ONE String token. The nested
// `"` must not prematurely close the outer string.
describe('string interpolation nesting (D9)', function () {
  it('lexes nested double-quoted strings inside an interpolation as a single String token', function () {
    const source = '"hi \\((Concat "a" "b"))"';
    const tokens = Lexer.Lex(source);

    assert.equal(tokens.length, 1, `expected a single token, got ${tokens.map((t) => t.toString()).join(' | ')}`);
    assert.equal(tokens[0].Type, TokenType.String);
    assert.equal(tokens[0].Value, source);
  });

  it('parses an interpolation containing nested double-quoted strings without corruption', function () {
    const parsed = KnConverter.Kon.Parser.Parse('"hi \\((Concat "a" "b"))"') as KnInterpolatedString;

    assert.ok(parsed instanceof KnInterpolatedString);
    assert.deepEqual(parsed.Parts.map((part) => part.kind), ['text', 'expr']);
    assert.equal(parsed.Parts[0].value, 'hi ');
  });
});

// D10: `\uXXXX` escapes in interpreted strings must decode to the corresponding
// character instead of being dropped to the bare letters after the backslash.
describe('unicode escape decoding (D10)', function () {
  it('decodes \\uXXXX to the corresponding character', function () {
    assert.equal(KnConverter.Kon.Parser.Parse('"\\u0041"'), 'A');
    assert.equal(KnConverter.Kon.Parser.Parse('"\\u0041\\u0042 ok"'), 'AB ok');
  });

  it('rejects malformed \\u escapes with a clear diagnostic', function () {
    assert.throws(() => KnConverter.Kon.Parser.Parse('"\\u00G1"'), /\\u escape/);
  });
});
