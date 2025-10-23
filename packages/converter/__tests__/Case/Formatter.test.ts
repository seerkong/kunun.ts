import { KnConverter } from 'kunun-converter/KnConverter';
// import { describe, it } from "mocha";
import assert from "assert";
import fs from 'fs'

const BASE_DIR = __dirname + '/../Resource'
const Parser = KnConverter.Knl.Parser;
const KnFormatter = KnConverter.Knl.Formater;

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
      let ast = Parser.Parse("[func #abc]");
      let str = KnFormatter.Stringify(ast, false);
      assert.equal(str, "[func #abc]");
    });
    it("knot_multi_map", function() {
      let ast = Parser.Parse("[p :props = (d = 3 e = 4)]");
      let str = KnFormatter.Stringify(ast, false);
      assert.equal(str, "[p :props = (d = 3 e = 4)]");
    });
    it("knot_multi_array", function() {
      let ast = parseFile('Parser/KnotMultiArray.kn');
      let str = KnFormatter.Stringify(ast, true);
      console.log(str)
      console.log(ast)
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
