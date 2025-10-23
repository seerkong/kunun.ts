import { RuntimeInterpreter, RuntimeState } from 'kunun-runtime';
import {
  EnableWorkflowDsl,
  ResumeWorkflowSync,
  RunWorkflowSync,
  WorkflowJobResult,
  WorkflowRunOutcome,
} from 'kunun-workflow-dsl';

import { runJob } from './bridge';
import { HostConfig, loadConfig } from './config';
import { Scheduler } from './scheduler';
import { RunMeta, RunStatus, RunStore } from './store';

export function startRunInStore(store: RunStore, meta: RunMeta): string {
  return store.create(meta);
}

function createWorkflowRuntime(meta: RunMeta): RuntimeState {
  const runtime = RuntimeInterpreter.CreateRuntime();
  EnableWorkflowDsl(runtime);
  runtime.defineGlobal('args', meta.args ?? null);
  return runtime;
}

// Durable driver loop: run-until-yield, persist the checkpoint BEFORE
// dispatching jobs, dispatch missing jobs through the scheduler, inject the
// collected results, resume — until the workflow completes. A crash or stop
// at any point resumes from checkpoint.json plus the persisted job results.
export async function executeRun(
  store: RunStore,
  runId: string,
  config: HostConfig = loadConfig(),
): Promise<RunStatus> {
  const meta = store.readMeta(runId);
  const scheduler = new Scheduler(config.concurrency, config.maxAgents);
  const runtime = createWorkflowRuntime(meta);

  const finish = (status: RunStatus): RunStatus => {
    store.writeStatus(runId, { ...status, dispatched: scheduler.dispatchedCount });
    return status;
  };

  store.writeStatus(runId, { state: 'running', pid: process.pid, yields: 0 });
  store.appendEvent(runId, { type: 'run_started', runId });

  let outcome: WorkflowRunOutcome;
  const existingCheckpoint = store.readCheckpoint(runId);
  try {
    if (existingCheckpoint != null) {
      store.appendEvent(runId, { type: 'run_resumed', runId });
      outcome = {
        status: 'yielded',
        effect: { checkpoint: existingCheckpoint, pendingJobs: existingCheckpoint.pendingWorkflowJobs ?? [] },
      } as any;
    } else {
      outcome = RunWorkflowSync(runtime, meta.source);
    }

    let yields = 0;
    while (outcome.status === 'yielded') {
      const effect: any = outcome.effect;
      yields += 1;
      store.writeCheckpoint(runId, effect.checkpoint);
      store.writeStatus(runId, { state: 'running', pid: process.pid, yields });

      const control = store.readControl(runId);
      if (control === 'stop') {
        store.appendEvent(runId, { type: 'run_stopped', runId });
        store.clearControl(runId);
        return finish({ state: 'stopped' });
      }
      if (control === 'pause') {
        store.appendEvent(runId, { type: 'run_paused', runId });
        store.clearControl(runId);
        return finish({ state: 'paused' });
      }

      const persisted = store.readJobResults(runId);
      const pendingJobs: any[] = effect.pendingJobs ?? [];
      const missing = pendingJobs.filter((job) => persisted[job.id] == null);
      await Promise.all(missing.map((job) => scheduler.runAgent(async () => {
        const label = job.metadata?.label ?? job.args?.[0]?.name ?? job.id;
        store.appendEvent(runId, { type: 'agent_started', jobId: job.id, label });
        try {
          const value = await runJob(job, config, (event) => store.appendEvent(runId, event));
          store.writeJobResult(runId, job.id, { status: 'completed', value });
          store.appendEvent(runId, { type: 'agent_finished', jobId: job.id, label });
        } catch (error: any) {
          store.writeJobResult(runId, job.id, { status: 'failed', error: String(error?.message ?? error) });
          store.appendEvent(runId, { type: 'agent_failed', jobId: job.id, label, error: String(error?.message ?? error) });
        }
      })));

      const collected = store.readJobResults(runId);
      const results: { [jobId: string]: WorkflowJobResult } = {};
      for (const job of pendingJobs) {
        const stored = collected[job.id];
        if (stored != null) {
          results[job.id] = stored.status === 'completed'
            ? { status: 'completed', value: stored.value }
            : { status: 'failed', error: new Error(stored.error ?? 'agent failed') };
        }
      }
      outcome = ResumeWorkflowSync(runtime, effect.checkpoint, results);
    }

    store.writeResult(runId, (outcome as any).result ?? null);
    store.appendEvent(runId, { type: 'run_finished', runId });
    return finish({ state: 'done', yields });
  } catch (error: any) {
    store.writeError(runId, error);
    store.appendEvent(runId, { type: 'run_failed', runId, error: String(error?.message ?? error) });
    return finish({ state: 'failed' });
  }
}
