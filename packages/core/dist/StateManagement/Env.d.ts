import { SingleEntryGraphNode } from "../Algo/SingleEntryGraphNode";
import { FlowVarEnvType } from "./FlowVarEnvType";
export interface EnvSnapshot {
    id: number;
    envType: FlowVarEnvType;
    parentEnvId: number;
    variables: [string, any][];
}
export declare class Env implements SingleEntryGraphNode<Number> {
    private static nextEnvId;
    Id: number;
    Variables: Map<String, any>;
    EnvType: FlowVarEnvType;
    ParentEnv: Env;
    constructor();
    private static CreateRootEnv;
    private static CreateChildEnv;
    static CreateBuildInEnv(): Env;
    static CreateGlobalEnv(parentEnv: Env): Env;
    static CreateProcessEnv(parentEnv: Env): Env;
    static CreateLocalEnv(parentEnv: Env): Env;
    static CreateFromSnapshot(snapshot: EnvSnapshot): Env;
    ToSnapshot(parentEnvId?: number): EnvSnapshot;
    Define(key: String, value: any): void;
    GetVertexId(): number;
    ContainsVar(key: String): boolean;
    Lookup(key: String): any;
}
