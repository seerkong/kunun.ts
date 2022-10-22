import { Parser } from '../../lib/Converter/Parser';
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
