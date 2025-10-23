import { KnKnot, KnotCallType } from 'kunun-core/Model/KnKnot';
import { KnTuple } from 'kunun-core/Model/KnTuple';
import { KnWord } from 'kunun-core/Model/KnWord';
import { KonTypeChecker, TypeCheckingResult } from './KonTypeChecker';
import { getTypeName, getWord } from './KonTypeBinder';
import { ParseKonSourceItems } from './KonSource';
import { KonTypedObject, KonTypedRuntimeContext } from './KonTypedRuntimeContext';

export class KonTypedBlockError extends Error {
  public constructor(message: string) {
    super(message);
  }
}

interface ClassReference {
  kind: 'class';
  name: string;
}

interface TypedClassPrototype {
  className: string;
  prototype: { [name: string]: any };
  constructorNode?: KnKnot;
}

interface TypedBlockEvaluationState {
  context: KonTypedRuntimeContext;
  prototypes: Map<string, TypedClassPrototype>;
}

type Environment = Map<string, any>;

export class KonTypedBlockEvaluator {
  public static EvaluateSync(source: string): any {
    const typeCheck = KonTypeChecker.CheckSource(source);
    if (!typeCheck.Success) {
      throw new KonTypedBlockTypeCheckError(typeCheck);
    }

    const nodes = ParseKonSourceItems(source);
    const binding = KonTypedRuntimeContext.BindSource(source);
    if (!binding.Success) {
      throw new KonTypedBlockError(`Typed runtime binding failed: ${binding.Diagnostics.map(diagnostic => `${diagnostic.Code}: ${diagnostic.Message}`).join('; ')}`);
    }

    const state: TypedBlockEvaluationState = {
      context: binding.Context,
      prototypes: new Map(),
    };
    for (const declaration of nodes.filter(isClassDeclaration)) {
      this.RegisterClassPrototype(state, declaration);
    }
    state.context.PrototypeResolver = className => state.prototypes.get(className)?.prototype ?? null;

    const env: Environment = new Map();
    let result: any = null;
    for (const node of nodes) {
      if (isTypeSystemDeclaration(node)) {
        continue;
      }
      result = this.EvaluateNode(state, node, env);
    }
    return result;
  }

  private static RegisterClassPrototype(state: TypedBlockEvaluationState, declaration: KnKnot): void {
    const className = getTypeName(declaration.Name);
    if (className == null) {
      return;
    }
    const prototype: TypedClassPrototype = {
      className,
      prototype: {},
    };

    for (const item of declaration.Body ?? []) {
      if (!(item instanceof KnKnot)) {
        continue;
      }
      const keyword = getWord(item.Core);
      if (keyword === 'field') {
        const defaultValue = this.ReadFieldDefaultValue(item);
        if (defaultValue != null) {
          prototype.prototype[this.ReadFieldName(item)] = this.EvaluateLiteral(defaultValue);
        }
        continue;
      }
      if (keyword === 'new') {
        prototype.constructorNode = item;
        continue;
      }
      if (keyword === 'method') {
        const methodName = getTypeName(item.Name);
        if (methodName != null) {
          prototype.prototype[`${className}::${methodName}`] = (target: KonTypedObject, ...args: any[]) =>
            this.InvokeBody(state, item, target, args);
        }
        continue;
      }
      if (keyword === 'prop') {
        this.RegisterPropertyPrototype(state, prototype, item);
      }
    }

    state.prototypes.set(className, prototype);
  }

  private static RegisterPropertyPrototype(
    state: TypedBlockEvaluationState,
    prototype: TypedClassPrototype,
    property: KnKnot,
  ): void {
    const propertyName = getTypeName(property.Name);
    if (propertyName == null) {
      return;
    }

    let section = property.Next;
    while (section != null) {
      const current = section;
      const keyword = getWord(section.Core);
      if (keyword === 'get') {
        prototype.prototype[`get_${propertyName}`] = (target: KonTypedObject) =>
          this.InvokeBody(state, current, target, []);
      } else if (keyword === 'set') {
        prototype.prototype[`set_${propertyName}`] = (target: KonTypedObject, ...args: any[]) =>
          this.InvokeBody(state, current, target, args);
      }
      section = section.Next;
    }
  }

  private static InvokeBody(
    state: TypedBlockEvaluationState,
    bodyOwner: KnKnot,
    self: KonTypedObject,
    args: any[],
  ): any {
    const env: Environment = new Map();
    env.set('self', self);
    const paramNames = this.ReadInputParameterNames(bodyOwner.InOutTable).filter(name => name !== 'self');
    for (let i = 0; i < paramNames.length; i++) {
      env.set(paramNames[i], args[i]);
    }
    return this.EvaluateBlock(state, bodyOwner.Body ?? [], env);
  }

  private static EvaluateBlock(state: TypedBlockEvaluationState, nodes: any[], env: Environment): any {
    let result: any = null;
    for (const node of nodes) {
      result = this.EvaluateNode(state, node, env);
    }
    return result;
  }

  private static EvaluateNode(state: TypedBlockEvaluationState, node: any, env: Environment): any {
    if (node instanceof KnKnot) {
      const keyword = getWord(node.Core);
      if (keyword === 'var') {
        return this.EvaluateVar(state, node, env);
      }
      if (keyword === 'set') {
        return this.EvaluateSet(state, node, env);
      }
      return this.EvaluateChain(state, node, env);
    }
    return this.EvaluateAtom(state, node, env);
  }

  private static EvaluateVar(state: TypedBlockEvaluationState, node: KnKnot, env: Environment): any {
    const name = getWord(node.Next?.Core);
    if (name == null) {
      throw new KonTypedBlockError('Typed var declaration requires a variable name.');
    }
    const valueNode = node.Next?.Next?.Core;
    const value = this.EvaluateNode(state, valueNode, env);
    env.set(name, value);
    return value;
  }

  private static EvaluateSet(state: TypedBlockEvaluationState, node: KnKnot, env: Environment): any {
    const parsed = this.ReadSetTarget(node.Next);
    const value = this.EvaluateNode(state, parsed.valueNode, env);
    const target = this.EvaluateChainParts(state, parsed.baseCore, parsed.baseSegments, env);
    if (!(target instanceof KonTypedObject)) {
      throw new KonTypedBlockError(`Set target for '${parsed.memberName}' is not a typed object.`);
    }

    const setter = state.context.GetPropertySetter(target, parsed.memberName);
    if (typeof setter === 'function') {
      setter(target, value);
    } else {
      state.context.WriteField(target, parsed.memberName, value);
    }
    return value;
  }

  private static EvaluateChain(state: TypedBlockEvaluationState, knot: KnKnot, env: Environment): any {
    return this.EvaluateChainParts(state, knot.Core, this.CollectSegments(knot.Next), env);
  }

  private static EvaluateChainParts(
    state: TypedBlockEvaluationState,
    core: any,
    segments: KnKnot[],
    env: Environment,
  ): any {
    let current = this.EvaluateAtom(state, core, env);
    for (const segment of segments) {
      current = this.EvaluateSegment(state, current, segment, env);
    }
    return current;
  }

  private static EvaluateSegment(
    state: TypedBlockEvaluationState,
    target: any,
    segment: KnKnot,
    env: Environment,
  ): any {
    if (segment.CallType === KnotCallType.StaticIndex) {
      const memberName = getWord(segment.Core);
      if (!(target instanceof KonTypedObject) || memberName == null) {
        throw new KonTypedBlockError(`Slot '${memberName ?? '<missing>'}' requires a typed object target.`);
      }
      const getter = state.context.GetPropertyGetter(target, memberName);
      return typeof getter === 'function'
        ? getter(target)
        : state.context.ReadField(target, memberName);
    }

    if (segment.CallType === KnotCallType.InstanceCall) {
      const memberName = getWord(segment.Core);
      const args = this.ReadCallArguments(segment).map(arg => this.EvaluateNode(state, arg, env));
      if (memberName === 'new') {
        const className = this.ReadClassReference(target);
        const instance = state.context.CreateObject(className, state.prototypes.get(className)?.prototype);
        const constructorNode = state.prototypes.get(className)?.constructorNode;
        if (constructorNode != null) {
          this.InvokeBody(state, constructorNode, instance, args);
        }
        return instance;
      }
      if (memberName === 'as') {
        const targetTypeName = getTypeName(this.ReadCallArguments(segment)[0]);
        if (!(target instanceof KonTypedObject) || targetTypeName == null) {
          throw new KonTypedBlockError('Typed projection requires an object target and target type.');
        }
        return state.context.Project(target, targetTypeName);
      }
      if (!(target instanceof KonTypedObject) || memberName == null) {
        throw new KonTypedBlockError(`Method '${memberName ?? '<missing>'}' requires a typed object target.`);
      }
      return state.context.Invoke(target, memberName, ...args);
    }

    return this.EvaluateNode(state, segment.Core, env);
  }

  private static EvaluateAtom(state: TypedBlockEvaluationState, node: any, env: Environment): any {
    if (node instanceof KnKnot) {
      return this.EvaluateNode(state, node, env);
    }
    if (node instanceof KnWord) {
      if (env.has(node.Value)) {
        return env.get(node.Value);
      }
      if (state.context.TypeSystem.Registry.TryGet(node.Value) != null) {
        return { kind: 'class', name: node.Value } as ClassReference;
      }
      return node.Value;
    }
    return this.EvaluateLiteral(node);
  }

  private static EvaluateLiteral(node: any): any {
    return node;
  }

  private static ReadSetTarget(head: KnKnot): { baseCore: any; baseSegments: KnKnot[]; memberName: string; valueNode: any } {
    if (head == null) {
      throw new KonTypedBlockError('Set requires a target and a value.');
    }
    const segments = this.CollectSegments(head.Next);
    if (segments.length < 2) {
      throw new KonTypedBlockError('Set requires a slot target and a value.');
    }
    const valueHolder = segments[segments.length - 1];
    const slot = segments[segments.length - 2];
    if (slot.CallType !== KnotCallType.StaticIndex) {
      throw new KonTypedBlockError('Set currently supports typed slot assignment targets.');
    }
    const memberName = getWord(slot.Core);
    if (memberName == null) {
      throw new KonTypedBlockError('Set slot target requires a member name.');
    }
    return {
      baseCore: head.Core,
      baseSegments: segments.slice(0, -2),
      memberName,
      valueNode: valueHolder.Core,
    };
  }

  private static CollectSegments(first: KnKnot): KnKnot[] {
    const segments: KnKnot[] = [];
    let current = first;
    while (current != null) {
      segments.push(current);
      current = current.Next;
    }
    return segments;
  }

  private static ReadCallArguments(segment: KnKnot): any[] {
    const params = segment.Params as any;
    const raw = params?.RawValue ?? params?.Value ?? [];
    return Array.isArray(raw) ? raw : [];
  }

  private static ReadInputParameterNames(table: KnTuple): string[] {
    const inputNodes = (table?.RawValue as any[])?.[0]?.[2] ?? [];
    return inputNodes.map(node => getWord(node)).filter(name => name != null);
  }

  private static ReadClassReference(value: any): string {
    if (value?.kind === 'class') {
      return value.name;
    }
    throw new KonTypedBlockError('Typed constructor call requires a class target.');
  }

  private static ReadFieldName(field: KnKnot): string {
    if (field.Name != null) {
      return getTypeName(field.Name);
    }
    if (field.Metadata instanceof Map) {
      const first = field.Metadata.keys().next();
      if (!first.done) {
        return getTypeName(first.value);
      }
    }
    return null;
  }

  private static ReadFieldDefaultValue(field: KnKnot): any {
    if (!(field.Metadata instanceof Map)) {
      return null;
    }
    const first = field.Metadata.values().next();
    return first.done ? null : first.value;
  }
}

export class KonTypedBlockTypeCheckError extends Error {
  public constructor(public readonly Result: TypeCheckingResult) {
    super(`Typed block type check failed: ${Result.Diagnostics.map(diagnostic => `${diagnostic.Code}: ${diagnostic.Message}`).join('; ')}`);
  }
}

function isTypeSystemDeclaration(node: any): boolean {
  return node instanceof KnKnot && ['type', 'class', 'trait'].includes(getWord(node.Core));
}

function isClassDeclaration(node: any): node is KnKnot {
  return node instanceof KnKnot && getWord(node.Core) === 'class';
}
