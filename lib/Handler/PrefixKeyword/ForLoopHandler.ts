import { KnKnot } from "../../Model/KnKnot";
import { ContinuationHandler } from "../../Handler/ContinuationHandler";
import { KnOpCode } from "../../KnOpCode";
import { Env } from "../../StateManagement/Env";
import { Instruction } from "../../StateManagement/InstructionStack";
import { KnState } from "../../KnState";
import { NodeHelper } from "../../Util/NodeHelper";

export class ForLoopHandler {
  public static ExpandForLoop(knState: KnState, nodeToRun: any) {
    let forStatement = nodeToRun as KnKnot;
    let initVarMap = forStatement.Attr;
    let preConditionExpr = forStatement.Next.Core;
    let afterBlockExpr = forStatement.Next.Next.Core;
    let loopBody = forStatement.Next.Next.Body;

    knState.OpBatchStart();
    knState.AddOp(KnOpCode.ValStack_PushFrame);
    knState.AddOp(KnOpCode.Env_DiveLocalEnv);
    knState.AddOp(KnOpCode.Node_RunNode, initVarMap);
    knState.AddOp(KnOpCode.Env_BindEnvByMap);

    knState.AddOp(KnOpCode.Ctrl_MakeContExcludeTopNInstruction, 2);
    knState.AddOp(KnOpCode.Env_SetLocalEnv, 'break');
    let iterMemo = {
      PreConditionExpr: preConditionExpr,
      AfterBlockExpr: afterBlockExpr,
      LoopBody: loopBody
    };
    knState.AddOp(KnOpCode.Ctrl_IterForLoop, iterMemo);
    knState.AddOp(KnOpCode.Env_Rise);
    knState.AddOp(KnOpCode.ValStack_PopFrameAndPushTopVal);

    knState.OpBatchCommit();
  }

  public static RunIterForLoop(knState: KnState, opContState : Instruction) {
    let lastMemo = opContState.Memo;
    let preConditionExpr = lastMemo.PreConditionExpr;
    let afterBlockExpr = lastMemo.AfterBlockExpr;
    let loopBody = lastMemo.LoopBody;

    let curOpStackTopIdx = knState.GetCurrentFiber().InstructionStack.GetCurTopIdx();


    knState.OpBatchStart();


    // eval condition
    knState.AddOp(KnOpCode.Node_RunNode, preConditionExpr);
    // 如果条件判断失败，调到下个条件判断，或者是else分支
    knState.AddOp(KnOpCode.Ctrl_JumpIfFalse, curOpStackTopIdx);
    // 如果条件判断成功
    knState.AddOp(KnOpCode.Ctrl_MakeContExcludeTopNInstruction, 3);
    knState.AddOp(KnOpCode.Env_SetLocalEnv, 'continue');
    knState.AddOp(KnOpCode.Node_RunBlock, loopBody);
    knState.AddOp(KnOpCode.ValStack_PopValue);
    knState.AddOp(KnOpCode.Node_RunNode, afterBlockExpr);
    knState.AddOp(KnOpCode.ValStack_PopValue);
    // 执行post expr后，继续执行 下个循环
    knState.AddOp(KnOpCode.Ctrl_IterForLoop, lastMemo);
    knState.OpBatchCommit();
  }
}