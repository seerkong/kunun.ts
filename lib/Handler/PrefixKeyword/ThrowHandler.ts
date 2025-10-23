import { KnNodeType } from "../../Model/KnNodeType";
import { KnSymbol } from "../../Model/KnSymbol";
import { KnNodeHelper } from "../../Util/KnNodeHelper";
import { XnlOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";

export class ThrowHandler {
  public static ExpandThrow(knState: XnlState, nodeToRun: any) {
    let field = nodeToRun.Value;
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.Node_RunNode, field);
    knState.AddOp(XnlOpCode.Node_RunGetSubscript);
    knState.OpBatchCommit();
  }
}