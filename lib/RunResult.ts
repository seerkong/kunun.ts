import { knState } from "./knState";

export class RunResult {
    public Result : any;
    public State : knState;

    constructor(r : any, state : knState) {
        this.Result = r;
        this.State = state;
    }
}