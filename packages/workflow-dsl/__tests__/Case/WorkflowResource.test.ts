import assert from 'assert';
import fs from 'fs';
import path from 'path';

import {
  EnableWorkflowDsl,
  GetWorkflowDslEvents,
  ResumeWorkflowSync,
  RunWorkflowSync,
  WorkflowDslEvent,
  WorkflowJobResult,
} from 'kunun-workflow-dsl';
import { RuntimeInterpreter, RuntimePendingWorkflowJob } from 'kunun-runtime';

const BASE_DIR = path.join(__dirname, '../Resource/Workflow');

interface WorkflowHarness {
  events: WorkflowDslEvent[];
  jobs: RuntimePendingWorkflowJob[];
  result: any;
}

function mockAgentResult(name: string): any {
  switch (name) {
    case 'findRisks':
      return { findings: [{ title: 'race condition', detail: 'shared state is updated without a guard' }] };
    case 'discoverSessions':
      return { sessions: [{ agent: 'codex', project: 'kunun.ts', title: 'workflow migration' }] };
    case 'synthesizeDigest':
      return { headline: 'Daily digest', sections: [{ title: 'Progress', items: ['workflow resource migrated'] }] };
    case 'classifyRequest':
      return { category: 'frontend' };
    case 'planResearch':
      return {
        angles: [
          { id: 'rate-limit', question: 'How does token refill work?', searchQueries: ['token bucket refill'] },
          { id: 'burst', question: 'How are bursts bounded?', searchQueries: ['token bucket burst capacity'] },
        ],
      };
    default:
      return { name, ok: true };
  }
}

// Mock host driver: run until yield, complete every pending job with a mock
// agent result, resume, repeat until the workflow completes.
function runWorkflowResource(fileName: string): WorkflowHarness {
  const runtime = RuntimeInterpreter.CreateRuntime();
  EnableWorkflowDsl(runtime);
  const source = fs.readFileSync(path.join(BASE_DIR, fileName), 'utf-8');
  const jobs: RuntimePendingWorkflowJob[] = [];

  let outcome = RunWorkflowSync(runtime, source);
  let rounds = 0;
  while (outcome.status === 'yielded') {
    if (++rounds > 100) {
      throw new Error(`Workflow ${fileName} did not converge after ${rounds} yields`);
    }
    const effect = outcome.effect;
    const results: { [jobId: string]: WorkflowJobResult } = {};
    for (const job of effect.pendingJobs) {
      jobs.push(job);
      results[job.id] = { status: 'completed', value: mockAgentResult(job.args[0]?.name) };
    }
    outcome = ResumeWorkflowSync(runtime, effect.checkpoint, results);
  }

  return { events: GetWorkflowDslEvents(runtime), jobs, result: outcome.result };
}

describe('RuntimeInterpreter workflow resource DSL', function () {
  const resourceFiles = fs.readdirSync(BASE_DIR).filter((file) => file.endsWith('.kon')).sort();

  for (const fileName of resourceFiles) {
    it(`executes ${fileName} through the built-in yield/resume loop with interpolated prompts`, function () {
      const { events, jobs } = runWorkflowResource(fileName);

      assert.equal(events.filter((event) => event.type === 'workflow').length, 1);
      assert.ok(events.some((event) => event.type === 'phase'), `${fileName} should declare phases`);
      assert.ok(jobs.length > 0, `${fileName} should dispatch agent jobs`);
      for (const job of jobs) {
        const prompt = job.args[0]?.userPrompt ?? '';
        assert.equal(
          String(prompt).includes('\\('),
          false,
          `${fileName} should evaluate all prompt interpolation markers (job ${job.id})`,
        );
      }
    });
  }

  it('maps DeepResearch angle input into interpolated Search and Extract prompts', function () {
    const { events, jobs } = runWorkflowResource('DeepResearch.kon');
    const search = events.find((event) => event.type === 'parallel' && event.name === 'searchAngles');
    const extractPrompt = String(
      jobs.find((job) => job.args[0]?.name === 'extractBatch')?.args[0]?.userPrompt ?? '',
    );

    assert.equal(search?.inputLength, 2);
    assert.ok(extractPrompt.includes('How does token refill work?'));
    assert.ok(extractPrompt.includes('[object Object]'));
  });

  it('uses object output fields before routing branch execution', function () {
    const { jobs } = runWorkflowResource('Routing.kon');

    const frontend = jobs.find((job) => job.args[0]?.name === 'frontendSpecialist');
    assert.ok(frontend != null, 'frontendSpecialist should be dispatched');
    assert.equal(jobs.some((job) => job.args[0]?.name === 'generalSpecialist'), false);
    assert.ok(String(frontend.args[0].userPrompt).includes('frontend'));
  });

  it('carries output schemas and stable job ids for resource workflows', function () {
    const { jobs } = runWorkflowResource('AgentDailyDigest.kon');

    const withSchema = jobs.filter((job) => job.args[0]?.outputSchema != null);
    assert.ok(withSchema.some((job) => job.args[0].name === 'discoverSessions'));
    assert.ok(withSchema.some((job) => job.args[0].name === 'synthesizeDigest'));
    assert.ok(withSchema.every((job) => job.args[0].outputSchema?.type === 'object'));
    assert.ok(withSchema.every((job) => job.metadata?.outputSchema?.type === 'object'));
    assert.ok(jobs.some((job) => job.id.includes('discoverSessions')));
    assert.ok(jobs.some((job) => job.id.includes('renderMarkdown')));
  });
});
