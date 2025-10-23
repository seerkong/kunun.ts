import assert from "assert";
import { KnConverter } from "kunun-converter/KnConverter";

// Regression for the machine-crash root cause: ParseContainer's
// `while (Current !== end)` loop had no `!End()` guard, so any *unclosed*
// container kept pushing a fresh EOF token forever — unbounded allocation that
// OOM-killed the host (see skills/finch-resource-diagnosis). The fix raises a
// bounded "Unclosed container" diagnostic instead of looping. This file also
// covers D5: `:<` / `<…>` (ordered-map / generic openers) no longer hang when
// left unclosed — they terminate with a clear error. The fact that this test
// process completes at all is itself the termination proof.
describe("Unclosed container terminates with a bounded diagnostic", function () {
  const parse = (source: string) => KnConverter.Kon.Parser.Parse(source);

  // `:<` opens a prop ordered-map; without the closing `>` this previously ran
  // away. It must now throw a bounded error rather than hang / OOM.
  it("rejects an unclosed `:<` prop ordered-map instead of looping", function () {
    assert.throws(() => parse("(:< 1 2)"), /Unclosed container/);
  });

  it("rejects unclosed ordered-map / vector / map with a clear diagnostic", function () {
    for (const source of ["$<a = 1", "[1 2 3", "{a = 1"]) {
      assert.throws(
        () => parse(source),
        /Unclosed container/,
        `expected "${source}" to raise a bounded Unclosed container error`,
      );
    }
  });

  it("still parses well-formed containers and generics", function () {
    assert.equal((parse("$<a = 1 b = 2>") as any)?.constructor?.name, "KnOrderedMap");
    assert.deepEqual(parse("[1 2 3]"), [1, 2, 3]);
    // a balanced generic argument list parses without error
    assert.doesNotThrow(() => parse("(type #Seq <T> :[])"));
  });
});
