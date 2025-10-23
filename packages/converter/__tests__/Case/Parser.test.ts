import { KnConverter } from 'kunun-converter/KnConverter';
import { KnKnot, KnUnorderedMap, KnWord } from 'kunun-core';
// import { describe, it } from "mocha";
import assert from "assert";
import fs from 'fs'

const BASE_DIR = __dirname + '/../Resource'
const Parser = KnConverter.Knl.Parser;
const KnFormatter = KnConverter.Knl.Formater;

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
    it("operator_words", function() {
      let ast = Parser.Parse("{+ - * / > < >= <=}") as KnWord[];
      const values = ast.map(word => word.Value);
      assert.deepEqual(values, ["+", "-", "*", "/", ">", "<", ">=", "<="]);
    });
    it("knot_core_only", function() {
      let ast = parseFile('Parser/KnotCoreOnly.kn');
      console.log(ast)
    });
    it("knot_single_node", function() {
      let ast = Parser.Parse("[func #abc]") as KnKnot;
      assert.equal((ast.Core as KnWord).Value, "func");
      assert.equal(ast.Name?.Value, "abc");
    });
    it("knot_multi_map", function() {
      let ast = Parser.Parse("[p :props = (d = 3 e = 4)]") as KnKnot;
      assert.equal((ast.Core as KnWord).Value, "p");
      assert.equal((ast.NamedConf.props as KnUnorderedMap).d, 3);
      assert.equal((ast.NamedConf.props as KnUnorderedMap).e, 4);
    });
    it("knot_multi_array", function() {
      let ast = parseFile('Parser/KnotMultiArray.kn');
      assert.deepEqual(ast.Core, [1, 2]);
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
