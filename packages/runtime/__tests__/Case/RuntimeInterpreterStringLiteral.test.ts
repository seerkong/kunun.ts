import assert from 'assert';
import fs from 'fs';

import { KnConverter } from 'kunun-converter/KnConverter';
import { RuntimeInterpreter } from 'kunun-runtime';

const SOURCE_DIR = __dirname + '/../Resource/RuntimeInterpreter/Source';
const STRING_DIR = __dirname + '/../Resource/RuntimeInterpreter/String';

function readSource(fileName: string, baseDir = SOURCE_DIR): string {
  return fs.readFileSync(`${baseDir}/${fileName}`, 'utf-8');
}

describe('RuntimeInterpreter string literal evaluation', function () {
  it('evaluates Kon interpolated and raw string literals from source', function () {
    const result = RuntimeInterpreter.EvalBlockSourceSync(readSource('StringInterpolation.kon'));

    assert.deepEqual(result, [
      'hello Kunun',
      'sum = 3',
      'raw \\(name)',
      'raw multiline\n\\(name)',
      '\\(name)',
    ]);
  });

  it('evaluates Knl interpolated string parser output with bracketed expressions', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.define('name', 'Knl');
    const parsed = KnConverter.Knl.Parser.Parse('"hello \\[name], sum \\[[1 2 :+]]"');

    assert.equal(RuntimeInterpreter.ExecWithRuntimeSync(runtime, parsed), 'hello Knl, sum 3');
  });

  it('executes literal forms, escapes, raw strings, and delimiter-like content from a Kon script resource', function () {
    const result = RuntimeInterpreter.EvalBlockSourceSync(readSource('LiteralFormsAndEscapes.kon', STRING_DIR));

    assert.deepEqual(result, [
      'hello Kunun',
      'double quote: "',
      'literal interpolation marker: \\(name)',
      'multiline\nname=Kunun\nsum=3\ntriple double="""',
      'raw \\n \\(name)',
      'raw multiline\n\\(name)\n"""',
    ]);
  });

  it('executes interpolation inside functions, object methods, and foreach loops from a Kon script resource', function () {
    const result = RuntimeInterpreter.EvalBlockSourceSync(readSource('InterpolationInLanguageFeatures.kon', STRING_DIR));

    assert.deepEqual(result, [
      'user=Ada',
      'box=Kunun',
      ['item=1', 'item=2', 'item=3'],
    ]);
  });

  it('executes multiline expression interpolation and preserves raw multiline content from a Kon script resource', function () {
    const result = RuntimeInterpreter.EvalBlockSourceSync(readSource('MultilineExpressionInterpolation.kon', STRING_DIR));

    assert.deepEqual(result, [
      'BEGIN\ntitle=report\ncalc=7\nEND',
      'BEGIN\n\\(lines::0)\n\\((left right :+))\nEND',
    ]);
  });
});
