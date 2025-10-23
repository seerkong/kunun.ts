import XnlState from "./KnState";

export class RunResult {
    public Result : any;
    public State : XnlState;

    constructor(r : any, state : XnlState) {
        this.Result = r;
        this.State = state;
    }
}