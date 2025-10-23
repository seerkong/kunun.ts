import assert from "assert";
import { KnConverter } from "kunun-converter/KnConverter";
import { KnKnot, KnotCallType, KnNodeType, KnQuoteWrapper, KnWord } from "kunun-core";

function assertThrowsParse(fn: () => unknown) {
  assert.throws(fn, Error);
}

function roundTripKon(source: string): string {
  const parsed = KnConverter.Kon.Parser.Parse(source);
  return KnConverter.Kon.Formater.Stringify(parsed, false);
}

describe("Kon parser syntax profiles", function () {
  describe("Knl and Kon whitespace separators", function () {
    it("parses Knl whitespace-separated vector and map values", function () {
      const vector = KnConverter.Knl.Parser.Parse("{1 2 3}");
      assert.deepEqual(vector, [1, 2, 3]);

      const map = KnConverter.Knl.Parser.Parse("(a = 1 b = 2)");
      assert.equal(map.a, 1);
      assert.equal(map.b, 2);
    });

    it("parses Kon whitespace-separated vector and map values", function () {
      const vector = KnConverter.Kon.Parser.Parse("[1 2 3]");
      assert.deepEqual(vector, [1, 2, 3]);

      const map = KnConverter.Kon.Parser.Parse("{a = 1 b = 2}");
      assert.equal(map.a, 1);
      assert.equal(map.b, 2);
    });

    it("rejects comma-separated Knl and Kon vector and map values", function () {
      assertThrowsParse(() => KnConverter.Knl.Parser.Parse("{1, 2}"));
      assertThrowsParse(() => KnConverter.Knl.Parser.Parse("(a = 1, b = 2)"));
      assertThrowsParse(() => KnConverter.Kon.Parser.Parse("[1, 2]"));
      assertThrowsParse(() => KnConverter.Kon.Parser.Parse("{a = 1, b = 2}"));
    });

    it("keeps Kjson comma-separated JSON-like values", function () {
      const vector = KnConverter.Kjson.Parser.Parse("[1, 2, 3]");
      assert.deepEqual(vector, [1, 2, 3]);

      const map = KnConverter.Kjson.Parser.Parse("{\"a\": 1, \"b\": 2}");
      assert.equal(map.a, 1);
      assert.equal(map.b, 2);
    });
  });

  describe("Kon external parser syntax", function () {
    it("round-trips subscript chain syntax", function () {
      assert.equal(roundTripKon("(a.:b.:c)"), "(a.:b.:c)");
      assert.equal(roundTripKon("(a::1::\"a\")"), "(a::1::\"a\")");
    });

    it("round-trips source-qualified names", function () {
      assert.equal(roundTripKon("(method #T1:::b |-> String|)"), "(method #T1:::b |-> String|)");
      assert.equal(
        roundTripKon("(method #com.example.ClassA:::b |-> String|)"),
        "(method #com.example.ClassA:::b |-> String|)"
      );
    });

    it("preserves source qualifier in word nodes", function () {
      const parsed = KnConverter.Kon.Parser.Parse("(method #com.example.ClassA:::b |-> String|)") as KnKnot;
      assert.ok(parsed.Name instanceof KnWord);
      assert.equal(parsed.Name.SourceQualifier, "com.example.ClassA");
      assert.equal(parsed.Name.Value, "b");
    });

    it("round-trips generic signatures, attrs, conf, body, sections, and slots", function () {
      const source = "(fn #map <T U> |List<T> Fn<T U> -> List<U>| :{timeout = 1} @pure :[ (operands |result|) ] :branch = [1] :slot = (value))";
      assert.equal(roundTripKon(source), source);
    });

    it("round-trips quote and row spread syntax", function () {
      assert.equal(roundTripKon("`(a b)"), "`(a b)");
      assert.equal(roundTripKon(",x"), ",x");
      assert.equal(roundTripKon(",@items"), ",@items");
      assert.equal(roundTripKon(",%pairs"), ",%pairs");
      assert.equal(roundTripKon("..Row"), "..Row");
    });

    it("preserves row spread kind and inner value", function () {
      const parsed = KnConverter.Kon.Parser.Parse("..Row") as KnQuoteWrapper;
      assert.equal(parsed._Type, KnNodeType.RowSpread);
      assert.ok(parsed.Inner instanceof KnWord);
      assert.equal(parsed.Inner.Value, "Row");
    });

    it("preserves type prefixes on words and knot nodes for type-system lowering", function () {
      const word = KnConverter.Kon.Parser.Parse("!String value") as KnWord;
      assert.ok(word instanceof KnWord);
      assert.equal(word.Value, "value");
      assert.equal(word.PreModifiers?.Identifiers[0]?.Value, "String");

      const declaration = KnConverter.Kon.Parser.Parse("(field #value |String|)") as KnKnot;
      assert.equal(declaration.Core.Value, "field");

      const typedDeclaration = KnConverter.Kon.Parser.Parse("!String (field #value)") as KnKnot;
      assert.equal((typedDeclaration.Core as KnWord).Value, "field");
      assert.equal(typedDeclaration.PreModifiers?.Identifiers[0]?.Value, "String");
    });

    it("rejects unsupported postfix field type annotation before binder lowering", function () {
      assertThrowsParse(() => KnConverter.Kon.Parser.Parse("(type #Box :[ (field #value : String) ])"));
    });

    it("preserves annotation prefixes on knot nodes for type-system effect metadata", function () {
      const parsed = KnConverter.Kon.Parser.Parse("#(effect row :[ Sync ]) (method #read |-> String|)") as KnKnot;
      assert.equal((parsed.Core as KnWord).Value, "method");
      const marker = parsed.PreModifiers?.Knots[0];
      assert.ok(marker instanceof KnKnot);
      assert.equal((marker.Core as KnWord).Value, "effect");
      assert.equal((marker.Next?.Core as KnWord).Value, "row");
      assert.deepEqual(marker.Next?.Body?.map((item: KnWord) => item.Value), ["Sync"]);
    });

    it("parses parenthesized postfix markers as postfix knot nodes", function () {
      const parsed = KnConverter.Kon.Parser.Parse("%(effect handle #consoleHandler)") as KnKnot;
      assert.equal(parsed.CallType, KnotCallType.PostfixCall);
      assert.equal((parsed.Core as KnWord).Value, "effect");
      assert.equal((parsed.Next?.Core as KnWord).Value, "handle");
      assert.equal(parsed.Next?.Name.Value, "consoleHandler");
    });

    it("keeps existing mixed call and subscript syntax", function () {
      const parsed = KnConverter.Kon.Parser.Parse("(value ~as Box<T>.:value::\"inner\")") as KnKnot;
      assert.equal(KnConverter.Kon.Formater.Stringify(parsed, false), "(value ~as Box<T>.:value::\"inner\")");
      assert.equal(parsed.Next?.CallType, KnotCallType.InstanceCall);
      assert.equal(parsed.Next?.Next?.CallType, KnotCallType.StaticIndex);
      assert.equal(parsed.Next?.Next?.Next?.CallType, KnotCallType.Subscript);
    });
  });

  describe("Suffix-complement (^) at end of input", function () {
    function parseMessage(source: string): string | null {
      try {
        KnConverter.Kon.Parser.Parse(source);
        return null;
      } catch (e: any) {
        return String(e?.message ?? e);
      }
    }

    it("does not surface internal 'End of stream' for trailing ^ at EOF", function () {
      const message = parseMessage("a^");
      assert.ok(
        message == null || !/End of stream/.test(message),
        `expected no internal 'End of stream', got: ${message}`
      );
    });

    it("does not crash with null s.Next() for ^ complement at EOF", function () {
      for (const source of ["a^b", "(a^)"]) {
        const message = parseMessage(source);
        assert.ok(
          message == null || !/End of stream/.test(message),
          `expected no internal 'End of stream' for ${JSON.stringify(source)}, got: ${message}`
        );
        assert.ok(
          message == null || !/null is not an object/.test(message),
          `expected no internal TypeError for ${JSON.stringify(source)}, got: ${message}`
        );
      }
    });

    it("parses a^b at EOF as word 'a' with suffix-complement identifier 'b'", function () {
      const word = KnConverter.Kon.Parser.Parse("a^b") as KnWord;
      assert.ok(word instanceof KnWord);
      assert.equal(word.Value, "a");
      assert.equal(word.PostModifiers?.Identifiers[0]?.Value, "b");
    });

    it("rejects a dangling ^ at EOF with a clear positioned diagnostic", function () {
      let message: string | null = null;
      try {
        KnConverter.Kon.Parser.Parse("a^");
      } catch (e: any) {
        message = String(e?.message ?? e);
      }
      assert.ok(message != null, "expected a^ to throw a diagnostic");
      assert.ok(!/End of stream/.test(message), `diagnostic must not be raw 'End of stream', got: ${message}`);
    });
  });
});
