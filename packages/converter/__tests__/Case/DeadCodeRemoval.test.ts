import assert from "assert";
import fs from "fs";
import path from "path";

// T1.3 (D7a): converter dead-code removal guard.
//
// The following files are never imported anywhere in the repo and must stay
// deleted. The live lexer is lib/Lexer/Lexer.ts (a different file) and MUST
// remain. This test fails if any of the dead files reappears, and also
// asserts the live converter pipeline still works after their removal.

const LIB_DIR = path.resolve(__dirname, "../../lib");

const DEAD_FILES = [
  "Lexer.ts",            // top-level dead lexer (NOT Lexer/Lexer.ts)
  "Token.ts",            // top-level dead token
  "Common/Token.ts",     // fully commented-out
  "Common/IndexStream.ts" // fully commented-out
];

const LIVE_FILES = [
  "Lexer/Lexer.ts" // the real lexer must stay
];

describe("converter dead-code removal (T1.3)", function () {
  describe("dead files are gone", function () {
    for (const rel of DEAD_FILES) {
      it(`does not contain lib/${rel}`, function () {
        const abs = path.join(LIB_DIR, rel);
        assert.strictEqual(
          fs.existsSync(abs),
          false,
          `dead file should be deleted: ${abs}`
        );
      });
    }
  });

  describe("live lexer is preserved", function () {
    for (const rel of LIVE_FILES) {
      it(`still contains lib/${rel}`, function () {
        const abs = path.join(LIB_DIR, rel);
        assert.strictEqual(
          fs.existsSync(abs),
          true,
          `live file must NOT be deleted: ${abs}`
        );
      });
    }
  });

  it("live converter pipeline still parses + formats", function () {
    // Imported lazily so the test file itself never references dead modules.
    const { KnConverter } = require("kunun-converter/KnConverter");
    const node = KnConverter.Knl.Parser.Parse("[a 1 b 2]");
    const out = KnConverter.Knl.Formater.Stringify(node);
    assert.ok(typeof out === "string" && out.length > 0);
  });
});
