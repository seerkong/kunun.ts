import { Parser } from '../../lib/Converter/Parser';
import { KnFormatter } from '../../lib/Converter/KnFormatter';
import { TableHandler } from '../../lib/Handler/PrefixKeyword/TableHandler';
// import { describe, it } from "mocha";
import assert from "assert";
import fs from 'fs'
import { KnKnot } from '../../lib/Model';

const BASE_DIR = './__tests__/Resource'

function parseFile(fileName: string) {
    const knStr = fs.readFileSync(`${BASE_DIR}/${fileName}`, 'utf-8')
    let node = Parser.Parse(knStr);
    return node;
}


describe("formatter", function() {
  describe("Number", function() {
    it("float_Number", function() {
      let v = Parser.Parse("5.321");
      let str = KnFormatter.Stringify(v, true);
      console.log(str)
      assert.equal(str, "5.321");
    });

    it("int_Number", function() {
      let v = Parser.Parse("54321");
      let str = KnFormatter.Stringify(v, true);
      console.log(str)
      assert.equal(str, "54321");
    });
  });

  describe("array", function() {
    it("Word_in_array", function() {
      let v = Parser.Parse(" {a} ");
      let str = KnFormatter.Stringify(v, true);
      console.log(str)
      console.log(v)
    });
    it("nested_array", function() {
      let v = Parser.Parse(" {a {1 {2 {3}}}} ");
      // let v = Parser.Parse(" {a } ");
      let str = KnFormatter.Stringify(v, true);
      console.log(str)
      console.log(v)
    });
  });

  describe("map", function() {
    it("omit_val_map", function() {
      let v = Parser.Parse(" (a) ");
      let str = KnFormatter.Stringify(v, true);
      console.log(str)
      console.log(v)
    });
    it("nested_map", function() {
      let v = Parser.Parse("(a =1  b =(c =2  d =(e =3  f =()) ) )");
      // let v = Parser.Parse("(a= 1  )");
      let str = KnFormatter.Stringify(v, true);
      console.log(str)
      console.log(v)
    });
  });

  describe("knot", function() {
    it("add_expr", function() {
      let v = Parser.Parse("[add;]");
      let str = KnFormatter.Stringify(v, true);
      console.log(str)
      console.log(v)
    });
    it("set_val_expr", function() {
      let v = Parser.Parse("[val @.n = 2]");
      let str = KnFormatter.Stringify(v, true);
      console.log(str)
      console.log(v)
    });

    it("knot_core_only", function() {
      let ast = parseFile('Parser/KnotCoreOnly.kn');
      let str = KnFormatter.Stringify(ast, true);
      console.log(str)
      console.log(ast)
    });
    it("knot_single_node", function() {
      let ast = parseFile('Parser/KnotSingleNode.kn');
      let str = KnFormatter.Stringify(ast, true);
      console.log(str)
      console.log(ast)
    });
    it("knot_multi_map", function() {
      let ast = parseFile('Parser/KnotMultiMap.kn');
      let str = KnFormatter.Stringify(ast, true);
      console.log(str)
      console.log(ast)
    });
    it("knot_multi_array", function() {
      let ast = parseFile('Parser/KnotMultiArray.kn');
      let str = KnFormatter.Stringify(ast, true);
      console.log(str)
      console.log(ast)
    });
  });


  describe("ObjectSystem", function() {
    it("DeclareObject", function() {
      let ast : KnKnot = parseFile('ObjectSystem/Object.kn');
      let str = KnFormatter.Stringify(ast, true);
      console.log(str)
      let objDeclareNode : any = ast.Block![0];
      let nameObjPair = TableHandler.MakeTable(objDeclareNode);
      let objInstance = nameObjPair[1];
      console.log(JSON.stringify(objInstance, null, 2));
    });
  });



  describe("Object", function() {
    it("ObjSetter", function() {
      let ast = parseFile('Parser/ObjSetter.kn');
      let str = KnFormatter.Stringify(ast, true);
      console.log(str)
      console.log(JSON.stringify(ast, null, 2));
    });
  });
});
