import { TableMeta } from "./TableMeta";
import { KnNodeType } from "./KnNodeType"

export class KnTable {
  public _Type = KnNodeType.Table;
  public Metadata: TableMeta;
  public Fields: any[];

  constructor(metadata: TableMeta, fields: any[]
  ) {
    this.Metadata = metadata;
    this.Fields = fields;
  }
}