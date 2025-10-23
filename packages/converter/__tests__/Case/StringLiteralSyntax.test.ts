import assert from 'assert';

import { KnConverter } from 'kunun-converter/KnConverter';
import { KnInterpolatedString, KnRawString, KnWord } from 'kunun-core';

describe('string literal parser syntax', function () {
  it('parses interpreted and raw single-line strings', function () {
    assert.equal(KnConverter.Kon.Parser.Parse('"hello\\nworld"'), 'hello\nworld');

    const raw = KnConverter.Kon.Parser.Parse("'hello\\nworld'") as KnRawString;
    assert.ok(raw instanceof KnRawString);
    assert.equal(raw.Value, 'hello\\nworld');
  });

  it('parses interpreted and raw multiline strings', function () {
    assert.equal(
      KnConverter.Kon.Parser.Parse('  """\n  hello\n  world\n  """'),
      'hello\nworld',
    );
    assert.equal(
      KnConverter.Kon.Parser.Parse('  """  \n  hello\n  """  '),
      'hello',
    );

    const raw = KnConverter.Kon.Parser.Parse("  '''\n  hello\n  world\n  '''") as KnRawString;
    assert.ok(raw instanceof KnRawString);
    assert.equal(raw.Value, 'hello\nworld');
  });

  it('parses delimiter-like content according to string kind', function () {
    assert.equal(KnConverter.Kon.Parser.Parse('"\'\'\'"'), "'''");
    assert.equal(KnConverter.Kon.Parser.Parse('  """\n  \\\"\\\"\\\"\n  """'), '"""');

    const raw = KnConverter.Kon.Parser.Parse("  '''\n  \"\"\"\n  '''") as KnRawString;
    assert.equal(raw.Value, '"""');
  });

  it('rejects malformed triple-quoted string indentation', function () {
    assert.throws(() => KnConverter.Kon.Parser.Parse('"""inline"""'), /opening delimiter/);
    assert.throws(() => KnConverter.Kon.Parser.Parse('  """\n bad\n  """'), /less indented/);
    assert.throws(() => KnConverter.Kon.Parser.Parse('  """\n  ok\n """'), /closing delimiter/);
  });

  it('rejects triple-quoted delimiters that share a line with other content', function () {
    assert.throws(() => KnConverter.Kon.Parser.Parse('(id """\n    ok\n    """)'), /opening delimiter/);
    assert.throws(() => KnConverter.Kon.Parser.Parse('[ """\n  ok\n  """ ]'), /opening delimiter/);
    assert.throws(() => KnConverter.Kon.Parser.Parse('"""\nok\n""" trailing'), /closing delimiter/);
    assert.throws(() => KnConverter.Kon.Parser.Parse("'''\nok\n''' trailing"), /closing delimiter/);
  });

  it('parses Kon interpreted string interpolations with parenthesized expressions', function () {
    const parsed = KnConverter.Kon.Parser.Parse('"hello \\(name), sum \\((1 2 :+))"') as KnInterpolatedString;

    assert.ok(parsed instanceof KnInterpolatedString);
    assert.deepEqual(parsed.Parts.map((part) => part.kind), ['text', 'expr', 'text', 'expr']);
    assert.equal(parsed.Parts[0].value, 'hello ');
    assert.ok(parsed.Parts[1].value instanceof KnWord);
    assert.equal((parsed.Parts[1].value as KnWord).Value, 'name');
  });

  it('parses Knl interpreted string interpolations with bracketed expressions', function () {
    const parsed = KnConverter.Knl.Parser.Parse('"hello \\[name], sum \\[[1 2 :+]]"') as KnInterpolatedString;

    assert.ok(parsed instanceof KnInterpolatedString);
    assert.deepEqual(parsed.Parts.map((part) => part.kind), ['text', 'expr', 'text', 'expr']);
    assert.ok(parsed.Parts[1].value instanceof KnWord);
    assert.equal((parsed.Parts[1].value as KnWord).Value, 'name');
  });

  it('keeps interpolation-looking text literal inside raw strings', function () {
    const raw = KnConverter.Kon.Parser.Parse("'hello \\(name)'") as KnRawString;

    assert.equal(raw.Value, 'hello \\(name)');
  });
});
