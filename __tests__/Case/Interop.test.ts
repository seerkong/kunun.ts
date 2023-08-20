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

describe("Interop", function() {
  describe("HostObject", function() {
      it("Console", async function() {

        let code = parseFile('Interop/JsConsole.kn');
        let ksState : KnState = Interpreter.PrepareState();
        let env : Env = ksState.GetCurEnv();
        env.Define("console", console);
        let r = await Interpreter.ExecWithStateAsync(ksState, code);
        assert.equal(r, undefined);
      });
  });


  describe("ReuseState", function() {
    it("VarDefUse", async function() {
      let ksState : KnState = Interpreter.PrepareState();
      let env : Env = ksState.GetCurEnv();
      env.Define("console", console);

      let code1 = Parser.Parse('[var a 5]');
      let r1 = await Interpreter.ExecWithStateAsync(ksState, code1);
      assert.equal(r1, 5);

      let code2 = Parser.Parse('[+ (1 a)]');
      let r2 = await Interpreter.ExecAndReuseStateAsync(ksState, code2);
      assert.equal(r2, 6);
    });
  });

  describe("CallHost", function() {
    it("CallHostSyncFunc", async function() {
      let ksState : KnState = Interpreter.PrepareState();
      let env : Env = ksState.GetCurEnv();
      env.Define("foo", function(arg1) {
        console.log("call func foo, arg1 is ", arg1);
        return 1 + arg1;
      });

      let code1 = Parser.Parse('[func bar (x) { [foo (x)] }]');
      let r1 = await Interpreter.ExecWithStateAsync(ksState, code1);

      let code2 = Parser.Parse('[bar (5)]');
      let r2 = await Interpreter.ExecAndReuseStateAsync(ksState, code2);
      assert.equal(r2, 6);
    });

    it("CallHostAsyncFunc_Fulfilled_1", async function() {
      let ksState : KnState = Interpreter.PrepareState();
      let env : Env = ksState.GetCurEnv();
      env.Define("console", console);
      env.Define("foo", async function(arg1) {
        console.log("call async func foo, arg1 is ", arg1);
        return new Promise(function (resolve, reject) {
          setTimeout(function() {
            console.log("exec callback func");
            let r = 1 + arg1;
            resolve(r);
          }, 100);
        });
      });

      let code1 = Parser.Parse('[func bar (x) { [await_host_fn foo (x) catch (e) { [console .log (e)] } ] }]');
      let r1 = await Interpreter.ExecWithStateAsync(ksState, code1);

      let code2 = Parser.Parse('[bar (5)]');
      let r2 = await Interpreter.ExecAndReuseStateAsync(ksState, code2);
      assert.equal(r2, 6);
    });


    it("CallHostAsyncFunc_Fulfilled_2", async function() {
      let ksState : KnState = Interpreter.PrepareState();
      let env : Env = ksState.GetCurEnv();

      let func1 = async function(arg1) {
        console.log("call async func foo, arg1 is ", arg1);
        return new Promise(function (resolve, reject) {
          setTimeout(function() {
            console.log("exec callback func");
            let r = 1 + arg1;
            resolve(r);
          }, 100);
        });
      };
      env.Define("console", console);
      env.Define("foo", async function(arg1) {
        console.log("call async func foo, arg1 is ", arg1);
        let r = await func1(arg1);
        return r;
      });

      let code1 = Parser.Parse('[func bar (x) { [await_host_fn foo (x) catch (e) { [console .log (e)] } ] }]');
      let r1 = await Interpreter.ExecWithStateAsync(ksState, code1);

      let code2 = Parser.Parse('[bar (5)]');
      let r2 = await Interpreter.ExecAndReuseStateAsync(ksState, code2);
      assert.equal(r2, 6);
    });


    it("CallHostAsyncFunc_Rejected", async function() {
      let ksState : KnState = Interpreter.PrepareState();
      let env : Env = ksState.GetCurEnv();
      env.Define("console", console);
      env.Define("foo", async function(arg1) {
        console.log("call async func foo, arg1 is ", arg1);
        return new Promise(function (resolve, reject) {
          setTimeout(function() {
            console.log("exec callback func");
            reject("this is a exception");
          }, 100);
        });
      });

      let code1 = Parser.Parse('[func bar (x) { [await_host_fn foo (x) catch (e) { [console .log (e)] 0 } ] }]');
      let r1 = await Interpreter.ExecWithStateAsync(ksState, code1);

      let code2 = Parser.Parse('[bar (5)]');
      let r2 = await Interpreter.ExecAndReuseStateAsync(ksState, code2);
      assert.equal(r2, 0);
    });


    it("MakeFuncSync_a", async function() {
      let ksState : KnState = Interpreter.PrepareState();
      let env : Env = ksState.GetCurEnv();
      env.Define("console", console);
      env.Define("a", 1);

      let code1 = Parser.Parse('[func (x) { [console .log (x)] ["result:" x append;] } ]');
      let r1 = Interpreter.MakeFuncSync(ksState, code1);
      let r2 = r1("test arg");
      assert.equal(r2, "result:test arg");
    });


    it("JsCall_1", async function() {
      let ksState : KnState = Interpreter.PrepareState();
      let env : Env = ksState.GetCurEnv();
      env.Define("console", console);
      let p = new Proxy([], {});
      env.Define("p", p);

      let code1 = Parser.Parse('[js_call p.push(1)]');
      let r1 = Interpreter.ExecWithStateSync(ksState, code1);
      assert.equal(p[0], 1);
    });

    it("JsApply_1", async function() {
      let ksState : KnState = Interpreter.PrepareState();
      let env : Env = ksState.GetCurEnv();
      env.Define("console", console);
      let p = new Proxy([], {});
      env.Define("p", p);

      let code1 = Parser.Parse('[js_apply p.push({1})]');
      let r1 = Interpreter.ExecWithStateSync(ksState, code1);
      assert.equal(p[0], 1);
    });

  });
});