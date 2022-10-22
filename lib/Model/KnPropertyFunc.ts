
import { Env } from "../StateManagement/Env";
import { KnNodeType } from "./KnType"
import { KnCompositeFunctionBase } from "./KnFunctionBase";
import { KnWord } from "./KnWord";
export class KnPropertyFunc extends KnCompositeFunctionBase {
  public _Type = KnNodeType.KnPropertyFunc;
  public RequiredFields: string[];
  public Name: string;


  constructor(requiredFields: string[], paramTuple: KnWord[], funcBody: any, name: string) {
    super(funcBody, paramTuple);
    this.RequiredFields = requiredFields;
    this.Name = name;
  }
}