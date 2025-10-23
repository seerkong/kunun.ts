import assert from 'assert';

import {
  EnableWorkflowDsl,
  GetWorkflowDslEvents,
  RunWorkflowSync,
} from 'kunun-workflow-dsl';
import { RuntimeInterpreter } from 'kunun-runtime';

function createDslRuntime() {
  const runtime = RuntimeInterpreter.CreateRuntime();
  EnableWorkflowDsl(runtime);
  return runtime;
}

describe('RuntimeInterpreter workflow DSL lowering', function () {
  it('lowers ai_agent nodes to a yielded workflow effect with evaluated prompts and control metadata', function () {
    const runtime = createDslRuntime();
    const outcome = RunWorkflowSync(runtime, `
      (var topic "rate limiter")
      (var draft (ai_agent #draftDoc :{
        label = "drafter"
        sys_prompt = "You are a writer."
        user_prompt =
        """
        Write about \\(topic).
        """
        output_schema = {type = "object"}
        retry = 2
        timeout = 60
        adapter = "codex"
        model = "fancy-model"
      }))
      draft
    `);

    assert.equal(outcome.status, 'yielded');
    const effect = outcome.effect;
    assert.equal(effect.kind, 'RuntimeWorkflowEffect');
    assert.equal(effect.name, 'ai_agent');
    assert.equal(effect.pendingJobs.length, 1);

    const job = effect.pendingJobs[0];
    assert.ok(job.id.includes('draftDoc'), `job id should reference agent name: ${job.id}`);
    const request = job.args[0];
    assert.equal(request.name, 'draftDoc');
    assert.equal(request.sysPrompt, 'You are a writer.');
    assert.ok(request.userPrompt.includes('rate limiter'), 'prompt interpolation should be evaluated');
    assert.equal(request.userPrompt.includes('\\('), false);
    assert.equal(request.adapter, 'codex');
    assert.equal(request.model, 'fancy-model');
    assert.equal(job.metadata.label, 'drafter');
    assert.equal(job.metadata.retry, 2);
    assert.equal(job.metadata.timeout, 60);
    assert.deepEqual(job.metadata.outputSchema, { type: 'object' });

    // checkpoint must JSON round-trip
    const restored = JSON.parse(JSON.stringify(effect.checkpoint));
    assert.deepEqual(restored.pendingWorkflowJobs.map((pending: any) => pending.id), [job.id]);
  });

  it('lowers ai_parallel into one effect with one job per input item and item bindings in prompts', function () {
    const runtime = createDslRuntime();
    const outcome = RunWorkflowSync(runtime, `
      (var inputs ["alpha" "beta"])
      (var results (ai_parallel #fanOut
        :{
          input = inputs
          item = it
          index = idx
        }
        :[
          (ai_agent #worker :{
            label = "w-\\(idx)"
            sys_prompt = "You are a worker."
            user_prompt =
            """
            Process \\(it).
            """
          })
        ]))
      results
    `);

    assert.equal(outcome.status, 'yielded');
    const effect = outcome.effect;
    assert.equal(effect.name, 'ai_parallel');
    assert.equal(effect.pendingJobs.length, 2);

    const [first, second] = effect.pendingJobs;
    assert.ok(first.path.endsWith('item:0'));
    assert.ok(second.path.endsWith('item:1'));
    assert.equal(first.metadata.itemIndex, 0);
    assert.equal(second.metadata.itemIndex, 1);
    assert.equal(first.metadata.item, 'alpha');
    assert.equal(second.metadata.item, 'beta');
    assert.ok(first.args[0].userPrompt.includes('alpha'));
    assert.ok(second.args[0].userPrompt.includes('beta'));
    assert.equal(first.args[0].label, 'w-0');
    assert.equal(second.args[0].label, 'w-1');
  });

  it('lowers ai_pipeline stage by stage: first yield only exposes stage-0 jobs', function () {
    const runtime = createDslRuntime();
    const outcome = RunWorkflowSync(runtime, `
      (var docs ["d1" "d2"])
      (var out (ai_pipeline #proc
        :{
          input = docs
          item = doc
          value = val
          index = i
        }
        :[
          (stage #normalize :[
            (ai_agent #norm :{
              sys_prompt = "s"
              user_prompt = "N \\(val)"
            })
          ])
          (stage #write :[
            (ai_agent #wr :{
              sys_prompt = "s"
              user_prompt = "W \\(val)"
            })
          ])
        ]))
      out
    `);

    assert.equal(outcome.status, 'yielded');
    const effect = outcome.effect;
    assert.equal(effect.name, 'ai_pipeline');
    // one yield per stage: only stage-0 jobs (one per item), not item x stage
    assert.equal(effect.pendingJobs.length, 2);
    for (const job of effect.pendingJobs) {
      assert.ok(job.path.includes('normalize'), `stage-0 job path should reference stage name: ${job.path}`);
      assert.equal(job.metadata.stageName, 'normalize');
      assert.equal(job.metadata.stageIndex, 0);
    }
    assert.ok(effect.pendingJobs[0].args[0].userPrompt.includes('d1'));
    assert.ok(effect.pendingJobs[1].args[0].userPrompt.includes('d2'));
  });

  it('records ai_phase and ai_log inline as events without yielding', function () {
    const runtime = createDslRuntime();
    const outcome = RunWorkflowSync(runtime, `
      (var counter 1)
      (ai_phase #Setup :[
        (ai_log #note :{ message = "counter is \\(counter)" })
        (set counter 2)
      ])
      counter
    `);

    assert.equal(outcome.status, 'completed');
    assert.equal(outcome.result, 2);
    const events = GetWorkflowDslEvents(runtime);
    assert.deepEqual(
      events.map((event: any) => event.type),
      ['phase', 'log'],
    );
    assert.equal(events[0].phase, 'Setup');
    assert.equal(events[1].message, 'counter is 1');
  });
});
