import assert from 'assert';

import {
  EnableWorkflowDsl,
  ResumeWorkflowSync,
  RunWorkflowSync,
  WorkflowJobResult,
} from 'kunun-workflow-dsl';
import { RuntimeInterpreter, RuntimeSnapshot } from 'kunun-runtime';

function createDslRuntime() {
  const runtime = RuntimeInterpreter.CreateRuntime();
  EnableWorkflowDsl(runtime);
  return runtime;
}

function completeAll(effect: any, makeValue: (job: any) => any): { [jobId: string]: WorkflowJobResult } {
  const results: { [jobId: string]: WorkflowJobResult } = {};
  for (const job of effect.pendingJobs) {
    results[job.id] = { status: 'completed', value: makeValue(job) };
  }
  return results;
}

describe('RuntimeInterpreter workflow resume loop', function () {
  it('completes a single ai_agent roundtrip with the injected result as the node value', function () {
    const runtime = createDslRuntime();
    const first = RunWorkflowSync(runtime, `
      (var draft (ai_agent #draftDoc :{
        sys_prompt = "s"
        user_prompt = "write"
      }))
      draft
    `);
    assert.equal(first.status, 'yielded');

    const resumed = ResumeWorkflowSync(runtime, (first as any).effect.checkpoint, completeAll(
      (first as any).effect,
      () => ({ text: 'the draft' }),
    ));

    assert.equal(resumed.status, 'completed');
    assert.deepEqual((resumed as any).result, { text: 'the draft' });
  });

  it('rejoins ai_parallel results as an array ordered by item index', function () {
    const runtime = createDslRuntime();
    const first = RunWorkflowSync(runtime, `
      (var inputs ["a" "b" "c"])
      (var results (ai_parallel #fan
        :{ input = inputs item = it index = idx }
        :[
          (ai_agent #worker :{ sys_prompt = "s" user_prompt = "do \\(it)" })
        ]))
      results
    `);
    assert.equal(first.status, 'yielded');
    const effect = (first as any).effect;
    assert.equal(effect.pendingJobs.length, 3);

    const resumed = ResumeWorkflowSync(runtime, effect.checkpoint, completeAll(
      effect,
      (job) => `done-${job.metadata.item}`,
    ));

    assert.equal(resumed.status, 'completed');
    assert.deepEqual((resumed as any).result, ['done-a', 'done-b', 'done-c']);
  });

  it('runs ai_pipeline stage by stage, binding previous stage results to the value binding', function () {
    const runtime = createDslRuntime();
    const first = RunWorkflowSync(runtime, `
      (var docs ["x" "y"])
      (var out (ai_pipeline #proc
        :{ input = docs item = doc value = val index = i }
        :[
          (stage #normalize :[
            (ai_agent #norm :{ sys_prompt = "s" user_prompt = "N \\(val)" })
          ])
          (stage #write :[
            (ai_agent #wr :{ sys_prompt = "s" user_prompt = "W \\(val)" })
          ])
        ]))
      out
    `);
    assert.equal(first.status, 'yielded');
    const stage0 = (first as any).effect;
    assert.equal(stage0.pendingJobs[0].metadata.stageName, 'normalize');

    const afterStage0 = ResumeWorkflowSync(runtime, stage0.checkpoint, completeAll(
      stage0,
      (job) => `${job.metadata.item}-normalized`,
    ));
    assert.equal(afterStage0.status, 'yielded');
    const stage1 = (afterStage0 as any).effect;
    assert.equal(stage1.pendingJobs.length, 2);
    assert.equal(stage1.pendingJobs[0].metadata.stageName, 'write');
    // the value binding of stage 1 must see stage 0 results
    assert.ok(stage1.pendingJobs[0].args[0].userPrompt.includes('x-normalized'));
    assert.ok(stage1.pendingJobs[1].args[0].userPrompt.includes('y-normalized'));

    const finished = ResumeWorkflowSync(runtime, stage1.checkpoint, completeAll(
      stage1,
      (job) => `${job.metadata.item}-written`,
    ));
    assert.equal(finished.status, 'completed');
    assert.deepEqual((finished as any).result, ['x-written', 'y-written']);
  });

  it('resumes equivalently from a JSON-serialized checkpoint on a fresh runtime', function () {
    const runtime = createDslRuntime();
    const first = RunWorkflowSync(runtime, `
      (var topic "kunun")
      (var draft (ai_agent #draftDoc :{ sys_prompt = "s" user_prompt = "about \\(topic)" }))
      "prefix: \\(draft)"
    `);
    assert.equal(first.status, 'yielded');
    const effect = (first as any).effect;

    const restored: RuntimeSnapshot = JSON.parse(JSON.stringify(effect.checkpoint));
    const freshRuntime = createDslRuntime();
    const resumed = ResumeWorkflowSync(freshRuntime, restored, completeAll(effect, () => 'RESULT'));

    assert.equal(resumed.status, 'completed');
    assert.equal((resumed as any).result, 'prefix: RESULT');
  });

  it('throws a descriptive host-side error when a job fails without an exception frame', function () {
    const runtime = createDslRuntime();
    const first = RunWorkflowSync(runtime, `
      (var draft (ai_agent #fragile :{ sys_prompt = "s" user_prompt = "u" }))
      draft
    `);
    assert.equal(first.status, 'yielded');
    const effect = (first as any).effect;
    const jobId = effect.pendingJobs[0].id;

    assert.throws(
      () => ResumeWorkflowSync(runtime, effect.checkpoint, {
        [jobId]: { status: 'failed', error: new Error('agent exploded') },
      }),
      /Workflow job failed: .*fragile.*agent exploded/,
    );
  });

  it('rejects resume when a pending job result is missing', function () {
    const runtime = createDslRuntime();
    const first = RunWorkflowSync(runtime, `
      (var results (ai_parallel #fan
        :{ input = ["a" "b"] item = it }
        :[ (ai_agent #worker :{ sys_prompt = "s" user_prompt = "u \\(it)" }) ]))
      results
    `);
    assert.equal(first.status, 'yielded');
    const effect = (first as any).effect;

    assert.throws(
      () => ResumeWorkflowSync(runtime, effect.checkpoint, {
        [effect.pendingJobs[0].id]: { status: 'completed', value: 1 },
      }),
      /Missing result for workflow job/,
    );
  });
});
