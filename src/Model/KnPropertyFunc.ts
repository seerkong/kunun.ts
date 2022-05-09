
import { Env } from "../StateManagement/Env";
import { KnType } from "./KnType"
import { KnFunctionBase } from "./KnFunctionBase";
import { KnWord } from "./KnWord";
export class KnPropertyFunc extends KnFunctionBase {
  public _Type = KnType.PropertyFunc;
  public RequiredFields: string[];
  public Name: string;


  constructor(requiredFields: string[], paramTuple: KnWord[], funcBody: any, name: string) {
    super(funcBody, paramTuple);
    this.RequiredFields = requiredFields;
    this.Name = name;
  }
}