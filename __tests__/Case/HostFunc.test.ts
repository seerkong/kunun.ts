import { Interpreter } from '../../lib/Interpreter';
import { Parser } from '../../lib/Converter/Parser';
// import { describe, it } from "mocha";
import assert from "assert";
import fs from 'fs'
import { KnFormatter } from '../../lib/Converter/KnFormatter';

const BASE_DIR = './__tests__/Resource'

function parseFile(fileName: string) {
  const knStr = fs.readFileSync(`${BASE_DIR}/${fileName}`, 'utf-8')
  let node = Parser.Parse(knStr);
  return node;
}

describe("HostFunc", function () {
  describe("IO", function () {
    it("Writeln", async function () {
      let code = parseFile('IO/Writeln.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 3);
    });
  });


  describe("Math", function () {

    it("add", async function () {
      let code = parseFile('Math/Add.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 7);
    });

    it("NumberEqual", async function () {
      let code = parseFile('Math/NumberEqual.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, true);
    });
  });

  describe("String", function () {
    it("append", async function () {
      let code = '[null 5 append;]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, 'null5');
    });

    it("str_length_1", async function () {
      let code = '["abcd".length]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, 4);
    });

    it("str_length_2", async function () {
      let code = '["abcde".length 5 ==;]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, true);
    });

    it("str_length_3", async function () {
      let code = '[do { [var  model $(text ="abcde")] [model.text.length] }]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, 5);
    });

    it("str_length_4", async function () {
      let code = '[do { [var  model $(text ="abcde")] [[model.text] and [model.text.length 5 ==;] ] }]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, true);
    });

    it("str_length_5", async function () {
      let code = '[do { [var  model $(text ="abcd")] [[model.text] and [model.text.length 5 ==;] ] }]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, false);
    });

    it("str_length_6", async function () {
      let code = '[do { [var  model $(text1 ="abcde")] [[model.text] and [model.text.length 5 ==;] ] }]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, false);
    });
  });
});