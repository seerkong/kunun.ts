import { Interpreter } from '../../lib/Interpreter';
import { Parser } from '../../lib/Converter/Parser';
// import { describe, it } from "mocha";
import assert from "assert";
import fs from 'fs'
import { KnState } from '../../lib/KnState';
import { Env } from '../../lib/StateManagement/Env';

const BASE_DIR = './__tests__/Resource'

function parseFile(fileName: string) {
    const knStr = fs.readFileSync(`${BASE_DIR}/${fileName}`, 'utf-8')
    let node = Parser.Parse(knStr);
    return node;
}

describe("Env", function() {
  describe("DefineEnv", function() {
      it("DefineMultiBlock", async function() {

        let code = `[do { [var b 2] 4 }]`;
        let ksState : KnState = Interpreter.PrepareState();
        let env : Env = ksState.GetCurEnv();
        env.Define("console", console);
        let r = await Interpreter.ExecWithStateAsync(ksState, code);
        assert.equal(r, 4);
      });
  });
});