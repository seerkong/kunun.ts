import assert from 'assert';

import { Lexer, LexException } from 'kunun-converter/Lexer/Lexer';

// T1.5 (D11): a non-ASCII bare word (e.g. a Chinese character) is NOT supported
// as an identifier — the Identifier regex is ASCII-only ([_a-zA-Z][_a-zA-Z0-9]*).
//
// Decision (conservative, diagnosed-reject): rather than silently failing with a
// generic "Invalid Token", the lexer must raise a CLEAR, position-bearing
// diagnostic that names the offending character and states that non-ASCII
// characters are not supported as identifiers. We deliberately do NOT add full
// Unicode identifier support (a large language feature) here.
//
// NOTE: non-ASCII inside `//` line comments is handled elsewhere and is
// unaffected; this case targets the IDENTIFIER position only.
describe('non-ASCII identifier diagnostic (T1.5 / D11)', function () {
  it('rejects a bare non-ASCII word with a clear, position-bearing diagnostic', function () {
    assert.throws(
      () => Lexer.Lex('哈'),
      (err: unknown) => {
        assert.ok(err instanceof LexException, `expected a LexException, got ${err}`);
        const lex = err as LexException;
        // No longer the generic, contextless message.
        assert.notEqual(lex.message, 'Invalid Token');
        // Position is preserved.
        assert.equal(lex.row, 1);
        assert.equal(lex.column, 1);
        // The diagnostic must name the offending character and call out that
        // non-ASCII characters are not supported as identifiers.
        assert.match(lex.message, /哈/);
        assert.match(lex.message, /non-ASCII/i);
        assert.match(lex.message, /identifier/i);
        return true;
      },
    );
  });

  it('reports the correct position for a non-ASCII char that follows valid tokens', function () {
    assert.throws(
      () => Lexer.Lex('(set x 名)'),
      (err: unknown) => {
        assert.ok(err instanceof LexException, `expected a LexException, got ${err}`);
        const lex = err as LexException;
        assert.equal(lex.row, 1);
        // '(', 's','e','t', ' ', 'x', ' ' => the non-ASCII char is at column 8.
        assert.equal(lex.column, 8);
        assert.match(lex.message, /名/);
        assert.match(lex.message, /non-ASCII/i);
        return true;
      },
    );
  });

  it('still rejects a genuinely unsupported ASCII control/symbol with a diagnostic naming it', function () {
    // A character that is neither ASCII-identifier nor any known punctuation
    // token must still produce a clear diagnostic (not "Invalid Token").
    assert.throws(
      () => Lexer.Lex('\\'),
      (err: unknown) => {
        assert.ok(err instanceof LexException, `expected a LexException, got ${err}`);
        const lex = err as LexException;
        assert.notEqual(lex.message, 'Invalid Token');
        assert.equal(lex.row, 1);
        assert.equal(lex.column, 1);
        return true;
      },
    );
  });
});
