import { TableHandler } from "./TableHandler";
import { KnType } from "../../Model/KnType";
import { KnSymbol } from "../../Model/KnSymbol";
import { NodeHelper } from "../../Util/NodeHelper";
import { OpCode } from "../../OpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { StateMgr } from "../../StateMgr";

export class ThrowHandler {
  public static ExpandThrow(stateMgr: StateMgr, nodeToRun: any) {
    let field = nodeToRun.Value;
    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.Node_RunNode, field);
    stateMgr.AddOp(OpCode.Node_RunGetSubscript);
    stateMgr.OpBatchCommit();
  }
}