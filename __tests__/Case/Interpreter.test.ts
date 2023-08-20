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

describe("Interpreter", function () {


  describe("Env", function () {
    it("DeclareVar", async function () {
      let code = parseFile('Env/DeclareVar.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 5);
    });

    it("SetVar", async function () {
      let code = parseFile('Env/SetVar.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 6);
    });

    it("DefineTo", async function () {
      let code = parseFile('Env/DefineTo.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 5);
    });

    it("SetTo", async function () {
      let code = parseFile('Env/SetTo.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 6);
    });

    it("MultiDefineSetTo", async function () {
      let code = parseFile('Env/MultiDefineSetTo.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 20);
    });
  });

  describe("IfElse", function () {
    it("IfWithTrueFalseBranch", async function () {
      let code = parseFile('IfElse/IfWithTrueFalseBranch.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, true);
    });
    it("NoElseBranch", async function () {
      let code = parseFile('IfElse/NoElseBranch.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, true);
    });
    it("IfCheckFailNoElseBranch", async function () {
      let code = parseFile('IfElse/IfCheckFailNoElseBranch.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, false);
    });
    it("IfCheckFailJumpToElseBranch", async function () {
      let code = parseFile('IfElse/IfCheckFailJumpToElseBranch.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, true);
    });
  });

  describe("Condition", function () {
    it("CondTrueBranch", async function () {
      let code = parseFile('Cond/Cond1.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 2);
    });
    it("CondElseBranch", async function () {
      let code = parseFile('Cond/Cond2.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 3);
    });
  });

  describe("Foreach", function () {
    it("ForeachArr", async function () {
      let code = parseFile('Foreach/ForeachArr2.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 3);
    });

    it("BreakForEach", async function () {
      let code = parseFile('Foreach/BreakForEach.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 1);
    });

    it("ContinueForEach", async function () {
      let code = parseFile('Foreach/ContinueForEach.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 3);
    });
  });

  describe("Func", function () {
    it("AddWith4Args", async function () {
      let code = parseFile('Func/AddWith4Args.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 10);
    });

    it("Curring", async function () {
      let code = parseFile('Func/Curring.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 10);
    });

    it("VaryLengthFunction", async function () {
      let code = parseFile('Func/VaryLengthFunction.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 10);
    });

    it("Return", async function () {
      let code = parseFile('Func/Return.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 1);
    });
    it("Return2", async function () {
      let code = parseFile('Func/Return2.kn');
      let formatedCode = KnFormatter.Stringify(code)
      console.log("exec kunun code:\n", formatedCode);
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 2);
    });
  });

  describe("ForLoop", function () {
    it("ForLoopArr", async function () {
      let code = parseFile('ForLoop/ForArr1.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 3);
    });

    it("ForLoopBreak", async function () {
      let code = parseFile('ForLoop/ForBreak.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 1);
    });

    it("ForLoopContinue", async function () {
      let code = parseFile('ForLoop/ForContinue.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 3);
    });
  });

  describe("SelfUpdate", function () {
    it("SelfUpdate_Increase", async function () {
      let code = parseFile('Math/SelfUpdate_PlusOne.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 3);
    });
    it("SelfUpdate_Decrease", async function () {
      let code = parseFile('Math/SelfUpdate_MinusOne.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 1);
    });
    it("SelfUpdate_Add", async function () {
      let code = parseFile('Math/SelfUpdate_Add.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 4);
    });
    it("SelfUpdate_Minus", async function () {
      let code = parseFile('Math/SelfUpdate_Minus.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 0);
    });
    it("SelfUpdate_Multiply", async function () {
      let code = parseFile('Math/SelfUpdate_Multiply.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 4);
    });
    it("SelfUpdate_Divide", async function () {
      let code = parseFile('Math/SelfUpdate_Divide.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 1);
    });
  });

  describe("PartialOperandStack", function () {
    it("MakePartialOperandStack", async function () {
      let code = parseFile('Env/MakePartialOperandStack.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.deepStrictEqual(r, [1, 2]);
    });

    it("UsePartialOperandStack", async function () {
      let code = parseFile('Env/UsePartialOperandStack.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.deepStrictEqual(r, 3);
    });

  });


  describe("ObjectSystem", function () {
    it("DeclareObject", async function () {
      let code = parseFile('ObjectSystem/Object.kn');
      let str = KnFormatter.Stringify(code, true);
      let r = await Interpreter.ExecAsync(code);
      console.log(JSON.stringify(r, null, 2));
      //   console.log(str)
    });

    it("FieldPropSetGetByProp", async function () {
      let code = parseFile('ObjectSystem/FieldPropSetGetByProp.kn');
      let r = await Interpreter.ExecAsync(code);
      console.log(JSON.stringify(r, null, 2));
      assert.equal(r, 2);
    });

    it("FieldPropSetGetBySubscript", async function () {
      let code = parseFile('ObjectSystem/FieldPropSetGetBySubscript.kn');
      let r = await Interpreter.ExecAsync(code);
      console.log(JSON.stringify(r, null, 2));
      assert.equal(r, 2);
    });

    it("CalcPropSetGetByProp", async function () {
      let code = parseFile('ObjectSystem/CalcPropSetGetByProp.kn');
      let r = await Interpreter.ExecAsync(code);
      console.log(JSON.stringify(r, null, 2));
      assert.equal(r, 3);
    });

    it("MethodCall", async function () {
      let code = parseFile('ObjectSystem/MethodCall.kn');
      let r = await Interpreter.ExecAsync(code);
      console.log(JSON.stringify(r, null, 2));
      assert.equal(r, 3);
    });

    it("HostArrayLength", async function () {
      let code = parseFile('ObjectSystem/HostArrayLength.kn');
      let r = await Interpreter.ExecAsync(code);
      console.log(JSON.stringify(r, null, 2));
      assert.equal(r, true);
    });


    it("ResetHostArray", async function () {
      let code = '[do { [var  tabledata $(data =${1 2 3})] [tabledata @.data = ${}] [tabledata.data.length] }]';
      let r = Interpreter.EvalSync(code);
      assert.equal(r, []);
    });
  });

  describe("TryKeyword", function () {
    it("RunMap", async function () {
      let code = parseFile('Effect/RunMap.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r.a, 3);
      assert.equal(r.b, 7);
      assert.equal(r.c, 3);
    });
    it("PerformResumeWithoutAsync", async function () {
      let code = parseFile('Effect/PerformResumeWithoutAsync.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 6);
    });
  });

  describe("EventQueue", function () {
    it("WaitTimeout", async function () {
      let code = parseFile('EventQueue/WaitTimeout.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 5);
    });

    it("SetInterval", async function () {
      let code = parseFile('EventQueue/SetInterval.kn');
      let r = await Interpreter.ExecAsync(code);
      assert.equal(r, 5);
    });
  });
});