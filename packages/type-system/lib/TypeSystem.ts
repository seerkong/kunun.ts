import {
  AccessModifier,
  BaseTypeReference,
  BrandedScalarTypeSymbol,
  ClassDefinition,
  ClassTypeSymbol,
  EnumTypeSymbol,
  EnumValueInput,
  FunctionTypeSymbol,
  GenericRowTypeSymbol,
  InheritanceKind,
  RelationTypeSymbol,
  MethodBody,
  RowMember,
  RowTypeSymbol,
  SchemaMixinSymbol,
  SchemaTypeSymbol,
  TypeParameter,
  TypeSymbol,
} from './Types';
import { TypeRegistry } from './TypeRegistry';
import { KonTypeComputationRuntime } from './KonTypeComputationRuntime';

export interface BaseTypeInput {
  Name: string;
  Inheritance?: InheritanceKind;
  Access?: AccessModifier;
}

export class TypeSystem {
  private readonly classes = new Map<string, ClassDefinition>();
  private readonly enums = new Map<string, EnumTypeSymbol>();
  private readonly brandedScalars = new Map<string, BrandedScalarTypeSymbol>();
  private readonly schemaMixins = new Map<string, SchemaMixinSymbol>();
  private readonly schemaTypes = new Map<string, SchemaTypeSymbol>();
  private readonly relations = new Map<string, RelationTypeSymbol>();
  private readonly schemaTypeAliases = new Map<string, string>();
  private readonly relationAliases = new Map<string, string>();
  private readonly attributeAliases = new Map<string, Map<string, string>>();
  private readonly computationRuntime: KonTypeComputationRuntime;
  public readonly Registry = new TypeRegistry();

  public constructor(computationRuntime: KonTypeComputationRuntime = new KonTypeComputationRuntime()) {
    this.computationRuntime = computationRuntime;
    this.DefineClass('object', [], true, [], [], false);
  }

  public get TypeComputationRuntime(): KonTypeComputationRuntime {
    return this.computationRuntime;
  }

  public DefineRowType(name: string, members: RowMember[], isOpen: boolean): RowTypeSymbol {
    return this.computationRuntime.defineRowType(this, name, members, isOpen);
  }

  public defineRowTypeDirect(name: string, members: RowMember[], isOpen: boolean): RowTypeSymbol {
    const row = new RowTypeSymbol(name, members, isOpen);
    this.Registry.Register(row);
    return row;
  }

  public DefineGenericRowType(
    name: string,
    typeParameters: { Name: string; IsRowParameter?: boolean }[],
    members: RowMember[],
    isOpen: boolean,
  ): GenericRowTypeSymbol {
    return this.computationRuntime.defineGenericRowType(this, name, typeParameters, members, isOpen);
  }

  public defineGenericRowTypeDirect(
    name: string,
    typeParameters: { Name: string; IsRowParameter?: boolean }[],
    members: RowMember[],
    isOpen: boolean,
  ): GenericRowTypeSymbol {
    const generic = new GenericRowTypeSymbol(name, typeParameters, members, isOpen);
    this.Registry.Register(generic);
    return generic;
  }

  public InstantiateGenericRowType(genericType: GenericRowTypeSymbol, ...typeArguments: TypeSymbol[]): RowTypeSymbol {
    return this.computationRuntime.instantiateGenericRowType(this, genericType, typeArguments);
  }

  public instantiateGenericRowTypeDirect(genericType: GenericRowTypeSymbol, ...typeArguments: TypeSymbol[]): RowTypeSymbol {
    const row = genericType.Instantiate(typeArguments) as RowTypeSymbol;
    this.Registry.Register(row);
    return row;
  }

  public DefineClass(
    name: string,
    members: RowMember[],
    isOpen: boolean,
    bases: BaseTypeInput[],
    methodBodies: any[] = [],
    isTrait: boolean = false,
    typeParameters: TypeParameter[] = [],
  ): ClassDefinition {
    return this.computationRuntime.defineClass(this, name, members, isOpen, bases, methodBodies, isTrait, typeParameters);
  }

  public defineClassDirect(
    name: string,
    members: RowMember[],
    isOpen: boolean,
    bases: BaseTypeInput[],
    methodBodies: any[] = [],
    isTrait: boolean = false,
    typeParameters: TypeParameter[] = [],
  ): ClassDefinition {
    const declared = new RowTypeSymbol(`${name}.decl`, members, isOpen);
    const typedMethodBodies = methodBodies as MethodBody[];
    const baseRefs: BaseTypeReference[] = [];
    const implementedTraits: ClassTypeSymbol[] = [];

    for (const entry of bases) {
      const base = this.classes.get(entry.Name)?.Type;
      if (base == null) {
        throw new Error(`Base type '${entry.Name}' is not defined.`);
      }
      if (base.IsTrait && !isTrait) {
        implementedTraits.push(base);
      } else {
        baseRefs.push({
          Type: base,
          Inheritance: entry.Inheritance ?? InheritanceKind.Real,
          Access: entry.Access ?? AccessModifier.Public,
        });
      }
    }

    if (!isTrait && baseRefs.length === 0 && name !== 'object') {
      const object = this.classes.get('object')?.Type;
      if (object != null) {
        baseRefs.push({ Type: object, Inheritance: InheritanceKind.Real, Access: AccessModifier.Public });
      }
    }

    const cls = new ClassTypeSymbol(name, declared, baseRefs, implementedTraits, isTrait, typeParameters);
    const definition = new ClassDefinition(cls, typedMethodBodies);
    this.classes.set(name, definition);
    this.Registry.Register(cls);
    this.Registry.RegisterLazy(`${name}.rows`, () => cls.Rows);
    return definition;
  }

  public InstantiateGenericClass(classType: ClassTypeSymbol, ...typeArguments: TypeSymbol[]): ClassTypeSymbol {
    return this.computationRuntime.instantiateGenericClass(this, classType, typeArguments);
  }

  public instantiateGenericClassDirect(classType: ClassTypeSymbol, ...typeArguments: TypeSymbol[]): ClassTypeSymbol {
    const instance = classType.Instantiate(typeArguments);
    this.Registry.Register(instance);
    this.Registry.RegisterLazy(`${instance.Name}.rows`, () => instance.Rows);
    return instance;
  }

  public RequireClassSymbol(name: string): ClassTypeSymbol {
    return this.RequireClass(name).Type;
  }

  public RequireClass(name: string): ClassDefinition {
    const definition = this.classes.get(name);
    if (definition == null) {
      throw new Error(`Class '${name}' is not registered.`);
    }
    return definition;
  }

  public DefineEnum(
    name: string,
    values: Array<string | EnumValueInput>,
    options: { Representation?: TypeSymbol; Metadata?: { [key: string]: any } } = {},
  ): EnumTypeSymbol {
    return this.computationRuntime.defineEnum(this, name, values, options);
  }

  public defineEnumDirect(
    name: string,
    values: Array<string | EnumValueInput>,
    options: { Representation?: TypeSymbol; Metadata?: { [key: string]: any } } = {},
  ): EnumTypeSymbol {
    if (this.enums.has(name)) {
      throw new Error(`Enum '${name}' is already registered.`);
    }
    const enumType = new EnumTypeSymbol(name, options.Representation ?? this.Registry.String, options.Metadata ?? {});
    const seen = new Set<string>();
    const seenCodes = new Set<any>();
    for (const item of values) {
      const input = typeof item === 'string' ? { Name: item } : item;
      if (seen.has(input.Name)) {
        throw new Error(`Enum '${name}' contains duplicate value '${input.Name}'.`);
      }
      seen.add(input.Name);
      if (input.Code != null) {
        if (seenCodes.has(input.Code)) {
          throw new Error(`Enum '${name}' contains duplicate code '${input.Code}'.`);
        }
        seenCodes.add(input.Code);
      }
      enumType.AddValue(input.Name, input.Code, input.Metadata);
    }
    this.enums.set(name, enumType);
    this.Registry.Register(enumType);
    for (const value of enumType.Values) {
      this.Registry.Register(value);
    }
    return enumType;
  }

  public RequireEnum(name: string): EnumTypeSymbol {
    const symbol = this.enums.get(name) ?? this.Registry.TryGet(name);
    if (symbol instanceof EnumTypeSymbol) {
      return symbol;
    }
    throw new Error(`Enum '${name}' is not registered.`);
  }

  public DefineBrandedScalar(
    name: string,
    representation: TypeSymbol = this.Registry.String,
    metadata: { [key: string]: any } = {},
  ): BrandedScalarTypeSymbol {
    if (this.brandedScalars.has(name)) {
      throw new Error(`Branded scalar '${name}' is already registered.`);
    }
    const scalar = new BrandedScalarTypeSymbol(name, representation, metadata);
    this.brandedScalars.set(name, scalar);
    this.Registry.Register(scalar);
    return scalar;
  }

  public RequireBrandedScalar(name: string): BrandedScalarTypeSymbol {
    const scalar = this.brandedScalars.get(name) ?? this.Registry.TryGet(name);
    if (scalar instanceof BrandedScalarTypeSymbol) {
      return scalar;
    }
    throw new Error(`Branded scalar '${name}' is not registered.`);
  }

  public DefineSchemaMixin(
    name: string,
    members: RowMember[],
    isOpen: boolean = true,
    metadata: { [key: string]: any } = {},
  ): SchemaMixinSymbol {
    if (this.schemaMixins.has(name)) {
      throw new Error(`Schema mixin '${name}' is already registered.`);
    }
    const row = new RowTypeSymbol(`${name}.mixin`, members, isOpen);
    const mixin = new SchemaMixinSymbol(name, row, metadata);
    this.schemaMixins.set(name, mixin);
    this.Registry.Register(mixin);
    this.Registry.Register(row);
    return mixin;
  }

  public RequireSchemaMixin(name: string): SchemaMixinSymbol {
    const mixin = this.schemaMixins.get(name);
    if (mixin == null) {
      throw new Error(`Schema mixin '${name}' is not registered.`);
    }
    return mixin;
  }

  public DefineSchemaType(
    name: string,
    members: RowMember[],
    options: {
      IsOpen?: boolean;
      Parent?: string | SchemaTypeSymbol;
      Mixins?: Array<string | SchemaMixinSymbol>;
      Metadata?: { [key: string]: any };
    } = {},
  ): SchemaTypeSymbol {
    if (this.schemaTypes.has(name)) {
      throw new Error(`Schema type '${name}' is already registered.`);
    }
    const parent = typeof options.Parent === 'string'
      ? this.RequireSchemaType(options.Parent)
      : options.Parent;
    const mixins = (options.Mixins ?? []).map(mixin =>
      typeof mixin === 'string' ? this.RequireSchemaMixin(mixin) : mixin);
    const declared = new RowTypeSymbol(`${name}.schema.decl`, members, options.IsOpen ?? true);
    const effective = this.BuildSchemaEffectiveRow(name, declared, parent, mixins);
    const schema = new SchemaTypeSymbol(name, declared, effective, parent, mixins, options.Metadata ?? {});
    this.schemaTypes.set(name, schema);
    this.Registry.Register(schema);
    this.Registry.RegisterLazy(`${name}.schema.rows`, () => schema.EffectiveRow);
    return schema;
  }

  public RequireSchemaType(name: string): SchemaTypeSymbol {
    const canonical = this.ResolveSchemaTypeName(name);
    const schema = this.schemaTypes.get(canonical);
    if (schema == null) {
      throw new Error(`Schema type '${name}' is not registered.`);
    }
    return schema;
  }

  public IsSchemaSubtype(candidate: SchemaTypeSymbol, target: SchemaTypeSymbol): boolean {
    let current: SchemaTypeSymbol = candidate;
    while (current != null) {
      if (current === target || current.Name === target.Name) {
        return true;
      }
      current = current.Parent;
    }
    return false;
  }

  public DefineRelation(
    name: string,
    from: string | SchemaTypeSymbol,
    to: string | SchemaTypeSymbol,
    directed: boolean = true,
    metadata: { [key: string]: any } = {},
  ): RelationTypeSymbol {
    if (this.relations.has(name)) {
      throw new Error(`Relation '${name}' is already registered.`);
    }
    const relation = new RelationTypeSymbol(
      name,
      typeof from === 'string' ? this.RequireSchemaType(from) : from,
      typeof to === 'string' ? this.RequireSchemaType(to) : to,
      directed,
      metadata,
    );
    this.relations.set(name, relation);
    this.Registry.Register(relation);
    return relation;
  }

  public RequireRelation(name: string): RelationTypeSymbol {
    const canonical = this.ResolveRelationName(name);
    const relation = this.relations.get(canonical);
    if (relation == null) {
      throw new Error(`Relation '${name}' is not registered.`);
    }
    return relation;
  }

  public CheckRelationEndpoints(relation: RelationTypeSymbol, from: SchemaTypeSymbol, to: SchemaTypeSymbol): boolean {
    const forward = this.IsSchemaSubtype(from, relation.From) && this.IsSchemaSubtype(to, relation.To);
    if (relation.Directed || forward) {
      return forward;
    }
    return this.IsSchemaSubtype(from, relation.To) && this.IsSchemaSubtype(to, relation.From);
  }

  public GetSchemaTypeSet(type: string | SchemaTypeSymbol, options: { exact?: boolean } = {}): SchemaTypeSymbol[] {
    const root = typeof type === 'string' ? this.RequireSchemaType(type) : type;
    if (options.exact) {
      return [root];
    }
    return Array.from(this.schemaTypes.values()).filter(candidate => this.IsSchemaSubtype(candidate, root));
  }

  public DefineSchemaTypeAlias(alias: string, canonical: string): void {
    this.schemaTypeAliases.set(alias, canonical);
    this.ResolveAlias(alias, this.schemaTypeAliases, 'schema type');
  }

  public DefineRelationAlias(alias: string, canonical: string): void {
    this.relationAliases.set(alias, canonical);
    this.ResolveAlias(alias, this.relationAliases, 'relation');
  }

  public DefineAttributeAlias(typeName: string, alias: string, canonical: string): void {
    const type = this.ResolveSchemaTypeName(typeName);
    const aliases = this.attributeAliases.get(type) ?? new Map<string, string>();
    aliases.set(alias, canonical);
    this.attributeAliases.set(type, aliases);
    this.ResolveAlias(alias, aliases, `attribute for ${type}`);
  }

  public ResolveSchemaTypeName(name: string): string {
    return this.ResolveAlias(name, this.schemaTypeAliases, 'schema type');
  }

  public ResolveRelationName(name: string): string {
    return this.ResolveAlias(name, this.relationAliases, 'relation');
  }

  public ResolveAttributeName(typeName: string, name: string): string {
    let current: SchemaTypeSymbol = this.RequireSchemaType(typeName);
    while (current != null) {
      const aliases = this.attributeAliases.get(current.Name);
      if (aliases?.has(name)) {
        return this.ResolveAlias(name, aliases, `attribute for ${current.Name}`);
      }
      current = current.Parent;
    }
    return name;
  }

  private BuildSchemaEffectiveRow(
    name: string,
    declared: RowTypeSymbol,
    parent?: SchemaTypeSymbol,
    mixins: SchemaMixinSymbol[] = [],
  ): RowTypeSymbol {
    const members: RowMember[] = [];
    for (const mixin of mixins) {
      members.push(...mixin.Row.Members);
    }
    const ancestors: SchemaTypeSymbol[] = [];
    let current = parent;
    while (current != null) {
      ancestors.unshift(current);
      current = current.Parent;
    }
    for (const ancestor of ancestors) {
      members.push(...ancestor.DeclaredRow.Members);
    }
    for (const member of declared.Members) {
      const inherited = members.find(candidate => candidate.Name === member.Name);
      if (inherited != null && !this.AreTypesCompatible(member.Type, inherited.Type)) {
        throw new Error(`Schema member '${member.Name}' in '${name}' cannot change inherited type '${inherited.Type.Name}' to '${member.Type.Name}'.`);
      }
      members.push(member);
    }
    return new RowTypeSymbol(`${name}.schema.rows`, members, declared.IsOpen || mixins.some(mixin => mixin.Row.IsOpen) || ancestors.some(ancestor => ancestor.EffectiveRow.IsOpen));
  }

  private ResolveAlias(name: string, aliases: Map<string, string>, kind: string): string {
    const seen = new Set<string>();
    let current = name;
    while (aliases.has(current)) {
      if (seen.has(current)) {
        throw new Error(`Alias cycle detected for ${kind} '${name}'.`);
      }
      seen.add(current);
      current = aliases.get(current);
    }
    return current;
  }

  public MergeRows(resultName: string, ...rows: RowTypeSymbol[]): RowTypeSymbol {
    return this.computationRuntime.mergeRows(this, resultName, rows);
  }

  public mergeRowsDirect(resultName: string, ...rows: RowTypeSymbol[]): RowTypeSymbol {
    if (rows.length === 0) {
      throw new Error('At least one row type is required.');
    }
    let merged = rows[0];
    for (let i = 1; i < rows.length; i++) {
      merged = merged.Append(rows[i]);
    }
    return new RowTypeSymbol(resultName, merged.Members, merged.IsOpen);
  }

  public IsSubtype(candidate: RowTypeSymbol | ClassTypeSymbol, target: RowTypeSymbol | ClassTypeSymbol): boolean {
    return this.computationRuntime.isSubtype(this, candidate, target);
  }

  public isSubtypeDirect(candidate: RowTypeSymbol | ClassTypeSymbol, target: RowTypeSymbol | ClassTypeSymbol): boolean {
    const candidateRows = candidate instanceof ClassTypeSymbol ? candidate.Rows : candidate;
    const targetRows = target instanceof ClassTypeSymbol ? target.Rows : target;
    const remaining = candidateRows.Members.filter(member => !member.IsVirtual);

    for (const required of targetRows.Members) {
      const index = remaining.findIndex(candidateMember =>
        candidateMember.Name === required.Name
        && this.MemberTypesAreCompatible(candidateMember, required));
      if (index < 0) {
        return false;
      }
      remaining.splice(index, 1);
    }

    return targetRows.IsOpen || remaining.length === 0;
  }

  private MemberTypesAreCompatible(candidate: RowMember, required: RowMember): boolean {
    if (this.areTypesCompatibleDirect(candidate.Type, required.Type)) {
      return true;
    }

    if (!candidate.IsMethod
      && required.IsMethod
      && required.Type instanceof FunctionTypeSymbol
      && required.Type.Parameters.length === 0
      && required.Type.Outputs.length === 1) {
      return this.areTypesCompatibleDirect(candidate.Type, required.Type.ReturnType);
    }
    return false;
  }

  public AreTypesCompatible(candidate: TypeSymbol, required: TypeSymbol): boolean {
    return this.computationRuntime.areTypesCompatible(this, candidate, required);
  }

  public areTypesCompatibleDirect(candidate: TypeSymbol, required: TypeSymbol): boolean {
    if (candidate === required || candidate.Name === required.Name) {
      return true;
    }
    if ((candidate as any).Owner instanceof EnumTypeSymbol && required instanceof EnumTypeSymbol) {
      return (candidate as any).Owner.Name === required.Name;
    }
    if (candidate instanceof BrandedScalarTypeSymbol || required instanceof BrandedScalarTypeSymbol) {
      return false;
    }
    if (candidate instanceof SchemaTypeSymbol && required instanceof SchemaTypeSymbol) {
      return this.IsSchemaSubtype(candidate, required);
    }
    if (candidate instanceof FunctionTypeSymbol && required instanceof FunctionTypeSymbol) {
      if (candidate.Parameters.length !== required.Parameters.length || candidate.Outputs.length !== required.Outputs.length) {
        return false;
      }
      for (let i = 0; i < candidate.Parameters.length; i++) {
        if (!this.areTypesCompatibleDirect(candidate.Parameters[i], required.Parameters[i])) {
          return false;
        }
      }
      for (let i = 0; i < candidate.Outputs.length; i++) {
        if (!this.areTypesCompatibleDirect(candidate.Outputs[i], required.Outputs[i])) {
          return false;
        }
      }
      return candidate.EffectRow.IsSubsetOf(required.EffectRow);
    }
    if (candidate instanceof RowTypeSymbol && required instanceof RowTypeSymbol) {
      return this.isSubtypeDirect(candidate, required);
    }
    if (candidate instanceof ClassTypeSymbol && required instanceof ClassTypeSymbol) {
      return this.isSubtypeDirect(candidate, required);
    }
    return false;
  }
}
