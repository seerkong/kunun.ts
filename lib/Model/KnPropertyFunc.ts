
import { Env } from "../StateManagement/Env";
import { KnNodeType } from "./KnNodeType"
import { KnCompositeFunctionBase } from "./KnCompositeFunctionBase";
import { KnWord } from "./KnWord";
export class KnPropertyFunc extends KnCompositeFunctionBase {
  public _Type = KnNodeType.PropertyFunc;
  public RequiredFields: string[];
  public Name: string;


  constructor(requiredFields: string[], paramTuple: KnWord[], funcBody: any, name: string) {
    super(funcBody, paramTuple);
    this.RequiredFields = requiredFields;
    this.Name = name;
  }
}