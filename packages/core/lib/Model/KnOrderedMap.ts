import { KnNodeType } from "./KnNodeType";

export class KnOrderedMap {
  public _Type = KnNodeType.OrderedMap;
  public Value: Map<string, any>;
  public TypeMap: Map<string, any[]>;

  public constructor(valMap: Map<string, any>, typeMap : Map<string, any[]> = new Map<string, any[]>()) {
    this.Value = valMap;
    this.TypeMap = typeMap;
  }

  public static MakeByPairs(kvPairs : [string, any[], any][]) {
    let valMap = new Map<string, any>();
    let typeMap = new Map<string, any[]>();
    for (let i = 0; i < kvPairs.length; i++) {
      let [k, types, v] = kvPairs[i];
      valMap.set(k, v);
      typeMap.set(k, types);
    }
    return new KnOrderedMap(valMap, typeMap);
  }
}