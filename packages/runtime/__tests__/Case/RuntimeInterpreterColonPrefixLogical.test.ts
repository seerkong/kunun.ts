import assert from 'assert';
import fs from 'fs';

import { RuntimeInterpreter } from 'kunun-runtime';

const BASE_DIR = __dirname + '/../Resource/RuntimeInterpreter/Logical';

function readSource(fileName: string): string {
  return fs.readFileSync(`${BASE_DIR}/${fileName}`, 'utf-8');
}

describe('RuntimeInterpreter colon-prefix logical operators', function () {
  it('evaluates (:and a b) / (:or a b) consistently with bare and infix forms', function () {
    assert.deepEqual(RuntimeInterpreter.EvalBlockSourceSync(readSource('ColonPrefixLogical.kon')), [
      true,       // (:and true true)
      true,       // (:or false true)
      false,      // (:and true false)
      false,      // (:or false false)
      'fallback', // (:or_else null "fallback")
      'value',    // (:or_else "value" "fallback")
      false,      // (and true false)   regression: bare form unchanged
      false,      // (true false :and)  regression: infix form unchanged
    ]);
  });

  it('short-circuits the right operand of the colon-prefix form', function () {
    assert.deepEqual(RuntimeInterpreter.EvalBlockSourceSync(readSource('ColonPrefixShortCircuit.kon')), [
      false, // (:and false (set touched 1)) -> false, right not evaluated
      true,  // (:or true (set touched 2))   -> true, right not evaluated
      true,  // (:and true (set touched 3))  -> right evaluated, truthy && truthy
      3,     // touched only mutated by the non-short-circuited right operand
    ]);
  });
});
