import assert from 'assert';
import fs from 'fs';

import { RuntimeInterpreter } from 'kunun-runtime';

const BASE_DIR = __dirname + '/../Resource/RuntimeInterpreter/ControlFlow';

function readSource(fileName: string): string {
  return fs.readFileSync(`${BASE_DIR}/${fileName}`, 'utf-8');
}

describe('RuntimeInterpreter control-flow scripts', function () {
  it('evaluates if branches from source', function () {
    assert.equal(RuntimeInterpreter.EvalBlockSourceSync(readSource('IfElse.kon')), true);
  });

  it('evaluates cond branches from source', function () {
    assert.equal(RuntimeInterpreter.EvalBlockSourceSync(readSource('Cond.kon')), 3);
  });

  it('evaluates foreach over literal and variable arrays', function () {
    assert.equal(RuntimeInterpreter.EvalBlockSourceSync(readSource('Foreach.kon')), 9);
  });

  it('supports break and continue inside foreach', function () {
    assert.deepEqual(RuntimeInterpreter.EvalBlockSourceSync(readSource('ForeachBreakContinue.kon')), [1, 3]);
  });

  it('supports for loop init, condition, step, break, and continue', function () {
    assert.deepEqual(RuntimeInterpreter.EvalBlockSourceSync(readSource('ForBreakContinue.kon')), [1, 3]);
  });
});
