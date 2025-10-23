import { KnNodeType } from "./KnNodeType";

export class KnUnorderedMap {
  [key: string]: any;

  // public _Type = XnNodeType.UnorderedMap;
  // public Value: Map<any, any>;

  // public constructor(inner: Map<string, any>) {
  //   this.Value = inner;
  // }

  public static MakeByPairs(kvPairs : [any, any][]): KnUnorderedMap {
    let r = new KnUnorderedMap();
    for (let i = 0; i < kvPairs.length; i++) {
      let [k, v] = kvPairs[i];
      r[k] = v;
    }
    return r;
  }
}
