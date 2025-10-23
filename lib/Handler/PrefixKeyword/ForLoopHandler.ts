import { KnKnot } from "../../Model/KnKnot";
import { ContinuationHandler } from "../../Handler/ContinuationHandler";
import { XnlOpCode } from "../../KnOpCode";
import { Env } from "../../StateManagement/Env";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";
import { KnNodeHelper } from "../../Util/KnNodeHelper";

export class ForLoopHandler {
  public static ExpandForLoop(knState: XnlState, nodeToRun: any) {
    let forStatement = nodeToRun as KnKnot;
    let initVarMap = forStatement.Attr;
    let preConditionExpr = forStatement.Next?.Core;
    let afterBlockExpr = forStatement.Next?.Next?.Core;
    let loopBody = forStatement.Next?.Next?.Block;

    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.ValStack_PushFrame);
    knState.AddOp(XnlOpCode.Env_DiveLocalEnv);
    knState.AddOp(XnlOpCode.Node_RunNode, initVarMap);
    knState.AddOp(XnlOpCode.Env_BindEnvByMap);

    knState.AddOp(XnlOpCode.Ctrl_MakeContExcludeTopNInstruction, 2);
    knState.AddOp(XnlOpCode.Env_SetLocalEnv, 'break');
    let iterMemo = {
      PreConditionExpr: preConditionExpr,
      AfterBlockExpr: afterBlockExpr,
      LoopBody: loopBody
    };
    knState.AddOp(XnlOpCode.Ctrl_IterForLoop, iterMemo);
    knState.AddOp(XnlOpCode.Env_Rise);
    knState.AddOp(XnlOpCode.ValStack_PopFrameAndPushTopVal);

    knState.OpBatchCommit();
  }

  public static RunIterForLoop(knState: XnlState, opContState : Instruction) {
    let lastMemo = opContState.Memo;
    let preConditionExpr = lastMemo.PreConditionExpr;
    let afterBlockExpr = lastMemo.AfterBlockExpr;
    let loopBody = lastMemo.LoopBody;

    let curOpStackTopIdx = knState.GetCurrentFiber().InstructionStack.GetCurTopIdx();


    knState.OpBatchStart();


    // eval condition
    knState.AddOp(XnlOpCode.Node_RunNode, preConditionExpr);
    // 如果条件判断失败，调到下个条件判断，或者是else分支
    knState.AddOp(XnlOpCode.Ctrl_JumpIfFalse, curOpStackTopIdx);
    // 如果条件判断成功
    knState.AddOp(XnlOpCode.Ctrl_MakeContExcludeTopNInstruction, 3);
    knState.AddOp(XnlOpCode.Env_SetLocalEnv, 'continue');
    knState.AddOp(XnlOpCode.Node_RunBlock, loopBody);
    knState.AddOp(XnlOpCode.ValStack_PopValue);
    knState.AddOp(XnlOpCode.Node_RunNode, afterBlockExpr);
    knState.AddOp(XnlOpCode.ValStack_PopValue);
    // 执行post expr后，继续执行 下个循环
    knState.AddOp(XnlOpCode.Ctrl_IterForLoop, lastMemo);
    knState.OpBatchCommit();
  }
}