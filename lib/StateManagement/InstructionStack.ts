import { StackMachine } from "../Algo/StackMachine";
import { XnlOpCode } from "../KnOpCode";
export class Instruction {
    public OpCode : string;
    public EnvId : number;
    public Memo : any;

    constructor(opCode : XnlOpCode, envId : number, memo: any = null) {
        this.OpCode = opCode;
        this.EnvId = envId;
        this.Memo = memo;
    }
}

export class InstructionStack extends StackMachine<Instruction> {
    constructor() {
        super(true);
    }
}