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

    private static CreateRootEnv() : Env {
        let env : Env = new Env();
        env.EnvType = FlowVarEnvType.BuildIn;
        return env;
    }

    private static CreateChildEnv(envType: FlowVarEnvType, parentEnv : Env) : Env {
        let env : Env = new Env();
        env.EnvType = envType;
        env.ParentEnv = parentEnv;
        return env;
    }

    public static CreateBuildInEnv() : Env {
        return Env.CreateRootEnv();
    }


    public static CreateGlobalEnv(parentEnv : Env) : Env {
        return Env.CreateChildEnv(FlowVarEnvType.Global, parentEnv);
    }

    public static CreateProcessEnv(parentEnv : Env) : Env {
        return Env.CreateChildEnv(FlowVarEnvType.Process, parentEnv);
    }
    
    public static CreateLocalEnv(parentEnv : Env) : Env {
        return Env.CreateChildEnv(FlowVarEnvType.Local, parentEnv);
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