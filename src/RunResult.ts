import { StateMgr } from "./StateMgr";

export class RunResult {
    public Result : any;
    public State : StateMgr;

    constructor(r : any, state : StateMgr) {
        this.Result = r;
        this.State = state;
    }
}