
import { Env } from "../StateManagement/Env";
import { KnNodeType } from "./KnNodeType"
import { KnNodeHelper } from "../Util/KnNodeHelper";
import { KnCompositeFunctionBase } from "./KnCompositeFunctionBase";
import { KnWord } from "./KnWord";

export class KnMethodFunc extends KnCompositeFunctionBase {
  public _Type = KnNodeType.MethodFunc;
  public InstanceType: any;

  public Name: string;
  public Visibility: string;

  constructor(paramTable: KnWord[], returnType: any, funcBody: any, name: string, visibility : string) {
    super(funcBody, paramTable, returnType);

    this.Name = name;
    this.Visibility = visibility;

  }
}