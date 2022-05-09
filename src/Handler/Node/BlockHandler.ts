import { OpCode } from "../../OpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import { StateMgr } from "../../StateMgr";

export class BlockHandler {
  public static ExpandBlock(stateMgr: StateMgr, nodeToRun: any) {
    stateMgr.OpBatchStart();
    
    let sentences = nodeToRun;
    if (sentences == null || sentences.length <= 0) {
      // 如果block没有sentence, 以null作为block的运行结果
      stateMgr.AddOp(OpCode.Node_RunNode, null);
    }
    else {
      stateMgr.AddOp(OpCode.ValStack_PushFrame);
      for (let i = 0; i < sentences.length - 1; i++) {
        stateMgr.AddOp(OpCode.Node_RunNode, sentences[i]);
        stateMgr.AddOp(OpCode.ValStack_PopValue)
      }
      // block最后一个语句执行前，先pop frame, 以实现尾递归优化
      stateMgr.AddOp(OpCode.ValStack_PopFrameIgnoreResult);
      // 使用最后一个语句的值作为block的结果
      stateMgr.AddOp(OpCode.Node_RunNode, sentences[sentences.length - 1]);
    }

    stateMgr.OpBatchCommit();
  }

  public static RunBlock(stateMgr: StateMgr, opContState : Instruction) {
    let nodeToRun = opContState.Memo;
    BlockHandler.ExpandBlock(stateMgr, nodeToRun);
  }
}