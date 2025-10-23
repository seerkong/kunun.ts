export class AgentLimitExceeded extends Error {
  public constructor(limit: number) {
    super(`Workflow agent limit exceeded: ${limit}`);
  }
}

export interface Budget {
  total: number | null;
  spent(): number;
  remaining(): number;
}

// Async semaphore: bounds concurrent agent subprocesses and enforces a total
// dispatch cap as a runaway-loop backstop. Budget is a stub hook for now.
export class Scheduler {
  private active = 0;
  private dispatched = 0;
  private waiters: Array<() => void> = [];

  public readonly budget: Budget;

  public constructor(
    private readonly concurrency: number,
    private readonly maxAgents: number,
    budgetTotal: number | null = null,
  ) {
    this.budget = {
      total: budgetTotal,
      spent: () => 0,
      remaining: () => (budgetTotal == null ? Infinity : budgetTotal),
    };
  }

  public get activeCount(): number {
    return this.active;
  }

  public get dispatchedCount(): number {
    return this.dispatched;
  }

  public async runAgent<T>(fn: () => Promise<T>): Promise<T> {
    if (this.dispatched >= this.maxAgents) {
      throw new AgentLimitExceeded(this.maxAgents);
    }
    this.dispatched += 1;
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (this.active < this.concurrency) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.active += 1;
  }

  private release(): void {
    this.active -= 1;
    const next = this.waiters.shift();
    if (next != null) {
      next();
    }
  }
}
