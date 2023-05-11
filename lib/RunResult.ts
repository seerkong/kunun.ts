import { KnState } from "./KnState";

export class RunResult {
    public Result : any;
    public State : KnState;

    constructor(r : any, state : KnState) {
        this.Result = r;
        this.State = state;
    }
}