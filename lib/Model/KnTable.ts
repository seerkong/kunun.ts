
import { Env } from "../StateManagement/Env";
import { KnNodeType } from "./KnType"
import { TableMeta } from "./TableMeta";
import { KnPropertyFunc } from "./KnPropertyFunc"
export class KnTable {
  public _Type = KnNodeType.KnTable;
  public Metadata: TableMeta;
  public Fields: any[];

  constructor(metadata: TableMeta, fields: any[]
  ) {
    this.Metadata = metadata;
    this.Fields = fields;
  }
}