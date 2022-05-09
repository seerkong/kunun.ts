import { StackMachine } from "../Algo/StackMachine";
import { OpCode } from "../OpCode";
export class Instruction {
    public OpCode : string;
    public EnvId : number;
    public Memo : any;

    constructor(opCode : OpCode, envId : number, memo = null) {
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