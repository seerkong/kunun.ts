import assert from 'assert';
import fs from 'fs';

import { RuntimeInterpreter } from 'kunun-runtime';

const BASE_DIR = __dirname + '/../Resource/RuntimeInterpreter/Function';

function readSource(fileName: string): string {
  return fs.readFileSync(`${BASE_DIR}/${fileName}`, 'utf-8');
}

describe('RuntimeInterpreter function variants and sessions', function () {
  it('evaluates multi-argument functions from source', function () {
    assert.equal(RuntimeInterpreter.EvalBlockSourceSync(readSource('MultiArgFunction.kon')), 10);
  });

  it('reuses variables and functions across evaluations in the same runtime', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();

    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, '(var base 5)'), 5);
    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, '(base 2 :+)'), 7);

    RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, `
      (fn #addBase :|value| :[
        (base value :+)
      ])
    `);

    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, '(3 :addBase)'), 8);
  });
});
