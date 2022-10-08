import { Interpreter } from '../../src/Interpreter';
import { Parser } from '../../src/Converter/Parser';
// import { describe, it } from "mocha";
import assert from "assert";
import fs from 'fs'
import { StateMgr } from '../../src/StateMgr';
import { Env } from '../../src/StateManagement/Env';

const BASE_DIR = './Test/Resource'

function parseFile(fileName: string) {
    const knStr = fs.readFileSync(`${BASE_DIR}/${fileName}`, 'utf-8')
    let node = Parser.Parse(knStr);
    return node;
}

describe("Interop", function() {
  describe("HostObject", function() {
      it("Console", async function() {

        let code = parseFile('Interop/JsConsole.kn');
        let ksState : StateMgr = Interpreter.PrepareState();
        let env : Env = ksState.GetCurEnv();
        env.Define("console", console);
        let r = await Interpreter.ExecWithState(ksState, code);
        assert.equal(r, undefined);
      });
  });


  describe("ReuseState", function() {
    it("VarDefUse", async function() {
      let ksState : StateMgr = Interpreter.PrepareState();
      let env : Env = ksState.GetCurEnv();
      env.Define("console", console);

      let code1 = Parser.Parse('[var a 5]');
      let r1 = await Interpreter.ExecWithState(ksState, code1);
      assert.equal(r1, 5);

      let code2 = Parser.Parse('[+ (1 a)]');
      let r2 = await Interpreter.ExecAndReuseState(ksState, code2);
      assert.equal(r2, 6);
    });
  });

});