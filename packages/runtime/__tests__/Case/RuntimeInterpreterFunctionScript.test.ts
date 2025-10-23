import assert from 'assert';
import fs from 'fs';

import { RuntimeInterpreter } from 'kunun-runtime';

const BASE_DIR = __dirname + '/../Resource/RuntimeInterpreter/Function';

function readSource(fileName: string): string {
  return fs.readFileSync(`${BASE_DIR}/${fileName}`, 'utf-8');
}

describe('RuntimeInterpreter function scripts', function () {
  it('defines and calls source-level functions through prefix and infix style', function () {
    const source = readSource('FunctionCall.kon');

    assert.equal(RuntimeInterpreter.EvalBlockSourceSync(source), 7);
  });

  it('returns early from source-level function bodies', function () {
    const source = readSource('Return.kon');

    assert.equal(RuntimeInterpreter.EvalBlockSourceSync(source), 1);
  });

  it('binds handler-style resume and payload arguments for runtime functions', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.define('resume', (value: number) => value + 10);
    const source = readSource('HandlerCallReady.kon');

    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, source), 13);
  });
});
