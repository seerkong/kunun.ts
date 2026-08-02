import assert from 'assert';
import {
  createInstructionStack,
  createOperandStack,
  dispatchInstructions,
} from 'depa-actor';

import { RuntimeFiberStatus, RuntimeInterpreter, RuntimeObject } from 'kunun-runtime';
import { KnConverter } from 'kunun-converter/KnConverter';
import { KnKnot, KnWord } from 'kunun-core';

const Parser = KnConverter.Knl.Parser;

describe('RuntimeInterpreter', function () {
  it('can import depa-actor execution primitives through the versioned package dependency', function () {
    assert.equal(typeof createInstructionStack, 'function');
    assert.equal(typeof createOperandStack, 'function');
    assert.equal(typeof dispatchInstructions, 'function');
  });

  it('creates an opt-in runtime with depa-actor stacks and instance-owned handlers', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();

    assert.equal(typeof runtime.registerInstructionHandler, 'function');
    assert.equal(typeof runtime.getInstructionHandler, 'function');
    assert.equal(typeof runtime.createFiber, 'function');
    assert.equal(runtime.instructionHistory.length, 0);

    const fiber = runtime.getCurrentFiber();
    fiber.instructionStack.push({ opcode: 'test:push', memo: 42 });

    assert.equal(fiber.instructionStack.pop()?.opcode, 'test:push');
  });

  it('executes a minimal custom instruction stream and records history', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.registerInstructionHandler('test:push', ({ instruction, operandStack }) => {
      operandStack.push(instruction.memo);
    });

    runtime.addOpDirectly('Runtime_LandSuccess');
    runtime.addOpDirectly('test:push', 42);

    const result = RuntimeInterpreter.StartLoopSync(runtime);

    assert.equal(result, 42);
    assert.equal(runtime.instructionHistory.length, 1);
    assert.equal(runtime.instructionHistory[0].instruction.opcode, 'test:push');
  });

  it('exposes source, parsed node, and parsed block execution entry points', function () {
    assert.ok(RuntimeInterpreter.EvalSync('[main { 5 }]'));

    const parsedNode = Parser.Parse('[main { 6 }]');
    assert.deepEqual(RuntimeInterpreter.ExecSync(parsedNode), [6]);

    const runtime = RuntimeInterpreter.CreateRuntime();
    const parsedBlock = [Parser.Parse('[main { 1 }]'), Parser.Parse('[main { 2 }]')];
    assert.deepEqual(RuntimeInterpreter.ExecBlockWithRuntimeSync(runtime, parsedBlock), [2]);
  });

  it('provides baseline value stack handlers', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();

    runtime.addOpDirectly('Runtime_LandSuccess');
    runtime.addOpDirectly('ValStack_PopFrameAndPushTopVal');
    runtime.addOpDirectly('ValStack_PushValue', 2);
    runtime.addOpDirectly('ValStack_PushValue', 1);
    runtime.addOpDirectly('ValStack_PushFrame');

    RuntimeInterpreter.StartLoopSync(runtime);

    assert.equal(runtime.getCurrentFiber().operandStack.peek(), 2);
  });

  it('provides baseline env define lookup and set handlers', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();

    runtime.addOpDirectly('Runtime_LandSuccess');
    runtime.addOpDirectly('Env_Lookup', 'x');
    runtime.addOpDirectly('Env_SetLocalEnv', { key: 'x', value: 7 });
    runtime.addOpDirectly('Env_DeclareLocalVar', { key: 'x', value: 5 });

    assert.equal(RuntimeInterpreter.StartLoopSync(runtime), 7);
  });

  it('evaluates basic value nodes and word lookup nodes', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.define('x', 5);

    assert.equal(RuntimeInterpreter.ExecWithRuntimeSync(runtime, 1), 1);
    assert.equal(RuntimeInterpreter.ExecWithRuntimeSync(runtime, 'text'), 'text');
    assert.equal(RuntimeInterpreter.ExecWithRuntimeSync(runtime, new KnWord('x')), 5);
  });

  it('evaluates parsed block arrays by returning the last evaluated value', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const block = [1, new KnWord('x')];
    runtime.define('x', 9);

    assert.equal(RuntimeInterpreter.ExecBlockWithRuntimeSync(runtime, block), 9);
  });

  it('provides baseline host math functions', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();

    assert.equal(runtime.callHostFunction('+', [1, 2]), 3);
    assert.equal(runtime.callHostFunction('*', [3, 4]), 12);
    assert.equal(runtime.callHostFunction('/', [10, 2]), 5);
  });

  it('evaluates knot chain expressions with frame-top host calls', function () {
    const expression = KnKnot.MakeByNodes([
      new KnKnot({ Core: 1 }),
      new KnKnot({ Core: 2 }),
      new KnKnot({ Core: new KnWord('+') }),
    ]);

    assert.equal(RuntimeInterpreter.ExecSync(expression), 3);
  });

  it('evaluates chained frame-top calls', function () {
    const expression = KnKnot.MakeByNodes([
      new KnKnot({ Core: 1 }),
      new KnKnot({ Core: new KnWord('+') }),
      new KnKnot({ Core: 1 }),
      new KnKnot({ Core: new KnWord('+') }),
      new KnKnot({ Core: 1 }),
    ]);

    assert.equal(RuntimeInterpreter.ExecSync(expression), 3);
  });

  it('evaluates nested knot chain expressions', function () {
    const nested = KnKnot.MakeByNodes([
      new KnKnot({ Core: 1 }),
      new KnKnot({ Core: 2 }),
      new KnKnot({ Core: new KnWord('+') }),
    ]);
    const expression = KnKnot.MakeByNodes([
      new KnKnot({ Core: nested }),
      new KnKnot({ Core: 3 }),
      new KnKnot({ Core: new KnWord('+') }),
    ]);

    assert.equal(RuntimeInterpreter.ExecSync(expression), 6);
  });

  it('evaluates baseline control flow helpers', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();

    assert.equal(RuntimeInterpreter.EvaluateIf(runtime, true, [1], [2]), 1);
    assert.equal(RuntimeInterpreter.EvaluateIf(runtime, false, [1], [2]), 2);
    assert.equal(RuntimeInterpreter.EvaluateCond(runtime, [
      { condition: false, body: [1] },
      { condition: true, body: [2] },
      { condition: true, body: [3] },
    ]), 2);
  });

  it('evaluates foreach and set-to baseline control helpers', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.define('sum', 0);

    const result = RuntimeInterpreter.EvaluateForeach(runtime, [1, 2, 3], 'item', [
      (activeRuntime) => {
        activeRuntime.setVar('sum', activeRuntime.lookup('sum') + activeRuntime.lookup('item'));
        return activeRuntime.lookup('sum');
      },
    ]);

    assert.equal(result, 6);
    RuntimeInterpreter.SetTo(runtime, 'sum', 10);
    assert.equal(runtime.lookup('sum'), 10);
  });

  it('creates and invokes runtime lambda functions with lexical bindings', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const add = runtime.createLambda(['left', 'right'], [
      (activeRuntime) => activeRuntime.lookup('left') + activeRuntime.lookup('right'),
    ]);

    assert.equal(runtime.callRuntimeFunction(add, [3, 4]), 7);
  });

  it('captures closure environment for runtime lambda functions', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.define('base', 20);
    const addBase = runtime.createLambda(['value'], [
      (activeRuntime) => activeRuntime.lookup('base') + activeRuntime.lookup('value'),
    ]);
    runtime.setVar('base', 100);

    assert.equal(runtime.callRuntimeFunction(addBase, [5]), 25);
  });

  it('performs effects through scoped runtime handlers', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();

    const result = runtime.withEffectHandler('ask', (payload) => payload + 1, () => {
      return runtime.performEffect('ask', 2) + 3;
    });

    assert.equal(result, 6);
  });

  it('captures and restores continuation stack state', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const fiber = runtime.getCurrentFiber();
    fiber.operandStack.push(1);
    const continuation = runtime.captureContinuation();
    fiber.operandStack.push(2);

    runtime.restoreContinuation(continuation, [3]);

    assert.equal(fiber.operandStack.pop(), 3);
    assert.equal(fiber.operandStack.pop(), 1);
  });

  it('selects runnable fibers without leaving the dual-stack model', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const child = runtime.createFiber();
    child.status = RuntimeFiberStatus.Runnable;

    runtime.getCurrentFiber().status = RuntimeFiberStatus.Suspended;

    assert.equal(runtime.getCurrentFiber(), child);
    assert.ok(child.instructionStack);
    assert.ok(child.operandStack);
  });

  it('evaluates blocks through async runtime entry point', async function () {
    const result = await RuntimeInterpreter.ExecBlockAsync([1, 2, 3]);

    assert.equal(result, 3);
  });

  it('provides baseline object property and subscript helpers', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const obj: any = { name: 'Alice' };
    const arr = [10, 20];

    assert.equal(runtime.getProperty(obj, 'name'), 'Alice');
    runtime.setProperty(obj, 'age', 25);
    assert.equal(obj.age, 25);

    assert.equal(runtime.getSubscript(arr, 1), 20);
    runtime.setSubscript(arr, 0, 5);
    assert.equal(arr[0], 5);
  });

  it('provides runtime object fields methods and properties', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const obj = new RuntimeObject();

    obj.setField('name', 'Alice');
    obj.addMethod('rename', runtime.createLambda(['self', 'name'], [
      (activeRuntime) => {
        activeRuntime.lookup('self').setField('name', activeRuntime.lookup('name'));
        return activeRuntime.lookup('self').getField('name');
      },
    ]));
    obj.defineProperty('label', {
      get: (target) => target.getField('name'),
      set: (target, value) => target.setField('name', value),
    });

    assert.equal(runtime.getProperty(obj, 'name'), 'Alice');
    assert.equal(runtime.callBoundMethod(obj, 'rename', ['Bob']), 'Bob');
    runtime.setProperty(obj, 'label', 'Carol');
    assert.equal(runtime.getProperty(obj, 'label'), 'Carol');
  });

  it('executes property and subscript opcode handlers', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const obj: any = { name: 'Alice' };
    const arr = [1, 2];

    runtime.addOpDirectly('Runtime_LandSuccess');
    runtime.addOpDirectly('Node_RunGetSubscript', { target: arr, key: 1 });
    runtime.addOpDirectly('Node_RunSetProperty', { target: obj, key: 'name', value: 'Bob' });
    runtime.addOpDirectly('Node_RunGetProperty', { target: obj, key: 'name' });

    RuntimeInterpreter.StartLoopSync(runtime);

    assert.equal(runtime.getCurrentFiber().operandStack.pop(), 2);
    assert.equal(runtime.getCurrentFiber().operandStack.pop(), 'Bob');
    assert.equal(obj.name, 'Bob');
  });

  it('provides array and map builtin method registry', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const arr = [1, 2];
    const map = { name: 'Alice', age: 20 };

    assert.equal(runtime.callBuiltinMethod(arr, 'Count', []), 2);
    assert.equal(runtime.callBuiltinMethod(arr, 'Push', [3]), 3);
    assert.equal(runtime.callBuiltinMethod(arr, 'Top', []), 3);
    assert.equal(runtime.callBuiltinMethod(map, 'Get', ['name']), 'Alice');
    assert.equal(runtime.callBuiltinMethod(map, 'ContainsKey', ['age']), true);
    assert.equal(runtime.callBuiltinMethod(runtime.callBuiltinMethod(map, 'Keys', []), 'Count', []), 2);
  });

  it('provides string conversion and injectable IO host support', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const writes: string[] = [];
    runtime.setIoHost({
      writeLine: (text) => writes.push(text),
      readLine: () => 'input',
    });

    assert.equal(runtime.callHostFunction('Concat', ['Hello', 'World']), 'HelloWorld');
    assert.equal(runtime.callHostFunction('Length', ['Hello']), 5);
    assert.equal(runtime.callHostFunction('ToInt', ['42']), 42);
    assert.equal(runtime.callHostFunction('ToString', [42]), '42');
    assert.equal(runtime.callHostFunction('WriteLine', ['ok']), null);
    assert.equal(runtime.callHostFunction('ReadLine', []), 'input');
    assert.deepEqual(writes, ['ok']);
  });

  it('reserves typed runtime context without installing a type checker', function () {
    const runtime = RuntimeInterpreter.CreateRuntime();
    const context = { kind: 'typed-context-placeholder' };

    runtime.setTypedRuntimeContext(context);
    runtime.setPrototypeResolver((name) => ({ name }));

    assert.equal(runtime.typedRuntimeContext, context);
    assert.deepEqual(runtime.resolvePrototype('User'), { name: 'User' });
    assert.equal((runtime as any).typeCheck, undefined);
  });

});
