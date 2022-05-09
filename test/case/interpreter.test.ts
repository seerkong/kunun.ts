import { Interpreter } from '../../src/Interpreter';
import { Parser } from '../../src/Converter/Parser';
// import { describe, it } from "mocha";
import assert from "assert";
import fs from 'fs'
import { KnFormatter } from '../../src/Formatter/KnFormatter';

const BASE_DIR = './test/testset'

function parseFile(fileName: string) {
  const knStr = fs.readFileSync(`${BASE_DIR}/${fileName}`, 'utf-8')
  let node = Parser.Parse(knStr);
  return node;
}

describe("Interpreter", function () {
  describe("HostFunction", function () {
    it("Writeln", async function () {
      let code = parseFile('io/writeln.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 3);
    });

    it("add", async function () {
      let code = parseFile('math/add.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 7);
    });

    it("NumberEqual", async function () {
      let code = parseFile('math/NumberEqual.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, true);
    });
  });

  describe("Env", function () {
    it("DeclareVar", async function () {
      let code = parseFile('env/declare_var.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 5);
    });

    it("SetVar", async function () {
      let code = parseFile('env/set_var.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 6);
    });
  });

  describe("IfElse", function () {
    it("IfWithTrueFalseBranch", async function () {
      let code = parseFile('ifelse/if_with_true_false_branch.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, true);
    });
    it("NoElseBranch", async function () {
      let code = parseFile('ifelse/no_else_branch.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, true);
    });
    it("IfCheckFailNoElseBranch", async function () {
      let code = parseFile('ifelse/if_check_fail_no_else_branch.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, false);
    });
    it("IfCheckFailJumpToElseBranch", async function () {
      let code = parseFile('ifelse/if_check_fail_jump_to_else_branch.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, true);
    });
  });

  describe("Condition", function () {
    it("CondTrueBranch", async function () {
      let code = parseFile('cond/cond1.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 2);
    });
    it("CondElseBranch", async function () {
      let code = parseFile('cond/cond2.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 3);
    });
  });

  describe("Foreach", function () {
    it("ForeachArr", async function () {
      let code = parseFile('foreach/foreach_arr_2.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 3);
    });

    it("BreakForEach", async function () {
      let code = parseFile('foreach/BreakForEach.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 1);
    });

    it("ContinueForEach", async function () {
      let code = parseFile('foreach/ContinueForEach.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 3);
    });
  });

  describe("Func", function () {
    it("AddWith4Args", async function () {
      let code = parseFile('func/add_with_4_args.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 10);
    });

    it("Curring", async function () {
      let code = parseFile('func/Curring.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 10);
    });

    it("VaryLengthFunction", async function () {
      let code = parseFile('func/VaryLengthFunction.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 10);
    });

    it("Return", async function () {
      let code = parseFile('func/Return.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 1);
    });
  });

  describe("ForLoop", function () {
    it("ForLoopArr", async function () {
      let code = parseFile('forloop/for_arr_1.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 3);
    });

    it("ForLoopBreak", async function () {
      let code = parseFile('forloop/for_break.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 1);
    });

    it("ForLoopContinue", async function () {
      let code = parseFile('forloop/for_continue.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 3);
    });
  });

  describe("SelfUpdate", function () {
    it("SelfUpdate_Increase", async function () {
      let code = parseFile('math/SelfUpdate_PlusOne.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 3);
    });
    it("SelfUpdate_Decrease", async function () {
      let code = parseFile('math/SelfUpdate_MinusOne.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 1);
    });
    it("SelfUpdate_Add", async function () {
      let code = parseFile('math/SelfUpdate_Add.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 4);
    });
    it("SelfUpdate_Minus", async function () {
      let code = parseFile('math/SelfUpdate_Minus.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 0);
    });
    it("SelfUpdate_Multiply", async function () {
      let code = parseFile('math/SelfUpdate_Multiply.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 4);
    });
    it("SelfUpdate_Divide", async function () {
      let code = parseFile('math/SelfUpdate_Divide.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 1);
    });
  });

  describe("PartialOperandStack", function () {
    it("MakePartialOperandStack", async function () {
      let code = parseFile('env/MakePartialOperandStack.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.deepStrictEqual(r, [1, 2]);
    });

    it("UsePartialOperandStack", async function () {
      let code = parseFile('env/UsePartialOperandStack.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.deepStrictEqual(r, 3);
    });

  });


  describe("ObjectSystem", function () {
    it("DeclareObject", async function () {
      let code = parseFile('ObjectSystem/Object.kn');
      let str = KnFormatter.Stringify(code, true);
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      console.log(JSON.stringify(r, null, 2));
      //   console.log(str)

      //   let objDeclareNode = ast.Body[0];
      //   let nameObjPair = ObjectHandler.MakeObject(objDeclareNode);
      //   let objInstance = nameObjPair[1];
      //   console.log(JSON.stringify(objInstance, null, 2));
    });

    it("SelfUpdate_Divide", async function () {
      let code = parseFile('math/SelfUpdate_Divide.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 1);
    });

    it("FieldPropSetGetByProp", async function () {
      let code = parseFile('ObjectSystem/FieldPropSetGetByProp.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      console.log(JSON.stringify(r, null, 2));
      assert.equal(r, 2);
    });

    it("FieldPropSetGetBySubscript", async function () {
      let code = parseFile('ObjectSystem/FieldPropSetGetBySubscript.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      console.log(JSON.stringify(r, null, 2));
      assert.equal(r, 2);
    });

    it("CalcPropSetGetByProp", async function () {
      let code = parseFile('ObjectSystem/CalcPropSetGetByProp.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      console.log(JSON.stringify(r, null, 2));
      assert.equal(r, 3);
    });

    it("MethodCall", async function () {
      let code = parseFile('ObjectSystem/MethodCall.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      console.log(JSON.stringify(r, null, 2));
      assert.equal(r, 3);
    });

    it("HostArrayLength", async function () {
      let code = parseFile('ObjectSystem/HostArrayLength.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      console.log(JSON.stringify(r, null, 2));
      assert.equal(r, true);
    });
  });

  describe("TryKeyword", function () {
    it("RunMap", async function () {
      let code = parseFile('effect/RunMap.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r.a, 3);
      assert.equal(r.b, 7);
      assert.equal(r.c, 3);
    });
    it("PerformResumeWithoutAsync", async function () {
      let code = parseFile('effect/PerformResumeWithoutAsync.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 6);
    });

    

  });

  describe("EventQueue", function () {
    it("WaitTimeout", async function () {
      let code = parseFile('eventqueue/WaitTimeout.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 5);
    });

    it("SetInterval", async function () {
      let code = parseFile('eventqueue/SetInterval.kn');
      let interp: Interpreter = new Interpreter();
      let r = await interp.Exec(code);
      assert.equal(r, 5);
    });
  });
});