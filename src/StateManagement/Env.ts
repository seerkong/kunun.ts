import { SingleEntryGraphNode } from "../Algo/SingleEntryGraphNode";
import { FlowVarEnvType } from "./FlowVarEnvType";

export class Env implements SingleEntryGraphNode<Number> {
    private static nextEnvId = 1;
    public Id : number;
    public Variables : Map<String, any> = new Map();
    public EnvType : FlowVarEnvType;
    public ParentEnv : Env;

    constructor() {
        this.Id = Env.nextEnvId;
        this.EnvType = FlowVarEnvType.Local;
        Env.nextEnvId += 1;
    }

    public static CreateRootEnv() : Env {
        let env : Env = new Env();
        env.EnvType = FlowVarEnvType.BuildIn;
        return env;
    }

    public static CreateChildEnv(envType: FlowVarEnvType, parentEnv : Env) : Env {
        let env : Env = new Env();
        env.EnvType = envType;
        env.ParentEnv = parentEnv;
        return env;
    }

    public Define(key : String, value : any) {
        this.Variables.set(key, value);
    }
    
    public GetVertexId(): number {
        return this.Id;
    }
    
    public ContainsVar(key : String) {
        return this.Variables.has(key);
    }

    public Lookup(key : String) : any {
        return this.Variables.get(key);
    }
}