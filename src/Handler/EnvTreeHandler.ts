import { KnType } from "../Model/KnType";
import { NodeHelper } from "../Util/NodeHelper";
import { Env } from "../StateManagement/Env";
import { Instruction } from "../StateManagement/InstructionStack";
import { StateMgr } from "../StateMgr";
import { FlowVarEnvType } from "../StateManagement/FlowVarEnvType";

export class EnvTreeHandler {
  public static RunDiveProcessEnv(stateMgr: StateMgr, opContState : Instruction) {
    let curEnv = stateMgr.GetCurEnv();

    let nextEnv : Env  = Env.CreateProcessEnv(curEnv);
    stateMgr.EnvTree.AddVertex(nextEnv);
    stateMgr.EnvTree.AddEdge(curEnv.Id, nextEnv.Id);
    stateMgr.GetCurrentFiber().ChangeEnvById(nextEnv.Id);
    return nextEnv;
  }

  public static RunDiveLocalEnv(stateMgr: StateMgr, opContState : Instruction) {
    let curEnv = stateMgr.GetCurEnv();
    let nextEnv : Env  = Env.CreateLocalEnv(curEnv);
    stateMgr.EnvTree.AddVertex(nextEnv);
    stateMgr.EnvTree.AddEdge(curEnv.Id, nextEnv.Id);
    stateMgr.GetCurrentFiber().ChangeEnvById(nextEnv.Id);
    return nextEnv;
  }

  public static RunRise(stateMgr: StateMgr, opContState : Instruction) {
    let curEnv = stateMgr.GetCurEnv();
    let parentEnv = stateMgr.EnvTree.GetParentEnv(curEnv.Id);
    let fiber = stateMgr.GetCurrentFiber();
    fiber.ChangeEnvById(parentEnv.Id);
  }

  public static RunChangeEnvById(stateMgr: StateMgr, opContState : Instruction) {
    stateMgr.GetCurrentFiber().ChangeEnvById(opContState.Memo);
  }

  public static RunLookup(stateMgr: StateMgr, opContState : Instruction) {
    let lookuped = stateMgr.Lookup(opContState.Memo);
    stateMgr.GetCurrentFiber().OperandStack.PushValue(lookuped);
  }

  public static RunBindEnvByMap(stateMgr: StateMgr, opContState : Instruction) {
    let curEnv : Env = stateMgr.GetCurEnv();
    let lastVal = stateMgr.GetCurrentFiber().OperandStack.PopValue();
    // TODO lastVal should be a object
    for (let key in lastVal) {
      curEnv.Define(key, lastVal[key]);
    } 
  }
}