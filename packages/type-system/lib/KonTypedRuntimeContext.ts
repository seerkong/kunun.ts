import {
  ClassTypeSymbol,
  EffectRow,
  EffectSymbol,
  FunctionTypeSymbol,
  InheritanceKind,
  RowMember,
  TypeProjection,
  TypeSymbol,
} from './Types';
import { TypeSystem } from './TypeSystem';
import { KonTypedExecutionContext, ObjectValue, TypedValue } from './KonTypedExecutionContext';
import { KonTypeBinder, TypeBindingDiagnostic, TypeBindingResult, getWord } from './KonTypeBinder';
import { ParseKonSourceItems } from './KonSource';
import { KnKnot } from 'kunun-core/Model/KnKnot';
import { KnNodeType } from 'kunun-core/Model/KnNodeType';

interface FieldStorage {
  Member: RowMember;
  Value: TypedRuntimeValue;
  Initialized: boolean;
}

export type TypedRuntimeValueKind = 'primitive' | 'list' | 'map' | 'function' | 'object' | 'projected-object' | 'any';

export interface TypedRuntimeValue {
  kind: TypedRuntimeValueKind;
  value: any;
  type?: TypeSymbol;
}

export function WrapTypedRuntimeValue(value: any, typeSystem?: TypeSystem): TypedRuntimeValue {
  if (value instanceof KonTypedObject) {
    return {
      kind: value.Projection == null ? 'object' : 'projected-object',
      value,
      type: value.Projection?.Rows ?? value.Class.Rows,
    };
  }
  if (typeof value === 'function') {
    return { kind: 'function', value };
  }
  if (Array.isArray(value)) {
    return { kind: 'list', value, type: typeSystem?.Registry.Any };
  }
  if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return { kind: 'primitive', value, type: inferPrimitiveType(value, typeSystem) };
  }
  if (typeof value === 'object') {
    return { kind: 'map', value, type: typeSystem?.Registry.Any };
  }
  return { kind: 'any', value, type: typeSystem?.Registry.Any };
}

export function UnwrapTypedRuntimeValue(value: TypedRuntimeValue): any {
  return value?.value;
}

export class KonTypedRuntimeBindingResult {
  public constructor(
    public readonly Binding: TypeBindingResult,
    public readonly Context: KonTypedRuntimeContext,
  ) {}

  public get Diagnostics(): TypeBindingDiagnostic[] {
    return this.Binding.Diagnostics;
  }

  public get Success(): boolean {
    return this.Binding.Success && this.Context != null;
  }
}

export class KonTypedObject {
  public readonly _Type = KnNodeType.KonTypedObject;

  public constructor(
    public readonly Class: ClassTypeSymbol,
    public readonly Fields: { [name: string]: FieldStorage[] },
    public readonly Parents: { [className: string]: KonTypedObject } = {},
    public readonly Prototype?: any,
    public readonly Projection?: ClassTypeSymbol,
  ) {}
}

export class KonTypedRuntimeContext {
  public PrototypeResolver?: (className: string) => any;
  private readonly effectScopes: EffectRow[] = [];
  private readonly globals = new Map<string, TypedRuntimeValue>();
  public readonly Execution: KonTypedExecutionContext;

  private constructor(public readonly TypeSystem: TypeSystem) {
    this.Execution = new KonTypedExecutionContext(TypeSystem);
  }

  public static BindSource(source: string): KonTypedRuntimeBindingResult {
    const nodes = ParseKonSourceItems(source);
    return KonTypedRuntimeContext.Bind(nodes);
  }

  public static Bind(nodes: any[]): KonTypedRuntimeBindingResult {
    const declarations = nodes.filter(isTypeSystemDeclaration);
    const binding = new KonTypeBinder().Bind(declarations);
    const context = binding.Success ? new KonTypedRuntimeContext(binding.TypeSystem) : null;
    return new KonTypedRuntimeBindingResult(binding, context);
  }

  public static BindSourceOptional(source: string): KonTypedRuntimeBindingResult {
    return KonTypedRuntimeContext.BindSource(source);
  }

  public CreateObject(className: string, prototype?: any): KonTypedObject {
    const cls = this.TypeSystem.RequireClassSymbol(className);
    const typed = new KonTypedObject(cls, this.CreateFieldStorage(cls), this.CreateParentStorage(cls), prototype);
    if (prototype != null) {
      this.HydrateFieldsFromPrototype(typed, prototype);
    }
    return typed;
  }

  public Instantiate(className: string): ObjectValue {
    return this.Execution.Instantiate(className);
  }

  public ToTypedValue(value: any): TypedValue {
    return this.Execution.ToTypedValue(value);
  }

  public FromTypedValue(value: TypedValue): any {
    return this.Execution.FromTypedValue(value);
  }

  public Project(target: KonTypedObject, targetTypeName: string): KonTypedObject {
    const targetType = this.TypeSystem.RequireClassSymbol(targetTypeName);
    const projection = new TypeProjection(target.Class, targetType);
    if (!projection.IsValidProjection(this.TypeSystem)) {
      throw new Error(`Invalid projection: ${target.Class.Name} cannot be viewed as ${targetTypeName}`);
    }
    return new KonTypedObject(target.Class, target.Fields, target.Parents, target.Prototype, targetType);
  }

  public ReadField(target: KonTypedObject, memberName: string): any {
    const storage = this.ResolveFieldStorage(target, memberName);
    if (!storage.Initialized) {
      throw new Error(`Field '${memberName}' from ${storage.Member.Origin} has not been initialized.`);
    }
    return UnwrapTypedRuntimeValue(storage.Value);
  }

  public WriteField(target: KonTypedObject, memberName: string, value: any): void {
    const storage = this.ResolveFieldStorage(target, memberName);
    storage.Value = WrapTypedRuntimeValue(value, this.TypeSystem);
    storage.Initialized = true;
  }

  public ReadValueField(target: KonTypedObject, memberName: string): TypedValue {
    return this.Execution.ToTypedValue(this.ReadField(target, memberName));
  }

  public WriteValueField(target: KonTypedObject, memberName: string, value: TypedValue): void {
    this.WriteField(target, memberName, this.Execution.FromTypedValue(value));
  }

  public WriteNodeField(target: KonTypedObject, memberName: string, value: any): void {
    this.WriteKonField(target, memberName, value);
  }

  public SetGlobal(name: string, value: any): void {
    this.globals.set(name, WrapTypedRuntimeValue(value, this.TypeSystem));
    this.Execution.SetGlobal(name, this.Execution.ToTypedValue(value));
  }

  public GetGlobal(name: string): any {
    const value = this.GetGlobalValue(name);
    return value == null ? undefined : UnwrapTypedRuntimeValue(value);
  }

  public GetGlobalValue(name: string): TypedRuntimeValue {
    return this.globals.get(name);
  }

  public GetCoreGlobal(name: string): TypedValue {
    return this.Execution.GetGlobal(name);
  }

  public ReadKonField(target: KonTypedObject, memberName: string): any {
    return this.ToKonValue(this.ReadField(target, memberName));
  }

  public WriteKonField(target: KonTypedObject, memberName: string, value: any): void {
    this.WriteField(target, memberName, this.ToRuntimeValue(value));
  }

  public PushEffectScope(...effects: Array<string | EffectSymbol>): { dispose: () => void } {
    const row = EffectRow.FromEffects(effects.map(effect =>
      typeof effect === 'string'
        ? this.TypeSystem.Registry.GetOrCreateEffect(effect)
        : effect));
    this.effectScopes.push(row);
    let disposed = false;
    return {
      dispose: () => {
        if (disposed) {
          return;
        }
        disposed = true;
        const current = this.effectScopes.pop();
        if (current !== row) {
          throw new Error('Effect scope imbalance detected.');
        }
      },
    };
  }

  public Invoke(target: KonTypedObject, memberName: string, ...args: any[]): any {
    const fn = this.GetMethodImplementation(target, memberName);
    if (typeof fn !== 'function') {
      throw new Error(`No method implementation found for '${memberName}'.`);
    }
    return fn(target, ...args);
  }

  public InvokeWithProjection(target: KonTypedObject, targetTypeName: string, memberName: string, ...args: any[]): any {
    return this.Invoke(this.Project(target, targetTypeName), memberName, ...args);
  }

  public GetMethodImplementation(target: KonTypedObject, memberName: string): any {
    const member = this.ResolveMethodMember(target, memberName);
    this.EnsureEffectsAllowed(member);
    const fn = this.ResolvePrototypeMethod(target, member);
    if (fn == null) {
      throw new Error(`No method implementation found for ${member.Origin}::${member.Name}.`);
    }
    return fn;
  }

  public GetPropertyGetter(target: KonTypedObject, memberName: string): any {
    return this.ResolvePropertyAccessor(target, memberName, 'get_');
  }

  public GetPropertySetter(target: KonTypedObject, memberName: string): any {
    return this.ResolvePropertyAccessor(target, memberName, 'set_');
  }

  private CreateFieldStorage(cls: ClassTypeSymbol): { [name: string]: FieldStorage[] } {
    const fields: { [name: string]: FieldStorage[] } = {};
    for (const member of cls.Rows.Members) {
      if (member.IsMethod) {
        continue;
      }
      fields[member.Name] = fields[member.Name] ?? [];
      fields[member.Name].push({ Member: member, Value: undefined, Initialized: false });
    }
    return fields;
  }

  private CreateParentStorage(cls: ClassTypeSymbol): { [className: string]: KonTypedObject } {
    const parents: { [className: string]: KonTypedObject } = {};
    for (const baseRef of cls.Bases) {
      if (baseRef.Inheritance === InheritanceKind.Real) {
        parents[baseRef.Type.Name] = this.CreateObject(baseRef.Type.Name);
      }
    }
    return parents;
  }

  private HydrateFieldsFromPrototype(target: KonTypedObject, prototype: any): void {
    for (const fieldName of getPrototypeFieldNames(prototype)) {
      if (fieldName.startsWith('__') || fieldName.startsWith('get_') || fieldName.startsWith('set_')) {
        continue;
      }
      const value = getPrototypeValue(prototype, fieldName);
      if (value == null) {
        continue;
      }
      if (!this.TargetExposesField(target, fieldName)) {
        continue;
      }
      this.WriteField(target, fieldName, value);
    }
  }

  private ResolveFieldStorage(target: KonTypedObject, memberName: string): FieldStorage {
    this.EnsureProjectionExposesField(target, memberName);
    const fields = target.Fields[memberName];
    if (fields == null || fields.length === 0) {
      throw new Error(`Field '${memberName}' does not exist on ${target.Class.Name}.`);
    }

    const origin = target.Projection?.IsTrait === true ? null : target.Projection?.Name;
    const originSpecified = origin != null;
    for (const field of fields) {
      if (originSpecified && field.Member.Origin !== origin) {
        continue;
      }
      if (!this.IsAccessible(field.Member, target.Class, originSpecified)) {
        continue;
      }
      return field;
    }

    throw new Error(`No matching field '${memberName}' found for origin '${origin ?? '<default>'}'.`);
  }

  private ResolvePropertyAccessor(target: KonTypedObject, memberName: string, prefix: string): any {
    const accessorName = prefix + memberName;
    if (!this.ViewExposesMethod(target, accessorName)) {
      return null;
    }
    const prototype = this.ResolvePrototypeForAccessor(target, accessorName);
    return getPrototypeValue(prototype, accessorName);
  }

  private ResolveMethodMember(target: KonTypedObject, memberName: string): RowMember {
    this.EnsureProjectionExposesMethod(target, memberName);
    const rows = target.Projection?.IsTrait === true ? target.Class.Rows : target.Projection?.Rows ?? target.Class.Rows;
    let candidates = rows.Members
      .filter(member => member.IsMethod && member.Name === memberName)
      .filter(member => target.Projection?.IsTrait === true || target.Projection == null || member.Origin === target.Projection.Name)
      .filter(member => this.IsAccessible(member, target.Class, target.Projection != null));

    if (candidates.length === 0) {
      throw new Error(`Member '${memberName}' is not exposed by ${target.Projection?.Name ?? target.Class.Name}.`);
    }

    const contextual = this.SelectByActiveEffectContext(candidates);
    if (contextual.length === 0) {
      throw new Error(`No method '${memberName}' is compatible with active effect scope.`);
    }
    if (contextual.length > 1 && contextual.some(member => member.EffectContext != null)) {
      throw new Error(`Method '${memberName}' is ambiguous for active effect scope: ${contextual.map(member => member.Origin).join(', ')}.`);
    }
    return contextual[0];
  }

  private SelectByActiveEffectContext(candidates: RowMember[]): RowMember[] {
    if (candidates.every(member => member.EffectContext == null)) {
      return candidates;
    }
    const active = this.GetActiveEffectRow();
    if (active.IsEmpty) {
      return candidates;
    }
    const contextual = candidates.filter(member => member.EffectContext == null || member.EffectContext.IsSubsetOf(active));
    return contextual.length === 0 ? candidates : contextual;
  }

  private GetActiveEffectRow(): EffectRow {
    return this.effectScopes.reduce((current, scope) => current.Union(scope), EffectRow.EmptyClosed);
  }

  private EnsureEffectsAllowed(member: RowMember): void {
    const signature = member.Type instanceof FunctionTypeSymbol ? member.Type : null;
    if (signature == null || signature.EffectRow.IsEmpty) {
      return;
    }
    const active = this.GetActiveEffectRow();
    if (!signature.EffectRow.IsSubsetOf(active)) {
      throw new Error(`Effect ${signature.EffectRow.ToDisplayString()} required by '${signature.Name}' is not permitted in the current scope.`);
    }
  }

  private ResolvePrototypeMethod(target: KonTypedObject, member: RowMember): any {
    const prototypes = this.EnumeratePrototypeCandidates(target, member);
    const contextualKey = `${member.Origin}::${member.Name}${member.EffectContext?.ToDisplayString() ?? ''}`;
    const originKey = `${member.Origin}::${member.Name}`;
    for (const prototype of prototypes) {
      if (prototype == null) {
        continue;
      }
      const contextual = getPrototypeValue(prototype, contextualKey);
      if (contextual != null) {
        return contextual;
      }
      const origin = getPrototypeValue(prototype, originKey);
      if (origin != null) {
        return origin;
      }
      const fallback = getPrototypeValue(prototype, member.Name);
      if (fallback != null) {
        return fallback;
      }
    }
    if (member.IsInherit) {
      return this.ResolveInheritedPrototypeMethod(target, member);
    }
    return null;
  }

  private ResolveInheritedPrototypeMethod(target: KonTypedObject, member: RowMember): any {
    const mro = target.Class.MethodResolutionOrder;
    const originIndex = mro.findIndex(type => type.Name === member.Origin);
    const searchStart = originIndex < 0 ? 0 : originIndex + 1;
    for (const type of mro.slice(searchStart)) {
      const prototype = this.PrototypeResolver?.(type.Name);
      if (prototype == null) {
        continue;
      }
      const origin = getPrototypeValue(prototype, `${type.Name}::${member.Name}`);
      if (origin != null) {
        return origin;
      }
      const fallback = getPrototypeValue(prototype, member.Name);
      if (fallback != null) {
        return fallback;
      }
    }
    return null;
  }

  private EnumeratePrototypeCandidates(target: KonTypedObject, member: RowMember): any[] {
    if (target.Projection?.IsTrait === true) {
      return target.Class.MethodResolutionOrder
        .map(type => this.PrototypeResolver?.(type.Name))
        .concat([target.Prototype]);
    }
    if (target.Projection != null) {
      return [this.PrototypeResolver?.(target.Projection.Name), target.Prototype];
    }
    return [this.PrototypeResolver?.(member.Origin), target.Prototype];
  }

  private ResolvePrototypeForAccessor(target: KonTypedObject, accessorName: string): any {
    if (target.Projection != null) {
      if (!target.Projection.IsTrait) {
        return this.PrototypeResolver?.(target.Projection.Name);
      }
      for (const type of target.Class.MethodResolutionOrder) {
        const prototype = this.PrototypeResolver?.(type.Name);
        if (prototype != null && getPrototypeValue(prototype, accessorName) != null) {
          return prototype;
        }
      }
    }
    return target.Prototype;
  }

  private TargetExposesField(target: KonTypedObject, memberName: string): boolean {
    const rows = target.Projection?.Rows ?? target.Class.Rows;
    return rows.Members.some(member => !member.IsMethod && member.Name === memberName);
  }

  private EnsureProjectionExposesField(target: KonTypedObject, memberName: string): void {
    if (target.Projection == null || this.TargetExposesField(target, memberName)) {
      return;
    }
    throw new Error(`Field '${memberName}' is not exposed by projected view ${target.Projection.Name}.`);
  }

  private ViewExposesMethod(target: KonTypedObject, memberName: string): boolean {
    const rows = target.Projection?.Rows ?? target.Class.Rows;
    return rows.Members.some(member => member.IsMethod && member.Name === memberName);
  }

  private EnsureProjectionExposesMethod(target: KonTypedObject, memberName: string): void {
    if (target.Projection == null || this.ViewExposesMethod(target, memberName)) {
      return;
    }
    throw new Error(`Member '${memberName}' is not exposed by projected view ${target.Projection.Name}.`);
  }

  private IsAccessible(member: RowMember, cls: ClassTypeSymbol, originSpecified: boolean): boolean {
    switch (member.Access) {
      case 'public':
      case 'internal':
        return true;
      case 'protected':
        return originSpecified && this.IsDerivedFrom(cls, member.Origin);
      case 'private':
        return originSpecified && cls.Name === member.Origin;
      default:
        return false;
    }
  }

  private IsDerivedFrom(candidate: ClassTypeSymbol, ancestorName: string): boolean {
    if (candidate.Name === ancestorName) {
      return true;
    }
    const ancestor = this.TypeSystem.RequireClassSymbol(ancestorName);
    return this.TypeSystem.IsSubtype(candidate, ancestor);
  }

  private ToRuntimeValue(value: any): any {
    if (Array.isArray(value)) {
      throw new Error(`Kon value 'Array' cannot be converted to a typed runtime value.`);
    }
    return value;
  }

  private ToKonValue(value: any): any {
    if (Array.isArray(value)) {
      throw new Error(`Typed runtime value 'Array' cannot be converted to a Kon value.`);
    }
    return value;
  }
}

function getPrototypeFieldNames(prototype: any): string[] {
  if (prototype == null) {
    return [];
  }
  if (typeof prototype.getFieldNames === 'function') {
    return prototype.getFieldNames();
  }
  return Object.keys(prototype);
}

function getPrototypeValue(prototype: any, name: string): any {
  if (prototype == null || name == null) {
    return null;
  }
  if (typeof prototype.getField === 'function') {
    const field = prototype.getField(name);
    if (field != null) {
      return field;
    }
  }
  if (typeof prototype.getMethod === 'function') {
    const method = prototype.getMethod(name);
    if (method != null) {
      return method;
    }
  }
  return prototype[name] ?? null;
}

function inferPrimitiveType(value: any, typeSystem?: TypeSystem): TypeSymbol {
  if (typeSystem == null) {
    return undefined;
  }
  if (typeof value === 'string') {
    return typeSystem.Registry.String;
  }
  if (typeof value === 'number') {
    return typeSystem.Registry.Int;
  }
  if (typeof value === 'boolean') {
    return typeSystem.Registry.Bool;
  }
  return typeSystem.Registry.Any;
}

function isTypeSystemDeclaration(node: any): boolean {
  return node instanceof KnKnot && ['type', 'class', 'trait'].includes(getWord(node.Core));
}
