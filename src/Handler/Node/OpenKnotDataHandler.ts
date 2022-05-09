import { KnKnot } from "../../Model/KnKnot";
import { OpCode } from "../../OpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { StateMgr } from "../../StateMgr";
import { ArrayHandler } from "./ArrayHandler";
import { MapHandler } from "./MapHandler";
import { NodeHandler } from "./NodeHandler";

export class OpenKnotDataHandler {
  public static ExpandKnotData(stateMgr: StateMgr, nodeToRun: any) {
    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.ValStack_PushFrame);
    stateMgr.AddOp(OpCode.Node_IterOpenKnotNode, nodeToRun);
    stateMgr.AddOp(OpCode.Node_MakeKnotChain);
    stateMgr.AddOp(OpCode.ValStack_PopFrameAndPushTopVal);

    stateMgr.OpBatchCommit();
  }

  public static HandleIterOpenKnotNode(stateMgr: StateMgr, opContState : Instruction) {
    let knot = opContState.Memo;
    if (knot == null) {
      return;
    }
    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.ValStack_PushFrame);
    stateMgr.AddOp(OpCode.ValStack_PushValue, knot.Core);
    MapHandler.ExpandOpenMap(stateMgr, knot.Header);
    ArrayHandler.ExpandOpenArray(stateMgr, knot.Param);
    ArrayHandler.ExpandOpenArray(stateMgr, knot.Body);
    stateMgr.AddOp(OpCode.Node_MakeKnotNode);
    stateMgr.AddOp(OpCode.ValStack_PopFrameAndPushTopVal);

    if (knot.Next != null) {
      stateMgr.AddOp(OpCode.Node_IterOpenKnotNode, knot.Next);
    }

    stateMgr.OpBatchCommit();
  }

  public static HandleMakeKnotNode(stateMgr: StateMgr, opContState : Instruction) {
    let evaledNodes = stateMgr.GetCurrentFiber().OperandStack.PeekAndClearFrameAllValues();
    let result = new KnKnot({
      Core: evaledNodes[0],
      Header: evaledNodes[1],
      Param: evaledNodes[2],
      Body: evaledNodes[3],
      Next: null
    });
    stateMgr.GetCurrentFiber().OperandStack.PushValue(result);
  }

  public static MakeKnotChain(stateMgr: StateMgr, opContState : Instruction) {
    let evaledNodes = stateMgr.GetCurrentFiber().OperandStack.PeekAndClearFrameAllValues();
    let result = null;
    for (let i = evaledNodes.length; i >= 0; i--) {
      let currentKnot = evaledNodes[i];
      currentKnot.Next = result;
      result = currentKnot;
      return result;
    }
  }
}