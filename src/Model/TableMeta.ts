
import { Env } from "../StateManagement/Env";
import { FieldStorageMeta } from "./FieldStorageMeta";
import { KnType } from "./KnType"
import { KnMethodFunc } from "./KnMethodFunc";
import { KnPropertyFunc } from "./KnPropertyFunc"
import { PropertyMeta } from "./PropertyMeta";
export class TableMeta {
  public _Type = KnType.TableMetadata;
  public Kind: any;
  public FieldMap: Map<string, FieldStorageMeta>;
  public PropertyMap: Map<string, PropertyMeta>;
  public MethodMap: Map<string, KnMethodFunc>;

  constructor(kind: string = 'Instance', fields: any[], properties : PropertyMeta[],
    methods: KnMethodFunc[]
  ) {
    this.Kind = kind;
    this.FieldMap = new Map<string, FieldStorageMeta>();
    for (let i = 0; i < fields.length; i++) {
      this.FieldMap.set(fields[i].Name, fields[i]);
    }
    this.PropertyMap = new Map<string, PropertyMeta>();
    for (let i = 0; i < properties.length; i++) {
      this.PropertyMap.set(properties[i].Name, properties[i]);
    }
    this.MethodMap = new Map<string, KnMethodFunc>();
    for (let i = 0; i < methods.length; i++) {
      this.MethodMap.set(methods[i].Name, methods[i]);
    }
  }
}