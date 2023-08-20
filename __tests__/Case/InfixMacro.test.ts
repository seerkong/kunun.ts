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

describe("InfixMacro", function () {
  describe("Optional", function () {
    it("or_else", async function () {
      let code = '["a" null or_else "b" "c" append;]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, 'abc');
    });

    it("or_else_append", async function () {
      let code = '[do { [var  model $(text ="abc")] ["input:" model.text or_else "" append;] }]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, "input:abc");
    });
  });

  describe("Logical", function () {
    it("and_a", async function () {
      let code = '[false]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, false);
    });

    it("and_b", async function () {
      let code = '[true]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, true);
    });

    it("and_c", async function () {
      let code = '[false and false]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, false);
    });

    it("and_d", async function () {
      let code = '[false and true]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, false);
    });

    it("and_e", async function () {
      let code = '[true and false]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, false);
    });

    it("and_f", async function () {
      let code = '[true and true]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, true);
    });

    it("and_g", async function () {
      let code = '[true and false and true]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, false);
    });

    it("or_a", async function () {
      let code = '[false]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, false);
    });

    it("or_b", async function () {
      let code = '[true]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, true);
    });

    it("or_c", async function () {
      let code = '[false or false]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, false);
    });

    it("or_d", async function () {
      let code = '[false or true]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, true);
    });

    it("or_e", async function () {
      let code = '[true or false]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, true);
    });

    it("or_f", async function () {
      let code = '[true or true]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, true);
    });

    it("or_g", async function () {
      let code = '[true or false or true]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, true);
    });

    it("mix_and_or_a", async function () {
      let code = '[true and false or true]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, true);
    });

    it("mix_and_or_b", async function () {
      let code = '[false or false and true]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, false);
    });
  });




});