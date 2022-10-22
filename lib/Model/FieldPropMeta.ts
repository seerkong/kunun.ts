
import { Env } from "../StateManagement/Env";
import { KnNodeType } from "./KnType"
import { IPropertyMeta } from "./IPropertyMeta";
export class FieldPropMeta implements IPropertyMeta {
  public _Type = KnNodeType.KnFieldPropMetadata;
  public Name: string;
  public Definition: any;
  public Visibility: string;

  constructor(name, definition = null, visibility = "public") {

    this.Name = name;
    this.Definition = definition;
    this.Visibility = visibility;
  }
}