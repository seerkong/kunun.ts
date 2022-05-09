import { Parser } from '../../src/Converter/Parser';
// import { describe, it } from "mocha";
import assert from "assert";
import fs from 'fs'

const BASE_DIR = './test/testset'

function parseFile(fileName: string) {
    const knStr = fs.readFileSync(`${BASE_DIR}/${fileName}`, 'utf-8')
    let node = Parser.Parse(knStr);
    return node;
}


describe("parser", function() {
  // describe("Number", function() {
  //   it("float Number", function() {
  //     let v = Parser.parse("5.321");
  //     console.log(v)
  //     assert.equal(v, 5.321);
  //   });
  // });

  // describe("Word", function() {
  //   it("Word", function() {
  //     let v = Parser.parse(" [a] ");
  //     console.log(v)
  //   });
  // });

  describe("knot", function() {
    it("arr_Words", function() {
      let ast = parseFile('parser/Words.kn');
      console.log(ast)
    });
    it("knot_core_only", function() {
      let ast = parseFile('parser/knot_core_only.kn');
      console.log(ast)
    });
    it("knot_single_node", function() {
      let ast = parseFile('parser/knot_single_node.kn');
      console.log(ast)
    });
    it("knot_multi_map", function() {
      let ast = parseFile('parser/knot_multi_map.kn');
      console.log(ast)
    });
    it("knot_multi_array", function() {
      let ast = parseFile('parser/knot_multi_array.kn');
      console.log(ast)
    });
  });
});
