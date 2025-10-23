import assert from 'assert';
import { RuntimeInterpreter, RuntimeTypeCheckError } from 'kunun-runtime';
// Registers the TypeSystem bridge (module-load side effect) for typed entry points.
import 'kunun-type-system';

describe('RuntimeInterpreter type-system integration', function () {
  it('keeps RuntimeInterpreter untyped by default', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.define('touched', 0);

    const result = RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, `
      (class #Person :[
        (!String field #name)
      ])

      (fn #bad |!Person person -> Int|
        :[
          (person.:name)
        ])

      (set touched 1)
    `);

    assert.equal(result, 1);
    assert.equal(runtime.lookup('touched'), 1);
  });

  it('can type-check before execution and stop invalid script bodies', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.define('touched', 0);

    assert.throws(
      () => RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, `
        (class #Person :[
          (!String field #name)
        ])

        (fn #bad |!Person person -> Int|
          :[
            (person.:name)
          ])

        (set touched 1)
      `, { typeCheck: true }),
      RuntimeTypeCheckError,
    );
    assert.equal(runtime.lookup('touched'), 0);
  });

  it('returns type-check diagnostics through the public API', function () {
    const result = RuntimeInterpreter.TypeCheckSource(`
      (class #Person :[
        (!String field #name)
      ])

      (fn #bad |!Person person -> Int|
        :[
          (person.:name)
        ])
    `);

    assert.equal(result.Success, false);
    assert.ok(result.Diagnostics.some(diagnostic => diagnostic.Code === 'KTC040'));
  });

  it('exposes an ExtensibleScopedRowType-style typed block execution entrypoint', function () {
    const result = RuntimeInterpreter.EvaluateTypedBlockSync(`
      (class #Person :[
        (!String field #name)
        (new |personName| :[
          (set self.:name personName)
        ])
      ])

      (var person (Person ~new "Alice"))
      (set person.:name "Bob")
      (person.:name)
    `);

    assert.equal(result, 'Bob');
  });

  it('dispatches class-projected methods through the typed block entrypoint', function () {
    const result = RuntimeInterpreter.EvaluateTypedBlockSync(`
      (class #A :[
        (method #label |-> String| :[ "A" ])
        (new || :[])
      ])

      (class #B
        @inherits = [A]
        :[
          (method #label |-> String| :[ "B" ])
          (new || :[])
        ])

      (var b (B ~new))
      ((b ~as A) ~label)
    `);

    assert.equal(result, 'A');
  });

  it('rejects trait-projected methods outside the typed view at the typed block entrypoint', function () {
    assert.throws(
      () => RuntimeInterpreter.EvaluateTypedBlockSync(`
        (trait #Named :[
          (method #label |self -> String|)
        ])

        (class #Item
          @implements = [Named]
          :[
            (method #label |-> String| :[ "item" ])
            (method #internal_label |-> String| :[ "hidden" ])
            (new || :[])
          ])

        (var item (Item ~new))
        ((item ~as Named) ~internal_label)
      `),
      /not exposed by projected view Named/,
    );
  });

  it('executes typed property get and set through the typed block entrypoint', function () {
    const result = RuntimeInterpreter.EvaluateTypedBlockSync(`
      (class #Box :[
        (!Int field #value)
        (method #get_data |self -> Int|)
        (method #set_data |self Int -> Never|)
        (new |initialValue| :[ (set self.:value initialValue) ])
        (prop #data
          get :[ (self.:value) ]
          set |newValue| :[ (set self.:value newValue) ])
      ])

      (var box (Box ~new 1))
      (set box.:data 42)
      (box.:data)
    `);

    assert.equal(result, 42);
  });

  it('runs C# typed runtime field, typed self, and nested object scripts through the typed entrypoint', function () {
    const methodResult = RuntimeInterpreter.EvaluateTypedBlockSync(`
      (class #Counter :[
        (!Int field #count)
        (new |initial| :[ (set self.:count initial) ])
        (method #get |-> Int| :[ (self.:count) ])
      ])

      (var counter (Counter ~new 7))
      (counter ~get)
    `);
    assert.equal(methodResult, 7);

    const nestedResult = RuntimeInterpreter.EvaluateTypedBlockSync(`
      (class #Address :[
        (!String field #city)
        (new |city| :[ (set self.:city city) ])
      ])

      (class #Person :[
        (!Any field #address)
        (new |address| :[ (set self.:address address) ])
      ])

      (var address (Address ~new "Suzhou"))
      (var person (Person ~new address))
      (set person.:address.:city "Shanghai")
      (person.:address.:city)
    `);
    assert.equal(nestedResult, 'Shanghai');
  });

  it('hydrates untyped field default metadata through the typed entrypoint', function () {
    const result = RuntimeInterpreter.EvaluateTypedBlockSync(`
      (class #Counter :[
        (field #count = 10)
      ])

      (var counter (Counter ~new))
      (counter.:count)
    `);

    assert.equal(result, 10);
  });

  it('uses the full runtime interpreter around typed object operations', function () {
    const result = RuntimeInterpreter.EvaluateTypedBlockSync(`
      (class #Counter :[
        (!Int field #count)
        (new |initial| :[ (set self.:count initial) ])
      ])

      (var counter (Counter ~new 1))
      (if true
        :[
          (set counter.:count 2)
        ]
        else :[
          (set counter.:count 3)
        ])
      (counter.:count)
    `);

    assert.equal(result, 2);
  });

  it('forwards inherit methods to the base implementation through typed dispatch', function () {
    const result = RuntimeInterpreter.EvaluateTypedBlockSync(`
      (class #Base :[
        (method #value |-> Int| :[ 42 ])
        (new || :[])
      ])

      (class #Derived
        @inherits = [Base]
        :[
          (method #value @qualifier = inherit |-> Int|)
          (new || :[])
        ])

      (var derived (Derived ~new))
      (derived ~value)
    `);

    assert.equal(result, 42);
  });

  it('keeps class and trait projected properties on the requested typed view', function () {
    const classProjection = RuntimeInterpreter.EvaluateTypedBlockSync(`
      (class #A :[
        (!String field #value)
        (method #get_data |self -> String|)
        (method #set_data |self String -> Never|)
        (prop #data
          get :[ (self.:value) ]
          set |newValue| :[ (set self.:value "A") ])
        (new || :[])
      ])

      (class #B
        @inherits = [A]
        :[
          (method #get_data |self -> String|)
          (method #set_data |self String -> Never|)
          (prop #data
            get :[ (self.:value) ]
            set |newValue| :[ (set self.:value "B") ])
          (new || :[])
        ])

      (var b (B ~new))
      (set (b ~as A).:data "base")
      ((b ~as A).:data)
    `);
    assert.equal(classProjection, 'A');

    const traitProjection = RuntimeInterpreter.EvaluateTypedBlockSync(`
      (trait #Named :[
        (!String field #label_value)
        (!String field #name)
        (method #get_label |self -> String|)
        (method #set_label |self String -> Never|)
      ])

      (class #Base
        @implements = [Named]
        :[
          (!String field #label_value)
          (method #get_label |self -> String|)
          (method #set_label |self String -> Never|)
          (prop #label
            get :[ (self.:label_value) ]
            set |newValue| :[ (set self.:label_value newValue) ])
          (new || :[
            (set self.:label_value "base")
          ])
        ])

      (class #Derived
        @inherits = [Base]
        :[
          (new || :[])
        ])

      (var item (Derived ~new))
      (set (item ~as Named).:label "renamed")
      ((item ~as Named).:label)
    `);
    assert.equal(traitProjection, 'renamed');
  });

  // Regression: the typed entry point shares ParseSourceBlock with the core
  // path, so `//` line comments — including non-ASCII (Chinese) content — must
  // be skipped before splitting/lexing. Mirrors the core-path comment tests in
  // RuntimeInterpreterSourceLowering.test.ts; CheckSource/BindSource (converter
  // Lexer) and ParseSourceBlock must all tolerate the comment.
  it('skips // line comments with non-ASCII content on the typed path', function () {
    assert.equal(RuntimeInterpreter.EvaluateTypedBlockSync('// 中文\n42\n'), 42);
    assert.equal(RuntimeInterpreter.EvaluateTypedBlockSync('// 头部中文注释\n(:+ 1 2)\n'), 3);
    assert.equal(RuntimeInterpreter.EvaluateTypedBlockSync('(:+ 1 2) // 行尾中文\n'), 3);
    assert.equal(
      RuntimeInterpreter.EvaluateTypedBlockSync('(type #T :[ (!Int field #n) ..never ]) // 类型后中文\n(:+ 1 2)\n'),
      3,
    );
  });
});
