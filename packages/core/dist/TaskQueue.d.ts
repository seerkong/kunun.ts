type Task<T> = {
    name?: string;
    fn: () => Promise<T>;
};
export declare class TaskQueue {
    private limit;
    debug: boolean;
    private queue;
    private activeTaskNum;
    constructor(limit?: number, debug?: boolean);
    addTask<T>(task: Task<T>): void;
    private execute;
    private runTask;
    private log;
}
export {};
