import assert from 'assert';
import {
  RuntimeInterpreter,
  RuntimeOpCode,
} from 'kunun-runtime';
import { KnConverter } from 'kunun-converter/KnConverter';
import { KnKnot, KnWord } from 'kunun-core';

describe('RuntimeInterpreter instruction stack expansion', function () {
  it('expands compound nodes into runtime instructions instead of completing them inside Node_RunNode', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const node = KnConverter.Kon.Parser.Parse('(1 2 :+)');

    assert.equal(RuntimeInterpreter.ExecWithRuntimeSync(runtime, node), 3);

    const opcodes = runtime.instructionHistory.map((entry) => entry.instruction.opcode);
    assert.ok(opcodes.includes(RuntimeOpCode.RunNode));
    assert.ok(opcodes.includes(RuntimeOpCode.ExpandChain));
    assert.ok(opcodes.includes(RuntimeOpCode.ChainStep));
    assert.ok(opcodes.includes(RuntimeOpCode.ApplyCallable));
    assert.ok(opcodes.indexOf(RuntimeOpCode.ExpandChain) > opcodes.indexOf(RuntimeOpCode.RunNode));
  });

  it('expands vector and map literals with ESRT make-array and make-map instructions', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const source = `
      (var values [1 (2 3 :+)])
      (var named { total = (4 5 :+) })
      (values.:length named.:total :+)
    `;

    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, source), 11);

    const opcodes = runtime.instructionHistory.map((entry) => entry.instruction.opcode);
    assert.ok(opcodes.includes(RuntimeOpCode.MakeArray));
    assert.ok(opcodes.includes(RuntimeOpCode.MakeMap));
    assert.ok(opcodes.includes(RuntimeOpCode.RunNode));
  });

  it('lets prefix keyword expanders append instructions without pre-evaluating args', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    let called = false;
    runtime.registerPrefixKeyword('twice', (activeRuntime, { knot }: { knot: KnKnot }) => {
      called = true;
      activeRuntime.addOpsInOrder([
        { opcode: RuntimeOpCode.RunNode, memo: knot.Next.Core },
        { opcode: RuntimeOpCode.RunNode, memo: knot.Next.Core },
        { opcode: RuntimeOpCode.ApplyCallable, memo: { callableNode: new KnWord('+'), argCount: 2 } },
      ]);
    });

    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, '(twice (1 2 :+))'), 6);
    assert.equal(called, true);

    const opcodes = runtime.instructionHistory.map((entry) => entry.instruction.opcode);
    const firstRunNode = opcodes.indexOf(RuntimeOpCode.RunNode);
    const applyIndex = opcodes.lastIndexOf(RuntimeOpCode.ApplyCallable);
    assert.ok(firstRunNode >= 0);
    assert.ok(applyIndex > firstRunNode);
  });

  it('binds loop break and continue continuations through ESRT-style env instructions', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    let checkpoint: any = null;
    runtime.registerWorkflowExtension('ai_agent', ({ checkpoint: captured }) => {
      checkpoint = captured;
      return 'ok';
    });
    runtime.define('items', [1, 2]);
    const node = RuntimeInterpreter.ParseSourceBlock('(foreach item in items :[ (ai_agent "work") ])')[0];

    assert.deepEqual(
      RuntimeInterpreter.ExecWithRuntimeSync(runtime, node),
      [1, 2],
    );
    assert.deepEqual(checkpoint.controlFrames, []);

    const history = runtime.instructionHistory.map((entry) => entry.instruction);
    assert.ok(history.some((entry) => entry.opcode === RuntimeOpCode.MakeContExcludeTopNInstruction));
    assert.ok(history.some((entry) => entry.opcode === 'Env_SetLocalEnv' && entry.memo === 'break'));
    assert.ok(history.some((entry) => entry.opcode === 'Env_SetLocalEnv' && entry.memo === 'continue'));
  });

  it('binds try handler maps and continuation through ESRT-style env instructions', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    let checkpoint: any = null;
    runtime.registerWorkflowExtension('ai_agent', ({ checkpoint: captured }) => {
      checkpoint = captured;
      return 'ok';
    });
    runtime.define('AskHandler', (resume: any, payload: any) => payload);
    const node = RuntimeInterpreter.ParseSourceBlock('(try :[ (ai_agent "fragile") ] handle #ask AskHandler)')[0];

    RuntimeInterpreter.ExecWithRuntimeSync(runtime, node);
    assert.deepEqual(checkpoint.controlFrames, []);

    const history = runtime.instructionHistory.map((entry) => entry.instruction);
    assert.ok(history.some((entry) => entry.opcode === 'Env_SetLocalEnv' && entry.memo === '__EffectHandlerMap'));
    assert.ok(history.some((entry) => entry.opcode === 'Env_SetLocalEnv' && entry.memo === '__ContinuationAfterTry'));
    assert.ok(history.some((entry) => entry.opcode === 'Runtime_PushActiveEffectHandlerMapFromEnv'));
  });

  it('expands compound try handler expressions before installing exception frames', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const source = `
      (fn #chooseHandler :|candidate| :[
        candidate
      ])
      (fn #AskHandler :|resume payload| :[
        payload
      ])
      (try :[
        (:HandlerReady)
      ]
        handle #ask (:chooseHandler AskHandler)
      )
    `;
    runtime.registerHostFunction('HandlerReady', () => runtime.getActiveEffectHandler('ask') != null, 0);

    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, source), true);

    const opcodes = runtime.instructionHistory.map((entry) => entry.instruction.opcode);
    const applyIndex = opcodes.indexOf(RuntimeOpCode.ApplyCallable);
    const frameIndex = opcodes.indexOf('Runtime_PushActiveEffectHandlerMapFromEnv');
    assert.ok(applyIndex >= 0);
    assert.ok(frameIndex >= 0);
    assert.ok(applyIndex < frameIndex);
  });

  it('expands source-level function calls into call frames and body instructions', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const source = `
      (fn #addOne :|value| :[
        (value 1 :+)
      ])
      (:addOne 2)
    `;

    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, source), 3);

    const opcodes = runtime.instructionHistory.map((entry) => entry.instruction.opcode);
    assert.ok(opcodes.includes(RuntimeOpCode.ApplyCallable));
    assert.ok(opcodes.includes(RuntimeOpCode.MakeContExcludeTopNInstruction));
    assert.ok(opcodes.includes(RuntimeOpCode.RunBlock));
  });

  it('expands return as a function continuation restore instead of direct body evaluation', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const source = `
      (fn #early :|| :[
        (:return 1)
        2
      ])
      (:early)
    `;

    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, source), 1);

    const opcodes = runtime.instructionHistory.map((entry) => entry.instruction.opcode);
    assert.ok(opcodes.includes('Runtime_RestoreContinuationFromEnv'));
    assert.ok(!opcodes.includes(RuntimeOpCode.ReturnFromFunction));
  });

  it('expands class constructor field defaults and property accessors through ESRT member function instructions', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const source = `
      (class #Box
        :[
          (field #value = (1 2 :+))
          (new || :[])
          (prop #doubled
            get :[ (self.:value 2 :*) ]
            set |next| :[ (set self.:value (next 1 :+)) ]
          )
        ])
      (var box (Box ~new))
      (set box.:doubled 4)
      (box.:doubled)
    `;

    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, source), 10);

    const opcodes = runtime.instructionHistory.map((entry) => entry.instruction.opcode);
    assert.ok(opcodes.includes(RuntimeOpCode.CallInstance));
    assert.ok(opcodes.includes(RuntimeOpCode.RunGetProperty));
    assert.ok(opcodes.includes('Env_ChangeEnvById'));
    assert.ok(opcodes.includes(RuntimeOpCode.RunBlock));
  });

  it('expands assignment place targets and subscript keys through runtime instructions', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const source = `
      (class #Box
        :[
          (field #value)
          (new || :[])
          (prop #doubled
            get :[ (self.:value 2 :*) ]
            set |next| :[ (set self.:value (next 1 :+)) ]
          )
        ])
      (var boxes [(Box ~new)])
      (var idx 0)
      (set boxes::idx.:doubled 4)
      (boxes::idx.:doubled)
    `;

    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, source), 10);

    const opcodes = runtime.instructionHistory.map((entry) => entry.instruction.opcode);
    assert.ok(opcodes.includes(RuntimeOpCode.RunGetSubscript));
    assert.ok(opcodes.includes(RuntimeOpCode.RunSetProperty));
    assert.equal(opcodes.includes('Runtime_AssignPlace'), false);
  });

  it('expands interpolated string expressions through runtime instructions', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const source = '"sum=\\((1 2 :+))"';

    assert.equal(RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, source), 'sum=3');

    const opcodes = runtime.instructionHistory.map((entry) => entry.instruction.opcode);
    assert.ok(opcodes.includes(RuntimeOpCode.BuildInterpolatedString));
    assert.ok(opcodes.includes(RuntimeOpCode.RunNode));
    assert.ok(opcodes.includes(RuntimeOpCode.ApplyCallable));
  });
});
