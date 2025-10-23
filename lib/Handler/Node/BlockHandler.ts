import { XnlOpCode } from "../../KnOpCode";
import { Instruction } from "../../StateManagement/InstructionStack";
import XnlState from "../../KnState";

export class BlockHandler {
  public static ExpandBlock(knState: XnlState, nodeToRun: any) {
    knState.OpBatchStart();
    
    let sentences = nodeToRun;
    if (sentences == null || sentences.length <= 0) {
      // 如果block没有sentence, 以null作为block的运行结果
      knState.AddOp(XnlOpCode.Node_RunNode, null);
    }
    else {
      knState.AddOp(XnlOpCode.ValStack_PushFrame);
      for (let i = 0; i < sentences.length - 1; i++) {
        knState.AddOp(XnlOpCode.Node_RunNode, sentences[i]);
        knState.AddOp(XnlOpCode.ValStack_PopValue)
      }
      // block最后一个语句执行前，先pop frame, 以实现尾递归优化
      knState.AddOp(XnlOpCode.ValStack_PopFrameIgnoreResult);
      // 使用最后一个语句的值作为block的结果
      knState.AddOp(XnlOpCode.Node_RunNode, sentences[sentences.length - 1]);
    }

    knState.OpBatchCommit();
  }

  public static RunBlock(knState: XnlState, opContState : Instruction) {
    let nodeToRun = opContState.Memo;
    BlockHandler.ExpandBlock(knState, nodeToRun);
  }
}