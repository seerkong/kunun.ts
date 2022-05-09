import { KnKnot } from "Model/KnKnot";
import { ContinuationHandler } from "../../Handler/ContinuationHandler";
import { OpCode } from "../../OpCode";
import { Env } from "../../StateManagement/Env";
import { Instruction } from "../../StateManagement/InstructionStack";
import { StateMgr } from "../../StateMgr";
import { NodeHelper } from "../../Util/NodeHelper";

export class ForLoopHandler {
  public static ExpandForLoop(stateMgr: StateMgr, nodeToRun: any) {
    let forStatement = nodeToRun as KnKnot;
    let initVarMap = forStatement.Header;
    let preConditionExpr = forStatement.Next.Core;
    let afterBlockExpr = forStatement.Next.Next.Core;
    let loopBody = nodeToRun.Next.Next.Body;

    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.ValStack_PushFrame);
    stateMgr.AddOp(OpCode.Env_DiveLocalEnv);
    stateMgr.AddOp(OpCode.Node_RunNode, initVarMap);
    stateMgr.AddOp(OpCode.Env_BindEnvByMap);

    stateMgr.AddOp(OpCode.Ctrl_MakeContExcludeTopNInstruction, 2);
    stateMgr.AddOp(OpCode.Env_SetLocalEnv, 'break');
    let iterMemo = {
      PreConditionExpr: preConditionExpr,
      AfterBlockExpr: afterBlockExpr,
      LoopBody: loopBody
    };
    stateMgr.AddOp(OpCode.Ctrl_IterForLoop, iterMemo);
    stateMgr.AddOp(OpCode.Env_Rise);
    stateMgr.AddOp(OpCode.ValStack_PopFrameAndPushTopVal);

    stateMgr.OpBatchCommit();
  }

  public static RunIterForLoop(stateMgr: StateMgr, opContState : Instruction) {
    let lastMemo = opContState.Memo;
    let preConditionExpr = lastMemo.PreConditionExpr;
    let afterBlockExpr = lastMemo.AfterBlockExpr;
    let loopBody = lastMemo.LoopBody;

    let curOpStackTopIdx = stateMgr.GetCurrentFiber().InstructionStack.GetCurTopIdx();


    stateMgr.OpBatchStart();


    // eval condition
    stateMgr.AddOp(OpCode.Node_RunNode, preConditionExpr);
    // 如果条件判断失败，调到下个条件判断，或者是else分支
    stateMgr.AddOp(OpCode.Ctrl_JumpIfFalse, curOpStackTopIdx);
    // 如果条件判断成功
    stateMgr.AddOp(OpCode.Ctrl_MakeContExcludeTopNInstruction, 3);
    stateMgr.AddOp(OpCode.Env_SetLocalEnv, 'continue');
    stateMgr.AddOp(OpCode.Node_RunBlock, loopBody);
    stateMgr.AddOp(OpCode.ValStack_PopValue);
    stateMgr.AddOp(OpCode.Node_RunNode, afterBlockExpr);
    stateMgr.AddOp(OpCode.ValStack_PopValue);
    // 执行post expr后，继续执行 下个循环
    stateMgr.AddOp(OpCode.Ctrl_IterForLoop, lastMemo);
    stateMgr.OpBatchCommit();
  }
}