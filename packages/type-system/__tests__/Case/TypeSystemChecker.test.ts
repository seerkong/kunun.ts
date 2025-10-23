import assert from 'assert';
import fs from 'fs';
import { KonTypeChecker } from 'kunun-type-system';

const BASE_DIR = __dirname + '/../Resource/TypeSystem';

function readSource(fileName: string): string {
  return fs.readFileSync(`${BASE_DIR}/${fileName}`, 'utf-8');
}

describe('Kon type checker', function () {
  it('accepts valid slot, method, projection, and handled effect usage', function () {
    const result = KonTypeChecker.CheckSource(readSource('CheckerValid.kon'));
    assert.deepEqual(result.Diagnostics, []);
  });

  it('reports missing slot, invalid projection, output mismatch, and unhandled effect diagnostics', function () {
    const result = KonTypeChecker.CheckSource(readSource('CheckerInvalid.kon'));

    assert.ok(result.Diagnostics.some(diagnostic => diagnostic.Code === 'KTC010' && diagnostic.Message.includes('age')));
    assert.ok(result.Diagnostics.some(diagnostic => diagnostic.Code === 'KTC020' && diagnostic.Message.includes('Person') && diagnostic.Message.includes('Address')));
    assert.ok(result.Diagnostics.some(diagnostic => diagnostic.Code === 'KTC030' && diagnostic.Message.includes('b') && diagnostic.Message.includes('T1') && diagnostic.Message.includes('T2')));
    assert.ok(result.Diagnostics.some(diagnostic => diagnostic.Code === 'KTC040' && diagnostic.Message.includes('str') && diagnostic.Message.includes('int')));
    assert.ok(result.Diagnostics.some(diagnostic => diagnostic.Code === 'KTC050' && diagnostic.Message.includes('Console')));
  });

  it('preserves and validates stack-shaped function output composition', function () {
    const valid = KonTypeChecker.CheckSource(`
      (fn #makePair |-> String Int|
        :[])

      (fn #consumePair |String Int -> Bool|
        :[])

      (fn #main |-> String Int|
        :[
          (makePair)
        ])

      (fn #composed |-> Bool|
        :[
          (makePair consumePair)
        ])
    `);
    const invalid = KonTypeChecker.CheckSource(`
      (fn #makePair |-> String Int|
        :[])

      (fn #consumePair |Int String -> Bool|
        :[])

      (fn #main |-> Int String|
        :[
          (makePair)
        ])

      (fn #badComposition |-> Bool|
        :[
          (makePair consumePair)
        ])
    `);

    assert.deepEqual(valid.Diagnostics, []);
    assert.ok(invalid.Diagnostics.some(diagnostic =>
      diagnostic.Code === 'KTC040'
      && diagnostic.Message.includes('str, int')
      && diagnostic.Message.includes('int, str')
      && diagnostic.Location === 'makePair'));
    assert.ok(invalid.Diagnostics.some(diagnostic =>
      diagnostic.Code === 'KTC041'
      && diagnostic.Message.includes('int, str')
      && diagnostic.Message.includes('str, int')
      && diagnostic.Location === 'makePair consumePair'));
  });

  it('reports handler no-op diagnostics when a postfix handler cannot reduce residual effects', function () {
    const result = KonTypeChecker.CheckSource(`
      #(effect decl #Console)
      (type #Console :[])

      #(effect decl #File)
      (type #File :[])

      #(effect row :[
        File
      ])
      (fn #readFile |-> Unit|
        :[])

      #(effect handler #consoleHandler handles :[
        Console
      ])
      (fn #consoleHandlerImpl |-> Unit|
        :[])

      #(effect row :[
        File
      ])
      (fn #main |-> Unit|
        :[
          (readFile)
          %(effect handle #consoleHandler)
        ])
    `);

    assert.ok(result.Diagnostics.some(diagnostic => diagnostic.Code === 'KTC061' && diagnostic.Message.includes('consoleHandler')));
  });

  it('applies inferred and explicit generic function type arguments', function () {
    const inferred = KonTypeChecker.CheckSource(`
      (fn #identity <T> |!T value -> T|
        :[
          value
        ])

      (fn #main |!String input -> String|
        :[
          (input identity)
        ])
    `);
    const explicitMismatch = KonTypeChecker.CheckSource(`
      (fn #identity <T> |!T value -> T|
        :[
          value
        ])

      (fn #main |!String input -> Int|
        :[
          (input identity<Int>)
        ])
    `);

    assert.deepEqual(inferred.Diagnostics, []);
    assert.ok(explicitMismatch.Diagnostics.some(diagnostic =>
      diagnostic.Code === 'KTC041'
      && diagnostic.Message.includes('int')
      && diagnostic.Message.includes('str')));
  });

  it('applies generic class type arguments to projected row members', function () {
    const valid = KonTypeChecker.CheckSource(`
      (class #Box <T> :[
        (!T field #value)
      ])

      (fn #main |!Box<Int> box -> Int|
        :[
          (box.:value)
        ])
    `);
    const invalid = KonTypeChecker.CheckSource(`
      (class #Box <T> :[
        (!T field #value)
      ])

      (fn #main |!Box<Int> box -> String|
        :[
          (box.:value)
        ])
    `);

    assert.deepEqual(valid.Diagnostics, []);
    assert.ok(invalid.Diagnostics.some(diagnostic =>
      diagnostic.Code === 'KTC040'
      && diagnostic.Message.includes('int')
      && diagnostic.Message.includes('str')));
  });

  it('checks typed perform operation signatures and residual effects', function () {
    const valid = KonTypeChecker.CheckSource(`
      #(effect decl #Console)
      (type #Console :[
        (op #print |!String text -> Unit|)
      ])

      #(effect row :[
        Console
      ])
      (fn #main |-> Unit|
        :[
          (perform #Console.print |"ready"|)
        ])
    `);
    const invalidArg = KonTypeChecker.CheckSource(`
      #(effect decl #Console)
      (type #Console :[
        (op #print |!String text -> Unit|)
      ])

      #(effect row :[
        Console
      ])
      (fn #main |-> Unit|
        :[
          (perform #Console.print |1|)
        ])
    `);
    const unhandled = KonTypeChecker.CheckSource(`
      #(effect decl #Console)
      (type #Console :[
        (op #print |!String text -> Unit|)
      ])

      (fn #main |-> Unit|
        :[
          (perform #Console.print |"ready"|)
        ])
    `);

    assert.deepEqual(valid.Diagnostics, []);
    assert.ok(invalidArg.Diagnostics.some(diagnostic => diagnostic.Code === 'KTC071' && diagnostic.Message.includes('Console.print')));
    assert.ok(unhandled.Diagnostics.some(diagnostic => diagnostic.Code === 'KTC050' && diagnostic.Message.includes('Console')));
  });

  it('checks class method constructor and property accessor bodies against typed self', function () {
    const valid = KonTypeChecker.CheckSource(`
      (class #Counter :[
        (!Int field #count)
        (new |!Int initial| :[
          (set self.:count initial)
        ])
        (method #get |-> Int| :[
          (self.:count)
        ])
        (prop #data
          get :[ (self.:count) ]
          set |!Int value| :[ (set self.:count value) ])
      ])
    `);
    const invalid = KonTypeChecker.CheckSource(`
      (class #Counter :[
        (!Int field #count)
        (new |!String initial| :[
          (set self.:count initial)
        ])
        (method #get |-> String| :[
          (self.:count)
        ])
        (method #missing |-> Int| :[
          (self.:unknown)
        ])
      ])
    `);

    assert.deepEqual(valid.Diagnostics, []);
    assert.ok(invalid.Diagnostics.some(diagnostic =>
      diagnostic.Code === 'KTC041'
      && diagnostic.Message.includes('count')
      && diagnostic.Message.includes('int')
      && diagnostic.Message.includes('str')));
    assert.ok(invalid.Diagnostics.some(diagnostic =>
      diagnostic.Code === 'KTC040'
      && diagnostic.Message.includes('int')
      && diagnostic.Message.includes('str')));
    assert.ok(invalid.Diagnostics.some(diagnostic =>
      diagnostic.Code === 'KTC010'
      && diagnostic.Message.includes('unknown')));
  });

  it('rejects external access to non-public members while allowing class bodies to use self', function () {
    const result = KonTypeChecker.CheckSource(`
      (class #SecretBox :[
        (!String field #secret @visibility = private)
        (method #peek @visibility = private |-> String| :[
          (self.:secret)
        ])
        (method #publicPeek |-> String| :[
          (self ~peek)
        ])
      ])

      (fn #readSecret |!SecretBox box -> String|
        :[
          (box.:secret)
        ])

      (fn #callPrivate |!SecretBox box -> String|
        :[
          (box ~peek)
        ])
    `);

    assert.equal(result.Diagnostics.filter(diagnostic => diagnostic.Code === 'KTC080').length, 2);
    assert.ok(result.Diagnostics.some(diagnostic => diagnostic.Message.includes('secret')));
    assert.ok(result.Diagnostics.some(diagnostic => diagnostic.Message.includes('peek')));
  });

  it('restricts merged row members through source-level row projection', function () {
    const valid = KonTypeChecker.CheckSource(`
      (type #T1 :[
        (method #b |-> String|)
      ])

      (type #T2 :[
        (method #c |-> Int|)
      ])

      (type #T3
        @merge = [T1 T2])

      (fn #main |!T3 value -> String|
        :[
          ((value ~as T1) ~b)
        ])
    `);
    const invalid = KonTypeChecker.CheckSource(`
      (type #T1 :[
        (method #b |-> String|)
      ])

      (type #T2 :[
        (method #c |-> Int|)
      ])

      (type #T3
        @merge = [T1 T2])

      (fn #main |!T3 value -> Int|
        :[
          ((value ~as T1) ~c)
        ])
    `);

    assert.deepEqual(valid.Diagnostics, []);
    assert.ok(invalid.Diagnostics.some(diagnostic =>
      diagnostic.Code === 'KTC010'
      && diagnostic.Message.includes('c')
      && diagnostic.Message.includes('T1')));
  });
});
