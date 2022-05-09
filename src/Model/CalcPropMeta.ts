
import { Env } from "../StateManagement/Env";
import { KnType } from "./KnType"
import { KnPropertyFunc } from "./KnPropertyFunc"
import { PropertyMeta } from "./PropertyMeta";
export class CalcPropMeta implements PropertyMeta {
  public _Type = KnType.CalcPropMetadata;
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