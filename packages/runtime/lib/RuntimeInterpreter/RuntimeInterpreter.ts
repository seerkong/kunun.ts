import { dispatchInstructions } from 'depa-actor';

import { KnConverter } from 'kunun-converter/KnConverter';
import { KnNodeHelper } from 'kunun-core/Util/KnNodeHelper';
import { KnNodeType } from 'kunun-core/Model/KnNodeType';
import { KnKnot, KnotCallType } from 'kunun-core/Model/KnKnot';
import { KnWord } from 'kunun-core/Model/KnWord';
import { KnInterpolatedString } from 'kunun-core/Model/KnInterpolatedString';
import { KnRawString } from 'kunun-core/Model/KnRawString';
import { KnUnorderedMap } from 'kunun-core/Model/KnUnorderedMap';
import { RuntimeInstruction, RuntimeOpCode } from './Instruction';
import {
  RuntimeBreakSignal,
  RuntimeContinuationResumeSignal,
  RuntimeContinuation,
  RuntimeContinueSignal,
  RuntimeHostFunction,
  RuntimeLambdaFunction,
  RuntimeReturnSignal,
  RuntimeState,
} from './RuntimeState';
import { RuntimeFiber, RuntimeFiberStatus } from './RuntimeFiber';
import { RuntimeClassDefinition, RuntimeObject } from './RuntimeObject';
import { GetTypeSystemBridge, RequireTypeSystemBridge, TypeCheckingResultLike } from './TypeSystemBridge';

export class RuntimeTypeCheckError extends Error {
  public constructor(public readonly Result: TypeCheckingResultLike) {
    super(`RuntimeInterpreter type check failed: ${Result.Diagnostics.map(diagnostic => `${diagnostic.Code}: ${diagnostic.Message}`).join('; ')}`);
  }
}

export interface RuntimeEvalSourceOptions {
  typeCheck?: boolean;
  onTypeChecked?: (result: TypeCheckingResultLike) => void;
}

export class RuntimeInterpreter {
  public static CreateRuntime(): RuntimeState {
    const runtime = new RuntimeState();
    RuntimeInterpreter.RegisterDefault(runtime);
    return runtime;
  }

  public static RegisterDefault(runtime: RuntimeState): void {
    runtime.registerInstructionHandler(RuntimeOpCode.PushValue, ({ instruction, operandStack }) => {
      operandStack.push(instruction.memo);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.RunNode, ({ runtime, instruction }) => {
      RuntimeInterpreter.ExpandNode(runtime, instruction.memo);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.RunBlock, ({ runtime, instruction }) => {
      const block = Array.isArray(instruction.memo) ? instruction.memo : [instruction.memo];
      if (block.length === 0) {
        runtime.addOpDirectly(RuntimeOpCode.PushValue, null);
      } else {
        RuntimeInterpreter.ExpandBlock(runtime, block);
      }
    });
    runtime.registerInstructionHandler(RuntimeOpCode.MakeArray, ({ instruction, operandStack }) => {
      const count = Number(instruction.memo ?? 0);
      const values: any[] = [];
      for (let i = 0; i < count; i++) {
        values.unshift(operandStack.pop());
      }
      operandStack.push(values);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.MakeMap, ({ instruction, operandStack }) => {
      const count = Number(instruction.memo ?? 0);
      const map = new KnUnorderedMap();
      for (let i = 0; i < count; i++) {
        const value = operandStack.pop();
        const key = operandStack.pop();
        map[String(key)] = value;
      }
      operandStack.push(map);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.ExpandChain, ({ runtime, instruction }) => {
      RuntimeInterpreter.ExpandChain(runtime, instruction.memo);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.ChainStep, ({ runtime, instruction }) => {
      RuntimeInterpreter.ExpandChainStep(runtime, instruction.memo);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.IterEvalChainNode, ({ runtime, instruction }) => {
      RuntimeInterpreter.ExpandChainStep(runtime, instruction.memo);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.RunLastVal, ({ operandStack }) => {
      const values = operandStack.popFrameAllValues();
      operandStack.push(values.length === 0 ? null : values[values.length - 1]);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.ApplyToFrameTop, ({ runtime, instruction, operandStack }) => {
      const func = operandStack.pop();
      const args = RuntimeInterpreter.PeekAndClearCurrentOperandFrame(runtime);
      if (RuntimeInterpreter.TryScheduleResolvedCallable(runtime, func, args, '<frame-top>')) {
        return;
      }
      operandStack.push(RuntimeInterpreter.CallResolvedCallable(runtime, func, args, '<frame-top>'));
    });
    runtime.registerInstructionHandler(RuntimeOpCode.ApplyToFrameBottom, ({ runtime, operandStack }) => {
      const values = RuntimeInterpreter.PeekAndClearCurrentOperandFrame(runtime);
      if (values.length === 0) {
        return;
      }
      const func = values[0];
      const args = values.slice(1);
      if (RuntimeInterpreter.TryScheduleResolvedCallable(runtime, func, args, '<frame-bottom>')) {
        return;
      }
      operandStack.push(RuntimeInterpreter.CallResolvedCallable(runtime, func, args, '<frame-bottom>'));
    });
    runtime.registerInstructionHandler(RuntimeOpCode.ApplyCallable, ({ runtime, instruction, operandStack }) => {
      const {
        callableNode,
        argCount,
        callableFromStack = false,
      } = instruction.memo ?? {};
      const callable = callableFromStack ? null : RuntimeInterpreter.ResolveCallable(runtime, callableNode);
      const count = argCount ?? RuntimeInterpreter.GetCallableArity(runtime, callableNode, callable);
      const args: any[] = [];
      for (let i = 0; i < count; i++) {
        args.unshift(operandStack.pop());
      }
      const actualCallable = callableFromStack ? operandStack.pop() : callable;
      if (RuntimeInterpreter.TryScheduleResolvedCallable(
        runtime,
        actualCallable,
        args,
        callableNode == null ? '<stack-callable>' : RuntimeInterpreter.GetWordName(callableNode),
      )) {
        return;
      }
      operandStack.push(RuntimeInterpreter.CallResolvedCallable(
        runtime,
        actualCallable,
        args,
        callableNode == null ? '<stack-callable>' : RuntimeInterpreter.GetWordName(callableNode),
      ));
    });
    runtime.registerInstructionHandler(RuntimeOpCode.CompleteFunctionCall, ({ runtime, operandStack }) => {
      const result = operandStack.popFrameAndPushTopValue();
      const frame = runtime.popControlFrame();
      if (frame?.kind !== 'function') {
        throw new Error('Function call frame missing during normal return');
      }
      runtime.changeEnvById(frame.callerEnvId);
      runtime.restoreActiveEffectHandlerMaps(frame.activeEffectHandlerMaps ?? []);
      if (frame.resultOverride !== undefined) {
        operandStack.pop();
        operandStack.push(frame.resultOverride);
      } else if (result === undefined) {
        operandStack.push(null);
      }
    });
    runtime.registerInstructionHandler(RuntimeOpCode.ReturnFromFunction, ({ runtime, operandStack }) => {
      const result = operandStack.pop();
      RuntimeInterpreter.RestoreEnvContinuation(runtime, 'return', [result ?? null]);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.CaptureContinuation, ({ runtime, instruction, operandStack }) => {
      operandStack.push(runtime.captureContinuation(Number(instruction.memo ?? 0)));
    });
    runtime.registerInstructionHandler(RuntimeOpCode.MakeContExcludeTopNInstruction, ({ runtime, instruction, operandStack }) => {
      operandStack.push(runtime.captureContinuation(Number(instruction.memo ?? 0)));
    });
    runtime.registerInstructionHandler(RuntimeOpCode.Jump, ({ instructionStack, instruction }) => {
      const count = Number(instruction.memo ?? 0);
      for (let i = 0; i < count; i++) {
        instructionStack.pop();
      }
    });
    runtime.registerInstructionHandler(RuntimeOpCode.JumpIfFalse, ({ instructionStack, instruction, operandStack }) => {
      const condition = operandStack.pop();
      if (!RuntimeInterpreter.IsTruthy(condition)) {
        const count = Number(instruction.memo ?? 0);
        for (let i = 0; i < count; i++) {
          instructionStack.pop();
        }
      }
    });
    runtime.registerInstructionHandler(RuntimeOpCode.IterConditionPairs, ({ runtime, instruction }) => {
      const memo = instruction.memo ?? {};
      const branches = memo.branches ?? [];
      const index = memo.index ?? 0;
      const branch = branches[index];
      if (branch == null) {
        runtime.addOpDirectly(RuntimeOpCode.RunBlock, memo.fallbackBody ?? []);
        return;
      }
      runtime.addOpsInOrder([
        RuntimeInterpreter.Op(RuntimeOpCode.RunNode, branch.condition),
        RuntimeInterpreter.Op(RuntimeOpCode.SelectConditionBranch, {
          ...memo,
          branch,
          index,
        }),
      ]);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.SelectConditionBranch, ({ runtime, instruction, operandStack }) => {
      const memo = instruction.memo ?? {};
      const condition = operandStack.pop();
      if (RuntimeInterpreter.IsTruthy(condition)) {
        runtime.addOpDirectly(RuntimeOpCode.RunBlock, memo.branch?.body ?? []);
        return;
      }
      runtime.addOpDirectly(RuntimeOpCode.IterConditionPairs, {
        ...memo,
        index: (memo.index ?? 0) + 1,
      });
    });
    runtime.registerInstructionHandler(RuntimeOpCode.IterForEachLoop, ({ runtime, instruction, operandStack }) => {
      const memo = instruction.memo ?? {};
      const items = operandStack.peek() ?? [];
      const index = memo.index ?? 0;
      // foreach only iterates arrays (and length-indexed array-likes such as
      // strings). For a map / plain object / number the `length` is undefined,
      // so `index >= items.length` is always false → an infinite loop that hangs
      // the host (D13). Raise a bounded diagnostic instead of running away.
      if (typeof items.length !== 'number') {
        throw new Error(
          `foreach expects an array to iterate, got ` +
          `${items === null ? 'null' : typeof items} — provide a vector/list.`,
        );
      }
      if (index >= items.length) {
        return;
      }
      if (runtime.getCurrentEnv().Lookup(memo.itemName) == null) {
        runtime.define(memo.itemName, items[index]);
      } else {
        runtime.setVar(memo.itemName, items[index]);
      }
      runtime.addOpsInOrder([
        RuntimeInterpreter.Op(RuntimeOpCode.MakeContExcludeTopNInstruction, 3),
        RuntimeInterpreter.Op('Env_SetLocalEnv', 'continue'),
        RuntimeInterpreter.Op(RuntimeOpCode.RunBlock, memo.body ?? []),
        RuntimeInterpreter.Op('ValStack_PopValue'),
        RuntimeInterpreter.Op(RuntimeOpCode.IterForEachLoop, {
          ...memo,
          index: index + 1,
        }),
      ]);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.IterForLoop, ({ runtime, instruction }) => {
      const memo = instruction.memo ?? {};
      runtime.addOpsInOrder([
        RuntimeInterpreter.Op(RuntimeOpCode.RunNode, memo.conditionNode),
        RuntimeInterpreter.Op(RuntimeOpCode.IterForLoopAfterCondition, memo),
      ]);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.IterForLoopAfterCondition, ({ runtime, instruction, operandStack }) => {
      const memo = instruction.memo ?? {};
      const condition = operandStack.pop();
      if (!RuntimeInterpreter.IsTruthy(condition)) {
        return;
      }
      runtime.addOpsInOrder([
        RuntimeInterpreter.Op(RuntimeOpCode.MakeContExcludeTopNInstruction, 3),
        RuntimeInterpreter.Op('Env_SetLocalEnv', 'continue'),
        RuntimeInterpreter.Op(RuntimeOpCode.RunBlock, memo.body ?? []),
        RuntimeInterpreter.Op('ValStack_PopValue'),
        ...RuntimeInterpreter.BuildLoopStepOps(memo.stepNode),
        RuntimeInterpreter.Op(RuntimeOpCode.IterForLoop, memo),
      ]);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.ReturnOperands, ({ operandStack }) => {
      const values = operandStack.popFrameAllValues();
      operandStack.push(values.length === 0 ? null : values[values.length - 1]);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.RunGetProperty, ({ runtime, instruction, operandStack }) => {
      const { target, key } = instruction.memo ?? {};
      const actualTarget = target ?? operandStack.pop();
      const typed = RuntimeInterpreter.TryHandleTypedPropertyGet(runtime, actualTarget, key);
      if (typed.handled) {
        if (!typed.scheduled) {
          operandStack.push(typed.value);
        }
        return;
      }
      if (RuntimeInterpreter.TrySchedulePropertyGet(runtime, actualTarget, key)) {
        return;
      }
      operandStack.push(runtime.getProperty(actualTarget, key));
    });
    runtime.registerInstructionHandler(RuntimeOpCode.RunSetProperty, ({ runtime, instruction, operandStack }) => {
      const memo = instruction.memo ?? {};
      const hasTarget = Object.prototype.hasOwnProperty.call(memo, 'target');
      const hasValue = Object.prototype.hasOwnProperty.call(memo, 'value');
      const actualTarget = hasTarget ? memo.target : operandStack.pop();
      const actualValue = hasValue ? memo.value : operandStack.pop();
      const typed = RuntimeInterpreter.TryHandleTypedPropertySet(runtime, actualTarget, memo.key, actualValue);
      if (typed.handled) {
        if (!typed.scheduled) {
          operandStack.push(typed.value);
        }
        return;
      }
      if (RuntimeInterpreter.TrySchedulePropertySet(runtime, actualTarget, memo.key, actualValue)) {
        return;
      }
      runtime.setProperty(actualTarget, memo.key, actualValue);
      operandStack.push(actualValue);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.RunGetSubscript, ({ runtime, instruction, operandStack }) => {
      const { target, key } = instruction.memo ?? {};
      const actualKey = key ?? operandStack.pop();
      const actualTarget = target ?? operandStack.pop();
      operandStack.push(runtime.getSubscript(actualTarget, actualKey));
    });
    runtime.registerInstructionHandler(RuntimeOpCode.RunSetSubscript, ({ runtime, instruction, operandStack }) => {
      const memo = instruction.memo ?? {};
      const hasTarget = Object.prototype.hasOwnProperty.call(memo, 'target');
      const hasKey = Object.prototype.hasOwnProperty.call(memo, 'key');
      const hasValue = Object.prototype.hasOwnProperty.call(memo, 'value');
      const actualKey = hasKey ? memo.key : operandStack.pop();
      const actualTarget = hasTarget ? memo.target : operandStack.pop();
      const actualValue = hasValue ? memo.value : operandStack.pop();
      runtime.setSubscript(actualTarget, actualKey, actualValue);
      operandStack.push(actualValue);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.CallInstance, ({ runtime, instruction, operandStack }) => {
      const { methodName, argCount = 0, projectionTargetName } = instruction.memo ?? {};
      const args: any[] = [];
      for (let i = 0; i < argCount; i++) {
        args.unshift(operandStack.pop());
      }
      const target = operandStack.pop();
      if (methodName === 'as' && RuntimeInterpreter.IsTypedObject(target) && runtime.typedRuntimeContext != null) {
        operandStack.push(runtime.typedRuntimeContext.Project(
          target,
          projectionTargetName ?? RuntimeInterpreter.ReadProjectionTargetName(args[0]),
        ));
        return;
      }
      if (RuntimeInterpreter.TryScheduleInstanceCall(runtime, target, methodName, args)) {
        return;
      }
      operandStack.push(RuntimeInterpreter.CallInstance(runtime, target, methodName, args));
    });
    runtime.registerInstructionHandler(RuntimeOpCode.ApplyLogicalOperator, ({ runtime, instruction, operandStack }) => {
      const { name, phase = 'apply', rightNode, nextNode } = instruction.memo ?? {};
      if (phase === 'apply') {
        const right = operandStack.pop();
        const left = operandStack.pop();
        operandStack.push(RuntimeInterpreter.ApplyLogicalOperator(name, left, right));
        if (nextNode != null) {
          runtime.addOpDirectly(RuntimeOpCode.ChainStep, nextNode);
        }
        return;
      }

      const left = operandStack.pop();
      if (RuntimeInterpreter.ShouldShortCircuitLogicalOperator(name, left)) {
        operandStack.push(RuntimeInterpreter.ApplyShortCircuitLogicalOperator(name, left));
        if (nextNode != null) {
          runtime.addOpDirectly(RuntimeOpCode.ChainStep, nextNode);
        }
        return;
      }

      operandStack.push(left);
      runtime.addOpsInOrder([
        RuntimeInterpreter.Op(RuntimeOpCode.RunNode, rightNode),
        RuntimeInterpreter.Op(RuntimeOpCode.ApplyLogicalOperator, {
          name,
          phase: 'apply',
          nextNode,
        }),
      ]);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.BuildInterpolatedString, ({ instruction, operandStack }) => {
      const count = Number(instruction.memo ?? 0);
      const parts: any[] = [];
      for (let i = 0; i < count; i++) {
        parts.unshift(operandStack.pop());
      }
      operandStack.push(parts.map((part) => String(part)).join(''));
    });
    runtime.registerInstructionHandler('ValStack_PushFrame', ({ operandStack }) => {
      operandStack.pushFrame();
    });
    runtime.registerInstructionHandler('ValStack_PushValue', ({ instruction, operandStack }) => {
      operandStack.push(instruction.memo);
    });
    runtime.registerInstructionHandler('ValStack_PopValue', ({ operandStack }) => {
      operandStack.pop();
    });
    runtime.registerInstructionHandler(RuntimeOpCode.Duplicate, ({ operandStack }) => {
      operandStack.push(operandStack.peek());
    });
    runtime.registerInstructionHandler(RuntimeOpCode.SwapTop, ({ operandStack }) => {
      const right = operandStack.pop();
      const left = operandStack.pop();
      operandStack.push(right);
      operandStack.push(left);
    });
    runtime.registerInstructionHandler(RuntimeOpCode.CollectTopN, ({ instruction, operandStack }) => {
      const count = Number(instruction.memo ?? 0);
      const values: any[] = [];
      for (let i = 0; i < count; i++) {
        values.unshift(operandStack.pop());
      }
      operandStack.push(values);
    });
    runtime.registerInstructionHandler('ValStack_PopFrameAndPushTopVal', ({ operandStack }) => {
      operandStack.popFrameAndPushTopValue();
    });
    runtime.registerInstructionHandler('ValStack_PopFrameIgnoreResult', ({ operandStack }) => {
      operandStack.popFrameAllValues();
    });
    runtime.registerInstructionHandler('Env_DeclareLocalVar', ({ runtime, instruction, operandStack }) => {
      const key = typeof instruction.memo === 'string' ? instruction.memo : instruction.memo.key;
      const value = typeof instruction.memo === 'string' ? operandStack.pop() : instruction.memo.value;
      runtime.define(key, value);
    });
    runtime.registerInstructionHandler('Env_DeclareGlobalVar', ({ runtime, instruction, operandStack }) => {
      const key = typeof instruction.memo === 'string' ? instruction.memo : instruction.memo.key;
      const value = typeof instruction.memo === 'string' ? operandStack.pop() : instruction.memo.value;
      runtime.defineGlobal(key, value);
    });
    runtime.registerInstructionHandler('Env_SetLocalEnv', ({ runtime, instruction, operandStack }) => {
      const key = typeof instruction.memo === 'string' ? instruction.memo : instruction.memo.key;
      const value = typeof instruction.memo === 'string' ? operandStack.pop() : instruction.memo.value;
      runtime.setVar(key, value);
    });
    runtime.registerInstructionHandler('Env_SetGlobalEnv', ({ runtime, instruction, operandStack }) => {
      const key = typeof instruction.memo === 'string' ? instruction.memo : instruction.memo.key;
      const value = typeof instruction.memo === 'string' ? operandStack.pop() : instruction.memo.value;
      runtime.setGlobal(key, value);
    });
    runtime.registerInstructionHandler('Env_Lookup', ({ runtime, instruction, operandStack }) => {
      operandStack.push(runtime.lookup(instruction.memo));
    });
    runtime.registerInstructionHandler('Env_DiveProcessEnv', ({ runtime, instruction }) => {
      runtime.diveProcessEnv(instruction.memo ?? 'process');
    });
    runtime.registerInstructionHandler('Env_DiveLocalEnv', ({ runtime, instruction }) => {
      const memo = instruction.memo;
      if (memo != null && typeof memo === 'object' && memo.parentEnvId != null) {
        runtime.makeSubLocalEnvUnderEnv(memo.parentEnvId, memo.name ?? 'local');
        for (const [key, value] of Object.entries(memo.bindings ?? {})) {
          runtime.define(key, value);
        }
        return;
      }
      runtime.diveLocalEnv(instruction.memo ?? 'local');
    });
    runtime.registerInstructionHandler('Env_Rise', ({ runtime }) => {
      runtime.riseEnv();
    });
    runtime.registerInstructionHandler('Env_ChangeEnvById', ({ runtime, instruction }) => {
      runtime.changeEnvById(instruction.memo);
    });
    runtime.registerInstructionHandler('Env_BindEnvByMap', ({ runtime, instruction, operandStack }) => {
      runtime.bindEnvByMap(instruction.memo ?? operandStack.pop());
    });
    runtime.registerInstructionHandler('Fiber_CurrentToIdle', ({ runtime, operandStack }) => {
      operandStack.push(runtime.currentFiberToIdle());
    });
    runtime.registerInstructionHandler('Fiber_CurrentToSuspended', ({ runtime, operandStack }) => {
      operandStack.push(runtime.suspendCurrentFiber());
    });
    runtime.registerInstructionHandler('Fiber_AwakenMulti', ({ runtime, instruction }) => {
      runtime.awakenFibers(instruction.memo ?? []);
    });
    runtime.registerInstructionHandler('Fiber_YieldToParentAndChangeCurrentFiberState', ({ runtime, instruction }) => {
      runtime.yieldToParentAndChangeCurrentFiberState(instruction.memo?.status ?? RuntimeFiberStatus.Runnable);
    });
    runtime.registerInstructionHandler('Fiber_YieldToFiberAndChangeCurrentFiberState', ({ runtime, instruction }) => {
      runtime.yieldToFiberAndChangeCurrentFiberState(
        instruction.memo?.fiberId,
        instruction.memo?.status ?? RuntimeFiberStatus.Runnable,
      );
    });
    runtime.registerInstructionHandler('Fiber_FinalizeCurrent', ({ runtime, operandStack }) => {
      operandStack.push(runtime.finalizeCurrentFiber());
    });
    runtime.registerInstructionHandler('Fiber_AddResumeToken', ({ runtime, instruction }) => {
      runtime.addResumeFiberToken(instruction.memo);
    });
    runtime.registerInstructionHandler('Fiber_ConsumeResumeToken', ({ runtime }) => {
      runtime.consumeResumeFiberToken();
    });
    runtime.registerInstructionHandler(RuntimeOpCode.WorkflowDispatch, ({ runtime, instruction, operandStack }) => {
      const {
        name,
        args = [],
        argCount,
        fixity = 'prefix',
        sourceNodeId = `${fixity}:${name}`,
        sourceNode,
      } = instruction.memo ?? {};
      const actualArgs = [...args];
      for (let i = 0; i < (argCount ?? 0); i++) {
        actualArgs.unshift(operandStack.pop());
      }
      const effect = runtime.invokeWorkflowExtension(name, actualArgs, {
        fixity,
        sourceNode,
        sourceNodeId,
      });
      return {
        effects: [effect],
        yield: true,
        yieldReason: `workflow:${name}`,
      };
    });
    runtime.registerInstructionHandler(RuntimeOpCode.InvokeWorkflowExtension, ({ runtime, instruction, operandStack }) => {
      const {
        name,
        argCount = 0,
        fixity = 'prefix',
        sourceNodeId = `${fixity}:${name}`,
        sourceNode,
      } = instruction.memo ?? {};
      const args: any[] = [];
      for (let i = 0; i < argCount; i++) {
        args.unshift(operandStack.pop());
      }
      operandStack.push(runtime.invokeWorkflowExtension(name, args, {
        fixity,
        sourceNode,
        sourceNodeId,
      }));
    });
    runtime.registerInstructionHandler('Runtime_IncrementVar', ({ runtime, instruction, operandStack }) => {
      operandStack.push(RuntimeInterpreter.EvaluateIncrementByName(runtime, String(instruction.memo)));
    });
    runtime.registerInstructionHandler('Ctrl_RunIfBranches', ({ runtime, instruction, operandStack }) => {
      const condition = operandStack.pop();
      runtime.addOpDirectly(
        RuntimeOpCode.RunBlock,
        RuntimeInterpreter.IsTruthy(condition)
          ? (instruction.memo?.thenBody ?? [])
          : (instruction.memo?.elseBody ?? []),
      );
    });
    runtime.registerInstructionHandler('Runtime_PushControlFrame', ({ runtime, instruction }) => {
      runtime.pushControlFrame(instruction.memo);
    });
    runtime.registerInstructionHandler('Runtime_PopControlFrame', ({ runtime }) => {
      runtime.popControlFrame();
    });
    runtime.registerInstructionHandler('Runtime_PushExceptionFrame', ({ runtime, instruction }) => {
      const handlerMap = instruction.memo?.handlerMap ?? {};
      runtime.pushControlFrame({
        kind: 'exception',
        frameId: instruction.memo?.frameId ?? 'try',
        envId: runtime.currentEnvId,
      });
      runtime.pushActiveEffectHandlerMap(handlerMap);
    });
    runtime.registerInstructionHandler('Runtime_BuildTryHandlerMap', ({ instruction, operandStack }) => {
      const entries = instruction.memo?.entries ?? [];
      const handlerMap: { [effectName: string]: any } = {};
      for (let i = entries.length - 1; i >= 0; i--) {
        const handler = operandStack.pop();
        handlerMap[entries[i].effectName] = handler;
      }
      operandStack.push(handlerMap);
    });
    runtime.registerInstructionHandler('Runtime_PushExceptionFrameFromStack', ({ runtime, instruction, operandStack }) => {
      const handlerMap = operandStack.pop() ?? {};
      runtime.pushControlFrame({
        kind: 'exception',
        frameId: instruction.memo?.frameId ?? 'try',
        envId: runtime.currentEnvId,
      });
      runtime.pushActiveEffectHandlerMap(handlerMap);
      operandStack.push(handlerMap);
    });
    runtime.registerInstructionHandler('Runtime_PopExceptionFrame', ({ runtime }) => {
      runtime.popActiveEffectHandlerMap();
      runtime.popControlFrame();
    });
    runtime.registerInstructionHandler('Runtime_PushActiveEffectHandlerMap', ({ runtime, instruction }) => {
      runtime.pushActiveEffectHandlerMap(instruction.memo ?? {});
    });
    runtime.registerInstructionHandler('Runtime_PopActiveEffectHandlerMap', ({ runtime }) => {
      runtime.popActiveEffectHandlerMap();
    });
    runtime.registerInstructionHandler('Runtime_PushActiveEffectHandlerMapFromEnv', ({ runtime, instruction }) => {
      const map = runtime.lookup(instruction.memo ?? '__EffectHandlerMap') ?? {};
      runtime.pushActiveEffectHandlerMap(map);
    });
    runtime.registerInstructionHandler('Runtime_RestoreContinuationFromEnv', ({ runtime, instruction, operandStack }) => {
      const memo = instruction.memo ?? {};
      const values: any[] = [];
      const count = Number(memo.valueCount ?? 0);
      for (let i = 0; i < count; i++) {
        values.unshift(operandStack.pop());
      }
      RuntimeInterpreter.RestoreEnvContinuation(runtime, memo.name, values);
    });
    runtime.registerInstructionHandler('Runtime_PushValueIfTopNullish', ({ instruction, operandStack }) => {
      const value = operandStack.pop();
      operandStack.push(value == null ? instruction.memo : value);
    });
    runtime.registerInstructionHandler('Runtime_SaveOperands', ({ operandStack }) => {
      operandStack.push(operandStack.popFrameAllValues());
    });
    runtime.registerInstructionHandler('Runtime_AssignChainTarget', ({ runtime, operandStack }) => {
      const value = operandStack.pop();
      const selector = operandStack.pop();
      const target = operandStack.pop();
      if (selector?.kind === 'subscript') {
        runtime.setSubscript(target, selector.key, value);
      } else {
        runtime.setProperty(target, selector?.key ?? selector, value);
      }
      operandStack.push(value);
    });
    runtime.registerInstructionHandler('Runtime_JsCallAlias', ({ runtime, instruction, operandStack }) => {
      const argCount = Number(instruction.memo?.argCount ?? 0);
      const args: any[] = [];
      for (let i = 0; i < argCount; i++) {
        args.unshift(operandStack.pop());
      }
      const methodName = operandStack.pop();
      const target = operandStack.pop();
      operandStack.push(runtime.callHostObjectMethod(target, String(methodName), args));
    });
    runtime.registerInstructionHandler('Runtime_JsApplyAlias', ({ runtime, operandStack }) => {
      const args = operandStack.pop();
      const methodName = operandStack.pop();
      const target = operandStack.pop();
      operandStack.push(runtime.applyHostObjectMethod(target, String(methodName), args ?? []));
    });
    runtime.registerInstructionHandler('Runtime_BuildSubscriptSelector', ({ operandStack }) => {
      const marker = operandStack.pop();
      const key = operandStack.pop();
      operandStack.push({ ...marker, key });
    });
    runtime.registerInstructionHandler('Runtime_AwaitHostFunction', ({ runtime, operandStack }) => {
      const argsValue = operandStack.pop();
      const callable = operandStack.pop();
      const args = Array.isArray(argsValue) ? argsValue : [argsValue];
      const fiberId = runtime.getCurrentFiber().id;
      Promise.resolve()
        .then(() => RuntimeInterpreter.CallResolvedCallable(runtime, callable, args, 'await_host_fn'))
        .then(
          (result) => runtime.addResumeFiberToken({ fiberId, result: [result] }),
          (error) => runtime.addResumeFiberToken({ fiberId, result: [error] }),
        );
      runtime.suspendCurrentFiber();
      return { yield: true, yieldReason: 'await_host_fn' };
    });
    runtime.registerInstructionHandler('Runtime_SetTimeout', ({ runtime, operandStack }) => {
      const timeout = Number(operandStack.pop() ?? 0);
      const callable = operandStack.pop();
      const fiberId = runtime.getCurrentFiber().id;
      const timerHost = runtime.getTimerHost();
      timerHost.setTimeout?.(() => {
        runtime.addResumeFiberToken({
          fiberId,
          result: [callable],
          beforeResumeOps: [RuntimeInterpreter.Op(RuntimeOpCode.ApplyCallable, {
            callableFromStack: true,
            argCount: 0,
          })],
        });
      }, timeout);
      runtime.suspendCurrentFiber();
      return { yield: true, yieldReason: 'set_timeout' };
    });
    runtime.registerInstructionHandler('Runtime_SetInterval', ({ runtime, operandStack }) => {
      const interval = Number(operandStack.pop() ?? 0);
      const callable = operandStack.pop();
      const timerHost = runtime.getTimerHost();
      const handle = timerHost.setInterval?.(() => {
        const parent = runtime.getCurrentFiber();
        const child = runtime.createFiber(parent, RuntimeFiberStatus.Runnable);
        RuntimeInterpreter.PushOpsToFiber(child, [
          RuntimeInterpreter.Op(RuntimeOpCode.PushValue, callable),
          RuntimeInterpreter.Op(RuntimeOpCode.ApplyCallable, {
            callableFromStack: true,
            argCount: 0,
          }),
          RuntimeInterpreter.Op('Fiber_FinalizeCurrent'),
        ]);
      }, interval);
      operandStack.push(handle);
    });
    runtime.registerHostFunction('+', (...args) => args.reduce((sum, item) => sum + item, 0), 2);
    runtime.registerHostFunction('*', (...args) => args.reduce((product, item) => product * item, 1), 2);
    runtime.registerHostFunction('-', (left, right) => left - right, 2);
    runtime.registerHostFunction('/', (left, right) => left / right, 2);
    runtime.registerHostFunction('gt', (left, right) => left > right, 2);
    runtime.registerHostFunction('lt', (left, right) => left < right, 2);
    runtime.registerHostFunction('==', (left, right) => left === right, 2);
    runtime.registerHostFunction('and', (left, right) => RuntimeInterpreter.IsTruthy(left) && RuntimeInterpreter.IsTruthy(right), 2);
    runtime.registerHostFunction('or', (left, right) => RuntimeInterpreter.IsTruthy(left) || RuntimeInterpreter.IsTruthy(right), 2);
    runtime.registerHostFunction('or_else', (left, right) => RuntimeInterpreter.IsTruthy(left) ? left : right, 2);
    runtime.registerHostFunction('ArrayLength', (value) => value?.length ?? 0, 1);
    runtime.registerHostFunction('HostCall', (target, methodName, arg) => runtime.callHostObjectMethod(target, String(methodName), [arg]), 3);
    runtime.registerHostFunction('HostApply', (target, methodName, args) => runtime.applyHostObjectMethod(target, String(methodName), args), 3);
    runtime.registerHostFunction('Writeln', (value) => {
      runtime.getIoHost().writeLine?.(String(value));
      return null;
    }, 1);
    runtime.registerHostFunction('append', (target, value) => {
      if (typeof target?.push === 'function') {
        return target.push(value);
      }
      return String(target) + String(value);
    }, 2);
    runtime.registerHostFunction('>=', (left, right) => left >= right, 2);
    runtime.registerHostFunction('<=', (left, right) => left <= right, 2);
    runtime.registerHostFunction('console', (value) => {
      runtime.getIoHost().writeLine?.(String(value));
      return value;
    }, 1);
    runtime.registerHostFunction('clear_interval', (handle) => {
      runtime.getTimerHost().clearInterval?.(handle);
      return null;
    }, 1);
    runtime.registerHostFunction('Concat', (...args) => args.join(''), 2, { variadic: true });
    runtime.registerHostFunction('Length', (value) => String(value).length, 1);
    runtime.registerHostFunction('ToUpper', (value) => String(value).toUpperCase(), 1);
    runtime.registerHostFunction('ToLower', (value) => String(value).toLowerCase(), 1);
    runtime.registerHostFunction('Trim', (value) => String(value).trim(), 1);
    runtime.registerHostFunction('ToString', (value) => String(value), 1);
    runtime.registerHostFunction('ToInt', (value) => Number.parseInt(String(value), 10), 1);
    runtime.registerHostFunction('ToFloat', (value) => Number.parseFloat(String(value)), 1);
    runtime.registerHostFunction('ToBoolean', (value) => Boolean(value), 1);
    runtime.registerHostFunction('Write', (value) => {
      runtime.getIoHost().write?.(String(value));
      return null;
    }, 1);
    runtime.registerHostFunction('WriteLine', (value) => {
      runtime.getIoHost().writeLine?.(String(value));
      return null;
    }, 1);
    runtime.registerHostFunction('ReadLine', () => runtime.getIoHost().readLine?.() ?? '', 0);

    runtime.registerNodeExpander(KnNodeType.Knot, (activeRuntime, node) => {
      activeRuntime.addOpDirectly(RuntimeOpCode.ExpandChain, node);
    });
    runtime.registerNodeExpander(KnNodeType.Vector, (activeRuntime, node) => RuntimeInterpreter.ExpandVector(activeRuntime, node));
    runtime.registerNodeExpander(KnNodeType.UnorderedMap, (activeRuntime, node) => RuntimeInterpreter.ExpandMap(activeRuntime, node));
    runtime.registerNodeExpander(KnNodeType.Word, (activeRuntime, node) => {
      const name = RuntimeInterpreter.GetWordName(node);
      activeRuntime.addOpDirectly(RuntimeOpCode.PushValue, activeRuntime.hasHostFunction(name)
        ? activeRuntime.getHostFunction(name)
        : activeRuntime.lookup(name));
    });
  }

  public static EvalSync(source: string): any {
    const runtime = RuntimeInterpreter.CreateRuntime();
    return RuntimeInterpreter.EvalWithRuntimeSync(runtime, source);
  }

  public static EvalWithRuntimeSync(runtime: RuntimeState, source: string, options: RuntimeEvalSourceOptions = {}): any {
    RuntimeInterpreter.TypeCheckSourceIfRequested(source, options);
    const nodesToRun = RuntimeInterpreter.ParseSourceBlock(source);
    return RuntimeInterpreter.ExecBlockWithRuntimeSync(runtime, nodesToRun);
  }

  public static EvalBlockSourceSync(source: string, options: RuntimeEvalSourceOptions = {}): any {
    const runtime = RuntimeInterpreter.CreateRuntime();
    return RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, source, options);
  }

  public static EvalBlockSourceTypedSync(source: string): any {
    return RuntimeInterpreter.EvaluateTypedBlockSync(source);
  }

  public static EvaluateTypedBlockSync(source: string): any {
    const typeCheck = RuntimeInterpreter.TypeCheckSource(source);
    if (!typeCheck.Success) {
      throw new RuntimeTypeCheckError(typeCheck);
    }
    const binding = RequireTypeSystemBridge().BindSource(source);
    if (!binding.Success) {
      throw new Error(`Typed runtime binding failed: ${binding.Diagnostics.map(diagnostic => `${diagnostic.Code}: ${diagnostic.Message}`).join('; ')}`);
    }
    const runtime = RuntimeInterpreter.CreateRuntime();
    runtime.setTypedRuntimeContext(binding.Context);
    binding.Context.PrototypeResolver = name => {
      const value = runtime.lookup(name);
      return value instanceof RuntimeObject ? value : null;
    };
    const nodesToRun = RuntimeInterpreter.ParseSourceBlock(source)
      .filter(node => !RuntimeInterpreter.IsPureTypeSystemDeclaration(node));
    return RuntimeInterpreter.ExecBlockWithRuntimeSync(runtime, nodesToRun);
  }

  public static EvalBlockSourceWithRuntimeSync(runtime: RuntimeState, source: string, options: RuntimeEvalSourceOptions = {}): any {
    RuntimeInterpreter.TypeCheckSourceIfRequested(source, options);
    return RuntimeInterpreter.ExecBlockWithRuntimeSync(runtime, RuntimeInterpreter.ParseSourceBlock(source));
  }

  public static TypeCheckSource(source: string): TypeCheckingResultLike {
    return RequireTypeSystemBridge().CheckSource(source);
  }

  private static TypeCheckSourceIfRequested(source: string, options: RuntimeEvalSourceOptions): void {
    if (options?.typeCheck !== true) {
      return;
    }
    const result = RuntimeInterpreter.TypeCheckSource(source);
    options.onTypeChecked?.(result);
    if (!result.Success) {
      throw new RuntimeTypeCheckError(result);
    }
  }

  public static ExecSync(nodeToRun: any): any {
    const runtime = RuntimeInterpreter.CreateRuntime();
    return RuntimeInterpreter.ExecWithRuntimeSync(runtime, nodeToRun);
  }

  public static ExecWithRuntimeSync(runtime: RuntimeState, nodeToRun: any): any {
    const fiber = runtime.getCurrentFiber();
    const operandStack = fiber.operandStack;
    const instructionStackSnapshot = fiber.instructionStack.snapshot();
    const initialFrameCount = operandStack.snapshot().frameBottoms.length;
    operandStack.pushFrame();
    runtime.addOpDirectly(RuntimeOpCode.LandSuccess);
    runtime.addOpDirectly(RuntimeOpCode.RunNode, nodeToRun);
    try {
      RuntimeInterpreter.StartLoopSync(runtime);
      return operandStack.popFrameAndPushTopValue();
    } catch (error) {
      RuntimeInterpreter.PopOperandFramesAfterAbrupt(runtime, initialFrameCount);
      fiber.instructionStack.loadSnapshot(instructionStackSnapshot);
      throw error;
    }
  }

  public static ExecBlockSync(nodesToRun: any[]): any {
    const runtime = RuntimeInterpreter.CreateRuntime();
    return RuntimeInterpreter.ExecBlockWithRuntimeSync(runtime, nodesToRun);
  }

  public static async ExecBlockAsync(nodesToRun: any[]): Promise<any> {
    const runtime = RuntimeInterpreter.CreateRuntime();
    return RuntimeInterpreter.ExecBlockWithRuntimeAsync(runtime, nodesToRun);
  }

  public static ExecBlockWithRuntimeSync(runtime: RuntimeState, nodesToRun: any[]): any {
    const fiber = runtime.getCurrentFiber();
    const operandStack = fiber.operandStack;
    const instructionStackSnapshot = fiber.instructionStack.snapshot();
    const initialFrameCount = operandStack.snapshot().frameBottoms.length;
    operandStack.pushFrame();
    runtime.addOpDirectly(RuntimeOpCode.LandSuccess);
    runtime.addOpDirectly(RuntimeOpCode.RunBlock, nodesToRun);
    try {
      RuntimeInterpreter.StartLoopSync(runtime);
      // D8: a bare unbound Word as a top-level statement (e.g. a whole-program
      // `totallyUnknownWord`) is checked here, post-execution, so late bindings
      // are settled and a genuinely-unbound name is told apart from a value
      // legitimately producing null.
      RuntimeInterpreter.AssertNoUnboundTopLevelWords(runtime, nodesToRun);
      return operandStack.popFrameAndPushTopValue();
    } catch (error) {
      RuntimeInterpreter.PopOperandFramesAfterAbrupt(runtime, initialFrameCount);
      fiber.instructionStack.loadSnapshot(instructionStackSnapshot);
      throw error;
    }
  }

  public static MakeFuncSync(
    runtime: RuntimeState,
    sourceOrNode: string | any,
    options: boolean | { reusable?: boolean } = false,
  ): (...args: any[]) => any {
    const callable = typeof sourceOrNode === 'string'
      ? RuntimeInterpreter.EvalBlockSourceWithRuntimeSync(runtime, sourceOrNode)
      : RuntimeInterpreter.ExecWithRuntimeSync(runtime, sourceOrNode);
    if (!RuntimeInterpreter.IsCallable(callable)) {
      throw new Error('RuntimeInterpreter.MakeFuncSync source does not evaluate to a callable');
    }
    if (RuntimeInterpreter.IsRuntimeContinuation(callable)) {
      throw new Error('RuntimeInterpreter.MakeFuncSync source does not evaluate to a callable');
    }
    const reusable = typeof options === 'boolean' ? options : options?.reusable === true;
    if (!reusable) {
      return (...args: any[]) => RuntimeInterpreter.CallRuntimeCallableSync(runtime, callable, args, '<embedded>');
    }
    let reusableSnapshot = runtime.captureSnapshot();
    return (...args: any[]) => {
      runtime.hydrateSnapshot(reusableSnapshot);
      const result = RuntimeInterpreter.CallRuntimeCallableSync(runtime, callable, args, '<embedded>');
      reusableSnapshot = runtime.captureSnapshot();
      return result;
    };
  }

  public static async ExecBlockWithRuntimeAsync(runtime: RuntimeState, nodesToRun: any[]): Promise<any> {
    const fiber = runtime.getCurrentFiber();
    const operandStack = fiber.operandStack;
    const instructionStackSnapshot = fiber.instructionStack.snapshot();
    const initialFrameCount = operandStack.snapshot().frameBottoms.length;
    operandStack.pushFrame();
    runtime.addOpDirectly(RuntimeOpCode.LandSuccess);
    runtime.addOpDirectly(RuntimeOpCode.RunBlock, nodesToRun);
    try {
      await RuntimeInterpreter.StartLoopAsync(runtime);
      return operandStack.popFrameAndPushTopValue();
    } catch (error) {
      RuntimeInterpreter.PopOperandFramesAfterAbrupt(runtime, initialFrameCount);
      fiber.instructionStack.loadSnapshot(instructionStackSnapshot);
      throw error;
    }
  }

  public static CallRuntimeCallableSync(runtime: RuntimeState, callable: any, args: any[], name = '<callable>'): any {
    if (!RuntimeInterpreter.IsCallable(callable)) {
      throw new Error(`Callable not found: ${name}`);
    }
    if (!RuntimeInterpreter.IsInstructionStackLambda(callable)) {
      return RuntimeInterpreter.CallResolvedCallable(runtime, callable, args, name);
    }
    const fiber = runtime.getCurrentFiber();
    const operandStack = fiber.operandStack;
    const instructionStackSnapshot = fiber.instructionStack.snapshot();
    const initialFrameCount = operandStack.snapshot().frameBottoms.length;
    operandStack.pushFrame();
    runtime.addOpDirectly(RuntimeOpCode.LandSuccess);
    RuntimeInterpreter.ScheduleRuntimeLambdaCall(runtime, callable, args, { name });
    try {
      RuntimeInterpreter.StartLoopSync(runtime);
      return operandStack.popFrameAndPushTopValue();
    } catch (error) {
      RuntimeInterpreter.PopOperandFramesAfterAbrupt(runtime, initialFrameCount);
      fiber.instructionStack.loadSnapshot(instructionStackSnapshot);
      throw error;
    }
  }

  public static EvaluateNode(runtime: RuntimeState, nodeToRun: any): any {
    if (nodeToRun?.__runtimeForm != null) {
      return RuntimeInterpreter.EvaluateRuntimeForm(runtime, nodeToRun);
    }
    if (KnNodeHelper.GetType(nodeToRun) === KnNodeType.RawString) {
      return (nodeToRun as KnRawString).Value;
    }
    if (KnNodeHelper.GetType(nodeToRun) === KnNodeType.InterpolatedString) {
      return RuntimeInterpreter.EvaluateInterpolatedString(runtime, nodeToRun as KnInterpolatedString);
    }
    if (KnNodeHelper.GetType(nodeToRun) === KnNodeType.Knot) {
      return RuntimeInterpreter.EvaluateChain(runtime, nodeToRun);
    }
    if (KnNodeHelper.GetType(nodeToRun) === KnNodeType.Word) {
      const name = RuntimeInterpreter.GetWordName(nodeToRun);
      if (runtime.hasHostFunction(name)) {
        return runtime.getHostFunction(name);
      }
      return runtime.lookup(name);
    }
    if (Array.isArray(nodeToRun)) {
      return nodeToRun.map((item) => RuntimeInterpreter.EvaluateNode(runtime, item));
    }
    return nodeToRun;
  }

  private static Op(opcode: string, memo: any = null, comment?: string): RuntimeInstruction {
    return { opcode, memo, comment };
  }

  private static PushOpsToFiber(fiber: RuntimeFiber, ops: RuntimeInstruction[]): void {
    for (let i = ops.length - 1; i >= 0; i--) {
      fiber.instructionStack.push({ ...ops[i] });
    }
  }

  private static PeekAndClearCurrentOperandFrame(runtime: RuntimeState): any[] {
    const operandStack = runtime.getCurrentFiber().operandStack;
    const snapshot = operandStack.snapshot();
    const frameBottom = snapshot.frameBottoms.at(-1) ?? 0;
    const values = snapshot.items.slice(frameBottom);
    operandStack.loadSnapshot({
      items: snapshot.items.slice(0, frameBottom),
      frameBottoms: [...snapshot.frameBottoms],
    });
    return values;
  }

  private static PopOperandFramesAfterAbrupt(runtime: RuntimeState, initialFrameCount: number): void {
    const operandStack = runtime.getCurrentFiber().operandStack;
    while (operandStack.snapshot().frameBottoms.length > initialFrameCount) {
      operandStack.popFrameAllValues();
    }
  }

  private static BuildLoopStepOps(stepNode: any): RuntimeInstruction[] {
    return stepNode == null
      ? []
      : [
        RuntimeInterpreter.Op(RuntimeOpCode.RunNode, stepNode),
        RuntimeInterpreter.Op('ValStack_PopValue'),
      ];
  }

  private static ScheduleRuntimeLambdaCall(
    runtime: RuntimeState,
    fn: RuntimeLambdaFunction,
    args: any[],
    options: { name?: string; resultOverride?: any } = {},
  ): void {
    const activeEffectHandlerMaps = runtime.captureSnapshot().activeEffectHandlerMaps;
    const bindings: { [key: string]: any } = { ...(fn.closureValues ?? {}) };
    for (let i = 0; i < fn.params.length; i++) {
      bindings[fn.params[i]] = args[i] ?? null;
    }
    if (activeEffectHandlerMaps.length > 0) {
      bindings.__EffectHandlerMap = Object.assign({}, ...activeEffectHandlerMaps);
    }
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op('Env_DiveLocalEnv', {
        parentEnvId: fn.definitionEnvId,
        name: `lambda:${options.name ?? fn.name ?? 'anonymous'}`,
        bindings,
      }),
      RuntimeInterpreter.Op(RuntimeOpCode.MakeContExcludeTopNInstruction, 2),
      RuntimeInterpreter.Op('Env_SetLocalEnv', 'return'),
      RuntimeInterpreter.Op(RuntimeOpCode.RunBlock, fn.body ?? []),
      ...(options.resultOverride !== undefined
        ? [RuntimeInterpreter.Op('Runtime_PushValueIfTopNullish', options.resultOverride)]
        : []),
      RuntimeInterpreter.Op('Env_Rise'),
    ]);
  }

  private static ScheduleRuntimeMemberLambdaCall(
    runtime: RuntimeState,
    fn: RuntimeLambdaFunction,
    args: any[],
    options: { name?: string; resultOverride?: any } = {},
  ): void {
    const callerEnvId = runtime.currentEnvId;
    const activeEffectHandlerMaps = runtime.captureSnapshot().activeEffectHandlerMaps;
    const bindings: { [key: string]: any } = { ...(fn.closureValues ?? {}) };
    for (let i = 0; i < fn.params.length; i++) {
      bindings[fn.params[i]] = args[i] ?? null;
    }
    if (activeEffectHandlerMaps.length > 0) {
      bindings.__EffectHandlerMap = Object.assign({}, ...activeEffectHandlerMaps);
    }
    const childEnv = runtime.makeSubLocalEnvUnderEnv(
      fn.definitionEnvId,
      `member:${options.name ?? fn.name ?? 'anonymous'}`,
    );
    for (const [key, value] of Object.entries(bindings)) {
      runtime.define(key, value);
    }
    runtime.changeEnvById(callerEnvId);
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op('Env_ChangeEnvById', childEnv.Id),
      RuntimeInterpreter.Op(RuntimeOpCode.RunBlock, fn.body ?? []),
      ...(options.resultOverride !== undefined
        ? [RuntimeInterpreter.Op('Runtime_PushValueIfTopNullish', options.resultOverride)]
        : []),
      RuntimeInterpreter.Op('Env_ChangeEnvById', callerEnvId),
    ]);
  }

  private static RestoreEnvContinuation(runtime: RuntimeState, name: string, values: any[] = []): void {
    const continuation = runtime.lookup(name);
    if (!RuntimeInterpreter.IsRuntimeContinuation(continuation)) {
      throw new Error(`${name} continuation not found`);
    }
    runtime.restoreContinuation(continuation, values);
  }

  private static IsInstructionStackLambda(fn: any): fn is RuntimeLambdaFunction {
    return fn?.kind === 'RuntimeLambdaFunction'
      && !(fn.body ?? []).some((item) => typeof item === 'function');
  }

  private static ExpandNode(runtime: RuntimeState, nodeToRun: any): void {
    if (nodeToRun?.__runtimeForm != null) {
      RuntimeInterpreter.ExpandRuntimeForm(runtime, nodeToRun);
      return;
    }
    const nodeType = KnNodeHelper.GetType(nodeToRun);
    if (nodeType === KnNodeType.RawString) {
      runtime.addOpDirectly(RuntimeOpCode.PushValue, (nodeToRun as KnRawString).Value);
      return;
    }
    if (nodeType === KnNodeType.InterpolatedString) {
      RuntimeInterpreter.ExpandInterpolatedString(runtime, nodeToRun as KnInterpolatedString);
      return;
    }
    const expander = runtime.getNodeExpander(nodeType);
    if (expander != null) {
      expander(runtime, nodeToRun);
      return;
    }
    if (KnNodeHelper.IsEvaluated(nodeToRun)) {
      runtime.addOpDirectly(RuntimeOpCode.PushValue, nodeToRun);
      return;
    }
    runtime.addOpDirectly(RuntimeOpCode.PushValue, nodeToRun);
  }

  private static ExpandVector(runtime: RuntimeState, nodeToRun: any[]): void {
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op('ValStack_PushFrame'),
      ...nodeToRun.map((item) => RuntimeInterpreter.Op(RuntimeOpCode.RunNode, item)),
      RuntimeInterpreter.Op(RuntimeOpCode.MakeArray, nodeToRun.length),
      RuntimeInterpreter.Op('ValStack_PopFrameAndPushTopVal', null, 'end make array'),
    ]);
  }

  private static ExpandMap(runtime: RuntimeState, nodeToRun: KnUnorderedMap): void {
    const entries = Object.entries(nodeToRun).filter(([key]) => key !== '_Type');
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op('ValStack_PushFrame'),
      ...entries.flatMap(([key, value]) => [
        RuntimeInterpreter.Op(RuntimeOpCode.PushValue, key),
        RuntimeInterpreter.Op(RuntimeOpCode.RunNode, value),
      ]),
      RuntimeInterpreter.Op(RuntimeOpCode.MakeMap, entries.length),
      RuntimeInterpreter.Op('ValStack_PopFrameAndPushTopVal', null, 'end make map'),
    ]);
  }

  private static ExpandInterpolatedString(runtime: RuntimeState, nodeToRun: KnInterpolatedString): void {
    runtime.addOpsInOrder([
      ...nodeToRun.Parts.map((part) => part.kind === 'text'
        ? RuntimeInterpreter.Op(RuntimeOpCode.PushValue, part.value)
        : RuntimeInterpreter.Op(RuntimeOpCode.RunNode, part.value)),
      RuntimeInterpreter.Op(RuntimeOpCode.BuildInterpolatedString, nodeToRun.Parts.length),
    ]);
  }

  private static ExpandBlock(runtime: RuntimeState, block: any[]): void {
    const ops: RuntimeInstruction[] = [];
    for (let i = 0; i < block.length; i++) {
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, block[i]));
      if (i < block.length - 1) {
        ops.push(RuntimeInterpreter.Op('ValStack_PopValue', null, `body index:${i}`));
      }
    }
    runtime.addOpsInOrder(ops);
  }

  private static ExpandChain(runtime: RuntimeState, knot: KnKnot): void {
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op('ValStack_PushFrame'),
      RuntimeInterpreter.Op(RuntimeOpCode.ChainStep, knot),
      RuntimeInterpreter.Op('ValStack_PopFrameAndPushTopVal', null, 'end chain expr'),
    ]);
  }

  private static ExpandChainStep(runtime: RuntimeState, knot: KnKnot): void {
    if (knot == null) {
      return;
    }
    const keyword = RuntimeInterpreter.GetKnotCoreWordName(knot);
    if (knot.CallType == null && RuntimeInterpreter.TryExpandPrefixSpecial(runtime, knot, keyword)) {
      return;
    }

    const ops: RuntimeInstruction[] = [];
    const nextNode = RuntimeInterpreter.AppendChainCurrentOps(runtime, ops, knot);
    if (nextNode != null) {
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.ChainStep, nextNode));
    }
    runtime.addOpsInOrder(ops);
  }

  private static TryExpandPrefixSpecial(runtime: RuntimeState, knot: KnKnot, keyword: string): boolean {
    const prefixExpander = runtime.getPrefixKeywordExpander(keyword);
    if (prefixExpander != null) {
      prefixExpander(runtime, {
        knot,
        sourceNodeId: `prefix:${keyword}`,
      });
      return true;
    }
    if (runtime.hasWorkflowExtension(keyword, 'prefix')) {
      const args = RuntimeInterpreter.KnotToArray(knot).slice(1);
      runtime.addOpsInOrder([
        ...args.map((arg) => RuntimeInterpreter.Op(RuntimeOpCode.RunNode, arg.Core)),
        RuntimeInterpreter.Op(RuntimeOpCode.InvokeWorkflowExtension, {
          name: keyword,
          fixity: 'prefix',
          argCount: args.length,
          sourceNode: knot,
          sourceNodeId: `prefix:${keyword}`,
        }),
      ]);
      return true;
    }
    switch (keyword) {
      case 'class':
        runtime.addOpDirectly(RuntimeOpCode.PushValue, RuntimeInterpreter.EvaluateClassDefinition(runtime, knot));
        return true;
      case 'var':
        RuntimeInterpreter.ExpandVar(runtime, knot);
        return true;
      case 'set':
        RuntimeInterpreter.ExpandSet(runtime, knot);
        return true;
      case 'fn':
        runtime.addOpDirectly(RuntimeOpCode.PushValue, RuntimeInterpreter.EvaluateFunctionDefinition(runtime, knot));
        return true;
      case 'func':
        runtime.addOpDirectly(RuntimeOpCode.PushValue, RuntimeInterpreter.EvaluateFunctionDefinition(runtime, knot));
        return true;
      case 'do':
      case 'main':
        if (knot.Body != null) {
          runtime.addOpDirectly(RuntimeOpCode.RunBlock, knot.Body);
        } else {
          runtime.addOpDirectly(RuntimeOpCode.RunNode, knot.Next?.Core ?? []);
        }
        return true;
      case 'if':
        RuntimeInterpreter.ExpandIf(runtime, knot);
        return true;
      case 'cond':
        RuntimeInterpreter.ExpandCond(runtime, knot);
        return true;
      case 'foreach':
        RuntimeInterpreter.ExpandForeach(runtime, knot);
        return true;
      case 'for':
        RuntimeInterpreter.ExpandFor(runtime, knot);
        return true;
      case '++':
        RuntimeInterpreter.ExpandIncrement(runtime, knot);
        return true;
      case '--':
      case '+=':
      case '-=':
      case '*=':
      case '/=':
        RuntimeInterpreter.ExpandSelfUpdate(runtime, knot, keyword);
        return true;
      case 'await_host_fn':
        RuntimeInterpreter.ExpandAwaitHostFunction(runtime, knot);
        return true;
      case 'set_timeout':
        RuntimeInterpreter.ExpandSetTimeout(runtime, knot);
        return true;
      case 'set_interval':
        RuntimeInterpreter.ExpandSetInterval(runtime, knot);
        return true;
      case 'js_call':
        RuntimeInterpreter.ExpandJsCallAlias(runtime, knot, false);
        return true;
      case 'js_apply':
        RuntimeInterpreter.ExpandJsCallAlias(runtime, knot, true);
        return true;
      case 'try':
        RuntimeInterpreter.ExpandTry(runtime, knot);
        return true;
      case 'perform':
        RuntimeInterpreter.ExpandPerform(runtime, knot);
        return true;
      case 'break':
        runtime.addOpDirectly('Runtime_RestoreContinuationFromEnv', {
          name: 'break',
          valueCount: 0,
        });
        return true;
      case 'continue':
        runtime.addOpDirectly('Runtime_RestoreContinuationFromEnv', {
          name: 'continue',
          valueCount: 0,
        });
        return true;
      case 'return':
        RuntimeInterpreter.ExpandReturn(runtime, knot);
        return true;
      default:
        return false;
    }
  }

  private static AppendChainCurrentOps(runtime: RuntimeState, ops: RuntimeInstruction[], knot: KnKnot): KnKnot {
    const keyword = RuntimeInterpreter.GetKnotCoreWordName(knot);
    if (keyword === '++') {
      ops.push(RuntimeInterpreter.Op(
        'Runtime_IncrementVar',
        RuntimeInterpreter.GetWordName(RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable)[0]),
      ));
      return knot.Next;
    }
    if (keyword === 'return') {
      RuntimeInterpreter.AppendReturnOps(ops, knot);
      return null;
    }
    if (RuntimeInterpreter.IsAbruptControlKeyword(keyword)) {
      RuntimeInterpreter.AppendAbruptControlOps(ops, keyword, knot);
      return null;
    }
    if (knot.CallType === KnotCallType.Assignment) {
      RuntimeInterpreter.AppendChainAssignmentOps(ops, knot);
      return null;
    }
    if (knot.CallType === KnotCallType.InfixCall || knot.CallType === KnotCallType.Operator) {
      const name = RuntimeInterpreter.GetWordName(knot.Core);
      const inputNodes = RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable);
      if (RuntimeInterpreter.IsSelfUpdateOperator(name)) {
        RuntimeInterpreter.AppendSelfUpdateOps(ops, knot, name);
        return knot.Next;
      }
      if (name === 'def_to' || name === 'set_to') {
        RuntimeInterpreter.AppendDefineSetToOps(ops, knot, name);
        return knot.Next;
      }
      if (name === 'save_operands') {
        ops.push(RuntimeInterpreter.Op('Runtime_SaveOperands'));
        return knot.Next;
      }
      if (RuntimeInterpreter.IsLogicalOperator(name)) {
        return RuntimeInterpreter.AppendLogicalOperatorOps(runtime, ops, knot, name, inputNodes);
      }
      if (runtime.getInfixKeywordExpander(name) != null) {
        const expander = runtime.getInfixKeywordExpander(name);
        runtime.addOpsInOrder(ops);
        expander(runtime, {
          knot,
          sourceNodeId: `infix:${name}`,
        });
        return null;
      }
      if (runtime.hasWorkflowExtension(name, 'infix')) {
        for (const inputNode of inputNodes) {
          ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, inputNode));
        }
        let nextNode = knot.Next;
        let argCount = Math.max(inputNodes.length, 2);
        if (inputNodes.length === 0) {
          let needed = Math.max(2 - RuntimeInterpreter.GetCurrentFrameValueCount(runtime), 0);
          while (needed > 0 && nextNode != null) {
            ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, nextNode.Core));
            nextNode = nextNode.Next;
            needed -= 1;
          }
        }
        ops.push(RuntimeInterpreter.Op(RuntimeOpCode.InvokeWorkflowExtension, {
          name,
          fixity: 'infix',
          argCount,
          sourceNode: knot,
          sourceNodeId: `infix:${name}`,
        }));
        return nextNode;
      }
      const callable = RuntimeInterpreter.ResolveCallable(runtime, knot.Core);
      const arity = RuntimeInterpreter.GetCallableArity(runtime, knot.Core, callable);
      for (const inputNode of inputNodes) {
        ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, inputNode));
      }
      let nextNode = knot.Next;
      let argCount = Math.max(arity, inputNodes.length);
      if (inputNodes.length === 0) {
        let needed = Math.max(arity - RuntimeInterpreter.GetCurrentFrameValueCount(runtime), 0);
        while (needed > 0 && nextNode != null) {
          ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, nextNode.Core));
          nextNode = nextNode.Next;
          needed -= 1;
        }
      }
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.ApplyCallable, {
        callableNode: knot.Core,
        argCount,
      }));
      return nextNode;
    }
    if (knot.CallType === KnotCallType.PrefixCall || knot.CallType === KnotCallType.PostfixCall) {
      const inputNodes = RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable);
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, knot.Core));
      for (const inputNode of inputNodes) {
        ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, inputNode));
      }
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.ApplyCallable, {
        callableFromStack: true,
        argCount: inputNodes.length,
      }));
      return knot.Next;
    }
    if (knot.CallType === KnotCallType.InstanceCall) {
      const inputNodes = RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable);
      const methodName = RuntimeInterpreter.GetWordName(knot.Core);
      for (const inputNode of inputNodes) {
        ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, inputNode));
      }
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.CallInstance, {
        methodName,
        argCount: inputNodes.length,
        projectionTargetName: methodName === 'as' && inputNodes.length > 0
          ? RuntimeInterpreter.ReadProjectionTargetName(inputNodes[0])
          : undefined,
      }));
      return knot.Next;
    }
    if (knot.CallType === KnotCallType.StaticIndex) {
      if (knot.Next?.CallType === KnotCallType.Assignment) {
        ops.push(RuntimeInterpreter.Op(RuntimeOpCode.PushValue, {
          kind: 'property',
          key: RuntimeInterpreter.GetWordName(knot.Core),
        }));
        return knot.Next;
      }
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunGetProperty, { key: RuntimeInterpreter.GetWordName(knot.Core) }));
      return knot.Next;
    }
    if (knot.CallType === KnotCallType.Subscript) {
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, knot.Core));
      if (knot.Next?.CallType === KnotCallType.Assignment) {
        ops.push(RuntimeInterpreter.Op(RuntimeOpCode.PushValue, { kind: 'subscript' }));
        ops.push(RuntimeInterpreter.Op('Runtime_BuildSubscriptSelector'));
        return knot.Next;
      }
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunGetSubscript, {}));
      return knot.Next;
    }
    if (knot.Core == null && knot.Body != null) {
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunBlock, knot.Body));
      return knot.Next;
    }
    if (KnNodeHelper.GetType(knot.Core) === KnNodeType.Word) {
      const callable = RuntimeInterpreter.TryResolveCallable(runtime, knot.Core);
      if (RuntimeInterpreter.IsCallable(callable)) {
        const headName = RuntimeInterpreter.GetWordName(knot.Core);
        const arity = RuntimeInterpreter.GetCallableArity(runtime, knot.Core, callable);
        const existingCount = RuntimeInterpreter.GetCurrentFrameValueCount(runtime);
        // Variadic host functions (e.g. Concat, +, *) in head position consume
        // every following sibling value node as an argument, instead of stopping
        // at their nominal binary arity. Without this, `(Concat "a" "b" "c")`
        // would apply Concat to only the last two siblings and silently drop the
        // leading ones. This mirrors the colon-apply form `(:Concat a b c)`.
        if (runtime.hasHostFunction(headName) && runtime.isHostFunctionVariadic(headName)) {
          let nextNode = knot.Next;
          let consumed = 0;
          while (nextNode != null) {
            ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, nextNode.Core));
            nextNode = nextNode.Next;
            consumed += 1;
          }
          const argCount = Math.max(existingCount + consumed, arity);
          ops.push(RuntimeInterpreter.Op(RuntimeOpCode.ApplyCallable, {
            callableNode: knot.Core,
            argCount,
          }));
          return nextNode;
        }
        let needed = Math.max(arity - existingCount, 0);
        let nextNode = knot.Next;
        while (needed > 0 && nextNode != null) {
          ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, nextNode.Core));
          nextNode = nextNode.Next;
          needed -= 1;
        }
        if (needed === 0) {
          ops.push(RuntimeInterpreter.Op(RuntimeOpCode.ApplyCallable, {
            callableNode: knot.Core,
            argCount: arity,
          }));
          return nextNode;
        }
      }
      // D8: a Word in chain head/value position that resolves to nothing — not a
      // host fn, not a workflow extension, not bound in any env — is an unbound
      // reference, not a silent value push that the frame collapse discards
      // (which let `(totallyUnknownWord 1 2)` quietly return the last operand).
      // Bound-but-non-callable heads (`(x 1 2)`) and literal heads (`(7 1 2)`)
      // are unaffected: `x` has a binding, `7` is not a Word. This runs lazily
      // during expansion, so names defined earlier in the block are already
      // bound. Operand words (e.g. an `as`-projection target) are scheduled via
      // RunNode by the call branches above and never reach here.
      if (RuntimeInterpreter.IsUnboundName(runtime, knot.Core)) {
        throw new Error(`Unbound name: ${RuntimeInterpreter.GetWordName(knot.Core)}`);
      }
    }
    ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, knot.Core));
    return knot.Next;
  }

  private static AppendLogicalOperatorOps(
    runtime: RuntimeState,
    ops: RuntimeInstruction[],
    knot: KnKnot,
    name: string,
    inputNodes: any[],
  ): KnKnot {
    if (RuntimeInterpreter.GetCurrentFrameValueCount(runtime) >= 2) {
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.ApplyLogicalOperator, { name, phase: 'apply' }));
      return knot.Next;
    }

    // Colon-prefix form `(:and a b)` / `(:or a b)` carries BOTH operands in
    // knot.Params with no left operand on the value stack. Push the left
    // operand first, then 'decide' (short-circuit on it) with the second
    // operand as the deferred right node.
    if (RuntimeInterpreter.GetCurrentFrameValueCount(runtime) === 0 && inputNodes.length >= 2) {
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, inputNodes[0]));
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.ApplyLogicalOperator, {
        name,
        phase: 'decide',
        rightNode: inputNodes[1],
        nextNode: knot.Next,
      }));
      return null;
    }

    const rightNode = inputNodes[0] ?? knot.Next?.Core ?? null;
    if (rightNode == null) {
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.ApplyLogicalOperator, {
        name,
        phase: 'apply',
      }));
      return knot.Next;
    }

    ops.push(RuntimeInterpreter.Op(RuntimeOpCode.ApplyLogicalOperator, {
      name,
      phase: 'decide',
      rightNode,
      nextNode: inputNodes.length > 0 ? knot.Next : knot.Next?.Next,
    }));
    return null;
  }

  private static IsAbruptControlKeyword(name: string): boolean {
    return name === 'break' || name === 'continue' || name === 'return';
  }

  private static ThrowAbruptControlSignal(runtime: RuntimeState, name: string, knot: KnKnot): never {
    if (name === 'break') {
      throw new RuntimeBreakSignal();
    }
    if (name === 'continue') {
      throw new RuntimeContinueSignal();
    }
    throw new RuntimeReturnSignal(RuntimeInterpreter.EvaluateParamValues(runtime, knot)[0] ?? null);
  }

  private static ExpandReturn(runtime: RuntimeState, knot: KnKnot): void {
    const ops: RuntimeInstruction[] = [];
    RuntimeInterpreter.AppendReturnOps(ops, knot);
    runtime.addOpsInOrder(ops);
  }

  private static AppendReturnOps(ops: RuntimeInstruction[], knot: KnKnot): void {
    const args = RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable);
    if (args.length === 0) {
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.PushValue, null));
    } else {
      ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, args[0]));
    }
    ops.push(RuntimeInterpreter.Op('Runtime_RestoreContinuationFromEnv', {
      name: 'return',
      valueCount: 1,
    }));
  }

  private static AppendChainAssignmentOps(ops: RuntimeInstruction[], knot: KnKnot): void {
    ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, knot.Core));
    ops.push(RuntimeInterpreter.Op('Runtime_AssignChainTarget'));
  }

  private static AppendDefineSetToOps(ops: RuntimeInstruction[], knot: KnKnot, name: string): void {
    const targetName = RuntimeInterpreter.GetDefineSetToTargetName(knot);
    ops.push(RuntimeInterpreter.Op(RuntimeOpCode.Duplicate));
    ops.push(RuntimeInterpreter.Op(name === 'def_to' ? 'Env_DeclareLocalVar' : 'Env_SetLocalEnv', targetName));
  }

  private static GetDefineSetToTargetName(knot: KnKnot): string {
    const selector = (knot as any).Selector;
    if (selector != null) {
      return selector;
    }
    const inputNodes = RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable);
    if (inputNodes[0] != null) {
      return RuntimeInterpreter.GetWordName(inputNodes[0]);
    }
    if (knot.Next?.Core != null) {
      return RuntimeInterpreter.GetWordName(knot.Next.Core);
    }
    return RuntimeInterpreter.GetWordName(knot.Core);
  }

  private static AppendAbruptControlOps(ops: RuntimeInstruction[], keyword: string, knot: KnKnot): void {
    if (keyword === 'return') {
      RuntimeInterpreter.AppendReturnOps(ops, knot);
      return;
    }
    ops.push(RuntimeInterpreter.Op('Runtime_RestoreContinuationFromEnv', {
      name: keyword,
      valueCount: 0,
    }));
  }

  private static GetCurrentFrameValueCount(runtime: RuntimeState): number {
    const snapshot = runtime.getCurrentFiber().operandStack.snapshot();
    const frameBottom = snapshot.frameBottoms.at(-1) ?? 0;
    return snapshot.items.length - frameBottom;
  }

  // A `var` name must be a plain word. If the name node carries a parameter list
  // (`|..|` -> InOutTable) or a block (`:[..]` -> Body), the author wrote a
  // function literal but omitted the `fn` keyword — e.g. `(var f |a| :[ a ])`
  // instead of `(var f (fn |a| :[ a ]))`. The former parses to just `var f`
  // (two chain nodes), so the value is missing and the name binds to null
  // silently. Raise a clear diagnostic instead of swallowing the mistake.
  private static AssertVarNameIsPlainBinding(nameNode: any): void {
    if (nameNode != null && (nameNode.InOutTable != null || nameNode.Body != null)) {
      const declaredName = RuntimeInterpreter.GetWordName(nameNode.Core) ?? '<name>';
      throw new Error(
        `var "${declaredName}" attaches a parameter list or block to the name but binds ` +
        `no value — a function literal needs the fn keyword, e.g. ` +
        `(var ${declaredName} (fn |..| :[ .. ])).`,
      );
    }
  }

  private static ExpandVar(runtime: RuntimeState, knot: KnKnot): void {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    RuntimeInterpreter.AssertVarNameIsPlainBinding(nodes[1]);
    const name = RuntimeInterpreter.GetWordName(nodes[1]?.Core);
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, nodes[2]?.Core),
      RuntimeInterpreter.Op(RuntimeOpCode.Duplicate),
      RuntimeInterpreter.Op('Env_DeclareLocalVar', name),
    ]);
  }

  private static ExpandSet(runtime: RuntimeState, knot: KnKnot): void {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    const placeNodes = nodes.slice(1, -1);
    const valueNode = nodes.at(-1)?.Core;
    if (placeNodes.length === 1 && KnNodeHelper.GetType(placeNodes[0].Core) === KnNodeType.Word) {
      runtime.addOpsInOrder([
        RuntimeInterpreter.Op(RuntimeOpCode.RunNode, valueNode),
        RuntimeInterpreter.Op(RuntimeOpCode.Duplicate),
        RuntimeInterpreter.Op('Env_SetLocalEnv', RuntimeInterpreter.GetWordName(placeNodes[0].Core)),
      ]);
      return;
    }
    const ops = [RuntimeInterpreter.Op(RuntimeOpCode.RunNode, valueNode)];
    RuntimeInterpreter.AppendSetPlaceOps(ops, placeNodes);
    runtime.addOpsInOrder(ops);
  }

  private static AppendSetPlaceOps(ops: RuntimeInstruction[], placeNodes: KnKnot[]): void {
    if (placeNodes.length === 0) {
      throw new Error('set requires an assignment target');
    }
    ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, placeNodes[0].Core));
    for (let i = 1; i < placeNodes.length; i++) {
      const node = placeNodes[i];
      const isFinal = i === placeNodes.length - 1;
      if (node.CallType === KnotCallType.Subscript) {
        ops.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, node.Core));
        ops.push(RuntimeInterpreter.Op(isFinal ? RuntimeOpCode.RunSetSubscript : RuntimeOpCode.RunGetSubscript, {}));
      } else {
        ops.push(RuntimeInterpreter.Op(
          isFinal ? RuntimeOpCode.RunSetProperty : RuntimeOpCode.RunGetProperty,
          { key: RuntimeInterpreter.GetWordName(node.Core) },
        ));
      }
    }
  }

  private static ExpandIncrement(runtime: RuntimeState, knot: KnKnot): void {
    const targetName = RuntimeInterpreter.GetWordName(RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable)[0]);
    runtime.addOpDirectly(RuntimeOpCode.PushValue, RuntimeInterpreter.EvaluateIncrementByName(runtime, targetName));
  }

  private static ExpandSelfUpdate(runtime: RuntimeState, knot: KnKnot, operator: string): void {
    const ops: RuntimeInstruction[] = [];
    RuntimeInterpreter.AppendSelfUpdateOps(ops, knot, operator);
    runtime.addOpsInOrder(ops);
  }

  private static AppendSelfUpdateOps(ops: RuntimeInstruction[], knot: KnKnot, operator: string): void {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    const inputNodes = RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable);
    const targetNode = inputNodes[0] ?? nodes[1]?.Core ?? knot.Next?.Core;
    const valueNode = operator === '++' || operator === '--'
      ? 1
      : inputNodes[1] ?? nodes[2]?.Core ?? knot.Next?.Next?.Core;
    const targetName = RuntimeInterpreter.GetWordName(targetNode);
    const mathName = operator === '--' || operator === '-='
      ? '-'
      : operator === '*='
        ? '*'
        : operator === '/='
          ? '/'
          : '+';
    ops.push(
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, new KnWord(targetName)),
      RuntimeInterpreter.Op(typeof valueNode === 'number' ? RuntimeOpCode.PushValue : RuntimeOpCode.RunNode, valueNode ?? 1),
      RuntimeInterpreter.Op(RuntimeOpCode.ApplyCallable, {
        callableNode: new KnWord(mathName),
        argCount: 2,
      }),
      RuntimeInterpreter.Op(RuntimeOpCode.Duplicate),
      RuntimeInterpreter.Op('Env_SetLocalEnv', targetName),
    );
  }

  private static IsSelfUpdateOperator(operator: string): boolean {
    return operator === '++'
      || operator === '--'
      || operator === '+='
      || operator === '-='
      || operator === '*='
      || operator === '/=';
  }

  private static ExpandAwaitHostFunction(runtime: RuntimeState, knot: KnKnot): void {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    const callableNode = nodes[1]?.Core;
    const argsNode = nodes[2]?.Core;
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, callableNode),
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, argsNode),
      RuntimeInterpreter.Op('Runtime_AwaitHostFunction'),
    ]);
  }

  private static ExpandSetTimeout(runtime: RuntimeState, knot: KnKnot): void {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, nodes[1]?.Core),
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, nodes[2]?.Core),
      RuntimeInterpreter.Op('Runtime_SetTimeout'),
    ]);
  }

  private static ExpandSetInterval(runtime: RuntimeState, knot: KnKnot): void {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, nodes[1]?.Core),
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, nodes[2]?.Core),
      RuntimeInterpreter.Op('Runtime_SetInterval'),
    ]);
  }

  private static ExpandJsCallAlias(runtime: RuntimeState, knot: KnKnot, apply: boolean): void {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    const targetNode = nodes[1]?.Core;
    const methodNode = nodes[2]?.Core;
    const argNodes = nodes.slice(3).map((node) => node.Core);
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, targetNode),
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, methodNode),
      ...(apply
        ? [RuntimeInterpreter.Op(RuntimeOpCode.RunNode, argNodes[0] ?? [])]
        : argNodes.map((arg) => RuntimeInterpreter.Op(RuntimeOpCode.RunNode, arg))),
      RuntimeInterpreter.Op(apply ? 'Runtime_JsApplyAlias' : 'Runtime_JsCallAlias', {
        argCount: apply ? 1 : argNodes.length,
      }),
    ]);
  }

  private static ExpandIf(runtime: RuntimeState, knot: KnKnot): void {
    const conditionNode = knot.Next;
    const elseNode = conditionNode?.Next != null
      && RuntimeInterpreter.GetKnotCoreWordName(conditionNode.Next) === 'else'
      ? conditionNode.Next
      : null;
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op('ValStack_PushFrame'),
      RuntimeInterpreter.Op(RuntimeOpCode.IterConditionPairs, {
        branches: [{
          condition: conditionNode?.Core,
          body: conditionNode?.Body ?? [],
        }],
        index: 0,
        fallbackBody: elseNode?.Body ?? [],
      }),
      RuntimeInterpreter.Op('ValStack_PopFrameAndPushTopVal', null, 'end if'),
    ]);
  }

  private static ExpandCond(runtime: RuntimeState, knot: KnKnot): void {
    const branches: Array<{ condition: any; body: any[] }> = [];
    let fallbackBody: any[] = [];
    let current = knot.Next;
    while (current != null) {
      if (RuntimeInterpreter.GetKnotCoreWordName(current) === 'else') {
        fallbackBody = current.Body ?? [];
      } else {
        branches.push({
          condition: current.Core,
          body: current.Body ?? [],
        });
      }
      current = current.Next;
    }
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op('ValStack_PushFrame'),
      RuntimeInterpreter.Op(RuntimeOpCode.IterConditionPairs, {
        branches,
        index: 0,
        fallbackBody,
      }),
      RuntimeInterpreter.Op('ValStack_PopFrameAndPushTopVal', null, 'end condition'),
    ]);
  }

  private static ExpandForeach(runtime: RuntimeState, knot: KnKnot): void {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    const itemName = RuntimeInterpreter.GetWordName(nodes[1]?.Core);
    const itemsNode = nodes[3];
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op('ValStack_PushFrame'),
      RuntimeInterpreter.Op('Env_DiveLocalEnv', 'foreach'),
      RuntimeInterpreter.Op(RuntimeOpCode.MakeContExcludeTopNInstruction, 3),
      RuntimeInterpreter.Op('Env_SetLocalEnv', 'break'),
      RuntimeInterpreter.Op(RuntimeOpCode.RunNode, itemsNode?.Core),
      RuntimeInterpreter.Op(RuntimeOpCode.IterForEachLoop, {
        index: 0,
        itemName,
        body: itemsNode?.Body ?? [],
        frameId: `foreach:${itemName}`,
      }),
      RuntimeInterpreter.Op('Env_Rise'),
      RuntimeInterpreter.Op('ValStack_PopFrameAndPushTopVal', null, 'end foreach'),
    ]);
  }

  private static ExpandFor(runtime: RuntimeState, knot: KnKnot): void {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    const conditionNode = nodes[1]?.Core;
    const stepNode = nodes[2]?.Core;
    const body = nodes[2]?.Body ?? [];
    const initOps: RuntimeInstruction[] = [];
    for (const [key, value] of Object.entries(knot.Conf ?? {})) {
      initOps.push(RuntimeInterpreter.Op(RuntimeOpCode.RunNode, value));
      initOps.push(RuntimeInterpreter.Op('Env_SetLocalEnv', key));
    }
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op('ValStack_PushFrame'),
      RuntimeInterpreter.Op('Env_DiveLocalEnv', 'for'),
      ...initOps,
      RuntimeInterpreter.Op(RuntimeOpCode.MakeContExcludeTopNInstruction, 2),
      RuntimeInterpreter.Op('Env_SetLocalEnv', 'break'),
      RuntimeInterpreter.Op(RuntimeOpCode.IterForLoop, {
        conditionNode,
        stepNode,
        body,
        frameId: 'for',
      }),
      RuntimeInterpreter.Op('Env_Rise'),
      RuntimeInterpreter.Op('ValStack_PopFrameAndPushTopVal', null, 'end for'),
    ]);
  }

  private static ExpandTry(runtime: RuntimeState, knot: KnKnot): void {
    const handlerEntries = RuntimeInterpreter.ParseTryHandlerEntries(knot);
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op('Env_DiveLocalEnv', 'try'),
      ...handlerEntries.map((entry) => RuntimeInterpreter.Op(RuntimeOpCode.RunNode, entry.handlerNode)),
      RuntimeInterpreter.Op('Runtime_BuildTryHandlerMap', { entries: handlerEntries }),
      RuntimeInterpreter.Op('Env_SetLocalEnv', '__EffectHandlerMap'),
      RuntimeInterpreter.Op(RuntimeOpCode.MakeContExcludeTopNInstruction, 4),
      RuntimeInterpreter.Op('Env_SetLocalEnv', '__ContinuationAfterTry'),
      RuntimeInterpreter.Op('Runtime_PushActiveEffectHandlerMapFromEnv', '__EffectHandlerMap'),
      RuntimeInterpreter.Op(RuntimeOpCode.RunBlock, knot.Body ?? []),
      RuntimeInterpreter.Op('Runtime_PopActiveEffectHandlerMap'),
      RuntimeInterpreter.Op('Env_Rise'),
    ]);
  }

  private static ExpandPerform(runtime: RuntimeState, knot: KnKnot): void {
    const effectName = RuntimeInterpreter.GetPerformEffectName(knot);
    const effectHandlerMap = runtime.lookup('__EffectHandlerMap') ?? runtime.getActiveEffectHandlerMap();
    const handler = effectHandlerMap?.[effectName];
    if (handler == null) {
      throw new Error(`Unhandled effect: ${effectName}`);
    }
    const args = RuntimeInterpreter.GetPerformArgNodes(knot);
    runtime.addOpsInOrder([
      RuntimeInterpreter.Op('ValStack_PushFrame'),
      RuntimeInterpreter.Op('Env_DiveLocalEnv', 'perform'),
      RuntimeInterpreter.Op(RuntimeOpCode.MakeContExcludeTopNInstruction, args.length + 2),
      ...args.map((arg) => RuntimeInterpreter.Op(RuntimeOpCode.RunNode, arg)),
      RuntimeInterpreter.Op('ValStack_PushValue', handler),
      RuntimeInterpreter.Op(RuntimeOpCode.ApplyToFrameTop),
      RuntimeInterpreter.Op('Env_Rise'),
      RuntimeInterpreter.Op('ValStack_PopFrameAndPushTopVal', null, 'end perform'),
    ]);
  }

  private static GetPerformEffectName(knot: KnKnot): string {
    if (knot.Name != null) {
      return RuntimeInterpreter.GetWordName(knot.Name);
    }
    const firstArg = RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable)[0];
    return RuntimeInterpreter.GetWordName(firstArg);
  }

  private static GetPerformArgNodes(knot: KnKnot): any[] {
    const args = RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable);
    if (args.length > 0) {
      return knot.Name == null ? args.slice(1) : args;
    }
    const result: any[] = [];
    let current = knot.Name == null ? knot.Next?.Next : knot.Next;
    while (current != null) {
      result.push(current.Core);
      current = current.Next;
    }
    return result;
  }

  private static ContainsWorkflowExtension(runtime: RuntimeState, nodes: any[]): boolean {
    for (const node of nodes ?? []) {
      if (KnNodeHelper.GetType(node) === KnNodeType.Knot) {
        const knot = node as KnKnot;
        const name = RuntimeInterpreter.GetKnotCoreWordName(knot);
        if (runtime.hasWorkflowExtension(name)) {
          return true;
        }
        if (RuntimeInterpreter.ContainsWorkflowExtension(runtime, knot.Body ?? [])) {
          return true;
        }
        if (knot.Next != null && RuntimeInterpreter.ContainsWorkflowExtension(runtime, [knot.Next])) {
          return true;
        }
      }
    }
    return false;
  }

  private static EvaluateInterpolatedString(runtime: RuntimeState, nodeToRun: KnInterpolatedString): string {
    return nodeToRun.Parts.map((part) => {
      if (part.kind === 'text') {
        return part.value;
      }
      return String(RuntimeInterpreter.EvaluateNode(runtime, part.value));
    }).join('');
  }

  private static EvaluateRuntimeForm(runtime: RuntimeState, form: any): any {
    if (form.__runtimeForm === 'effectHandlerDeclaration') {
      runtime.registerNamedEffectHandler(form.handlerName, form.effectNames);
      return null;
    }
    if (form.__runtimeForm === 'postfixEffectHandle') {
      const handlerMap = RuntimeInterpreter.BuildNamedEffectHandlerMap(runtime, form.handlerNames);
      return runtime.withActiveEffectHandlerMap(handlerMap, () => RuntimeInterpreter.ExecWithRuntimeSync(runtime, form.body));
    }
    throw new Error(`Unknown runtime form: ${form.__runtimeForm}`);
  }

  private static ExpandRuntimeForm(runtime: RuntimeState, form: any): void {
    if (form.__runtimeForm === 'effectHandlerDeclaration') {
      runtime.registerNamedEffectHandler(form.handlerName, form.effectNames);
      runtime.addOpDirectly(RuntimeOpCode.PushValue, null);
      return;
    }
    if (form.__runtimeForm === 'postfixEffectHandle') {
      const handlerMap = RuntimeInterpreter.BuildNamedEffectHandlerMap(runtime, form.handlerNames);
      runtime.addOpsInOrder([
        RuntimeInterpreter.Op('Runtime_PushActiveEffectHandlerMap', handlerMap),
        RuntimeInterpreter.Op(RuntimeOpCode.RunNode, form.body),
        RuntimeInterpreter.Op('Runtime_PopActiveEffectHandlerMap'),
      ]);
      return;
    }
    throw new Error(`Unknown runtime form: ${form.__runtimeForm}`);
  }

  private static BuildNamedEffectHandlerMap(runtime: RuntimeState, handlerNames: string[]): { [effectName: string]: any } {
    const handlerMap: { [effectName: string]: any } = {};
    for (const handlerName of handlerNames) {
      const effectNames = runtime.getNamedEffectHandlerEffects(handlerName);
      if (effectNames.length === 0) {
        throw new Error(`Unknown effect handler: ${handlerName}`);
      }
      for (const effectName of effectNames) {
        handlerMap[effectName] = RuntimeInterpreter.LookupNamedEffectImplementation(runtime, handlerName, effectName);
      }
    }
    return handlerMap;
  }

  private static LookupNamedEffectImplementation(runtime: RuntimeState, handlerName: string, effectName: string): any {
    const candidates = [
      RuntimeInterpreter.ToPascalCase(effectName) + 'Handler',
      RuntimeInterpreter.ToPascalCase(handlerName),
    ];
    for (const candidate of candidates) {
      try {
        return runtime.lookup(candidate);
      } catch (error) {
        // Try the next naming convention.
      }
    }
    throw new Error(`Effect implementation not found for handler ${handlerName} and effect ${effectName}`);
  }

  private static ToPascalCase(name: string): string {
    if (name.length === 0) {
      return name;
    }
    return name[0].toUpperCase() + name.slice(1);
  }

  public static EvaluateChain(runtime: RuntimeState, knot: KnKnot): any {
    const specialResult = RuntimeInterpreter.TryEvaluateSpecialForm(runtime, knot);
    if (specialResult.handled) {
      return specialResult.value;
    }

    const values: any[] = [];
    const nodes: KnKnot[] = [];
    let current: KnKnot = knot;
    while (current != null) {
      nodes.push(current);
      current = current.Next;
    }
    for (let i = 0; i < nodes.length; i++) {
      const consumed = RuntimeInterpreter.EvaluateChainKnot(runtime, nodes[i], values, nodes, i + 1);
      i += consumed;
    }
    return values.length === 0 ? null : values[values.length - 1];
  }

  private static EvaluateChainKnot(
    runtime: RuntimeState,
    knot: KnKnot,
    values: any[],
    chainNodes: KnKnot[],
    lookaheadStart: number,
  ): number {
    const keyword = RuntimeInterpreter.GetKnotCoreWordName(knot);
    if (RuntimeInterpreter.IsAbruptControlKeyword(keyword)) {
      RuntimeInterpreter.ThrowAbruptControlSignal(runtime, keyword, knot);
    }
    if (knot.CallType === KnotCallType.InfixCall || knot.CallType === KnotCallType.Operator) {
      const name = RuntimeInterpreter.GetWordName(knot.Core);
      if (runtime.getInfixKeywordExpander(name) != null) {
        const left = values.pop();
        const argsFromParams = RuntimeInterpreter.EvaluateParamValues(runtime, knot);
        values.push(runtime.getInfixKeywordExpander(name)(runtime, {
          knot,
          args: [left, ...argsFromParams],
          sourceNodeId: `infix:${name}`,
        }));
        return 0;
      }
      if (runtime.hasWorkflowExtension(name, 'infix')) {
        const left = values.pop();
        const argsFromParams = RuntimeInterpreter.EvaluateParamValues(runtime, knot);
        values.push(runtime.invokeWorkflowExtension(name, [left, ...argsFromParams], {
          fixity: 'infix',
          sourceNode: knot,
          sourceNodeId: `infix:${name}`,
        }));
        return 0;
      }
      if (RuntimeInterpreter.IsLogicalOperator(name)) {
        return RuntimeInterpreter.EvaluateLogicalOperator(runtime, name, values, knot, lookaheadStart, chainNodes);
      }
      const argsFromParams = RuntimeInterpreter.EvaluateParamValues(runtime, knot);
      return RuntimeInterpreter.ApplyCallable(runtime, knot.Core, values, argsFromParams, lookaheadStart, chainNodes);
    }
    if (knot.CallType === KnotCallType.PrefixCall) {
      const argsFromParams = RuntimeInterpreter.EvaluateParamValues(runtime, knot);
      values.push(RuntimeInterpreter.CallCallable(runtime, knot.Core, argsFromParams));
      return 0;
    }
    if (knot.CallType === KnotCallType.InstanceCall) {
      const target = values.pop();
      const methodName = RuntimeInterpreter.GetWordName(knot.Core);
      const args = RuntimeInterpreter.EvaluateParamValues(runtime, knot);
      values.push(RuntimeInterpreter.CallInstance(runtime, target, methodName, args));
      return 0;
    }
    if (knot.CallType === KnotCallType.StaticIndex) {
      const target = values.pop();
      values.push(runtime.getProperty(target, RuntimeInterpreter.GetWordName(knot.Core)));
      return 0;
    }
    if (knot.CallType === KnotCallType.Subscript) {
      const target = values.pop();
      values.push(runtime.getSubscript(target, RuntimeInterpreter.EvaluateNode(runtime, knot.Core)));
      return 0;
    }
    return RuntimeInterpreter.EvaluateChainItem(runtime, knot.Core, values, chainNodes, lookaheadStart);
  }

  private static IsLogicalOperator(name: string): boolean {
    return name === 'and' || name === 'or' || name === 'or_else';
  }

  private static EvaluateLogicalOperator(
    runtime: RuntimeState,
    name: string,
    values: any[],
    knot: KnKnot,
    lookaheadStart: number,
    chainNodes: KnKnot[],
  ): number {
    if (values.length >= 2) {
      const right = values.pop();
      const left = values.pop();
      values.push(RuntimeInterpreter.ApplyLogicalOperator(name, left, right));
      return 0;
    }

    // Colon-prefix form `(:and a b)` / `(:or a b)` carries BOTH operands in
    // knot.Params (no left operand on the value stack). Evaluate the left
    // operand from params, short-circuit on it, then evaluate the right.
    const paramNodes = RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable);
    if (values.length === 0 && paramNodes.length >= 2) {
      const left = RuntimeInterpreter.EvaluateNode(runtime, paramNodes[0]);
      if (RuntimeInterpreter.ShouldShortCircuitLogicalOperator(name, left)) {
        values.push(RuntimeInterpreter.ApplyShortCircuitLogicalOperator(name, left));
        return 0;
      }
      const right = RuntimeInterpreter.EvaluateNode(runtime, paramNodes[1]);
      values.push(RuntimeInterpreter.ApplyLogicalOperator(name, left, right));
      return 0;
    }

    const left = values.pop();
    const skipCount = RuntimeInterpreter.HasDeferredRightOperand(knot, lookaheadStart, chainNodes) ? 1 : 0;
    if (name === 'and' && !RuntimeInterpreter.IsTruthy(left)) {
      values.push(false);
      return skipCount;
    }
    if (name === 'or' && RuntimeInterpreter.IsTruthy(left)) {
      values.push(true);
      return skipCount;
    }
    if (name === 'or_else' && RuntimeInterpreter.IsTruthy(left)) {
      values.push(left);
      return skipCount;
    }

    const right = RuntimeInterpreter.EvaluateDeferredRightOperand(runtime, knot, values, lookaheadStart, chainNodes);
    values.push(RuntimeInterpreter.ApplyLogicalOperator(name, left, right.value));
    return right.consumed;
  }

  private static HasDeferredRightOperand(knot: KnKnot, lookaheadStart: number, chainNodes: KnKnot[]): boolean {
    return RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable).length > 0 || lookaheadStart < chainNodes.length;
  }

  private static EvaluateDeferredRightOperand(
    runtime: RuntimeState,
    knot: KnKnot,
    values: any[],
    lookaheadStart: number,
    chainNodes: KnKnot[],
  ): { value: any; consumed: number } {
    const explicitArgs = RuntimeInterpreter.EvaluateParamValues(runtime, knot);
    if (explicitArgs.length > 0) {
      return { value: explicitArgs[0], consumed: 0 };
    }
    if (lookaheadStart >= chainNodes.length) {
      return { value: null, consumed: 0 };
    }
    const consumed = 1 + RuntimeInterpreter.EvaluateChainItem(
      runtime,
      chainNodes[lookaheadStart].Core,
      values,
      chainNodes,
      lookaheadStart + 1,
    );
    return { value: values.pop(), consumed };
  }

  private static ApplyLogicalOperator(name: string, left: any, right: any): any {
    if (name === 'and') {
      return RuntimeInterpreter.IsTruthy(left) && RuntimeInterpreter.IsTruthy(right);
    }
    if (name === 'or') {
      return RuntimeInterpreter.IsTruthy(left) || RuntimeInterpreter.IsTruthy(right);
    }
    return RuntimeInterpreter.IsTruthy(left) ? left : right;
  }

  private static ShouldShortCircuitLogicalOperator(name: string, left: any): boolean {
    if (name === 'and') {
      return !RuntimeInterpreter.IsTruthy(left);
    }
    if (name === 'or' || name === 'or_else') {
      return RuntimeInterpreter.IsTruthy(left);
    }
    return false;
  }

  private static ApplyShortCircuitLogicalOperator(name: string, left: any): any {
    if (name === 'and') {
      return false;
    }
    if (name === 'or') {
      return true;
    }
    return left;
  }

  private static EvaluateChainItem(
    runtime: RuntimeState,
    nodeToRun: any,
    values: any[],
    chainNodes: KnKnot[] = [],
    lookaheadStart = 0,
  ): number {
    if (KnNodeHelper.GetType(nodeToRun) === KnNodeType.Word) {
      const name = RuntimeInterpreter.GetWordName(nodeToRun);
      if (runtime.hasHostFunction(name)) {
        const arity = runtime.getHostFunctionArity(name);
        // Variadic host functions consume every remaining sibling in the chain
        // as an argument; fixed-arity functions consume exactly `arity` values.
        const variadic = runtime.isHostFunctionVariadic(name);
        let consumed = 0;
        while (
          (variadic || values.length < arity)
          && lookaheadStart + consumed < chainNodes.length
        ) {
          const nextCore = chainNodes[lookaheadStart + consumed].Core;
          consumed += 1 + RuntimeInterpreter.EvaluateChainItem(
            runtime,
            nextCore,
            values,
            chainNodes,
            lookaheadStart + consumed + 1,
          );
        }
        const takeCount = variadic ? values.length : arity;
        const args = values.splice(Math.max(values.length - takeCount, 0), takeCount);
        values.push(runtime.callHostFunction(name, args));
        return consumed;
      }
      const callable = RuntimeInterpreter.TryResolveCallable(runtime, nodeToRun);
      if (RuntimeInterpreter.IsCallable(callable)) {
        const arity = RuntimeInterpreter.GetCallableArity(runtime, nodeToRun, callable);
        let consumed = 0;
        while (values.length < arity && lookaheadStart + consumed < chainNodes.length) {
          const nextCore = chainNodes[lookaheadStart + consumed].Core;
          consumed += 1 + RuntimeInterpreter.EvaluateChainItem(
            runtime,
            nextCore,
            values,
            chainNodes,
            lookaheadStart + consumed + 1,
          );
        }
        const args = values.splice(Math.max(values.length - arity, 0), arity);
        values.push(RuntimeInterpreter.CallResolvedCallable(runtime, callable, args, name));
        return consumed;
      }
      // D8: mirror of the instruction-stack head check on the tree-walk chain
      // path (used e.g. for lambda bodies) — a Word resolving to nothing (not a
      // host fn, not a workflow extension, not bound) is an unbound reference.
      if (RuntimeInterpreter.IsUnboundName(runtime, nodeToRun)) {
        throw new Error(`Unbound name: ${name}`);
      }
    }
    values.push(RuntimeInterpreter.EvaluateNode(runtime, nodeToRun));
    return 0;
  }

  private static ApplyCallable(
    runtime: RuntimeState,
    callableNode: any,
    values: any[],
    explicitArgs: any[],
    lookaheadStart: number,
    chainNodes: KnKnot[],
  ): number {
    const name = RuntimeInterpreter.GetWordName(callableNode);
    const callable = RuntimeInterpreter.ResolveCallable(runtime, callableNode);
    const arity = RuntimeInterpreter.GetCallableArity(runtime, callableNode, callable, explicitArgs.length);
    let consumed = 0;
    while (values.length + explicitArgs.length < arity && lookaheadStart + consumed < chainNodes.length) {
      const nextCore = chainNodes[lookaheadStart + consumed].Core;
      consumed += 1 + RuntimeInterpreter.EvaluateChainItem(
        runtime,
        nextCore,
        values,
        chainNodes,
        lookaheadStart + consumed + 1,
      );
    }
    const existingArgCount = Math.max(arity - explicitArgs.length, 0);
    const existingArgs = values.splice(Math.max(values.length - existingArgCount, 0), existingArgCount);
    values.push(RuntimeInterpreter.CallResolvedCallable(runtime, callable, [...existingArgs, ...explicitArgs], name));
    return consumed;
  }

  private static CallCallable(runtime: RuntimeState, callableNode: any, args: any[]): any {
    const name = RuntimeInterpreter.GetWordName(callableNode);
    if (runtime.hasHostFunction(name)) {
      return runtime.callHostFunction(name, args);
    }
    const fn = RuntimeInterpreter.EvaluateNode(runtime, callableNode);
    if (typeof fn === 'function' || fn?.kind === 'RuntimeLambdaFunction') {
      return runtime.callRuntimeFunction(fn, args);
    }
    throw new Error(`Callable not found: ${name}`);
  }

  private static ResolveCallable(runtime: RuntimeState, callableNode: any): any {
    const name = RuntimeInterpreter.GetWordName(callableNode);
    if (runtime.hasHostFunction(name)) {
      return runtime.getHostFunction(name);
    }
    return RuntimeInterpreter.EvaluateNode(runtime, callableNode);
  }

  private static TryResolveCallable(runtime: RuntimeState, callableNode: any): any {
    try {
      return RuntimeInterpreter.ResolveCallable(runtime, callableNode);
    } catch (error) {
      return null;
    }
  }

  private static IsCallable(value: any): value is RuntimeLambdaFunction | RuntimeHostFunction | RuntimeContinuation {
    return typeof value === 'function'
      || value?.kind === 'RuntimeLambdaFunction'
      || RuntimeInterpreter.IsRuntimeContinuation(value);
  }

  // D8: a bare Word is "unbound" when nothing can supply a value for it — not a
  // host function, not a workflow extension (any fixity), and not declared in
  // any enclosing env. `hasBinding` (not `lookup`) is what distinguishes a
  // never-declared name from one legitimately bound to null/undefined. Class
  // and trait names that the type system uses are read syntactically or are
  // env-bound (classes call `define`), so they are not caught here; this only
  // fires on a Word that is genuinely the program's intent and resolves to
  // nothing.
  private static IsUnboundName(runtime: RuntimeState, node: any): boolean {
    if (KnNodeHelper.GetType(node) !== KnNodeType.Word) {
      return false;
    }
    const name = RuntimeInterpreter.GetWordName(node);
    return !runtime.hasHostFunction(name)
      && !runtime.hasWorkflowExtension(name)
      && !runtime.hasBinding(name);
  }

  // Catches a bare unbound Word used as a standalone top-level statement (e.g. a
  // whole-program `totallyUnknownWord`). Runs after execution so forward/late
  // bindings are settled, and only inspects top-level statement nodes — operand
  // words (e.g. an `as`-projection target) never appear here.
  private static AssertNoUnboundTopLevelWords(runtime: RuntimeState, nodes: any[]): void {
    if (!Array.isArray(nodes)) {
      return;
    }
    for (const node of nodes) {
      if (RuntimeInterpreter.IsUnboundName(runtime, node)) {
        throw new Error(`Unbound name: ${RuntimeInterpreter.GetWordName(node)}`);
      }
    }
  }

  private static GetCallableArity(
    runtime: RuntimeState,
    callableNode: any,
    callable: any,
    fallbackArity = 0,
  ): number {
    const name = RuntimeInterpreter.GetWordName(callableNode);
    if (runtime.hasHostFunction(name)) {
      return runtime.getHostFunctionArity(name);
    }
    if (callable?.kind === 'RuntimeLambdaFunction') {
      return callable.params.length;
    }
    if (typeof callable === 'function') {
      return callable.length;
    }
    if (RuntimeInterpreter.IsRuntimeContinuation(callable)) {
      return Math.max(fallbackArity, 1);
    }
    return fallbackArity;
  }

  private static CallResolvedCallable(runtime: RuntimeState, callable: any, args: any[], name: string): any {
    if (typeof callable === 'function' || callable?.kind === 'RuntimeLambdaFunction') {
      return runtime.callRuntimeFunction(callable, args);
    }
    if (RuntimeInterpreter.IsRuntimeContinuation(callable)) {
      runtime.restoreContinuation(callable, args);
      throw new RuntimeContinuationResumeSignal(args.length === 0 ? null : args[args.length - 1], callable.currentEnvId);
    }
    throw new Error(`Callable not found: ${name}`);
  }

  private static TryScheduleResolvedCallable(runtime: RuntimeState, callable: any, args: any[], name: string): boolean {
    if (callable?.kind === 'RuntimeLambdaFunction' && RuntimeInterpreter.IsInstructionStackLambda(callable)) {
      RuntimeInterpreter.ScheduleRuntimeLambdaCall(runtime, callable, args, { name });
      return true;
    }
    if (RuntimeInterpreter.IsRuntimeContinuation(callable)) {
      runtime.restoreContinuation(callable, args);
      return true;
    }
    return false;
  }

  private static IsRuntimeContinuation(value: any): value is RuntimeContinuation {
    return value != null
      && Array.isArray(value.operandItems)
      && Array.isArray(value.operandFrameBottoms)
      && Array.isArray(value.instructionItems)
      && Array.isArray(value.instructionFrameBottoms);
  }

  private static CallInstance(runtime: RuntimeState, target: any, methodName: string, args: any[]): any {
    if (target instanceof RuntimeClassDefinition && methodName === 'new') {
      return RuntimeInterpreter.InstantiateClass(runtime, target, args);
    }
    if (target instanceof RuntimeObject
      && methodName === 'new'
      && RuntimeInterpreter.IsClassPrototype(target)
      && runtime.typedRuntimeContext != null) {
      return RuntimeInterpreter.InstantiateTypedPrototypeDirect(runtime, target, args);
    }
    if (target instanceof RuntimeObject && methodName === 'new' && RuntimeInterpreter.IsClassPrototype(target)) {
      return RuntimeInterpreter.InstantiatePrototypeDirect(runtime, target, args);
    }
    if (RuntimeInterpreter.IsTypedObject(target) && runtime.typedRuntimeContext != null) {
      if (methodName === 'as') {
        return runtime.typedRuntimeContext.Project(target, RuntimeInterpreter.ReadProjectionTargetName(args[0]));
      }
      const method = runtime.typedRuntimeContext.GetMethodImplementation(target, methodName);
      if (typeof method === 'function') {
        return method(target, ...args);
      }
      return RuntimeInterpreter.CallRuntimeCallableSync(runtime, method, [target, ...args], methodName);
    }
    if (target instanceof RuntimeObject && target.hasMethod(methodName)) {
      return runtime.callBoundMethod(target, methodName, args);
    }
    return runtime.callBuiltinMethod(target, RuntimeInterpreter.NormalizeMethodName(methodName), args);
  }

  private static TryScheduleInstanceCall(runtime: RuntimeState, target: any, methodName: string, args: any[]): boolean {
    if (target instanceof RuntimeClassDefinition && methodName === 'new') {
      const scheduled = RuntimeInterpreter.TryScheduleClassInstantiation(runtime, target, args);
      return scheduled;
    }
    if (target instanceof RuntimeObject
      && methodName === 'new'
      && RuntimeInterpreter.IsClassPrototype(target)
      && runtime.typedRuntimeContext != null) {
      RuntimeInterpreter.ScheduleTypedPrototypeInstantiation(runtime, target, args);
      return true;
    }
    if (target instanceof RuntimeObject && methodName === 'new' && RuntimeInterpreter.IsClassPrototype(target)) {
      RuntimeInterpreter.SchedulePrototypeInstantiation(runtime, target, args);
      return true;
    }
    if (RuntimeInterpreter.IsTypedObject(target) && runtime.typedRuntimeContext != null) {
      if (methodName === 'as') {
        return false;
      }
      const method = runtime.typedRuntimeContext.GetMethodImplementation(target, methodName);
      if (RuntimeInterpreter.IsInstructionStackLambda(method)) {
        RuntimeInterpreter.ScheduleRuntimeMemberLambdaCall(runtime, method, [target, ...args], { name: methodName });
        return true;
      }
    }
    if (target instanceof RuntimeObject && target.hasMethod(methodName)) {
      const method = target.getMethod(methodName);
      if (RuntimeInterpreter.IsInstructionStackLambda(method)) {
        RuntimeInterpreter.ScheduleRuntimeMemberLambdaCall(runtime, method, [target, ...args], { name: methodName });
        return true;
      }
    }
    return false;
  }

  private static NormalizeMethodName(methodName: string): string {
    if (methodName.length === 0) {
      return methodName;
    }
    return methodName[0].toUpperCase() + methodName.slice(1);
  }

  private static EvaluateParamValues(runtime: RuntimeState, knot: KnKnot): any[] {
    const raw = RuntimeInterpreter.GetInputNodes(knot.Params ?? knot.InOutTable);
    return raw.map((node) => RuntimeInterpreter.EvaluateNode(runtime, node));
  }

  private static GetInputNodes(tuple: any): any[] {
    if (tuple == null) {
      return [];
    }
    if (Array.isArray(tuple.RawValue)) {
      if (typeof tuple.IsTupleRows === 'function' && tuple.IsTupleRows()) {
        const firstValue = tuple.RawValue[0]?.[2];
        return Array.isArray(firstValue) ? firstValue : tuple.Value;
      }
      return tuple.RawValue;
    }
    return Array.isArray(tuple) ? tuple : [];
  }

  private static GetParamNames(tuple: any): string[] {
    return RuntimeInterpreter.GetInputNodes(tuple).map((node) => RuntimeInterpreter.GetWordName(node));
  }

  private static TryEvaluateSpecialForm(runtime: RuntimeState, knot: KnKnot): { handled: boolean; value?: any } {
    const keyword = RuntimeInterpreter.GetKnotCoreWordName(knot);
    const prefixExpander = runtime.getPrefixKeywordExpander(keyword);
    if (prefixExpander != null) {
      return {
        handled: true,
        value: prefixExpander(runtime, {
          knot,
          args: RuntimeInterpreter.EvaluateFollowingKnotCores(runtime, knot),
          sourceNodeId: `prefix:${keyword}`,
        }),
      };
    }
    if (runtime.hasWorkflowExtension(keyword, 'prefix')) {
      return {
        handled: true,
        value: runtime.invokeWorkflowExtension(
          keyword,
          RuntimeInterpreter.EvaluateFollowingKnotCores(runtime, knot),
          {
            fixity: 'prefix',
            sourceNode: knot,
            sourceNodeId: `prefix:${keyword}`,
          },
        ),
      };
    }
    switch (keyword) {
      case 'class':
        return { handled: true, value: RuntimeInterpreter.EvaluateClassDefinition(runtime, knot) };
      case 'var':
        return { handled: true, value: RuntimeInterpreter.EvaluateVar(runtime, knot) };
      case 'set':
        return { handled: true, value: RuntimeInterpreter.EvaluateSet(runtime, knot) };
      case 'fn':
        return { handled: true, value: RuntimeInterpreter.EvaluateFunctionDefinition(runtime, knot) };
      case 'if':
        return { handled: true, value: RuntimeInterpreter.EvaluateIfForm(runtime, knot) };
      case 'cond':
        return { handled: true, value: RuntimeInterpreter.EvaluateCondForm(runtime, knot) };
      case 'foreach':
        return { handled: true, value: RuntimeInterpreter.EvaluateForeachForm(runtime, knot) };
      case 'for':
        return { handled: true, value: RuntimeInterpreter.EvaluateForForm(runtime, knot) };
      case '++':
        return { handled: true, value: RuntimeInterpreter.EvaluateIncrement(runtime, knot) };
      case 'break':
        throw new RuntimeBreakSignal();
      case 'continue':
        throw new RuntimeContinueSignal();
      case 'return':
        throw new RuntimeReturnSignal(RuntimeInterpreter.EvaluateParamValues(runtime, knot)[0] ?? null);
      case 'try':
        return { handled: true, value: RuntimeInterpreter.EvaluateTry(runtime, knot) };
      case 'perform':
        return { handled: true, value: RuntimeInterpreter.EvaluatePerform(runtime, knot) };
      default:
        return { handled: false };
    }
  }

  private static EvaluateFunctionDefinition(runtime: RuntimeState, knot: KnKnot): RuntimeLambdaFunction {
    const name = RuntimeInterpreter.GetWordName(knot.Name);
    const fn = runtime.createLambda(RuntimeInterpreter.GetParamNames(knot.InOutTable), knot.Body ?? [], name);
    runtime.define(name, fn);
    return fn;
  }

  private static EvaluateIfForm(runtime: RuntimeState, knot: KnKnot): any {
    const conditionNode = knot.Next;
    if (conditionNode == null) {
      return null;
    }
    const elseNode = conditionNode.Next != null
      && RuntimeInterpreter.GetKnotCoreWordName(conditionNode.Next) === 'else'
      ? conditionNode.Next
      : null;
    return RuntimeInterpreter.EvaluateIf(
      runtime,
      RuntimeInterpreter.EvaluateNode(runtime, conditionNode.Core),
      conditionNode.Body ?? [],
      elseNode?.Body ?? [],
    );
  }

  private static EvaluateCondForm(runtime: RuntimeState, knot: KnKnot): any {
    const branches: Array<{ condition: any; body: any[]; else?: boolean }> = [];
    let current = knot.Next;
    while (current != null) {
      const isElse = RuntimeInterpreter.GetKnotCoreWordName(current) === 'else';
      branches.push({
        condition: isElse ? true : RuntimeInterpreter.EvaluateNode(runtime, current.Core),
        body: current.Body ?? [],
        else: isElse,
      });
      current = current.Next;
    }
    return RuntimeInterpreter.EvaluateCond(runtime, branches);
  }

  private static EvaluateForeachForm(runtime: RuntimeState, knot: KnKnot): any {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    const itemName = RuntimeInterpreter.GetWordName(nodes[1]?.Core);
    const itemsNode = nodes[3];
    return RuntimeInterpreter.EvaluateForeach(
      runtime,
      RuntimeInterpreter.EvaluateNode(runtime, itemsNode?.Core) ?? [],
      itemName,
      itemsNode?.Body ?? [],
    );
  }

  private static EvaluateForForm(runtime: RuntimeState, knot: KnKnot): any {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    const conditionNode = nodes[1]?.Core;
    const stepNode = nodes[2]?.Core;
    const body = nodes[2]?.Body ?? [];
    const previousEnvId = runtime.currentEnvId;
    runtime.diveLocalEnv('for');
    try {
      for (const [key, value] of Object.entries(knot.Conf ?? {})) {
        runtime.define(key, RuntimeInterpreter.EvaluateNode(runtime, value));
      }
      let result = null;
      while (RuntimeInterpreter.IsTruthy(RuntimeInterpreter.EvaluateNode(runtime, conditionNode))) {
        try {
          result = RuntimeInterpreter.EvaluateBlockDirect(runtime, body);
        } catch (error) {
          if (error instanceof RuntimeBreakSignal) {
            break;
          }
          if (!(error instanceof RuntimeContinueSignal)) {
            throw error;
          }
        }
        RuntimeInterpreter.EvaluateNode(runtime, stepNode);
      }
      return result;
    } finally {
      runtime.changeEnvById(previousEnvId);
    }
  }

  private static EvaluateIncrement(runtime: RuntimeState, knot: KnKnot): any {
    const targetName = RuntimeInterpreter.GetWordName(RuntimeInterpreter.GetInputNodes(knot.Params)[0]);
    return RuntimeInterpreter.EvaluateIncrementByName(runtime, targetName);
  }

  private static EvaluateIncrementByName(runtime: RuntimeState, targetName: string): any {
    const value = runtime.lookup(targetName) + 1;
    runtime.setVar(targetName, value);
    return value;
  }

  private static EvaluateBlockDirect(runtime: RuntimeState, body: any[]): any {
    let result = null;
    for (const item of body) {
      result = typeof item === 'function' ? item(runtime) : RuntimeInterpreter.EvaluateNode(runtime, item);
    }
    return result;
  }

  private static EvaluateTry(runtime: RuntimeState, knot: KnKnot): any {
    const previousEnvId = runtime.currentEnvId;
    runtime.diveLocalEnv('try');
    const handlerMap = RuntimeInterpreter.ParseTryHandlerMap(runtime, knot);
    runtime.define('__EffectHandlerMap', handlerMap);
    runtime.define('__ContinuationAfterTry', runtime.captureContinuation());
    try {
      return runtime.withActiveEffectHandlerMap(handlerMap, () => RuntimeInterpreter.EvaluateBlockDirect(runtime, knot.Body ?? []));
    } finally {
      runtime.changeEnvById(previousEnvId);
    }
  }

  private static ParseTryHandlerMap(runtime: RuntimeState, knot: KnKnot): { [effectName: string]: any } {
    const handlerMap: { [effectName: string]: any } = {};
    for (const entry of RuntimeInterpreter.ParseTryHandlerEntries(knot)) {
      handlerMap[entry.effectName] = RuntimeInterpreter.EvaluateNode(runtime, entry.handlerNode);
    }
    return handlerMap;
  }

  private static ParseTryHandlerEntries(knot: KnKnot): Array<{ effectName: string; handlerNode: any }> {
    const entries: Array<{ effectName: string; handlerNode: any }> = [];
    let current = knot.Next;
    while (current != null) {
      if (RuntimeInterpreter.GetKnotCoreWordName(current) !== 'handle') {
        current = current.Next;
        continue;
      }
      const handlerNode = current.Next;
      if (handlerNode == null) {
        break;
      }
      entries.push({
        effectName: RuntimeInterpreter.GetWordName(current.Name),
        handlerNode: handlerNode.Core,
      });
      current = handlerNode.Next;
    }
    return entries;
  }

  private static EvaluatePerform(runtime: RuntimeState, knot: KnKnot): any {
    const effectName = RuntimeInterpreter.GetWordName(knot.Name);
    const handler = runtime.getActiveEffectHandler(effectName);
    if (handler == null) {
      throw new Error(`Unhandled effect: ${effectName}`);
    }
    const args = RuntimeInterpreter.EvaluateParamValues(runtime, knot);
    const continuation = runtime.captureContinuation(args.length + 2);
    return RuntimeInterpreter.CallResolvedCallable(runtime, handler, [continuation, ...args], effectName);
  }

  private static EvaluateClassDefinition(runtime: RuntimeState, knot: KnKnot): RuntimeObject {
    const name = RuntimeInterpreter.GetWordName(knot.Name);
    const classDef = new RuntimeClassDefinition(name);
    for (const member of knot.Body ?? []) {
      if (KnNodeHelper.GetType(member) !== KnNodeType.Knot) {
        continue;
      }
      const memberName = RuntimeInterpreter.GetKnotCoreWordName(member);
      if (memberName === 'field') {
        RuntimeInterpreter.AddClassField(classDef, member);
      } else if (memberName === 'new') {
        classDef.constructorDef = {
          params: RuntimeInterpreter.GetParamNames(member.InOutTable),
          body: member.Body ?? [],
        };
      } else if (memberName === 'method') {
        if (RuntimeInterpreter.GetMemberQualifier(member) === 'inherit' && (member.Body ?? []).length === 0) {
          continue;
        }
        classDef.methods[RuntimeInterpreter.GetWordName(member.Name)] = {
          params: RuntimeInterpreter.GetParamNames(member.InOutTable),
          body: member.Body ?? [],
        };
      } else if (memberName === 'prop') {
        classDef.properties[RuntimeInterpreter.GetWordName(member.Name)] = RuntimeInterpreter.ParseClassProperty(member);
      }
    }
    const prototype = RuntimeInterpreter.BuildClassPrototype(runtime, classDef);
    runtime.define(name, prototype);
    return prototype;
  }

  private static BuildClassPrototype(runtime: RuntimeState, classDef: RuntimeClassDefinition): RuntimeObject {
    const prototype = new RuntimeObject();
    prototype.setField('__class_name__', classDef.name);
    prototype.setField('__fields__', classDef.fields.map((field) => field.name));

    for (const field of classDef.fields) {
      prototype.setField(field.name, field.defaultValue ?? null);
    }
    prototype.addMethod('constructor', runtime.createLambda(
      ['self', ...classDef.constructorDef.params],
      RuntimeInterpreter.BuildConstructorBody(classDef),
      `${classDef.name}.constructor`,
    ));
    for (const [methodName, method] of Object.entries(classDef.methods)) {
      prototype.addMethod(methodName, runtime.createLambda(['self', ...method.params], method.body, methodName));
    }
    for (const [propertyName, property] of Object.entries(classDef.properties)) {
      if (property.getBody != null) {
        prototype.setField(`get_${propertyName}`, runtime.createLambda(['self'], property.getBody, `get_${propertyName}`));
      }
      if (property.setBody != null) {
        prototype.setField(
          `set_${propertyName}`,
          runtime.createLambda(['self', ...(property.setParams ?? ['value'])], property.setBody, `set_${propertyName}`),
        );
      }
    }
    return prototype;
  }

  private static BuildConstructorBody(classDef: RuntimeClassDefinition): any[] {
    return [
      ...classDef.fields.map((field, index) => RuntimeInterpreter.BuildSetSelfFieldNode(
        field.name,
        field.defaultValue ?? (classDef.constructorDef.params[index] != null
          ? new KnWord(classDef.constructorDef.params[index])
          : null),
      )),
      ...(classDef.constructorDef.body ?? []),
      new KnWord('self'),
    ];
  }

  private static BuildSetSelfFieldNode(fieldName: string, valueNode: any): KnKnot {
    return KnKnot.MakeByNodes([
      new KnKnot({ Core: new KnWord('set') }),
      new KnKnot({ Core: new KnWord('self') }),
      new KnKnot({ CallType: KnotCallType.StaticIndex, Core: new KnWord(fieldName) }),
      new KnKnot({ Core: valueNode }),
    ]);
  }

  private static AddClassField(classDef: RuntimeClassDefinition, member: KnKnot): void {
    if (member.Name != null) {
      classDef.fields.push({ name: RuntimeInterpreter.GetWordName(member.Name) });
      return;
    }
    const metadata = member.Metadata;
    if (metadata == null || metadata.size === 0) {
      return;
    }
    for (const [key, value] of metadata.entries()) {
      classDef.fields.push({ name: RuntimeInterpreter.GetWordName(key), defaultValue: value });
    }
  }

  private static GetMemberQualifier(member: KnKnot): string {
    return RuntimeInterpreter.GetWordName(member.Attr?.qualifier ?? member.Attr?.mode);
  }

  private static ParseClassProperty(member: KnKnot): { getBody?: any[]; setParams?: string[]; setBody?: any[] } {
    const prop: { getBody?: any[]; setParams?: string[]; setBody?: any[] } = {};
    let current = member.Next;
    while (current != null) {
      const name = RuntimeInterpreter.GetKnotCoreWordName(current);
      if (name === 'get') {
        prop.getBody = current.Body ?? [];
      } else if (name === 'set') {
        prop.setParams = RuntimeInterpreter.GetParamNames(current.InOutTable);
        prop.setBody = current.Body ?? [];
      }
      current = current.Next;
    }
    return prop;
  }

  private static InstantiateClass(runtime: RuntimeState, classDef: RuntimeClassDefinition, args: any[]): RuntimeObject {
    return RuntimeInterpreter.InstantiatePrototypeDirect(runtime, RuntimeInterpreter.BuildClassPrototype(runtime, classDef), args);
  }

  private static TryScheduleClassInstantiation(runtime: RuntimeState, classDef: RuntimeClassDefinition, args: any[]): boolean {
    RuntimeInterpreter.SchedulePrototypeInstantiation(runtime, RuntimeInterpreter.BuildClassPrototype(runtime, classDef), args);
    return true;
  }

  private static IsClassPrototype(target: RuntimeObject): boolean {
    return target.hasField('__class_name__') || target.hasMethod('constructor');
  }

  private static IsTypedObject(target: any): boolean {
    const bridge = GetTypeSystemBridge();
    return bridge != null && bridge.IsTypedObject(target);
  }

  private static ReadProjectionTargetName(value: any): string {
    if (value instanceof RuntimeObject && value.hasField('__class_name__')) {
      return String(value.getField('__class_name__'));
    }
    return RuntimeInterpreter.GetWordName(value) ?? String(value);
  }

  private static InstantiatePrototypeDirect(runtime: RuntimeState, prototype: RuntimeObject, args: any[]): RuntimeObject {
    const instance = RuntimeInterpreter.CreateInstanceFromPrototype(prototype);
    const constructor = prototype.getMethod('constructor');
    if (constructor != null) {
      RuntimeInterpreter.CallRuntimeCallableSync(runtime, constructor, [instance, ...args], `${prototype.getField('__class_name__')}.constructor`);
    }
    return instance;
  }

  private static InstantiateTypedPrototypeDirect(runtime: RuntimeState, prototype: RuntimeObject, args: any[]): any {
    const className = String(prototype.getField('__class_name__'));
    const instance = runtime.typedRuntimeContext.CreateObject(className, prototype);
    const constructor = prototype.getMethod('constructor');
    if (constructor != null) {
      RuntimeInterpreter.CallRuntimeCallableSync(runtime, constructor, [instance, ...args], `${className}.constructor`);
    }
    return instance;
  }

  private static SchedulePrototypeInstantiation(runtime: RuntimeState, prototype: RuntimeObject, args: any[]): void {
    const instance = RuntimeInterpreter.CreateInstanceFromPrototype(prototype);
    const constructor = prototype.getMethod('constructor');
    if (constructor == null) {
      runtime.getCurrentFiber().operandStack.push(instance);
      return;
    }
    RuntimeInterpreter.ScheduleRuntimeMemberLambdaCall(runtime, constructor, [instance, ...args], {
      name: `${prototype.getField('__class_name__')}.constructor`,
      resultOverride: instance,
    });
  }

  private static ScheduleTypedPrototypeInstantiation(runtime: RuntimeState, prototype: RuntimeObject, args: any[]): void {
    const className = String(prototype.getField('__class_name__'));
    const instance = runtime.typedRuntimeContext.CreateObject(className, prototype);
    const constructor = prototype.getMethod('constructor');
    if (constructor == null) {
      runtime.getCurrentFiber().operandStack.push(instance);
      return;
    }
    RuntimeInterpreter.ScheduleRuntimeMemberLambdaCall(runtime, constructor, [instance, ...args], {
      name: `${className}.constructor`,
      resultOverride: instance,
    });
  }

  private static CreateInstanceFromPrototype(prototype: RuntimeObject): RuntimeObject {
    const instance = new RuntimeObject();
    for (const methodName of prototype.getMethodNames()) {
      if (methodName !== 'constructor') {
        instance.addMethod(methodName, prototype.getMethod(methodName));
      }
    }
    for (const fieldName of prototype.getFieldNames()) {
      if (fieldName === '__fields__' || fieldName === '__class_name__') {
        continue;
      }
      const value = prototype.getField(fieldName);
      if (fieldName.startsWith('get_') || fieldName.startsWith('set_')) {
        instance.setField(fieldName, value);
      } else {
        instance.setField(fieldName, null);
      }
    }
    return instance;
  }

  private static TrySchedulePropertyGet(runtime: RuntimeState, target: any, key: string): boolean {
    if (!(target instanceof RuntimeObject)) {
      return false;
    }
    const getter = target.getField(`get_${key}`);
    if (RuntimeInterpreter.IsInstructionStackLambda(getter)) {
      RuntimeInterpreter.ScheduleRuntimeMemberLambdaCall(runtime, getter, [target], { name: `get_${key}` });
      return true;
    }
    return false;
  }

  private static TryHandleTypedPropertyGet(
    runtime: RuntimeState,
    target: any,
    key: string,
  ): { handled: boolean; scheduled?: boolean; value?: any } {
    if (!RuntimeInterpreter.IsTypedObject(target) || runtime.typedRuntimeContext == null) {
      return { handled: false };
    }
    const getter = runtime.typedRuntimeContext.GetPropertyGetter(target, key);
    if (RuntimeInterpreter.IsInstructionStackLambda(getter)) {
      RuntimeInterpreter.ScheduleRuntimeMemberLambdaCall(runtime, getter, [target], { name: `get_${key}` });
      return { handled: true, scheduled: true };
    }
    if (typeof getter === 'function') {
      return { handled: true, value: getter(target) };
    }
    return { handled: true, value: runtime.typedRuntimeContext.ReadField(target, key) };
  }

  private static TrySchedulePropertySet(runtime: RuntimeState, target: any, key: string, value: any): boolean {
    if (!(target instanceof RuntimeObject)) {
      return false;
    }
    const setter = target.getField(`set_${key}`);
    if (RuntimeInterpreter.IsInstructionStackLambda(setter)) {
      RuntimeInterpreter.ScheduleRuntimeMemberLambdaCall(runtime, setter, [target, value], {
        name: `set_${key}`,
        resultOverride: value,
      });
      return true;
    }
    return false;
  }

  private static TryHandleTypedPropertySet(
    runtime: RuntimeState,
    target: any,
    key: string,
    value: any,
  ): { handled: boolean; scheduled?: boolean; value?: any } {
    if (!RuntimeInterpreter.IsTypedObject(target) || runtime.typedRuntimeContext == null) {
      return { handled: false };
    }
    const setter = runtime.typedRuntimeContext.GetPropertySetter(target, key);
    if (RuntimeInterpreter.IsInstructionStackLambda(setter)) {
      RuntimeInterpreter.ScheduleRuntimeMemberLambdaCall(runtime, setter, [target, value], {
        name: `set_${key}`,
        resultOverride: value,
      });
      return { handled: true, scheduled: true };
    }
    if (typeof setter === 'function') {
      setter(target, value);
    } else {
      runtime.typedRuntimeContext.WriteField(target, key, value);
    }
    return { handled: true, value };
  }

  private static WithObjectEnv(runtime: RuntimeState, self: RuntimeObject, params: string[], args: any[], body: () => any): any {
    const previousEnvId = runtime.currentEnvId;
    runtime.diveLocalEnv('object');
    runtime.define('self', self);
    for (let i = 0; i < params.length; i++) {
      runtime.define(params[i], args[i]);
    }
    try {
      return body();
    } finally {
      runtime.changeEnvById(previousEnvId);
    }
  }

  private static EvaluateVar(runtime: RuntimeState, knot: KnKnot): any {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    RuntimeInterpreter.AssertVarNameIsPlainBinding(nodes[1]);
    const name = RuntimeInterpreter.GetWordName(nodes[1]?.Core);
    const value = RuntimeInterpreter.EvaluateNode(runtime, nodes[2]?.Core);
    runtime.define(name, value);
    return value;
  }

  private static EvaluateSet(runtime: RuntimeState, knot: KnKnot): any {
    const nodes = RuntimeInterpreter.KnotToArray(knot);
    const value = RuntimeInterpreter.EvaluateNode(runtime, nodes.at(-1)?.Core);
    RuntimeInterpreter.AssignPlace(runtime, nodes.slice(1, -1), value);
    return value;
  }

  private static AssignPlace(runtime: RuntimeState, placeNodes: KnKnot[], value: any): boolean {
    if (placeNodes.length === 1 && KnNodeHelper.GetType(placeNodes[0].Core) === KnNodeType.Word) {
      runtime.setVar(RuntimeInterpreter.GetWordName(placeNodes[0].Core), value);
      return false;
    }
    let target = RuntimeInterpreter.EvaluateNode(runtime, placeNodes[0].Core);
    for (let i = 1; i < placeNodes.length; i++) {
      const node = placeNodes[i];
      const key = RuntimeInterpreter.GetWordName(node.Core);
      if (i === placeNodes.length - 1) {
        if (node.CallType === KnotCallType.Subscript) {
          runtime.setSubscript(target, RuntimeInterpreter.EvaluateNode(runtime, node.Core), value);
        } else {
          if (RuntimeInterpreter.TrySchedulePropertySet(runtime, target, key, value)) {
            return true;
          }
          runtime.setProperty(target, key, value);
        }
      } else {
        target = node.CallType === KnotCallType.Subscript
          ? runtime.getSubscript(target, RuntimeInterpreter.EvaluateNode(runtime, node.Core))
          : runtime.getProperty(target, key);
      }
    }
    return false;
  }

  private static KnotToArray(knot: KnKnot): KnKnot[] {
    const nodes: KnKnot[] = [];
    let current: KnKnot = knot;
    while (current != null) {
      nodes.push(current);
      current = current.Next;
    }
    return nodes;
  }

  private static EvaluateFollowingKnotCores(runtime: RuntimeState, knot: KnKnot): any[] {
    const values: any[] = [];
    let current = knot.Next;
    while (current != null) {
      values.push(RuntimeInterpreter.EvaluateNode(runtime, current.Core));
      current = current.Next;
    }
    return values;
  }

  private static GetKnotCoreWordName(knot: KnKnot): string {
    return RuntimeInterpreter.GetWordName(knot?.Core);
  }

  private static GetWordName(word: any): string {
    if (typeof word?.GetFullNameStr === 'function') {
      return word.GetFullNameStr();
    }
    // Word nodes hydrated from a JSON-serialized checkpoint are plain data
    // without class methods; rebuild the qualified name from fields.
    if (word != null && typeof word === 'object' && typeof word.Value === 'string') {
      const name = [...(word.Qualifiers ?? []), word.Value].join('.');
      return word.SourceQualifier == null ? name : `${word.SourceQualifier}:::${name}`;
    }
    return String(word);
  }

  public static ParseKonSourceBlock(source: string): any[] {
    return RuntimeInterpreter.BuildPostfixRuntimeForms(
      RuntimeInterpreter.SplitTopLevelExpressions(source).map((expr) => RuntimeInterpreter.ParseKonExpression(expr)),
    );
  }

  public static ParseSourceBlock(source: string): any[] {
    const expressions = RuntimeInterpreter.SplitTopLevelExpressions(source);
    try {
      return RuntimeInterpreter.BuildPostfixRuntimeForms(expressions.map((expr) => RuntimeInterpreter.ParseKonExpression(expr)));
    } catch (error) {
      return expressions.map((expr) => KnConverter.Knl.Parser.Parse(expr));
    }
  }

  private static ParseKonExpression(expression: string): any {
    if (expression.startsWith('#(')) {
      return RuntimeInterpreter.ParseEffectHandlerDeclaration(expression);
    }
    if (expression.startsWith('%(')) {
      return RuntimeInterpreter.ParsePostfixEffectHandle(expression);
    }
    return KnConverter.Kon.Parser.Parse(expression);
  }

  private static BuildPostfixRuntimeForms(nodes: any[]): any[] {
    const result: any[] = [];
    for (const node of nodes) {
      if (node?.__runtimeForm === 'postfixEffectHandle') {
        const body = result.pop();
        if (body == null) {
          throw new Error('effect handle postfix requires a previous expression');
        }
        result.push({ ...node, body });
      } else {
        result.push(node);
      }
    }
    return result;
  }

  private static ParseEffectHandlerDeclaration(expression: string): any {
    const nameMatch = expression.match(/effect\s+handler\s+#([A-Za-z_][A-Za-z0-9_]*)/);
    const handlesMatch = expression.match(/handles\s*:?\[([\s\S]*)\]\s*\)$/);
    if (nameMatch == null || handlesMatch == null) {
      throw new Error('Invalid effect handler declaration');
    }
    return {
      __runtimeForm: 'effectHandlerDeclaration',
      handlerName: nameMatch[1],
      effectNames: handlesMatch[1].split(/\s+/).map((item) => item.trim()).filter((item) => item.length > 0),
    };
  }

  private static ParsePostfixEffectHandle(expression: string): any {
    const handlerNames = Array.from(expression.matchAll(/#([A-Za-z_][A-Za-z0-9_]*)/g)).map((match) => match[1]);
    if (handlerNames.length === 0) {
      throw new Error('effect handle postfix requires a named handler');
    }
    return {
      __runtimeForm: 'postfixEffectHandle',
      handlerNames,
      body: null,
    };
  }

  private static SplitTopLevelExpressions(source: string): string[] {
    const result: string[] = [];
    let start = -1;
    let depth = 0;
    let quote: '"' | "'" | null = null;
    let escape = false;
    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      if (quote != null) {
        if (escape) {
          escape = false;
        } else if (ch === '\\') {
          // Interpolation `\(...)` / `\[...]` inside an interpreted string may
          // contain nested string literals using the same quote character. Skip
          // the whole balanced block so a nested `"` does not prematurely close
          // the surrounding string and corrupt the top-level split.
          if (quote === '"' && (source[i + 1] === '(' || source[i + 1] === '[')) {
            i = RuntimeInterpreter.SkipInterpolationBlockEnd(source, i + 1) - 1;
            continue;
          }
          escape = true;
        } else if (ch === quote) {
          quote = null;
        }
        continue;
      }
      // `//` starts a line comment (outside string literals). Skip to end of
      // line so comment text — including non-ASCII content the lexer cannot
      // tokenize — never leaks out as a bogus top-level expression. (Without
      // this, `(a) // 哈\n(b)` split `哈` into its own piece, which threw
      // "Invalid Token" and tripped the Knl fallback into misparsing.)
      if (ch === '/' && source[i + 1] === '/') {
        let j = i + 2;
        while (j < source.length && source[j] !== '\n') {
          j += 1;
        }
        i = j;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        if (start < 0) {
          start = i;
        }
        continue;
      }
      if (/\s/.test(ch) && depth === 0) {
        continue;
      }
      if (start < 0) {
        start = i;
      }
      if ((ch === '#' || ch === '%') && source[i + 1] === '(' && depth === 0) {
        continue;
      }
      // A top-level `$`-prefixed syntax macro (`${}`, `$[]`, `$()`, `$<>`)
      // belongs to the bracketed expression that follows, mirroring the node
      // entry. Without this the `$` fell into the bare-token branch below and
      // `${a = 1 b = 2}` was sliced into the bogus fragment `${a`, which made
      // EvalBlockSourceSync throw "End of stream" while the node entry parsed
      // the whole macro.
      if (ch === '$' && depth === 0) {
        const next = source[i + 1];
        if (next === '(' || next === '[' || next === '{') {
          // Let the following opener drive the normal balanced-bracket logic;
          // `start` already points at this `$` so the slice keeps the prefix.
          continue;
        }
        if (next === '<') {
          // `<`/`>` are not tracked as brackets in general (they are also the
          // comparison operators), so consume the balanced angle block here so
          // the whole `$<...>` macro stays a single top-level expression.
          const end = RuntimeInterpreter.SkipAngleMacroBlockEnd(source, i + 1);
          result.push(source.slice(start, end));
          i = end - 1;
          start = -1;
          continue;
        }
      }
      if (ch === '(' || ch === '[' || ch === '{') {
        depth += 1;
      } else if (ch === ')' || ch === ']' || ch === '}') {
        depth -= 1;
        if (depth === 0 && start >= 0) {
          result.push(source.slice(start, i + 1));
          start = -1;
        }
      } else if (depth === 0) {
        let end = i + 1;
        while (end < source.length && !/\s/.test(source[end])) {
          end += 1;
        }
        result.push(source.slice(start, end));
        i = end;
        start = -1;
      }
    }
    if (start >= 0) {
      result.push(source.slice(start).trim());
    }
    return result.filter((item) => item.length > 0);
  }

  // Returns the index just past the matching close bracket for an interpolation
  // block whose opening `(` or `[` is at `openIndex`. Nested string literals
  // (single/double, triple variants) are skipped opaquely so quotes inside an
  // interpolated expression do not interfere with the surrounding string.
  private static SkipInterpolationBlockEnd(source: string, openIndex: number): number {
    const open = source[openIndex];
    const close = open === '(' ? ')' : ']';
    let depth = 0;
    let index = openIndex;
    while (index < source.length) {
      const ch = source[index];
      if (ch === '"' || ch === "'") {
        const triple = source.startsWith(ch.repeat(3), index);
        const delimiter = triple ? ch.repeat(3) : ch;
        index += delimiter.length;
        while (index < source.length) {
          if (ch === '"' && source[index] === '\\') {
            index += 2;
            continue;
          }
          if (source.startsWith(delimiter, index)) {
            index += delimiter.length;
            break;
          }
          index += 1;
        }
        continue;
      }
      if (ch === open) {
        depth += 1;
      } else if (ch === close) {
        depth -= 1;
        if (depth === 0) {
          return index + 1;
        }
      }
      index += 1;
    }
    return source.length;
  }

  // Returns the index just past the matching `>` for a `$<...>` ordered-map
  // macro whose opening `<` is at `openIndex`. Used only when a top-level `$`
  // macro is immediately followed by `<`; nested `<...>` blocks and string
  // literals are skipped so a `>` inside a string does not close the macro
  // early. Falls back to end-of-source if the macro is unbalanced (the parser
  // then reports the precise diagnostic).
  private static SkipAngleMacroBlockEnd(source: string, openIndex: number): number {
    let depth = 0;
    let index = openIndex;
    while (index < source.length) {
      const ch = source[index];
      if (ch === '"' || ch === "'") {
        const triple = source.startsWith(ch.repeat(3), index);
        const delimiter = triple ? ch.repeat(3) : ch;
        index += delimiter.length;
        while (index < source.length) {
          if (ch === '"' && source[index] === '\\') {
            index += 2;
            continue;
          }
          if (source.startsWith(delimiter, index)) {
            index += delimiter.length;
            break;
          }
          index += 1;
        }
        continue;
      }
      if (ch === '<') {
        depth += 1;
      } else if (ch === '>') {
        depth -= 1;
        if (depth === 0) {
          return index + 1;
        }
      }
      index += 1;
    }
    return source.length;
  }

  public static EvaluateIf(runtime: RuntimeState, condition: any, thenBody: any[], elseBody: any[] = []): any {
    return RuntimeInterpreter.ExecBlockWithRuntimeSync(runtime, RuntimeInterpreter.IsTruthy(condition) ? thenBody : elseBody);
  }

  public static EvaluateCond(
    runtime: RuntimeState,
    branches: Array<{ condition: any; body: any[]; else?: boolean }>,
  ): any {
    for (const branch of branches) {
      if (branch.else === true || RuntimeInterpreter.IsTruthy(branch.condition)) {
        return RuntimeInterpreter.ExecBlockWithRuntimeSync(runtime, branch.body);
      }
    }
    return null;
  }

  public static EvaluateForeach(
    runtime: RuntimeState,
    items: any[],
    itemName: string,
    body: Array<any | ((runtime: RuntimeState) => any)>,
  ): any {
    let result = null;
    for (const item of items) {
      if (runtime.getCurrentEnv().Lookup(itemName) == null) {
        runtime.define(itemName, item);
      } else {
        runtime.setVar(itemName, item);
      }
      try {
        for (const node of body) {
          result = typeof node === 'function' ? node(runtime) : RuntimeInterpreter.EvaluateNode(runtime, node);
        }
      } catch (error) {
        if (error instanceof RuntimeBreakSignal) {
          break;
        }
        if (error instanceof RuntimeContinueSignal) {
          continue;
        }
        throw error;
      }
    }
    return result;
  }

  public static SetTo(runtime: RuntimeState, key: string, value: any): any {
    runtime.setVar(key, value);
    return value;
  }

  public static IsTruthy(value: any): boolean {
    if (KnNodeHelper.GetType(value) === KnNodeType.Unknown || KnNodeHelper.GetType(value) === KnNodeType.Undefined) {
      return false;
    }
    return value !== false && value != null;
  }

  private static IsPureTypeSystemDeclaration(node: any): boolean {
    return node instanceof KnKnot
      && node.CallType == null
      && ['type', 'trait'].includes(RuntimeInterpreter.GetKnotCoreWordName(node));
  }

  // Generic dispatch loop for hosts and higher-level packages: drives the
  // current instruction stack until a yield or until it drains. Errors and
  // missing handlers are thrown; effects are returned on yield.
  public static DispatchUntilStop(
    runtime: RuntimeState,
    maxInstructions = 1_000_000,
  ): { stopReason: string; effects: any[] } {
    const result = dispatchInstructions<RuntimeState, RuntimeInstruction, any, string>(
      runtime.makeDispatchContext(),
      (opcode) => runtime.resolveHandler(opcode),
      { maxInstructions },
    );
    if (result.stopReason === 'error') {
      throw result.error;
    }
    if (result.stopReason === 'missing_handler') {
      throw new Error('Instruction handler not found during dispatch');
    }
    return { stopReason: result.stopReason, effects: result.effects ?? [] };
  }

  public static StartLoopSync(runtime: RuntimeState): any {
    while (runtime.getResumeFiberTokenCount() > 0) {
      runtime.consumeResumeFiberToken();
    }
    let fiber = runtime.switchToNextRunnableFiberWithWork();
    if (fiber == null) {
      return runtime.getCurrentFiber().operandStack.peekBottomOfAllFrames();
    }
    let yielded = false;
    while (fiber.instructionStack.peek()?.opcode !== RuntimeOpCode.LandSuccess
      && fiber.instructionStack.peek()?.opcode !== RuntimeOpCode.LandFail
      && fiber.instructionStack.peek() != null) {
      const before = fiber.instructionStack.peek();
      const dispatchResult = dispatchInstructions<RuntimeState, RuntimeInstruction, any, string>(
        runtime.makeDispatchContext(),
        (opcode) => runtime.resolveHandler(opcode),
        { maxInstructions: 1 },
      );
      if (dispatchResult.stopReason === 'error') {
        throw dispatchResult.error;
      }
      if (dispatchResult.stopReason === 'missing_handler') {
        throw new Error(`Instruction handler not found: ${before?.opcode}`);
      }
      if (before != null) {
        runtime.instructionHistory.push({
          fiberId: fiber.id,
          instruction: before,
        });
      }
      if (dispatchResult.stopReason === 'yield_requested') {
        yielded = true;
        break;
      }
      while (runtime.getResumeFiberTokenCount() > 0) {
        runtime.consumeResumeFiberToken();
      }
      const selected = runtime.switchToNextRunnableFiberWithWork();
      if (selected == null) {
        break;
      }
      fiber = selected;
    }

    if (!yielded && (fiber.instructionStack.peek()?.opcode === RuntimeOpCode.LandSuccess
      || fiber.instructionStack.peek()?.opcode === RuntimeOpCode.LandFail)) {
      fiber.instructionStack.pop();
    }
    return fiber.operandStack.peekBottomOfAllFrames();
  }

  public static async StartLoopAsync(runtime: RuntimeState): Promise<any> {
    while (runtime.hasLiveFiberWork() || runtime.getResumeFiberTokenCount() > 0) {
      RuntimeInterpreter.StartLoopSync(runtime);
      if (!runtime.hasLiveFiberWork() && runtime.getResumeFiberTokenCount() === 0) {
        break;
      }
      if (runtime.switchToNextRunnableFiberWithWork() == null) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      } else {
        await Promise.resolve();
      }
    }
    return runtime.getCurrentFiber().operandStack.peekBottomOfAllFrames();
  }
}
