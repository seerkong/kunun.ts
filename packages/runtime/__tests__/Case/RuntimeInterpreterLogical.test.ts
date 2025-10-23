import assert from 'assert';
import fs from 'fs';

import { RuntimeInterpreter } from 'kunun-runtime';

const BASE_DIR = __dirname + '/../Resource/RuntimeInterpreter/Logical';

function readSource(fileName: string): string {
  return fs.readFileSync(`${BASE_DIR}/${fileName}`, 'utf-8');
}

describe('RuntimeInterpreter logical scripts', function () {
  it('evaluates and, or, or_else, and mixed logical expressions', function () {
    assert.deepEqual(RuntimeInterpreter.EvalBlockSourceSync(readSource('LogicalOperators.kon')), [
      false,
      true,
      'fallback',
      'value',
      true,
      false,
    ]);
  });

  it('short-circuits right-hand expressions', function () {
    assert.deepEqual(RuntimeInterpreter.EvalBlockSourceSync(readSource('ShortCircuit.kon')), [
      false,
      true,
      'value',
      0,
    ]);
  });
});
