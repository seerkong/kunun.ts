import { KnNodeType } from "../Model/KnType";
import { NodeHelper } from "../Util/NodeHelper";
import { Env } from "../StateManagement/Env";
import { Instruction } from "../StateManagement/InstructionStack";
import { KnState } from "../KnState";
import { FlowVarEnvType } from "../StateManagement/FlowVarEnvType";

export class EnvTreeHandler {
  public static RunDiveProcessEnv(knState: KnState, opContState : Instruction) {
    let curEnv = knState.GetCurEnv();

    let nextEnv : Env  = Env.CreateProcessEnv(curEnv);
    knState.EnvTree.AddVertex(nextEnv);
    knState.EnvTree.AddEdge(curEnv.Id, nextEnv.Id);
    knState.GetCurrentFiber().ChangeEnvById(nextEnv.Id);
    return nextEnv;
  }

  public static RunDiveLocalEnv(knState: KnState, opContState : Instruction) {
    let curEnv = knState.GetCurEnv();
    let nextEnv : Env  = Env.CreateLocalEnv(curEnv);
    knState.EnvTree.AddVertex(nextEnv);
    knState.EnvTree.AddEdge(curEnv.Id, nextEnv.Id);
    knState.GetCurrentFiber().ChangeEnvById(nextEnv.Id);
    return nextEnv;
  }

  public static RunRise(knState: KnState, opContState : Instruction) {
    let curEnv = knState.GetCurEnv();
    let parentEnv = knState.EnvTree.GetParentEnv(curEnv.Id);
    let fiber = knState.GetCurrentFiber();
    fiber.ChangeEnvById(parentEnv.Id);
  }

  public static RunChangeEnvById(knState: KnState, opContState : Instruction) {
    knState.GetCurrentFiber().ChangeEnvById(opContState.Memo);
  }

  public static RunLookup(knState: KnState, opContState : Instruction) {
    let lookuped = knState.Lookup(opContState.Memo);
    knState.GetCurrentFiber().OperandStack.PushValue(lookuped);
  }

  public static RunBindEnvByMap(knState: KnState, opContState : Instruction) {
    let curEnv : Env = knState.GetCurEnv();
    let lastVal = knState.GetCurrentFiber().OperandStack.PopValue();
    // TODO lastVal should be a object
    for (let key in lastVal) {
      curEnv.Define(key, lastVal[key]);
    } 
  }
}