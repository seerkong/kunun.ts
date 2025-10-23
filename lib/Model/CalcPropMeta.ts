
import { Env } from "../StateManagement/Env";
import { KnNodeType } from "./KnNodeType"
import { KnPropertyFunc } from "./KnPropertyFunc"
import { IPropertyMeta } from "./IPropertyMeta";
export class CalcPropMeta implements IPropertyMeta {
  public _Type = KnNodeType.CalcPropMetadata;
  public Name: string;
  public Definition: any;

  public GetterVisibility: string;
  public GetterFunc: KnPropertyFunc | null;
  public SetterVisibility: string;
  public SetterFunc: KnPropertyFunc | null;

  constructor(name, definition = null,
    getterVisibility : string = "public", getterFunc : KnPropertyFunc | null,
    setterVisibility : string = "public", setterFunc : KnPropertyFunc | null
  ) {
    this.Name = name;
    this.Definition = definition;
    this.GetterVisibility = getterVisibility;
    this.GetterFunc = getterFunc;
    this.SetterVisibility = setterVisibility;
    this.SetterFunc = setterFunc;
  }
}