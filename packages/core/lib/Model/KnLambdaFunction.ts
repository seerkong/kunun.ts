import { Env } from "../StateManagement/Env";
import { KnNodeType } from "./KnNodeType"
import { KnNodeHelper } from "../Util/KnNodeHelper";
import { KnCompositeFunctionBase } from "./KnCompositeFunctionBase";
import { KnWord } from "./KnWord";
export class KnLambdaFunction extends KnCompositeFunctionBase {
  public _Type = KnNodeType.Lambda;
  public Env: Env;
  public Name: string;

  constructor(paramTable: KnWord[], funcBody: any, env: Env, name: string = null) {
    super(funcBody, paramTable);

    this.Env = env;
    this.Name = name;
  }
}