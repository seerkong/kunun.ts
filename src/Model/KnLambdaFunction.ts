import { Env } from "../StateManagement/Env";
import { KnType } from "./KnType"
import { NodeHelper } from "Util/NodeHelper";
import { KnFunctionBase } from "./KnFunctionBase";
import { KnWord } from "./KnWord";
export class KnLambdaFunction extends KnFunctionBase {
  public _Type = KnType.LambdaFunc;
  public Env: Env;
  public Name: string;

  constructor(paramTable: KnWord[], funcBody: any, env: Env, name: string = null) {
    super(funcBody, paramTable);

    this.Env = env;
    this.Name = name;
  }
}