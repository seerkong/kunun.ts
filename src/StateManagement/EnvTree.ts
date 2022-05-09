import { Env } from "../StateManagement/Env";
import { SingleEntryGraphNode } from "../Algo/SingleEntryGraphNode";
import { SingleEntryGraph } from "../Algo/SingleEntryGraph";
import { ArrayExt } from "../Util/ArrayExt";
import { FlowVarEnvType } from "./FlowVarEnvType";

export class EnvTree extends SingleEntryGraph<Env, number> {
  // env是个数，所以prev节点只有一个
  public GetParentEnv(envId : number) : Env {
    let prevIdSet : Set<number> = this.GetPrevVertexIds(envId);
    let prevIdArr : number[] = ArrayExt.FromSet(prevIdSet);
    if (prevIdArr.length > 0) {
      return this.GetVertexDetail(prevIdArr[0]);
    }
    else {
      return null;
    }
  }

  public LookupDeclareEnv(fromEnv : Env, key : String) : Env {
    let lookupIter : Env = fromEnv;
    while (lookupIter != null) {
        let containsVar = lookupIter.ContainsVar(key);
        if (containsVar) {
            return lookupIter;
        } else {
            lookupIter = this.GetParentEnv(lookupIter.Id);
        }
    }

    // 使用传入的 env 作为fallback
    return fromEnv;
  }

  public MakeCurChildEnv(parentEnv : Env, envType : FlowVarEnvType) {
      let r : Env  = Env.CreateChildEnv(envType, parentEnv);
      this.AddVertex(r);
      this.AddEdge(parentEnv.Id, r.Id);
      return r;
  }
}