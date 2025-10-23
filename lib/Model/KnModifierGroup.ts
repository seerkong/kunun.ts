
import { Env } from "../StateManagement/Env";
import { KnNodeType } from "./KnNodeType"
import { KnNodeHelper } from "../Util/KnNodeHelper";
import { KnCompositeFunctionBase } from "./KnCompositeFunctionBase";
import { KnWord } from "./KnWord";
import { KnOrderedMap } from "./KnOrderedMap";
import { KnKnot } from "./KnKnot";
export class KnModifierGroup {
  public Identifiers: KnWord[] = [];
  public NamedValues: Map<KnWord, any> = new Map();
  public Knots: KnKnot[] = [];
  public UnorderedMap: { [prop: string]: any } = null;
  public OrderedMap: KnOrderedMap = null;
  public Vector: any[] = null;

}
