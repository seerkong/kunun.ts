import { Interpreter } from '../../src/Interpreter';
import { Parser } from '../../src/Converter/Parser';
// import { describe, it } from "mocha";
import assert from "assert";
import fs from 'fs'
import { StateMgr } from '../../src/StateMgr';
import { Env } from '../../src/StateManagement/Env';

const BASE_DIR = './test/testset'

function parseFile(fileName: string) {
    const knStr = fs.readFileSync(`${BASE_DIR}/${fileName}`, 'utf-8')
    let node = Parser.Parse(knStr);
    return node;
}

describe("Interop", function() {
  describe("HostObject", function() {
      it("Console", function() {

        let code = parseFile('interop/JsConsole.kn');
        let interp: Interpreter = new Interpreter();
        let ksState : StateMgr = interp.PrepareState();
        let env : Env = ksState.GetCurEnv();
        env.Define("console", console);
        let r = interp.ExecNode(ksState, code);
        assert.equal(r, undefined);
      });
  });

});