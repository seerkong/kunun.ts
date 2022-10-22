import { Env } from "../StateManagement/Env";
import { KnNodeType } from "./KnType"
import { NodeHelper } from "../Util/NodeHelper";
import { KnCompositeFunctionBase } from "./KnFunctionBase";
import { KnWord } from "./KnWord";
export class KnLambdaFunction extends KnCompositeFunctionBase {
  public _Type = KnNodeType.KnLambdaFunc;
  public Env: Env;
  public Name: string;

  constructor(paramTable: KnWord[], funcBody: any, env: Env, name: string = null) {
    super(funcBody, paramTable);

    this.Env = env;
    this.Name = name;
  }
}