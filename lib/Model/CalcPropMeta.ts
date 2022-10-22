
import { Env } from "../StateManagement/Env";
import { KnNodeType } from "./KnType"
import { KnPropertyFunc } from "./KnPropertyFunc"
import { IPropertyMeta } from "./IPropertyMeta";
export class CalcPropMeta implements IPropertyMeta {
  public _Type = KnNodeType.KnCalcPropMetadata;
  public Name: string;
  public Definition: any;

  public GetterVisibility: string;
  public GetterFunc: KnPropertyFunc;
  public SetterVisibility: string;
  public SetterFunc: KnPropertyFunc;

  constructor(name, definition = null,
    getterVisibility = "public", getterFunc : KnPropertyFunc,
    setterVisibility = "public", setterFunc : KnPropertyFunc
  ) {
    this.Name = name;
    this.Definition = definition;
    this.GetterVisibility = getterVisibility;
    this.GetterFunc = getterFunc;
    this.SetterVisibility = setterVisibility;
    this.SetterFunc = setterFunc;
  }
}