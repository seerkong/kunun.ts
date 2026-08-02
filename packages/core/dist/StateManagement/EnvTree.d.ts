import { Env } from "../StateManagement/Env";
import { SingleEntryGraph } from "../Algo/SingleEntryGraph";
export declare class EnvTree extends SingleEntryGraph<Env, number> {
    GetParentEnv(envId: number): Env;
    LookupDeclareEnv(fromEnv: Env, key: String): Env;
}
