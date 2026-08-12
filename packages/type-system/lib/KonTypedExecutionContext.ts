import {
  ClassTypeSymbol,
  EffectRow,
  EffectSymbol,
  FunctionTypeSymbol,
  RowMember,
  RowQualifier,
  TypeProjection,
  TypeSymbol,
} from './Types';
import { TypeSystem } from './TypeSystem';

export abstract class TypedValue {
  public constructor(public readonly Type: TypeSymbol) {}
}

export class IntValue extends TypedValue {
  public constructor(public readonly Value: number, typeSystem?: TypeSystem) {
    super(resolveRuntimeTypeSystem(typeSystem).Registry.Int);
  }
}

export class StringValue extends TypedValue {
  public constructor(public readonly Value: string, typeSystem?: TypeSystem) {
    super(resolveRuntimeTypeSystem(typeSystem).Registry.String);
  }
}

export class BoolValue extends TypedValue {
  public constructor(public readonly Value: boolean, typeSystem?: TypeSystem) {
    super(resolveRuntimeTypeSystem(typeSystem).Registry.Bool);
  }
}

export class ListValue extends TypedValue {
  public constructor(public readonly Elements: TypedValue[], typeSystem?: TypeSystem) {
    super(resolveRuntimeTypeSystem(typeSystem).Registry.Any);
  }
}

export class MapValue extends TypedValue {
  public constructor(public readonly Properties: { [name: string]: TypedValue }, typeSystem?: TypeSystem) {
    super(resolveRuntimeTypeSystem(typeSystem).Registry.Any);
  }
}

export class AnyValue extends TypedValue {
  public constructor(public readonly Value: any, typeSystem?: TypeSystem) {
    super(resolveRuntimeTypeSystem(typeSystem).Registry.Any);
  }
}

export class FunctionValue extends TypedValue {
  public constructor(
    public readonly Signature: FunctionTypeSymbol,
    public readonly Body: (context: InvocationContext, args: TypedValue[]) => TypedValue,
  ) {
    super(Signature);
  }
}

export class ObjectValue extends TypedValue {
  public constructor(
    public readonly Class: ClassTypeSymbol,
    public readonly Rows: { [name: string]: RowImplementation[] },
    public readonly Fields: { [name: string]: FieldStorage[] },
    public readonly Parents: { [className: string]: ObjectValue },
  ) {
    super(Class.Rows);
  }
}

export class ProjectedObjectValue extends TypedValue {
  public constructor(
    public readonly Instance: ObjectValue,
    public readonly TargetType: ClassTypeSymbol,
  ) {
    super(TargetType.Rows);
  }
}

export class RowImplementation {
  public constructor(
    public readonly Member: RowMember,
    public readonly Function: FunctionValue,
  ) {}

  public WithFunction(fn: FunctionValue): RowImplementation {
    return new RowImplementation(this.Member, fn);
  }
}

export class FieldStorage {
  public constructor(
    public readonly Member: RowMember,
    public Value?: TypedValue,
  ) {}
}

export class InvocationContext {
  public constructor(
    public readonly Execution: KonTypedExecutionContext,
    public readonly Self?: ObjectValue,
  ) {}

  public get Context(): KonTypedExecutionContext {
    return this.Execution;
  }
}

export class KonTypedExecutionContext {
  private static runtimeTypeSystem: TypeSystem;
  private readonly globals = new Map<string, TypedValue>();
  private readonly effectScopes: EffectRow[] = [];

  public constructor(public readonly TypeSystem: TypeSystem) {
    KonTypedExecutionContext.InitializeRuntimeTypes(TypeSystem);
  }

  public static InitializeRuntimeTypes(typeSystem: TypeSystem): void {
    KonTypedExecutionContext.runtimeTypeSystem = typeSystem;
  }

  public static GetRuntimeTypeSystem(): TypeSystem {
    if (KonTypedExecutionContext.runtimeTypeSystem == null) {
      KonTypedExecutionContext.runtimeTypeSystem = new TypeSystem();
    }
    return KonTypedExecutionContext.runtimeTypeSystem;
  }

  public GetGlobal(name: string): TypedValue {
    return this.globals.get(name);
  }

  public SetGlobal(name: string, value: TypedValue): void {
    this.globals.set(name, value);
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

  public Instantiate(className: string): ObjectValue {
    const classDefinition = this.TypeSystem.RequireClass(className);
    const rows: { [name: string]: RowImplementation[] } = {};
    const fields = this.CreateFieldStorage(classDefinition.Type);
    const parents = this.CreateParentStorage(classDefinition.Type);
    const pendingTraits: RowMember[] = [];
    const pendingVirtualBases: RowMember[] = [];
    const inheritPlaceholders: Array<{ list: RowImplementation[]; index: number; member: RowMember }> = [];
    const nextMethodBodyByMember = new Map<string, number>();

    for (const member of classDefinition.Type.Rows.Members) {
      if (!member.IsMethod) {
        continue;
      }

      rows[member.Name] = rows[member.Name] ?? [];
      const list = rows[member.Name];
      const originDefinition = this.TypeSystem.RequireClass(member.Origin);

      if (originDefinition.Type.IsTrait) {
        pendingTraits.push(member);
        continue;
      }

      if (this.RequiresVirtualOverride(classDefinition.Type, member)) {
        pendingVirtualBases.push(member);
        continue;
      }

      const method = this.TakeNextMethodBody(originDefinition.Methods, member, nextMethodBodyByMember);
      if (method == null) {
        if (member.IsInherit) {
          const signature = this.RequireFunctionSignature(member);
          inheritPlaceholders.push({ list, index: list.length, member });
          list.push(new RowImplementation(member, new FunctionValue(signature, () => {
            throw new Error('Inherited method forwarding unresolved.');
          })));
          continue;
        }
        throw new Error(`No method body found for ${member.Origin}::${member.Name}.`);
      }

      list.push(new RowImplementation(
        member,
        new FunctionValue(this.RequireFunctionSignature(member), (context, args) => method.Implementation(context, args)),
      ));
    }

    for (const placeholder of inheritPlaceholders) {
      const target = placeholder.list.slice(placeholder.index + 1).find(candidate => !candidate.Member.IsVirtual)
        ?? placeholder.list.find((candidate, index) => index !== placeholder.index && !candidate.Member.IsVirtual);
      if (target == null) {
        const fallback = this.FindInheritedMethodTarget(classDefinition.Type, placeholder.member);
        if (fallback == null) {
          throw new Error(`Inherited member ${placeholder.member.Origin}::${placeholder.member.Name} has no target implementation to forward to.`);
        }
        const signature = this.RequireFunctionSignature(placeholder.member);
        placeholder.list[placeholder.index] = placeholder.list[placeholder.index].WithFunction(new FunctionValue(
          signature,
          (context, args) => fallback.Function.Body(context, args),
        ));
        continue;
      }
      const signature = this.RequireFunctionSignature(placeholder.member);
      placeholder.list[placeholder.index] = placeholder.list[placeholder.index].WithFunction(new FunctionValue(
        signature,
        (context, args) => target.Function.Body(context, args),
      ));
    }

    for (const traitMember of pendingTraits) {
      const list = rows[traitMember.Name];
      if (list == null || list.length === 0) {
        throw new Error(`Trait member ${traitMember.Origin}::${traitMember.Name} has no backing implementation.`);
      }
      const forwarded = new RowMember(
        traitMember.Name,
        traitMember.Type,
        RowQualifier.Default,
        traitMember.Origin,
        traitMember.IsMethod,
        {
          Access: traitMember.Access,
          EffectContext: traitMember.EffectContext,
          Metadata: traitMember.Metadata,
          Kind: traitMember.Kind,
        },
      );
      list.unshift(new RowImplementation(forwarded, list[0].Function));
    }

    for (const virtualMember of pendingVirtualBases) {
      const list = rows[virtualMember.Name];
      if (list == null || list.length === 0) {
        throw new Error(`Virtual base member ${virtualMember.Origin}::${virtualMember.Name} requires an override.`);
      }
    }

    return new ObjectValue(classDefinition.Type, rows, fields, parents);
  }

  public CreateObject(className: string): ObjectValue {
    const classDefinition = this.TypeSystem.RequireClass(className);
    return new ObjectValue(
      classDefinition.Type,
      {},
      this.CreateFieldStorage(classDefinition.Type),
      {},
    );
  }

  public Project(instance: ObjectValue, targetTypeName: string): ProjectedObjectValue {
    const targetType = this.TypeSystem.RequireClassSymbol(targetTypeName);
    const projection = new TypeProjection(instance.Class, targetType);
    if (!projection.IsValidProjection(this.TypeSystem)) {
      throw new Error(`Invalid projection: ${instance.Class.Name} cannot be viewed as ${targetTypeName}`);
    }
    return new ProjectedObjectValue(instance, targetType);
  }

  public InvokeWithProjection(instance: ObjectValue, targetTypeName: string, memberName: string, ...args: TypedValue[]): TypedValue {
    return this.Invoke(this.Project(instance, targetTypeName), memberName, ...args);
  }

  public InvokeOrigin(instance: ObjectValue, memberName: string, origin: string, ...args: TypedValue[]): TypedValue {
    return this.InvokeObject(instance, memberName, origin, args);
  }

  public Invoke(target: ObjectValue | ProjectedObjectValue, memberName: string, ...args: TypedValue[]): TypedValue {
    if (target instanceof ProjectedObjectValue) {
      if (target.TargetType.IsTrait) {
        return this.InvokeTraitMember(target.Instance, target.TargetType, memberName, args);
      }
      return this.InvokeObject(target.Instance, memberName, target.TargetType.Name, args);
    }
    const overloaded = splitOriginOverloadArgs(args);
    if (overloaded.origin != null) {
      return this.InvokeObject(target, memberName, overloaded.origin, overloaded.values);
    }
    return this.InvokeObject(target, memberName, null, args);
  }

  public ReadField(target: ObjectValue | ProjectedObjectValue, memberName: string, origin?: string): TypedValue {
    if (target instanceof ProjectedObjectValue) {
      if (target.TargetType.IsTrait) {
        this.EnsureProjectionExposesField(target.TargetType, memberName);
        return this.ReadFieldFromObject(target.Instance, memberName, null);
      }
      return this.ReadFieldFromObject(target.Instance, memberName, target.TargetType.Name);
    }
    if (origin != null) {
      return this.ReadFieldFromObject(target, memberName, origin);
    }
    return this.ReadFieldFromObject(target, memberName, null);
  }

  public ReadFieldOrigin(instance: ObjectValue, memberName: string, origin?: string): TypedValue {
    return this.ReadFieldFromObject(instance, memberName, origin ?? null);
  }

  public WriteField(target: ObjectValue | ProjectedObjectValue, memberName: string, value: TypedValue, origin?: string): void {
    if (target instanceof ProjectedObjectValue) {
      if (target.TargetType.IsTrait) {
        this.EnsureProjectionExposesField(target.TargetType, memberName);
        this.WriteFieldToObject(target.Instance, memberName, value, null);
        return;
      }
      this.WriteFieldToObject(target.Instance, memberName, value, target.TargetType.Name);
      return;
    }
    if (origin != null) {
      this.WriteFieldToObject(target, memberName, value, origin);
      return;
    }
    this.WriteFieldToObject(target, memberName, value, null);
  }

  public WriteFieldOrigin(instance: ObjectValue, memberName: string, value: TypedValue, origin?: string): void {
    this.WriteFieldToObject(instance, memberName, value, origin ?? null);
  }

  public ToTypedValue(value: any): TypedValue {
    if (value instanceof TypedValue) {
      return value;
    }
    if (typeof value === 'number') {
      return new IntValue(value, this.TypeSystem);
    }
    if (typeof value === 'string') {
      return new StringValue(value, this.TypeSystem);
    }
    if (typeof value === 'boolean') {
      return new BoolValue(value, this.TypeSystem);
    }
    if (Array.isArray(value)) {
      return new ListValue(value.map(item => this.ToTypedValue(item)), this.TypeSystem);
    }
    if (value != null && isPlainObject(value)) {
      const properties: { [name: string]: TypedValue } = {};
      for (const key of Object.keys(value)) {
        properties[key] = this.ToTypedValue(value[key]);
      }
      return new MapValue(properties, this.TypeSystem);
    }
    return new AnyValue(value, this.TypeSystem);
  }

  public FromTypedValue(value: TypedValue): any {
    if (value instanceof IntValue || value instanceof StringValue || value instanceof BoolValue || value instanceof AnyValue) {
      return value.Value;
    }
    if (value instanceof ListValue) {
      return value.Elements.map(item => this.FromTypedValue(item));
    }
    if (value instanceof MapValue) {
      const result: { [name: string]: any } = {};
      for (const key of Object.keys(value.Properties)) {
        result[key] = this.FromTypedValue(value.Properties[key]);
      }
      return result;
    }
    return value;
  }

  private CreateFieldStorage(cls: ClassTypeSymbol): { [name: string]: FieldStorage[] } {
    const fields: { [name: string]: FieldStorage[] } = {};
    for (const member of cls.Rows.Members) {
      if (!member.IsField) {
        continue;
      }
      fields[member.Name] = fields[member.Name] ?? [];
      fields[member.Name].push(new FieldStorage(member));
    }
    return fields;
  }

  private CreateParentStorage(cls: ClassTypeSymbol): { [className: string]: ObjectValue } {
    const parents: { [className: string]: ObjectValue } = {};
    for (const baseRef of cls.Bases) {
      if (baseRef.Inheritance === 'real') {
        parents[baseRef.Type.Name] = this.Instantiate(baseRef.Type.Name);
      }
    }
    return parents;
  }

  private RequiresVirtualOverride(cls: ClassTypeSymbol, member: RowMember): boolean {
    if (member.Origin === cls.Name) {
      return false;
    }
    const baseRef = cls.Bases.find(candidate => candidate.Type.Name === member.Origin);
    return baseRef?.Inheritance === 'virtual';
  }

  private TakeNextMethodBody(methods: { Member: RowMember; Implementation: any }[], member: RowMember, indexes: Map<string, number>): { Member: RowMember; Implementation: any } {
    const key = `${member.Origin}::${member.Name}`;
    const start = indexes.get(key) ?? 0;
    for (let i = start; i < methods.length; i++) {
      const method = methods[i];
      if (method.Member.Origin === member.Origin && method.Member.Name === member.Name) {
        indexes.set(key, i + 1);
        return method;
      }
    }
    indexes.set(key, methods.length);
    return null;
  }

  private FindInheritedMethodTarget(cls: ClassTypeSymbol, member: RowMember): RowImplementation {
    for (const candidate of cls.MethodResolutionOrder.slice(1)) {
      if (candidate.IsTrait) {
        continue;
      }
      const definition = this.TypeSystem.RequireClass(candidate.Name);
      const method = definition.Methods.find(body =>
        body.Member.Name === member.Name && body.Member.Origin === candidate.Name);
      if (method == null) {
        continue;
      }
      return new RowImplementation(
        method.Member,
        new FunctionValue(this.RequireFunctionSignature(method.Member), (context, args) => method.Implementation(context, args)),
      );
    }
    return null;
  }

  private InvokeTraitMember(instance: ObjectValue, traitType: ClassTypeSymbol, memberName: string, args: TypedValue[]): TypedValue {
    this.EnsureProjectionExposesMethod(traitType, memberName);
    const implementations = instance.Rows[memberName];
    if (implementations == null || implementations.length === 0) {
      throw new Error(`Member '${memberName}' does not exist on ${instance.Class.Name}.`);
    }
    const implementation = implementations[0];
    this.EnsureEffectsAllowed(implementation.Function.Signature);
    return implementation.Function.Body(new InvocationContext(this, instance), args);
  }

  private InvokeObject(instance: ObjectValue, memberName: string, origin: string, args: TypedValue[]): TypedValue {
    const implementations = instance.Rows[memberName];
    if (implementations == null || implementations.length === 0) {
      throw new Error(`Member '${memberName}' does not exist on ${instance.Class.Name}.`);
    }
    const originSpecified = origin != null;
    for (const implementation of this.SelectImplementationsForActiveEffectContext(implementations)) {
      if (originSpecified && implementation.Member.Origin !== origin) {
        continue;
      }
      if (!this.IsAccessible(implementation.Member, instance.Class, originSpecified)) {
        if (originSpecified && implementation.Member.Origin === origin) {
          throw new Error(`Member '${memberName}' from ${implementation.Member.Origin} is not accessible.`);
        }
        continue;
      }
      if (implementation.Member.IsVirtual) {
        if (originSpecified) {
          throw new Error(`Member '${memberName}' from ${implementation.Member.Origin} is declared virtual and cannot be invoked.`);
        }
        continue;
      }
      this.EnsureEffectsAllowed(implementation.Function.Signature);
      return implementation.Function.Body(new InvocationContext(this, instance), args);
    }
    if (!originSpecified && implementations.some(implementation => implementation.Member.IsVirtual)) {
      throw new Error(`Member '${memberName}' requires an override but none was provided.`);
    }
    if (originSpecified) {
      const fallback = this.FindMethodImplementationByOrigin(instance.Class, origin, memberName);
      if (fallback != null) {
        this.EnsureEffectsAllowed(fallback.Function.Signature);
        return fallback.Function.Body(new InvocationContext(this, instance), args);
      }
    }
    throw new Error(`No matching member '${memberName}' found for origin '${origin ?? '<default>'}'.`);
  }

  private FindMethodImplementationByOrigin(cls: ClassTypeSymbol, origin: string, memberName: string): RowImplementation {
    if (!cls.MethodResolutionOrder.some(type => type.Name === origin)) {
      return null;
    }
    const definition = this.TypeSystem.RequireClass(origin);
    const method = definition.Methods.find(body =>
      body.Member.Origin === origin && body.Member.Name === memberName);
    if (method == null) {
      return null;
    }
    return new RowImplementation(
      method.Member,
      new FunctionValue(this.RequireFunctionSignature(method.Member), (context, args) => method.Implementation(context, args)),
    );
  }

  private ReadFieldFromObject(instance: ObjectValue, memberName: string, origin: string): TypedValue {
    const storage = this.ResolveFieldStorage(instance, memberName, origin);
    if (storage.Value == null) {
      throw new Error(`Field '${memberName}' from ${storage.Member.Origin} has not been initialized.`);
    }
    return storage.Value;
  }

  private WriteFieldToObject(instance: ObjectValue, memberName: string, value: TypedValue, origin: string): void {
    const storage = this.ResolveFieldStorage(instance, memberName, origin);
    storage.Value = value;
  }

  private ResolveFieldStorage(instance: ObjectValue, memberName: string, origin: string): FieldStorage {
    const fields = instance.Fields[memberName];
    if (fields == null || fields.length === 0) {
      throw new Error(`Field '${memberName}' does not exist on ${instance.Class.Name}.`);
    }
    const originSpecified = origin != null;
    for (const field of fields) {
      if (originSpecified && field.Member.Origin !== origin) {
        continue;
      }
      if (!this.IsAccessible(field.Member, instance.Class, originSpecified)) {
        if (originSpecified && field.Member.Origin === origin) {
          throw new Error(`Field '${memberName}' from ${field.Member.Origin} is not accessible.`);
        }
        continue;
      }
      return field;
    }
    throw new Error(`No matching field '${memberName}' found for origin '${origin ?? '<default>'}'.`);
  }

  private EnsureProjectionExposesField(targetType: ClassTypeSymbol, memberName: string): void {
    if (targetType.Rows.Members.some(member => member.IsField && member.Name === memberName)) {
      return;
    }
    throw new Error(`Field '${memberName}' is not exposed by projected view ${targetType.Name}.`);
  }

  private EnsureProjectionExposesMethod(targetType: ClassTypeSymbol, memberName: string): void {
    if (targetType.Rows.Members.some(member => member.IsMethod && member.Name === memberName)) {
      return;
    }
    throw new Error(`Member '${memberName}' is not exposed by projected view ${targetType.Name}.`);
  }

  private SelectImplementationsForActiveEffectContext(implementations: RowImplementation[]): RowImplementation[] {
    if (implementations.every(implementation => implementation.Member.EffectContext == null)) {
      return implementations;
    }
    const active = this.GetAllowedEffects();
    if (active.IsEmpty) {
      return implementations;
    }
    const contextual = implementations.filter(implementation =>
      implementation.Member.EffectContext == null || implementation.Member.EffectContext.IsSubsetOf(active));
    return contextual.length === 0 ? implementations : contextual;
  }

  private GetAllowedEffects(): EffectRow {
    return this.effectScopes.reduce((current, scope) => current.Union(scope), EffectRow.EmptyClosed);
  }

  private EnsureEffectsAllowed(signature: FunctionTypeSymbol): void {
    if (signature.EffectRow.IsEmpty) {
      return;
    }
    const active = this.GetAllowedEffects();
    if (!signature.EffectRow.IsSubsetOf(active)) {
      throw new Error(`Effect '${signature.EffectRow.ToDisplayString()}' required by '${signature.Name}' is not permitted in the current scope.`);
    }
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
    return this.TypeSystem.IsSubtype(candidate, this.TypeSystem.RequireClassSymbol(ancestorName));
  }

  private RequireFunctionSignature(member: RowMember): FunctionTypeSymbol {
    if (!(member.Type instanceof FunctionTypeSymbol)) {
      throw new Error(`Member ${member.Origin}::${member.Name} must be a method.`);
    }
    return member.Type;
  }
}

function resolveRuntimeTypeSystem(typeSystem?: TypeSystem): TypeSystem {
  return typeSystem ?? KonTypedExecutionContext.GetRuntimeTypeSystem();
}

function splitOriginOverloadArgs(args: TypedValue[]): { origin?: string; values: TypedValue[] } {
  if (typeof (args as any[])[0] === 'string') {
    return {
      origin: (args as any[])[0],
      values: (args as any[]).slice(1) as TypedValue[],
    };
  }
  return { values: args };
}

function isPlainObject(value: any): value is { [name: string]: any } {
  if (value == null || typeof value !== 'object') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype == null;
}
