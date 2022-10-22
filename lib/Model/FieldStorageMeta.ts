
import { Env } from "../StateManagement/Env";
import { KnNodeType } from "./KnType"
export class FieldStorageMeta {
  public _Type = KnNodeType.KnFieldStorageMetadata;
  public Name: string;
  public Index: number;
  public Definition: any;
  public DefaultValueExpr: any;
  

  constructor(name, index, definition = null, defaultValueExpr = null) {
    this.Name = name;
    this.Index = index;
    this.Definition = definition;
    this.DefaultValueExpr = defaultValueExpr;
  }
}