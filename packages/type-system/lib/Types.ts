import { TypeSystem } from './TypeSystem';

export interface TypeSymbol {
  Name: string;
}

export type MethodImplementation = (context: any, args: any[]) => any;

export class PrimitiveTypeSymbol implements TypeSymbol {
  public constructor(public readonly Name: string) {}
}

export interface TypeMetadata {
  [key: string]: any;
}

export class AnyTypeSymbol implements TypeSymbol {
  public readonly Name = 'any';
}

export class NeverTypeSymbol implements TypeSymbol {
  public readonly Name = 'never';
}

export class TypeReferenceSymbol implements TypeSymbol {
  public readonly Name: string;

  public constructor(
    public readonly BaseName: string,
    public readonly TypeArguments: TypeSymbol[] = [],
  ) {
    this.Name = TypeArguments.length === 0
      ? BaseName
      : `${BaseName}<${TypeArguments.map(type => type.Name).join(' ')}>`;
  }
}

export class FunctionTypeSymbol implements TypeSymbol {
  public readonly EffectRow: EffectRow;

  public constructor(
    public readonly Name: string,
    public readonly Parameters: TypeSymbol[],
    public readonly Outputs: TypeSymbol[],
    effectRow?: EffectRow,
  ) {
    this.EffectRow = effectRow ?? EffectRow.EmptyClosed;
  }

  public get ReturnType(): TypeSymbol {
    return this.Outputs.length === 0 ? new NeverTypeSymbol() : this.Outputs[this.Outputs.length - 1];
  }

  public get Effects(): EffectSymbol[] {
    return this.EffectRow.Effects;
  }
}

export class MethodBody {
  public constructor(
    public readonly Member: RowMember,
    public readonly Implementation: MethodImplementation,
  ) {}
}

export class MethodBuilder {
  public static FromFunction(member: RowMember, implementation: MethodImplementation): MethodBody {
    return new MethodBody(member, implementation);
  }

  public static FromLambda(
    owner: string,
    name: string,
    signature: FunctionTypeSymbol,
    implementation: MethodImplementation,
    qualifier: RowQualifier = RowQualifier.Default,
    access: AccessModifier = AccessModifier.Public,
  ): MethodBody {
    return new MethodBody(RowMemberBuilder.Method(owner, name, signature, qualifier, access), implementation);
  }
}

export class GenericFunctionTypeSymbol implements TypeSymbol {
  public constructor(
    public readonly Name: string,
    public readonly TypeParameters: TypeParameter[],
    public readonly Signature: FunctionTypeSymbol,
  ) {}
}

export class EffectSymbol implements TypeSymbol {
  public constructor(public readonly Name: string) {}
}

export class BrandedScalarTypeSymbol implements TypeSymbol {
  public constructor(
    public readonly Name: string,
    public readonly Representation: TypeSymbol,
    public readonly Metadata: TypeMetadata = {},
  ) {}
}

export interface EnumValueInput {
  Name: string;
  Code?: any;
  Metadata?: TypeMetadata;
}

export class EnumTypeSymbol implements TypeSymbol {
  public readonly Values: EnumValueSymbol[] = [];
  public readonly IsClosed = true;

  public constructor(
    public readonly Name: string,
    public readonly Representation: TypeSymbol,
    public readonly Metadata: TypeMetadata = {},
  ) {}

  public AddValue(name: string, code?: any, metadata: TypeMetadata = {}): EnumValueSymbol {
    if (this.Values.some(value => value.ValueName === name)) {
      throw new Error(`Enum '${this.Name}' already contains value '${name}'.`);
    }
    const value = new EnumValueSymbol(name, this, code, metadata);
    this.Values.push(value);
    return value;
  }

  public RequireValue(name: string): EnumValueSymbol {
    const value = this.Values.find(candidate => candidate.ValueName === name);
    if (value == null) {
      throw new Error(`Enum '${this.Name}' does not contain value '${name}'.`);
    }
    return value;
  }
}

export class EnumValueSymbol implements TypeSymbol {
  public readonly Name: string;
  public readonly QualifiedName: string;

  public constructor(
    public readonly ValueName: string,
    public readonly Owner: EnumTypeSymbol,
    public readonly Code: any = ValueName,
    public readonly Metadata: TypeMetadata = {},
  ) {
    this.QualifiedName = `${Owner.Name}.${ValueName}`;
    this.Name = this.QualifiedName;
  }
}

export interface TypeParameter extends TypeSymbol {
  IsRowParameter?: boolean;
}

export enum RowQualifier {
  Default = 'default',
  Virtual = 'virtual',
  Final = 'final',
  Override = 'override',
  Inherit = 'inherit',
}

export enum AccessModifier {
  Public = 'public',
  Protected = 'protected',
  Private = 'private',
  Internal = 'internal',
}

export class EffectRow {
  public static readonly EmptyClosed = new EffectRow([], false);

  private constructor(
    public readonly Effects: EffectSymbol[],
    public readonly IsOpen: boolean,
  ) {}

  public get IsClosed(): boolean {
    return !this.IsOpen;
  }

  public get IsEmpty(): boolean {
    return this.Effects.length === 0;
  }

  public static FromEffects(effects: EffectSymbol[], isOpen: boolean = false): EffectRow {
    const map = new Map<string, EffectSymbol>();
    for (const effect of effects) {
      if (!map.has(effect.Name)) {
        map.set(effect.Name, effect);
      }
    }
    const distinct = Array.from(map.values()).sort((lhs, rhs) => lhs.Name.localeCompare(rhs.Name));
    if (distinct.length === 0 && !isOpen) {
      return EffectRow.EmptyClosed;
    }
    return new EffectRow(distinct, isOpen);
  }

  public Contains(effect: EffectSymbol): boolean {
    return this.Effects.some(candidate => candidate.Name === effect.Name);
  }

  public IsSubsetOf(target: EffectRow): boolean {
    if (target.IsOpen) {
      return true;
    }
    return this.Effects.every(effect => target.Contains(effect));
  }

  public Subtract(handled: EffectRow): EffectRow {
    return EffectRow.FromEffects(
      this.Effects.filter(effect => !handled.Contains(effect)),
      this.IsOpen,
    );
  }

  public Union(other: EffectRow): EffectRow {
    return EffectRow.FromEffects(this.Effects.concat(other.Effects), this.IsOpen || other.IsOpen);
  }

  public ToDisplayString(): string {
    const items = this.Effects.map(effect => effect.Name).join(' ');
    if (this.IsOpen) {
      return items.length === 0 ? '[..]' : `[${items} ..]`;
    }
    return `[${items}]`;
  }
}

export class RowMember {
  public readonly Access: AccessModifier;
  public readonly EffectContext?: EffectRow;

  public constructor(
    public readonly Name: string,
    public readonly Type: TypeSymbol,
    public readonly Qualifier: RowQualifier,
    public readonly Origin: string,
    public readonly IsMethod: boolean,
    options: { Access?: AccessModifier; EffectContext?: EffectRow; Metadata?: TypeMetadata } = {},
  ) {
    this.Access = options.Access ?? AccessModifier.Public;
    this.EffectContext = options.EffectContext;
    this.Metadata = options.Metadata ?? {};
  }

  public readonly Metadata: TypeMetadata;

  public get IsVirtual(): boolean {
    return this.Qualifier === RowQualifier.Virtual;
  }

  public get IsFinal(): boolean {
    return this.Qualifier === RowQualifier.Final;
  }

  public get IsOverride(): boolean {
    return this.Qualifier === RowQualifier.Override;
  }

  public get IsInherit(): boolean {
    return this.Qualifier === RowQualifier.Inherit;
  }

  public get ShouldForward(): boolean {
    return this.Qualifier === RowQualifier.Default
      || this.Qualifier === RowQualifier.Inherit
      || this.Qualifier === RowQualifier.Override;
  }

  public get IsSpreadParameter(): boolean {
    return this.Name.startsWith('..');
  }

  public get EffectContextKey(): string {
    return this.EffectContext?.ToDisplayString() ?? '';
  }

  public WithEffectContext(effectContext: EffectRow): RowMember {
    return new RowMember(this.Name, this.Type, this.Qualifier, this.Origin, this.IsMethod, {
      Access: this.Access,
      EffectContext: effectContext,
      Metadata: this.Metadata,
    });
  }

  public WithType(type: TypeSymbol): RowMember {
    return new RowMember(this.Name, type, this.Qualifier, this.Origin, this.IsMethod, {
      Access: this.Access,
      EffectContext: this.EffectContext,
      Metadata: this.Metadata,
    });
  }
}

export class RowMemberBuilder {
  public static Method(
    origin: string,
    name: string,
    type: TypeSymbol,
    qualifier: RowQualifier = RowQualifier.Default,
    access: AccessModifier = AccessModifier.Public,
    metadata: TypeMetadata = {},
  ): RowMember {
    return new RowMember(name, type, qualifier, origin, true, { Access: access, Metadata: metadata });
  }

  public static Field(
    origin: string,
    name: string,
    type: TypeSymbol,
    qualifier: RowQualifier = RowQualifier.Default,
    access: AccessModifier = AccessModifier.Public,
    metadata: TypeMetadata = {},
  ): RowMember {
    return new RowMember(name, type, qualifier, origin, false, { Access: access, Metadata: metadata });
  }

  public static Spread(origin: string, name: string, type: TypeSymbol, metadata: TypeMetadata = {}): RowMember {
    return new RowMember(`..${name}`, type, RowQualifier.Default, origin, false, { Metadata: metadata });
  }
}

export enum RowMemberResolutionStatus {
  Success = 'success',
  NotFound = 'not_found',
  Ambiguous = 'ambiguous',
}

export class RowMemberResolutionResult {
  public constructor(
    public readonly Status: RowMemberResolutionStatus,
    public readonly Member: RowMember,
    public readonly Candidates: RowMember[],
  ) {}

  public get Success(): boolean {
    return this.Status === RowMemberResolutionStatus.Success;
  }
}

export class RowTypeSymbol implements TypeSymbol {
  public constructor(
    public readonly Name: string,
    public readonly Members: RowMember[],
    public readonly IsOpen: boolean,
  ) {}

  public Resolve(name: string, origin?: string): RowMember {
    for (const member of this.Members) {
      if (member.Name === name && (origin == null || member.Origin === origin)) {
        if (member.IsVirtual) {
          throw new Error(`Member '${name}' declared virtual in ${member.Origin} requires an override.`);
        }
        return member;
      }
    }
    return null;
  }

  public ResolveWithEffectContext(name: string, activeEffectContext: EffectRow): RowMemberResolutionResult {
    const candidates = this.EnumerateByName(name)
      .filter(member => !member.IsVirtual)
      .filter(member => member.EffectContext == null || member.EffectContext.IsSubsetOf(activeEffectContext));

    if (candidates.length === 0) {
      return new RowMemberResolutionResult(RowMemberResolutionStatus.NotFound, null, candidates);
    }
    if (candidates.length === 1) {
      return new RowMemberResolutionResult(RowMemberResolutionStatus.Success, candidates[0], candidates);
    }
    return new RowMemberResolutionResult(RowMemberResolutionStatus.Ambiguous, null, candidates);
  }

  public Append(other: RowTypeSymbol): RowTypeSymbol {
    return new RowTypeSymbol(`${this.Name}&${other.Name}`, this.Members.concat(other.Members), this.IsOpen || other.IsOpen);
  }

  public EnumerateByName(name: string): RowMember[] {
    return this.Members.filter(member => member.Name === name);
  }
}

export class SchemaMixinSymbol implements TypeSymbol {
  public constructor(
    public readonly Name: string,
    public readonly Row: RowTypeSymbol,
    public readonly Metadata: TypeMetadata = {},
  ) {}
}

export class SchemaTypeSymbol implements TypeSymbol {
  public constructor(
    public readonly Name: string,
    public readonly DeclaredRow: RowTypeSymbol,
    public readonly EffectiveRow: RowTypeSymbol,
    public readonly Parent?: SchemaTypeSymbol,
    public readonly Mixins: SchemaMixinSymbol[] = [],
    public readonly Metadata: TypeMetadata = {},
  ) {}
}

export class RelationTypeSymbol implements TypeSymbol {
  public constructor(
    public readonly Name: string,
    public readonly From: SchemaTypeSymbol,
    public readonly To: SchemaTypeSymbol,
    public readonly Directed: boolean = true,
    public readonly Metadata: TypeMetadata = {},
  ) {}
}

export abstract class GenericTypeSymbol implements TypeSymbol {
  public constructor(
    public readonly Name: string,
    public readonly TypeParameters: TypeParameter[],
  ) {}

  protected ValidateTypeArguments(typeArguments: TypeSymbol[]): void {
    if (typeArguments.length !== this.TypeParameters.length) {
      throw new Error(`Generic type '${this.Name}' expects ${this.TypeParameters.length} type arguments, got ${typeArguments.length}.`);
    }
  }

  public abstract Instantiate(typeArguments: TypeSymbol[]): TypeSymbol;
}

export class GenericRowTypeSymbol extends GenericTypeSymbol {
  public constructor(
    name: string,
    typeParameters: TypeParameter[],
    public readonly Members: RowMember[],
    public readonly IsOpen: boolean,
  ) {
    super(name, typeParameters);
  }

  public Instantiate(typeArguments: TypeSymbol[]): TypeSymbol {
    this.ValidateTypeArguments(typeArguments);
    const substitutions = new Map<string, TypeSymbol>();
    for (let i = 0; i < this.TypeParameters.length; i++) {
      const parameter = this.TypeParameters[i];
      const argument = typeArguments[i];
      if (parameter.IsRowParameter && !(argument instanceof RowTypeSymbol)) {
        throw new Error(`Type argument '${argument.Name}' for parameter '${parameter.Name}' must be a row type.`);
      }
      substitutions.set(parameter.Name, argument);
    }

    const members: RowMember[] = [];
    const spreadRows: RowTypeSymbol[] = [];
    for (const member of this.Members) {
      if (member.IsSpreadParameter) {
        const parameterName = member.Name.slice(2);
        const substitution = substitutions.get(parameterName);
        if (substitution instanceof RowTypeSymbol) {
          spreadRows.push(substitution);
        }
        continue;
      }
      members.push(member.WithType(substituteType(member.Type, substitutions)));
    }

    const typeArgumentNames = typeArguments.map(type => type.Name).join(',');
    const name = `${this.Name}<${typeArgumentNames}>`;
    let result = new RowTypeSymbol(name, members, this.IsOpen);
    for (const row of spreadRows) {
      result = new RowTypeSymbol(name, result.Members.concat(row.Members), result.IsOpen || row.IsOpen);
    }
    return result;
  }
}

function substituteType(type: TypeSymbol, substitutions: Map<string, TypeSymbol>): TypeSymbol {
  const replacement = substitutions.get(type.Name);
  if (replacement != null) {
    return replacement;
  }
  if (type instanceof FunctionTypeSymbol) {
    return new FunctionTypeSymbol(
      type.Name,
      type.Parameters.map(parameter => substituteType(parameter, substitutions)),
      type.Outputs.map(output => substituteType(output, substitutions)),
      type.EffectRow,
    );
  }
  if (type instanceof TypeReferenceSymbol && type.TypeArguments.length > 0) {
    return new TypeReferenceSymbol(
      type.BaseName,
      type.TypeArguments.map(argument => substituteType(argument, substitutions)),
    );
  }
  return type;
}

export enum InheritanceKind {
  Real = 'real',
  Virtual = 'virtual',
}

export interface BaseTypeReference {
  Type: ClassTypeSymbol;
  Inheritance: InheritanceKind;
  Access: AccessModifier;
}

export class ClassTypeSymbol implements TypeSymbol {
  private rowsCache?: RowTypeSymbol;
  private mroCache?: ClassTypeSymbol[];

  public constructor(
    public readonly Name: string,
    public readonly DeclaredRows: RowTypeSymbol,
    public readonly Bases: BaseTypeReference[],
    public readonly ImplementedTraits: ClassTypeSymbol[],
    public readonly IsTrait: boolean,
    public readonly TypeParameters: TypeParameter[] = [],
  ) {}

  public get MethodResolutionOrder(): ClassTypeSymbol[] {
    if (this.mroCache == null) {
      this.mroCache = computeC3Linearization(this);
    }
    return this.mroCache;
  }

  public get Rows(): RowTypeSymbol {
    if (this.rowsCache == null) {
      this.rowsCache = buildRowsForClass(this);
    }
    return this.rowsCache;
  }

  public Instantiate(typeArguments: TypeSymbol[]): ClassTypeSymbol {
    if (typeArguments.length !== this.TypeParameters.length) {
      throw new Error(`Generic class '${this.Name}' expects ${this.TypeParameters.length} type arguments, got ${typeArguments.length}.`);
    }
    const substitutions = new Map<string, TypeSymbol>();
    for (let i = 0; i < this.TypeParameters.length; i++) {
      substitutions.set(this.TypeParameters[i].Name, typeArguments[i]);
    }
    const typeArgumentNames = typeArguments.map(type => type.Name).join(',');
    const name = `${this.Name}<${typeArgumentNames}>`;
    const declaredRows = new RowTypeSymbol(
      `${name}.decl`,
      this.DeclaredRows.Members.map(member => member.WithType(substituteType(member.Type, substitutions))),
      this.DeclaredRows.IsOpen,
    );
    return new ClassTypeSymbol(name, declaredRows, this.Bases, this.ImplementedTraits, this.IsTrait);
  }
}

export class ClassDefinition implements TypeSymbol {
  public constructor(
    public readonly Type: ClassTypeSymbol,
    public readonly Methods: MethodBody[],
  ) {}

  public get Name(): string {
    return this.Type.Name;
  }

  public get DeclaredRows(): RowTypeSymbol {
    return this.Type.DeclaredRows;
  }

  public get Bases(): BaseTypeReference[] {
    return this.Type.Bases;
  }

  public get ImplementedTraits(): ClassTypeSymbol[] {
    return this.Type.ImplementedTraits;
  }

  public get IsTrait(): boolean {
    return this.Type.IsTrait;
  }

  public get MethodResolutionOrder(): ClassTypeSymbol[] {
    return this.Type.MethodResolutionOrder;
  }

  public get Rows(): RowTypeSymbol {
    return this.Type.Rows;
  }
}

export class TypeProjection implements TypeSymbol {
  public readonly Name: string;

  public constructor(
    public readonly SourceType: TypeSymbol,
    public readonly TargetType: TypeSymbol,
  ) {
    this.Name = `${SourceType.Name} as ${TargetType.Name}`;
  }

  public IsValidProjection(typeSystem: TypeSystem): boolean {
    const source = this.SourceType;
    const target = this.TargetType;
    if (source instanceof ClassTypeSymbol && target instanceof ClassTypeSymbol) {
      if (target.IsTrait) {
        return source.MethodResolutionOrder.some(candidate => candidate === target)
          || source.MethodResolutionOrder.some(candidate => candidate.ImplementedTraits.includes(target));
      }
      return typeSystem.IsSubtype(source, target)
        || source.MethodResolutionOrder.includes(target);
    }
    if (source instanceof RowTypeSymbol && target instanceof RowTypeSymbol) {
      return typeSystem.IsSubtype(source, target);
    }
    if (source instanceof ClassTypeSymbol && target instanceof RowTypeSymbol) {
      return typeSystem.IsSubtype(source.Rows, target);
    }
    if (source instanceof RowTypeSymbol && target instanceof ClassTypeSymbol) {
      return typeSystem.IsSubtype(source, target.Rows);
    }
    return false;
  }
}

function computeC3Linearization(type: ClassTypeSymbol): ClassTypeSymbol[] {
  if (type.Bases.length === 0) {
    return [type];
  }

  const sequences: ClassTypeSymbol[][] = [[type]];
  for (const baseRef of type.Bases) {
    sequences.push(baseRef.Type.MethodResolutionOrder.slice());
  }
  sequences.push(type.Bases.map(baseRef => baseRef.Type));

  const result: ClassTypeSymbol[] = [];
  while (sequences.length > 0) {
    let candidate: ClassTypeSymbol = null;
    for (const seq of sequences) {
      if (seq.length === 0) {
        continue;
      }
      const head = seq[0];
      const appearsInAnyTail = sequences.some(other => other !== seq && other.slice(1).includes(head));
      if (!appearsInAnyTail) {
        candidate = head;
        break;
      }
    }

    if (candidate == null) {
      throw new Error(`Cannot compute consistent MRO for ${type.Name}.`);
    }

    result.push(candidate);
    for (let i = sequences.length - 1; i >= 0; i--) {
      sequences[i] = sequences[i].filter(item => item !== candidate);
      if (sequences[i].length === 0) {
        sequences.splice(i, 1);
      }
    }
  }
  return result;
}

function buildRowsForClass(type: ClassTypeSymbol): RowTypeSymbol {
  const members: RowMember[] = [];
  const existing = new Set<string>();
  const blockedByVirtual = new Set<string>();
  const finalMembers = new Set<string>();
  const overridesAwaitingBase = new Set<string>();
  const inheritsAwaitingBase = new Set<string>();

  for (const ancestor of type.MethodResolutionOrder.concat(type.ImplementedTraits)) {
    for (const original of ancestor.DeclaredRows.Members) {
      const member = applyEffectiveAccess(type, original);
      const key = memberKey(member);
      if (existing.has(key)) {
        continue;
      }

      if (finalMembers.has(member.Name)) {
        if (member.IsOverride || member.IsInherit || member.Origin !== ancestor.Name) {
          throw new Error(`Cannot override final member '${member.Name}' in ${type.Name}.`);
        }
        continue;
      }

      if (member.IsVirtual) {
        blockedByVirtual.add(member.Name);
        removeExistingMembers(type, ancestor, members, existing, member.Name);
        members.push(member);
        existing.add(key);
        overridesAwaitingBase.delete(member.Name);
        continue;
      }

      if (member.IsOverride || member.IsInherit) {
        if (!blockedByVirtual.has(member.Name) && members.every(candidate => candidate.Name !== member.Name)) {
          if (member.IsOverride) {
            overridesAwaitingBase.add(member.Name);
          } else {
            inheritsAwaitingBase.add(member.Name);
          }
        } else {
          blockedByVirtual.delete(member.Name);
          overridesAwaitingBase.delete(member.Name);
          inheritsAwaitingBase.delete(member.Name);
        }
        members.push(member);
        existing.add(key);
      } else if (blockedByVirtual.has(member.Name)) {
        continue;
      } else {
        if (member.IsFinal && members.some(candidate => candidate.Name === member.Name && candidate.Origin !== member.Origin)) {
          throw new Error(`Cannot override final member '${member.Name}' in ${type.Name}.`);
        }
        members.push(member);
        existing.add(key);
        overridesAwaitingBase.delete(member.Name);
        inheritsAwaitingBase.delete(member.Name);
      }

      if (member.IsFinal) {
        finalMembers.add(member.Name);
      }
    }
  }

  if (overridesAwaitingBase.size > 0) {
    throw new Error(`Override specified without base implementation for: ${Array.from(overridesAwaitingBase).join(', ')}`);
  }
  if (inheritsAwaitingBase.size > 0) {
    throw new Error(`inherit specified without base implementation for: ${Array.from(inheritsAwaitingBase).join(', ')}`);
  }

  return new RowTypeSymbol(`${type.Name}.rows`, members, type.DeclaredRows.IsOpen);
}

function removeExistingMembers(
  targetType: ClassTypeSymbol,
  ancestor: ClassTypeSymbol,
  members: RowMember[],
  existing: Set<string>,
  name: string,
): void {
  for (let i = members.length - 1; i >= 0; i--) {
    const candidate = members[i];
    if (candidate.Name !== name) {
      continue;
    }
    const originClass = targetType.MethodResolutionOrder.find(item => item.Name === candidate.Origin);
    let keep = candidate.Origin === targetType.Name;
    if (!keep && originClass != null && originClass !== ancestor) {
      keep = originClass.MethodResolutionOrder.includes(ancestor);
    }
    if (keep && candidate.Origin !== ancestor.Name) {
      continue;
    }
    existing.delete(memberKey(candidate));
    members.splice(i, 1);
  }
}

function applyEffectiveAccess(type: ClassTypeSymbol, member: RowMember): RowMember {
  const pathAccess = computeAccessModifier(type, member.Origin);
  const effective = minAccess(member.Access, pathAccess);
  if (effective === member.Access) {
    return member;
  }
  return new RowMember(member.Name, member.Type, member.Qualifier, member.Origin, member.IsMethod, {
    Access: effective,
    EffectContext: member.EffectContext,
  });
}

function computeAccessModifier(type: ClassTypeSymbol, ancestorName: string): AccessModifier {
  if (type.Name === ancestorName) {
    return AccessModifier.Public;
  }
  return tryComputeAccess(type, ancestorName) ?? AccessModifier.Public;
}

function tryComputeAccess(type: ClassTypeSymbol, targetName: string): AccessModifier {
  for (const baseRef of type.Bases) {
    if (baseRef.Type.Name === targetName) {
      return baseRef.Access;
    }
    const downstream = tryComputeAccess(baseRef.Type, targetName);
    if (downstream != null) {
      return minAccess(baseRef.Access, downstream);
    }
  }
  return null;
}

function minAccess(first: AccessModifier, second: AccessModifier): AccessModifier {
  return accessRank(first) <= accessRank(second) ? first : second;
}

function accessRank(access: AccessModifier): number {
  switch (access) {
    case AccessModifier.Private:
      return 0;
    case AccessModifier.Protected:
      return 1;
    case AccessModifier.Internal:
      return 2;
    case AccessModifier.Public:
    default:
      return 3;
  }
}

function memberKey(member: RowMember): string {
  return `${member.Name}\u0000${member.Origin}\u0000${member.EffectContext?.ToDisplayString() ?? ''}`;
}
