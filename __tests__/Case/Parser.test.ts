import { Parser } from '../../lib/Converter/Parser';
import { KnFormatter } from '../../lib/Converter/KnFormatter';
// import { describe, it } from "mocha";
import assert from "assert";
import fs from 'fs'

const BASE_DIR = './__tests__/Resource'

function parseFile(fileName: string) {
    const knStr = fs.readFileSync(`${BASE_DIR}/${fileName}`, 'utf-8')
    let node = Parser.Parse(knStr);
    return node;
}


describe("parser", function() {
  // describe("Number", function() {
  //   it("float Number", function() {
  //     let v = Parser.Parse("5.321");
  //     console.log(v)
  //     assert.equal(v, 5.321);
  //   });
  // });

  // describe("Word", function() {
  //   it("Word", function() {
  //     let v = Parser.Parse(" [a] ");
  //     console.log(v)
  //   });
  // });

  describe("Prefix", function() {
    it("WordWithPrefix", function() {
      let v = Parser.Parse("!public m");
      console.log(v)
    });
  });

  describe("MultiLineString", function() {
    it("MultiLineString", function() {
      let ast = parseFile('Parser/MultiLineString.kn');
      let formatedCode = KnFormatter.Stringify(ast)
      console.log("exec kunun code:\n", formatedCode);
    });
  });

  describe("knot", function() {
    it("arr_Words", function() {
      let ast = parseFile('Parser/Words.kn');
      console.log(ast)
    });
    it("knot_core_only", function() {
      let ast = parseFile('Parser/KnotCoreOnly.kn');
      console.log(ast)
    });
    it("knot_single_node", function() {
      let ast = parseFile('Parser/KnotSingleNode.kn');
      console.log(ast)
    });
    it("knot_multi_map", function() {
      let ast = parseFile('Parser/KnotMultiMap.kn');
      console.log(ast)
    });
    it("knot_multi_array", function() {
      let ast = parseFile('Parser/KnotMultiArray.kn');
      console.log(ast)
    });
  });

  describe("LowCode", function() {
    it("LowCode_formtest", function() {
      let ast = parseFile('LowCode/formtest.kn');
      console.log(ast)
    });
    it("LowCode_nesting", function() {
      let ast = parseFile('LowCode/nesting.kn');
      console.log(ast)
    });
    it("LowCode_sample", function() {
      let ast = parseFile('LowCode/sample.kn');
      console.log(ast)
    });
    it("LowCode_schema", function() {
      let ast = parseFile('LowCode/schema.kn');
      console.log(ast)
    });
    it("LowCode_table", function() {
      let ast = parseFile('LowCode/table.kn');
      console.log(ast)
    });
    it("LowCode_cmp1", function() {
      let ast = parseFile('LowCode/nesting/cmp1.kn');
      console.log(ast)
    });
    it("LowCode_cmp2", function() {
      let ast = parseFile('LowCode/nesting/cmp2.kn');
      console.log(ast)
    });
    it("LowCode_cmp3", function() {
      let ast = parseFile('LowCode/nesting/cmp3.kn');
      console.log(ast)
    });
  });
});
