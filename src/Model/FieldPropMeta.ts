
import { Env } from "../StateManagement/Env";
import { KnType } from "./KnType"
import { PropertyMeta } from "./PropertyMeta";
export class FieldPropMeta implements PropertyMeta {
  public _Type = KnType.FieldPropMetadata;
  public Name: string;
  public Definition: any;
  public Visibility: string;

  constructor(name, definition = null, visibility = "public") {

    this.Name = name;
    this.Definition = definition;
    this.Visibility = visibility;
  }
}