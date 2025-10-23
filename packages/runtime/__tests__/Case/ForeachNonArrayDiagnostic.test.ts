import assert from 'assert';

import { RuntimeInterpreter } from 'kunun-runtime';

// Regression for D13: `foreach` over a non-array (map / plain object / number)
// used to hang the host forever — `items.length` is undefined, so the loop's
// `index >= items.length` guard is always false → infinite loop. It now raises a
// bounded "foreach expects an array" diagnostic. Arrays (incl. empty) still work.
describe('RuntimeInterpreter foreach non-array diagnostic (D13)', function () {
  const ev = (source: string) => RuntimeInterpreter.EvalBlockSourceSync(source);

  it('rejects foreach over a map instead of hanging', function () {
    assert.throws(() => ev('(foreach k in {a = 1 b = 2} :[ k ])'), /foreach expects an array/);
  });

  it('rejects foreach over a number instead of hanging', function () {
    assert.throws(() => ev('(foreach k in 5 :[ k ])'), /foreach expects an array/);
  });

  it('still iterates a non-empty array', function () {
    assert.equal(ev('(var s 0)(foreach n in [1 2 3] :[ (set s (s n :+)) ]) s'), 6);
  });

  it('handles an empty array', function () {
    assert.deepEqual(ev('(foreach n in [] :[ n ])'), []);
  });
});
