import { TableHandler } from "./TableHandler";
import { KnNodeType } from "../../Model/KnType";
import { KnSymbol } from "../../Model/KnSymbol";
import { NodeHelper } from "../../Util/NodeHelper";
import { KnOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { KnState } from "../../KnState";

export class ThrowHandler {
  public static ExpandThrow(knState: KnState, nodeToRun: any) {
    let field = nodeToRun.Value;
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.Node_RunNode, field);
    knState.AddOp(KnOpCode.Node_RunGetSubscript);
    knState.OpBatchCommit();
  }
}