import { KnWord } from "./KnWord";
import { KnOrderedMap } from "./KnOrderedMap";
import { KnKnot } from "./KnKnot";
export declare class KnModifierGroup {
    Identifiers: KnWord[];
    NamedValues: Map<KnWord, any>;
    Knots: KnKnot[];
    UnorderedMap: {
        [prop: string]: any;
    };
    OrderedMap: KnOrderedMap;
    Vector: any[];
}
