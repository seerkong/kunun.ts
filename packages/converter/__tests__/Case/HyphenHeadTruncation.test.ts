import { KnConverter } from 'kunun-converter/KnConverter';
import { KnSymbol, KnWord } from 'kunun-core';
import assert from "assert";

// T1.2 (D3): hyphenated head/symbol must NOT be silently truncated.
//
// Background: `-` is an operator in kunun, so `foo-bar` in a normal value
// position is legitimately subtraction (`foo` minus `bar`) and is NOT a bug.
// The genuine defect is the SILENT DROP of trailing tokens: `#foo-bar`
// previously parsed to just `KnWord("#")`, throwing away `foo-bar` with no
// diagnostic. The contract enforced here: a top-level parse must either
// represent every token it consumes, or raise a clear, positioned error -
// it must never silently discard characters.

const Knl = KnConverter.Knl.Parser;
const Kon = KnConverter.Kon.Parser;
const Kjson = KnConverter.Kjson.Parser;

function isCleanSymbolOrThrow(parse: () => any) {
  let result: any;
  let threw: Error | null = null;
  try {
    result = parse();
  } catch (e) {
    threw = e as Error;
  }
  return { result, threw };
}

describe("HyphenHeadTruncation (T1.2/D3)", function () {
  describe("#foo-bar must not collapse to '#'", function () {
    for (const [name, parser] of [["Knl", Knl], ["Kon", Kon], ["Kjson", Kjson]] as const) {
      it(`${name}: #foo-bar does not silently become KnWord('#')`, function () {
        const { result, threw } = isCleanSymbolOrThrow(() => parser.Parse("#foo-bar"));
        // The defect: result was KnWord with Value '#', dropping foo-bar.
        const collapsedToHash =
          !threw && result instanceof KnWord && result.Value === "#";
        assert.ok(
          !collapsedToHash,
          "expected #foo-bar to either parse completely or raise a clear error, " +
            "not silently collapse to KnWord('#')"
        );
        // Whatever path is taken, trailing tokens must not be silently dropped:
        // either a positioned diagnostic was raised, or a value capturing the
        // full token span was produced.
        if (threw) {
          assert.ok(
            /unexpected|trailing|token|foo|bar|-/i.test(threw.message),
            `error message should be a clear diagnostic, got: ${threw.message}`
          );
        }
      });
    }
  });

  describe("%foo-bar (symbol macro) must not silently drop -bar", function () {
    for (const [name, parser] of [["Knl", Knl], ["Kon", Kon], ["Kjson", Kjson]] as const) {
      it(`${name}: %foo-bar does not silently drop the -bar tail`, function () {
        const { result, threw } = isCleanSymbolOrThrow(() => parser.Parse("%foo-bar"));
        // Previously: symbol 'foo' produced, '-bar' silently discarded.
        const droppedTail =
          !threw && result instanceof KnSymbol && result.Value === "foo";
        assert.ok(
          !droppedTail,
          "expected %foo-bar to either parse completely or raise a clear error, " +
            "not silently produce symbol 'foo' while dropping '-bar'"
        );
      });
    }
  });

  describe("regression: legitimate single forms still parse", function () {
    it("Knl bare identifier", function () {
      const r = Knl.Parse("foo") as KnWord;
      assert.equal(r.Value, "foo");
    });
    it("subtraction inside a knot/container is still operator chaining (not an error)", function () {
      // Inside a container, `-` is the subtraction operator and `foo-bar` chains
      // `foo` with a `(- bar)` operator node. This is legitimate and must NOT throw.
      assert.doesNotThrow(() => Knl.Parse("[foo-bar]"));
      assert.doesNotThrow(() => Kon.Parse("(foo-bar 1 2)"));
    });
    it("top-level foo-bar no longer silently drops the tail", function () {
      // Previously produced KnWord('foo'), silently discarding '-bar'.
      // Now it must raise a clear, positioned diagnostic instead.
      assert.throws(() => Knl.Parse("foo-bar"), /trailing tokens|Unexpected token/);
    });
    it("Knl knot metadata #[...] still works", function () {
      assert.doesNotThrow(() => Knl.Parse("[func #abc]"));
    });
  });
});
