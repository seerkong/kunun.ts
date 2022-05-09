
import { Env } from "../StateManagement/Env";
import { KnType } from "./KnType"
import { NodeHelper } from "Util/NodeHelper";
import { KnFunctionBase } from "./KnFunctionBase";
import { KnWord } from "./KnWord";

export class KnMethodFunc extends KnFunctionBase {
  public _Type = KnType.MethodFunc;
  public InstanceType: any;

  public Name: string;
  public Visibility: string;

  constructor(instanceType: any, paramTable: KnWord[], returnType: any, funcBody: any, name: string, visibility : string) {
    super(funcBody, paramTable, returnType);
    this.InstanceType = instanceType;
    

    this.Name = name;
    this.Visibility = visibility;

  }
}