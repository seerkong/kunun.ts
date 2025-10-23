import assert from 'assert';
import fs from 'fs';

import { RuntimeInterpreter, RuntimeObject } from 'kunun-runtime';

const BASE_DIR = __dirname + '/../Resource/RuntimeInterpreter/Object';

function readSource(fileName: string): string {
  return fs.readFileSync(`${BASE_DIR}/${fileName}`, 'utf-8');
}

describe('RuntimeInterpreter object script parity', function () {
  it('defines a class and creates an object from source', function () {
    const result = RuntimeInterpreter.EvalBlockSourceSync(readSource('SimpleClass.kon'));

    assert.ok(result instanceof RuntimeObject);
  });

  it('assigns object fields through set-place syntax', function () {
    const result = RuntimeInterpreter.EvalBlockSourceSync(readSource('AssignField.kon'));

    assert.equal(result, 'Bob');
  });

  it('executes methods and properties declared in class scripts', function () {
    const result = RuntimeInterpreter.EvalBlockSourceSync(readSource('MethodAndProperty.kon'));

    assert.equal(result, 'Alice');
  });

  it('supports default fields and complete class/property/method scripts', function () {
    const result = RuntimeInterpreter.EvalBlockSourceSync(readSource('DefaultAndCompleteClass.kon'));

    assert.deepEqual(result, ['John Doe', 30, 0]);
  });

  it('supports nested object field assignment once parsed as static index chain', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const source = `
      (class #Address
        :[
          (field #city)
          (new |city| :[ (set self.:city city) ])
        ])
      (class #Person
        :[
          (field #address)
          (new |address| :[ (set self.:address address) ])
        ])
      (var address (Address ~new "Suzhou"))
      (var person (Person ~new address))
      (set person.:address.:city "Shanghai")
      (person.:address.:city)
    `;

    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, source), 'Shanghai');
  });
});
