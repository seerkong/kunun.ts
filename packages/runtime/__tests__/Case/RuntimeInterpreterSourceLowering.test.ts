import assert from 'assert';
import fs from 'fs';

import { KnConverter } from 'kunun-converter/KnConverter';
import { RuntimeInterpreter } from 'kunun-runtime';

const BASE_DIR = __dirname + '/../Resource/RuntimeInterpreter/Source';

function readSource(fileName: string): string {
  return fs.readFileSync(`${BASE_DIR}/${fileName}`, 'utf-8');
}

describe('RuntimeInterpreter source lowering', function () {
  it('parses and evaluates ExtensibleScopedRowType simple add script', function () {
    const source = readSource('SimpleAdd.kon');

    assert.equal(RuntimeInterpreter.EvalBlockSourceSync(source), 3);
  });

  it('parses and evaluates nested Kon expressions from source', function () {
    const source = readSource('NestedAdd.kon');

    assert.equal(RuntimeInterpreter.EvalBlockSourceSync(source), 6);
  });

  it('parses and evaluates chained frame-top calls from source', function () {
    const source = readSource('ChainFrameTop.kon');

    assert.equal(RuntimeInterpreter.EvalBlockSourceSync(source), 3);
  });

  it('parses and evaluates frame-bottom in-out table calls from source', function () {
    const source = readSource('ChainFrameBottom.kon');

    assert.equal(RuntimeInterpreter.EvalBlockSourceSync(source), 3);
  });

  it('keeps parser output executable for operator infix knots', function () {
    const parsed = KnConverter.Kon.Parser.Parse('(1 2 :+)');

    assert.equal(RuntimeInterpreter.ExecSync(parsed), 3);
  });

  it('supports variables inside parsed source expressions', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.define('x', 5);

    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, '(x 3 :+)'), 8);
  });

  // Regression: `//` line comments between top-level expressions must be
  // skipped before splitting/lexing, regardless of the comment content's
  // codepoint width. A non-ASCII comment previously leaked its text as a
  // bogus top-level token, threw "Invalid Token", and tripped the Knl
  // fallback into misparsing the next `(...)` as a map.
  it('skips // line comments with non-ASCII (Chinese) content', function () {
    assert.equal(RuntimeInterpreter.EvalBlockSourceSync('(set x 1) // 哈\n(set x 2)'), 2);
  });

  it('skips // line comments with ASCII content (parity)', function () {
    assert.equal(RuntimeInterpreter.EvalBlockSourceSync('(set x 1) // hi\n(set x 2)'), 2);
  });

  it('skips a full-line Chinese // comment between expressions', function () {
    assert.equal(RuntimeInterpreter.EvalBlockSourceSync('(var a 1)\n// 这是一段中文注释\n(var b 2)\n(:+ a b)'), 3);
  });

  it('does not mistake `;` apply-sugar for a comment', function () {
    // `;` is the KnotCallParamEnd / pairs separator, not a line comment.
    assert.equal(RuntimeInterpreter.EvalBlockSourceSync('(3 4 +;)'), 7);
  });
});
