import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface RunMeta {
  runId?: string;
  workflowName: string;
  scriptPath: string;
  source: string;
  args?: any;
  config?: any;
  createdAt?: string;
}

export interface RunStatus {
  state: 'created' | 'running' | 'paused' | 'stopped' | 'done' | 'failed';
  dispatched?: number;
  yields?: number;
  pid?: number;
  updatedAt?: string;
  [key: string]: any;
}

export interface StoredJobResult {
  status: 'completed' | 'failed';
  value?: any;
  error?: any;
}

// File-based run directory. The CLI observes, the worker writes; the two
// processes only communicate through these files (no daemon, no sockets).
export class RunStore {
  public constructor(public readonly root: string) {
    fs.mkdirSync(root, { recursive: true });
  }

  public create(meta: RunMeta): string {
    const runId = meta.runId ?? RunStore.newRunId(meta.workflowName);
    const dir = this.runDir(runId);
    fs.mkdirSync(path.join(dir, 'jobs'), { recursive: true });
    this.writeJsonAtomic(path.join(dir, 'meta.json'), {
      ...meta,
      runId,
      createdAt: meta.createdAt ?? new Date().toISOString(),
    });
    this.writeStatus(runId, { state: 'created' });
    return runId;
  }

  public runDir(runId: string): string {
    return path.join(this.root, runId);
  }

  public exists(runId: string): boolean {
    return fs.existsSync(path.join(this.runDir(runId), 'meta.json'));
  }

  public listRuns(): string[] {
    if (!fs.existsSync(this.root)) {
      return [];
    }
    return fs.readdirSync(this.root)
      .filter((entry) => fs.existsSync(path.join(this.root, entry, 'meta.json')))
      .sort();
  }

  public readMeta(runId: string): RunMeta {
    return this.readJson(path.join(this.runDir(runId), 'meta.json'));
  }

  public writeStatus(runId: string, status: RunStatus): void {
    this.writeJsonAtomic(path.join(this.runDir(runId), 'status.json'), {
      ...status,
      updatedAt: status.updatedAt ?? new Date().toISOString(),
    });
  }

  public readStatus(runId: string): RunStatus {
    return this.readJson(path.join(this.runDir(runId), 'status.json'));
  }

  public appendEvent(runId: string, event: { [key: string]: any }): void {
    const line = JSON.stringify({ ts: new Date().toISOString(), ...event });
    fs.appendFileSync(path.join(this.runDir(runId), 'events.jsonl'), `${line}\n`);
  }

  public readEvents(runId: string): any[] {
    const file = path.join(this.runDir(runId), 'events.jsonl');
    if (!fs.existsSync(file)) {
      return [];
    }
    return fs.readFileSync(file, 'utf-8')
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line));
  }

  public writeCheckpoint(runId: string, checkpoint: any): void {
    this.writeJsonAtomic(path.join(this.runDir(runId), 'checkpoint.json'), checkpoint);
  }

  public readCheckpoint(runId: string): any | null {
    const file = path.join(this.runDir(runId), 'checkpoint.json');
    return fs.existsSync(file) ? this.readJson(file) : null;
  }

  public writeJobResult(runId: string, jobId: string, result: StoredJobResult): void {
    const file = path.join(this.runDir(runId), 'jobs', `${RunStore.jobFileName(jobId)}.json`);
    this.writeJsonAtomic(file, { jobId, ...result });
  }

  public readJobResults(runId: string): { [jobId: string]: StoredJobResult } {
    const dir = path.join(this.runDir(runId), 'jobs');
    const results: { [jobId: string]: StoredJobResult } = {};
    if (!fs.existsSync(dir)) {
      return results;
    }
    for (const entry of fs.readdirSync(dir)) {
      if (!entry.endsWith('.json')) {
        continue;
      }
      const stored = this.readJson(path.join(dir, entry));
      results[stored.jobId] = { status: stored.status, value: stored.value, error: stored.error };
    }
    return results;
  }

  public clearJobResults(runId: string): void {
    const dir = path.join(this.runDir(runId), 'jobs');
    if (!fs.existsSync(dir)) {
      return;
    }
    for (const entry of fs.readdirSync(dir)) {
      fs.rmSync(path.join(dir, entry), { force: true });
    }
  }

  public writeResult(runId: string, result: any): void {
    this.writeJsonAtomic(path.join(this.runDir(runId), 'result.json'), { result });
  }

  public readResult(runId: string): any {
    const file = path.join(this.runDir(runId), 'result.json');
    return fs.existsSync(file) ? this.readJson(file).result : null;
  }

  public writeError(runId: string, error: any): void {
    this.writeJsonAtomic(path.join(this.runDir(runId), 'error.json'), {
      message: String(error?.message ?? error),
      stack: error?.stack,
    });
  }

  public readError(runId: string): { message: string; stack?: string } | null {
    const file = path.join(this.runDir(runId), 'error.json');
    return fs.existsSync(file) ? this.readJson(file) : null;
  }

  public writeControl(runId: string, action: 'pause' | 'resume' | 'stop'): void {
    this.writeJsonAtomic(path.join(this.runDir(runId), 'control.json'), { action });
  }

  public readControl(runId: string): 'pause' | 'resume' | 'stop' | null {
    const file = path.join(this.runDir(runId), 'control.json');
    return fs.existsSync(file) ? this.readJson(file).action ?? null : null;
  }

  public clearControl(runId: string): void {
    fs.rmSync(path.join(this.runDir(runId), 'control.json'), { force: true });
  }

  private readJson(file: string): any {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }

  private writeJsonAtomic(file: string, value: any): void {
    const temp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(value, null, 2));
    fs.renameSync(temp, file);
  }

  private static jobFileName(jobId: string): string {
    return crypto.createHash('sha1').update(jobId).digest('hex').slice(0, 16);
  }

  private static newRunId(workflowName: string): string {
    const slug = workflowName.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'run';
    return `${slug}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
  }
}
