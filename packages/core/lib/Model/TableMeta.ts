
import { Env } from "../StateManagement/Env";
import { FieldStorageMeta } from "./FieldStorageMeta";
import { KnNodeType } from "./KnNodeType"
import { KnMethodFunc } from "./KnMethodFunc";
import { KnPropertyFunc } from "./KnPropertyFunc"
import { IPropertyMeta } from "./IPropertyMeta";
export class TableMeta {
  public _Type = KnNodeType.TableMetadata;
  public Kind: any;
  public FieldMap: Map<string, FieldStorageMeta>;
  public PropertyMap: Map<string, IPropertyMeta>;
  public MethodMap: Map<string, KnMethodFunc>;

  constructor(kind: string = 'Instance', fields: any[], properties : IPropertyMeta[],
    methods: KnMethodFunc[]
  ) {
    this.Kind = kind;
    this.FieldMap = new Map<string, FieldStorageMeta>();
    for (let i = 0; i < fields.length; i++) {
      this.FieldMap.set(fields[i].Name, fields[i]);
    }
    this.PropertyMap = new Map<string, IPropertyMeta>();
    for (let i = 0; i < properties.length; i++) {
      this.PropertyMap.set(properties[i].Name, properties[i]);
    }
    this.MethodMap = new Map<string, KnMethodFunc>();
    for (let i = 0; i < methods.length; i++) {
      this.MethodMap.set(methods[i].Name, methods[i]);
    }
  }
}