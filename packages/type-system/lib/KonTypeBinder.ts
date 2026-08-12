import { KnKnot, KnotCallType } from 'kunun-core/Model/KnKnot';
import { KnQuoteWrapper } from 'kunun-core/Model/KnQuoteWrapper';
import { KnTuple } from 'kunun-core/Model/KnTuple';
import { KnWord } from 'kunun-core/Model/KnWord';
import { KnSymbol } from 'kunun-core/Model/KnSymbol';
import { KnUnorderedMap } from 'kunun-core/Model/KnUnorderedMap';
import { KnNodeType } from 'kunun-core/Model/KnNodeType';
import {
  AccessModifier,
  ClassTypeSymbol,
  EnumValueInput,
  EffectRow,
  FunctionTypeSymbol,
  GenericFunctionTypeSymbol,
  GenericRowTypeSymbol,
  InheritanceKind,
  RowMember,
  RowMemberBuilder,
  RowQualifier,
  RowTypeSymbol,
  TypeParameter,
  TypeReferenceSymbol,
  TypeSymbol,
} from './Types';
import { TypeSystem } from './TypeSystem';
import { ParseKonSourceItems } from './KonSource';

export class TypeBindingDiagnostic {
  public constructor(
    public readonly Code: string,
    public readonly Message: string,
    public readonly Location?: string,
  ) {}
}

export interface EffectHandlerBinding {
  Name: string;
  FunctionName: string;
  ImplementationFunctionName: string;
  HandledEffects: EffectRow;
}

interface PendingHandlerDeclaration {
  Name: string;
  HandledEffects: EffectRow;
}

export class TypeBindingResult {
  public constructor(
    public readonly TypeSystem: TypeSystem,
    public readonly Diagnostics: TypeBindingDiagnostic[],
    public readonly Functions: { [name: string]: FunctionTypeSymbol },
    public readonly GenericFunctions: { [name: string]: GenericFunctionTypeSymbol },
    public readonly EffectHandlers: EffectHandlerBinding[],
  ) {}

  public get Success(): boolean {
    return this.Diagnostics.length === 0;
  }

  public ApplyEffectHandler(row: EffectRow, handlerName: string): EffectRow {
    const handler = this.EffectHandlers.find(candidate => candidate.Name === handlerName);
    if (handler == null) {
      this.Diagnostics.push(new TypeBindingDiagnostic('KTB096', `Unknown effect handler '${handlerName}'.`, handlerName));
      return row;
    }
    const residual = row.Subtract(handler.HandledEffects);
    if (residual.Effects.length === row.Effects.length && residual.IsOpen === row.IsOpen) {
      this.Diagnostics.push(new TypeBindingDiagnostic('KTB097', `Effect handler '${handlerName}' does not handle any residual effects in ${row.ToDisplayString()}.`, handlerName));
    }
    return residual;
  }

  public ApplyEffectHandlers(row: EffectRow, handlerNames: string[]): EffectRow {
    return handlerNames.reduce((current, name) => this.ApplyEffectHandler(current, name), row);
  }

  public ValidateClosedEffectBoundary(functionName: string, residualEffects: EffectRow): void {
    if (!residualEffects.IsEmpty) {
      this.Diagnostics.push(new TypeBindingDiagnostic('KTB098', `Boundary '${functionName}' has unhandled residual effects ${residualEffects.ToDisplayString()}.`, functionName));
    }
  }
}

export class KonTypeBinder {
  private readonly diagnostics: TypeBindingDiagnostic[] = [];
  private readonly activeTypeParameters = new Map<string, TypeParameter>();
  private readonly functions: { [name: string]: FunctionTypeSymbol } = {};
  private readonly genericFunctions: { [name: string]: GenericFunctionTypeSymbol } = {};
  private readonly effectHandlers: EffectHandlerBinding[] = [];
  private pendingFunctionEffectRow: EffectRow = null;
  private pendingHandler: PendingHandlerDeclaration = null;

  public constructor(private readonly typeSystem: TypeSystem = new TypeSystem()) {}

  public static BindSource(source: string): TypeBindingResult {
    return new KonTypeBinder().Bind(ParseKonSourceItems(source));
  }

  public Bind(declarations: any[]): TypeBindingResult {
    for (const declaration of declarations) {
      this.BindTopLevelDeclaration(declaration);
    }
    return new TypeBindingResult(
      this.typeSystem,
      this.diagnostics.slice(),
      { ...this.functions },
      { ...this.genericFunctions },
      this.effectHandlers.slice(),
    );
  }

  private BindTopLevelDeclaration(declaration: any): void {
    if (!(declaration instanceof KnKnot)) {
      this.AddDiagnostic('KTB002', 'Top-level type-system declarations must be knot nodes.', String(declaration));
      return;
    }

    this.ReadEffectPrefixes(declaration);
    const keyword = getWord(declaration.Core);
    if (this.pendingHandler != null && keyword !== 'fn') {
      this.AddDiagnostic('KTB095', 'Effect handler declaration must be followed by a function declaration.', keyword);
      this.ClearPendingFunctionMetadata();
    }

    switch (keyword) {
      case 'type':
        this.BindTypeDeclaration(declaration);
        break;
      case 'fn':
        this.BindFunctionDeclaration(declaration);
        break;
      case 'class':
        this.BindClassDeclaration(declaration, false);
        break;
      case 'trait':
        this.BindClassDeclaration(declaration, true);
        break;
      case 'enum':
        this.BindEnumDeclaration(declaration);
        break;
      case 'scalar':
        this.BindScalarDeclaration(declaration);
        break;
      case 'mixin':
        this.BindSchemaMixinDeclaration(declaration);
        break;
      case 'schema':
        this.BindSchemaDeclaration(declaration);
        break;
      case 'relation':
        this.BindRelationDeclaration(declaration);
        break;
      case 'attr':
        this.BindTopLevelAttributeDeclaration(declaration);
        break;
      default:
        this.AddDiagnostic('KTB002', `Unsupported top-level type-system declaration '${keyword ?? '<missing>'}'.`, keyword);
        break;
    }
  }

  private BindTypeDeclaration(knot: KnKnot): void {
    const name = this.GetDeclarationName(knot, 'type');
    if (name == null) {
      return;
    }

    const bodyItems = knot.Body ?? [];
    const genericParams = this.CreateTypeParameters(knot.GenericParams, bodyItems);
    const previous = this.PushTypeParameters(genericParams);
    try {
      const members: RowMember[] = [];
      let isOpen = readBoolAttr(knot, 'open', true);

      for (const item of bodyItems) {
        this.ReadEffectPrefixes(item);
        if (this.IsClosedRowMarker(item)) {
          isOpen = false;
          continue;
        }
        const spread = this.TryBindSpreadMember(name, item, genericParams);
        if (spread != null) {
          members.push(spread);
          continue;
        }
        const member = this.BindMember(name, item, false);
        if (member != null) {
          members.push(member);
        }
      }

      const mergeTargets = readArrayAttr(knot, 'merge');
      if (mergeTargets != null) {
        this.BindMergedRowType(name, mergeTargets, members, isOpen);
        return;
      }

      if (genericParams.length > 0) {
        this.typeSystem.DefineGenericRowType(name, genericParams, members, isOpen);
      } else {
        this.typeSystem.DefineRowType(name, members, isOpen);
      }
    } finally {
      this.RestoreTypeParameters(previous);
    }
  }

  private BindMergedRowType(name: string, mergeTargets: any[], declaredMembers: RowMember[], isOpen: boolean): void {
    const rows: RowTypeSymbol[] = [];
    let hasError = false;
    for (const target of mergeTargets) {
      const targetName = getTypeName(target);
      const row = targetName == null ? null : this.TryRequireRow(targetName);
      if (targetName == null || row == null) {
        this.AddDiagnostic('KTB021', `Row merge target '${targetName ?? '<invalid>'}' is not defined.`, targetName);
        hasError = true;
        continue;
      }
      rows.push(row);
    }
    if (hasError) {
      return;
    }
    const mergedMembers = rows.reduce((members, row) => members.concat(row.Members), [] as RowMember[]).concat(declaredMembers);
    const mergedOpen = rows.some(row => row.IsOpen) || isOpen;
    this.typeSystem.DefineRowType(name, mergedMembers, mergedOpen);
  }

  private BindClassDeclaration(knot: KnKnot, isTrait: boolean): void {
    const name = this.GetDeclarationName(knot, isTrait ? 'trait' : 'class');
    if (name == null) {
      return;
    }
    const bodyItems = knot.Body ?? [];
    const genericParams = this.CreateTypeParameters(knot.GenericParams, bodyItems);
    const previous = this.PushTypeParameters(genericParams);
    try {
      const members: RowMember[] = [];
      for (const item of bodyItems) {
        this.ReadEffectPrefixes(item);
        const member = this.BindMember(name, item, true);
        if (member != null) {
          members.push(member);
        }
      }
      const bases = this.ReadBaseReferences(knot, 'inherits').concat(this.ReadBaseReferences(knot, 'implements'));
      const definition = this.typeSystem.DefineClass(
        name,
        members,
        readBoolAttr(knot, 'open', true),
        bases,
        [],
        isTrait,
        genericParams,
      );
      // Materialize the effective row at the source boundary so inherited
      // kind conflicts become binding diagnostics instead of latent failures.
      void definition.Rows;
    } catch (error) {
      this.AddDiagnostic('KTB030', error?.message ?? String(error), name);
    } finally {
      this.RestoreTypeParameters(previous);
    }
  }

  private BindEnumDeclaration(knot: KnKnot): void {
    const name = this.GetDeclarationName(knot, 'enum');
    if (name == null) {
      return;
    }
    const values: EnumValueInput[] = [];
    const seen = new Set<string>();
    for (const item of knot.Body ?? []) {
      if (!(item instanceof KnKnot) || getWord(item.Core) !== 'value') {
        this.AddDiagnostic('KTB110', `Enum '${name}' body items must be value declarations.`, name);
        continue;
      }
      const valueName = this.GetDeclarationName(item, 'value');
      if (valueName == null) {
        continue;
      }
      if (seen.has(valueName)) {
        this.AddDiagnostic('KTB111', `Enum '${name}' contains duplicate value '${valueName}'.`, valueName);
        continue;
      }
      seen.add(valueName);
      const valueMetadata = this.ReadTypeMetadata(item);
      values.push({
        Name: valueName,
        Code: readConfigValue(item, 'code'),
        Metadata: valueMetadata,
      });
    }
    if (values.length === 0) {
      this.AddDiagnostic('KTB112', `Enum '${name}' must declare at least one value.`, name);
      return;
    }

    const reprName = getTypeName(readConfigValue(knot, 'repr'));
    const representation = reprName == null
      ? this.typeSystem.Registry.String
      : this.TryResolvePrimitiveAlias(reprName) ?? this.typeSystem.Registry.TryGet(reprName);
    if (representation == null) {
      this.AddDiagnostic('KTB113', `Enum '${name}' representation '${reprName}' is not defined.`, reprName);
      return;
    }

    try {
      this.typeSystem.DefineEnum(name, values, {
        Representation: representation,
        Metadata: this.ReadTypeMetadata(knot),
      });
    } catch (error) {
      this.AddDiagnostic('KTB114', error?.message ?? String(error), name);
    }
  }

  private BindScalarDeclaration(knot: KnKnot): void {
    const name = this.GetDeclarationName(knot, 'scalar');
    if (name == null) {
      return;
    }
    const reprName = getTypeName(readConfigValue(knot, 'repr'));
    const representation = reprName == null
      ? this.typeSystem.Registry.String
      : this.TryResolvePrimitiveAlias(reprName) ?? this.typeSystem.Registry.TryGet(reprName);
    if (representation == null) {
      this.AddDiagnostic('KTB115', `Scalar '${name}' representation '${reprName}' is not defined.`, reprName);
      return;
    }

    try {
      this.typeSystem.DefineBrandedScalar(name, representation, this.ReadTypeMetadata(knot));
    } catch (error) {
      this.AddDiagnostic('KTB116', error?.message ?? String(error), name);
    }
  }

  private BindSchemaMixinDeclaration(knot: KnKnot): void {
    const name = this.GetDeclarationName(knot, 'mixin');
    if (name == null) {
      return;
    }
    const members = this.BindSchemaMembers(name, knot.Body ?? []);
    try {
      this.typeSystem.DefineSchemaMixin(name, members, readBoolConfig(knot, 'open', true), this.ReadTypeMetadata(knot));
    } catch (error) {
      this.AddDiagnostic('KTB120', error?.message ?? String(error), name);
    }
  }

  private BindSchemaDeclaration(knot: KnKnot): void {
    const name = this.GetDeclarationName(knot, 'schema');
    if (name == null) {
      return;
    }
    const aliasTarget = getTypeName(readConfigValue(knot, 'alias_of'));
    if (aliasTarget != null) {
      this.BindSchemaAliasDeclaration(name, aliasTarget, knot);
      return;
    }

    const members = this.BindSchemaMembers(name, knot.Body ?? []);
    const parent = getTypeName(readConfigValue(knot, 'extends'));
    const mixins = readConfigItems(knot, 'mixins')
      .map(item => getTypeName(item))
      .filter(item => item != null);
    try {
      this.typeSystem.DefineSchemaType(name, members, {
        IsOpen: readBoolConfig(knot, 'open', true),
        Parent: parent,
        Mixins: mixins,
        Metadata: this.ReadTypeMetadata(knot),
      });
    } catch (error) {
      this.AddDiagnostic('KTB123', error?.message ?? String(error), name);
    }
  }

  private BindSchemaAliasDeclaration(name: string, aliasTarget: string, knot: KnKnot): void {
    if ((knot.Body?.length ?? 0) > 0 || hasConfigValue(knot, 'extends') || hasConfigValue(knot, 'mixins')) {
      this.AddDiagnostic('KTB130', `Schema alias '${name}' must not include body, extends, or mixins.`, name);
      return;
    }
    try {
      this.typeSystem.DefineSchemaTypeAlias(name, aliasTarget);
      this.typeSystem.RequireSchemaType(name);
    } catch (error) {
      this.AddDiagnostic('KTB132', error?.message ?? String(error), name);
    }
  }

  private BindRelationDeclaration(knot: KnKnot): void {
    const name = this.GetDeclarationName(knot, 'relation');
    if (name == null) {
      return;
    }
    const aliasTarget = getTypeName(readConfigValue(knot, 'alias_of'));
    if (aliasTarget != null) {
      this.BindRelationAliasDeclaration(name, aliasTarget, knot);
      return;
    }

    const from = getTypeName(readConfigValue(knot, 'from'));
    const to = getTypeName(readConfigValue(knot, 'to'));
    if (from == null || to == null) {
      this.AddDiagnostic('KTB141', `Relation '${name}' must include from and to schema targets in :{ ... }.`, name);
      return;
    }
    try {
      this.typeSystem.DefineRelation(name, from, to, readBoolConfig(knot, 'directed', true), this.ReadTypeMetadata(knot));
    } catch (error) {
      this.AddDiagnostic('KTB140', error?.message ?? String(error), name);
    }
  }

  private BindRelationAliasDeclaration(name: string, aliasTarget: string, knot: KnKnot): void {
    if (hasConfigValue(knot, 'from') || hasConfigValue(knot, 'to')) {
      this.AddDiagnostic('KTB141', `Relation alias '${name}' must not include from or to config.`, name);
      return;
    }
    try {
      this.typeSystem.DefineRelationAlias(name, aliasTarget);
      this.typeSystem.RequireRelation(name);
    } catch (error) {
      this.AddDiagnostic('KTB142', error?.message ?? String(error), name);
    }
  }

  private BindTopLevelAttributeDeclaration(knot: KnKnot): void {
    const name = this.GetDeclarationName(knot, 'attr');
    if (name == null) {
      return;
    }
    const aliasTarget = getTypeName(readConfigValue(knot, 'alias_of'));
    if (aliasTarget == null) {
      this.AddDiagnostic('KTB150', `Top-level attr declaration '${name}' must use alias_of in :{ ... }.`, name);
      return;
    }
    const target = this.ParseAttributeAliasTarget(aliasTarget);
    if (target == null) {
      this.AddDiagnostic('KTB151', `Attribute alias '${name}' target must be SchemaName.attributeName.`, aliasTarget);
      return;
    }
    try {
      const schema = this.typeSystem.RequireSchemaType(target.Schema);
      if (!schema.EffectiveRow.Members.some(member => member.Name === target.Attribute)) {
        this.AddDiagnostic('KTB153', `Schema '${target.Schema}' has no attribute '${target.Attribute}'.`, aliasTarget);
        return;
      }
      this.typeSystem.DefineAttributeAlias(target.Schema, name, target.Attribute);
    } catch (error) {
      this.AddDiagnostic('KTB152', error?.message ?? String(error), name);
    }
  }

  private BindFunctionDeclaration(knot: KnKnot): void {
    const name = this.GetDeclarationName(knot, 'fn');
    if (name == null) {
      this.ClearPendingFunctionMetadata();
      return;
    }
    if (knot.InOutTable == null) {
      this.AddDiagnostic('KTB080', `Function '${name}' must include an in/out table.`, name);
      this.ClearPendingFunctionMetadata();
      return;
    }
    const genericParams = this.CreateTypeParameters(knot.GenericParams, []);
    const previous = this.PushTypeParameters(genericParams);
    try {
      const signature = this.BindFunctionSignature(name, knot.InOutTable, this.pendingFunctionEffectRow);
      this.functions[name] = signature;
      if (genericParams.length > 0) {
        this.genericFunctions[name] = new GenericFunctionTypeSymbol(name, genericParams, signature);
      }
      if (this.pendingHandler != null) {
        this.effectHandlers.push({
          Name: this.pendingHandler.Name,
          FunctionName: name,
          ImplementationFunctionName: name,
          HandledEffects: this.pendingHandler.HandledEffects,
        });
      }
    } finally {
      this.RestoreTypeParameters(previous);
      this.ClearPendingFunctionMetadata();
    }
  }

  private BindMember(owner: string, item: any, allowProperty: boolean = false): RowMember {
    if (!(item instanceof KnKnot)) {
      this.AddDiagnostic('KTB040', 'Type body item must be a knot node.', String(item));
      return null;
    }
    const keyword = getWord(item.Core);
    switch (keyword) {
      case 'method':
      case 'op':
        return this.BindMethodMember(owner, item);
      case 'field':
        return this.BindFieldMember(owner, item);
      case 'prop':
        if (!allowProperty) {
          this.AddDiagnostic('KTB044', `Property declaration '${getTypeName(item.Name) ?? '<missing>'}' is only valid in class or trait bodies.`, owner);
          return null;
        }
        return this.BindPropertyMember(owner, item);
      default:
        return null;
    }
  }

  private BindSchemaMembers(owner: string, bodyItems: any[]): RowMember[] {
    const members: RowMember[] = [];
    for (const item of bodyItems) {
      this.ReadEffectPrefixes(item);
      if (item instanceof KnKnot && getWord(item.Core) === 'attr' && hasConfigValue(item, 'alias_of')) {
        this.AddDiagnostic('KTB122', 'Attribute aliases must be top-level attr declarations, not schema body items.', getTypeName(item.Name) ?? owner);
        continue;
      }
      const member = this.BindMember(owner, item, false);
      if (member != null) {
        members.push(member);
      }
    }
    return members;
  }

  private BindMethodMember(owner: string, knot: KnKnot): RowMember {
    const memberInfo = this.ReadMemberName(owner, knot);
    const inOutTable = this.GetMemberInOutTable(knot);
    if (memberInfo == null || inOutTable == null) {
      this.AddDiagnostic('KTB042', 'Method declaration must include a member name and in/out table.', owner);
      return null;
    }
    const effectContext = this.pendingFunctionEffectRow;
    const signature = this.BindFunctionSignature(`${memberInfo.origin}::${memberInfo.name}`, inOutTable, effectContext);
    this.pendingFunctionEffectRow = null;
    const member = RowMemberBuilder.Method(
      memberInfo.origin,
      memberInfo.name,
      signature,
      readQualifier(knot),
      readAccess(knot),
      this.ReadTypeMetadata(knot),
    );
    return effectContext == null ? member : member.WithEffectContext(effectContext);
  }

  private BindFieldMember(owner: string, knot: KnKnot): RowMember {
    const memberInfo = this.ReadMemberName(owner, knot);
    if (memberInfo == null) {
      this.AddDiagnostic('KTB043', 'Field declaration must include a member name.', owner);
      return null;
    }
    const fieldType = firstTypePrefix(knot) ?? this.firstInOutInput(knot) ?? this.typeSystem.Registry.Any;
    return RowMemberBuilder.Field(
      memberInfo.origin,
      memberInfo.name,
      this.BindTypeNode(fieldType),
      readQualifier(knot),
      readAccess(knot),
      this.ReadTypeMetadata(knot),
    );
  }

  private BindPropertyMember(owner: string, knot: KnKnot): RowMember {
    const propertyType = firstTypePrefix(knot);
    if (propertyType == null) {
      return null;
    }
    const memberInfo = this.ReadMemberName(owner, knot);
    if (memberInfo == null) {
      this.AddDiagnostic('KTB045', 'Typed property declaration must include a member name.', owner);
      return null;
    }
    return RowMemberBuilder.Property(
      memberInfo.origin,
      memberInfo.name,
      this.BindTypeNode(propertyType),
      readQualifier(knot),
      readAccess(knot),
      this.ReadTypeMetadata(knot),
    );
  }

  private BindFunctionSignature(name: string, table: KnTuple, effectRow?: EffectRow): FunctionTypeSymbol {
    const rows = table.RawValue as any[];
    const inputNodes = rows[0]?.[2] ?? [];
    const outputNodes = rows[1]?.[2] ?? [];
    const parameters = inputNodes.map(node => this.BindInOutItemType(node));
    const outputs = outputNodes.length === 0
      ? [this.typeSystem.Registry.Never]
      : outputNodes.map(node => this.BindInOutItemType(node));
    return new FunctionTypeSymbol(name, parameters, outputs, effectRow ?? EffectRow.EmptyClosed);
  }

  private BindInOutItemType(node: any): TypeSymbol {
    const typePrefix = firstTypePrefix(node);
    return this.BindTypeNode(typePrefix ?? node);
  }

  public BindTypeNode(node: any): TypeSymbol {
    if (node instanceof KnWord) {
      const name = node.Value;
      const parameter = this.activeTypeParameters.get(name);
      if (parameter != null && node.GenericArgs == null) {
        return parameter;
      }
      const primitive = this.TryResolvePrimitiveAlias(name);
      if (primitive != null && node.GenericArgs == null) {
        return primitive;
      }
      const typeArgs = (node.GenericArgs ?? []).map(arg => this.BindTypeNode(arg));
      const registered = this.typeSystem.Registry.TryGet(name);
      if (registered != null) {
        if (typeArgs.length === 0) {
          return registered;
        }
        if (registered instanceof GenericRowTypeSymbol) {
          try {
            return registered.Instantiate(typeArgs);
          } catch (error) {
            this.AddDiagnostic('KTB101', error?.message ?? String(error), name);
            return new TypeReferenceSymbol(name, typeArgs);
          }
        }
        if (registered instanceof ClassTypeSymbol) {
          if (registered.TypeParameters.length === 0) {
            this.AddDiagnostic('KTB100', `Type '${name}' is not generic.`, name);
            return new TypeReferenceSymbol(name, typeArgs);
          }
          try {
            return this.typeSystem.InstantiateGenericClass(registered, ...typeArgs);
          } catch (error) {
            this.AddDiagnostic('KTB101', error?.message ?? String(error), name);
            return new TypeReferenceSymbol(name, typeArgs);
          }
        }
        this.AddDiagnostic('KTB100', `Type '${name}' is not generic.`, name);
        return new TypeReferenceSymbol(name, typeArgs);
      }
      return new TypeReferenceSymbol(name, typeArgs);
    }
    const name = getTypeName(node);
    return name == null ? new TypeReferenceSymbol(String(node)) : this.BindTypeNode(new KnWord(name));
  }

  private TryResolvePrimitiveAlias(name: string): TypeSymbol {
    switch (name) {
      case 'Unit':
      case 'unit':
      case 'Never':
      case 'never':
        return this.typeSystem.Registry.Never;
      case 'Int':
      case 'int':
        return this.typeSystem.Registry.Int;
      case 'String':
      case 'str':
        return this.typeSystem.Registry.String;
      case 'Bool':
      case 'bool':
        return this.typeSystem.Registry.Bool;
      case 'Any':
      case 'any':
        return this.typeSystem.Registry.Any;
      default:
        return null;
    }
  }

  private ReadEffectPrefixes(node: any): void {
    const knots = node?.PreModifiers?.Knots ?? [];
    for (const marker of knots) {
      if (getWord(marker.Core) !== 'effect') {
        continue;
      }
      const command = getWord(marker.Next?.Core);
      switch (command) {
        case 'decl':
          {
            const effectName = getTypeName(marker.Next?.Name ?? marker.Next?.Next?.Core);
            if (effectName == null) {
              this.AddDiagnostic('KTB091', 'Effect declaration must use #(effect decl #Name).', command);
            } else {
              this.typeSystem.Registry.GetOrCreateEffect(effectName);
            }
          }
          break;
        case 'row':
          this.pendingFunctionEffectRow = this.BindEffectRowMarker(marker.Next);
          break;
        case 'handler':
          this.pendingHandler = this.BindEffectHandlerPrefix(marker.Next);
          break;
        default:
          this.AddDiagnostic('KTB090', `Unsupported effect prefix command '${command ?? '<missing>'}'.`, command);
          break;
      }
    }
  }

  private BindEffectHandlerPrefix(commandNode: KnKnot): PendingHandlerDeclaration {
    const handlerName = getTypeName(commandNode?.Name ?? commandNode?.Next?.Core);
    const handlesNode = commandNode?.Next;
    if (handlerName == null || getWord(handlesNode?.Core) !== 'handles') {
      this.AddDiagnostic('KTB092', 'Effect handler declaration must use #(effect handler #handlerName handles :[ ... ]).', handlerName);
      return null;
    }
    return {
      Name: handlerName,
      HandledEffects: this.BindEffectRowMarker(handlesNode),
    };
  }

  private BindEffectRowMarker(commandNode: KnKnot): EffectRow {
    const items = commandNode?.Body ?? commandNode?.Next?.Body ?? [];
    const effects = items
      .map(item => getTypeName(item))
      .filter(name => name != null)
      .map(name => this.typeSystem.Registry.GetOrCreateEffect(name));
    return EffectRow.FromEffects(effects);
  }

  private CreateTypeParameters(genericParams: KnTuple, bodyItems: any[]): TypeParameter[] {
    const params = (genericParams?.Value?.[0] ?? []) as any[];
    const rowParameterNames = new Set<string>();
    for (const item of bodyItems) {
      const spreadName = this.TryReadSpreadName(item);
      if (spreadName != null && spreadName.toLowerCase() !== 'never') {
        rowParameterNames.add(spreadName);
      }
    }
    return params.map(param => getTypeName(param))
      .filter(name => name != null)
      .map(name => ({ Name: name, IsRowParameter: rowParameterNames.has(name) }));
  }

  private TryBindSpreadMember(owner: string, item: any, parameters: TypeParameter[]): RowMember {
    const spreadName = this.TryReadSpreadName(item);
    if (spreadName == null || spreadName.toLowerCase() === 'never') {
      return null;
    }
    const parameter = parameters.find(p => p.Name === spreadName);
    if (parameter != null) {
      return RowMemberBuilder.Spread(owner, spreadName, parameter);
    }
    const effect = this.typeSystem.Registry.TryGetEffect(spreadName);
    if (effect != null) {
      return RowMemberBuilder.Spread(owner, spreadName, effect);
    }
    this.AddDiagnostic('KTB061', `Spread parameter '${spreadName}' must be declared as a generic parameter or effect.`, spreadName);
    return null;
  }

  private IsClosedRowMarker(item: any): boolean {
    return this.TryReadSpreadName(item)?.toLowerCase() === 'never';
  }

  private TryReadSpreadName(item: any): string {
    if (item instanceof KnQuoteWrapper && item._Type === KnNodeType.RowSpread) {
      return getTypeName(item.Inner);
    }
    if (item instanceof KnWord && item.Value.startsWith('..')) {
      return item.Value.slice(2);
    }
    if (item instanceof KnKnot && getWord(item.Core) === 'spread') {
      return getTypeName(item.Next?.Core);
    }
    return null;
  }

  private ReadBaseReferences(knot: KnKnot, attrName: string): { Name: string; Inheritance: InheritanceKind; Access: AccessModifier }[] {
    const attr = knot.Attr?.[attrName];
    if (attr == null) {
      return [];
    }
    const items = Array.isArray(attr) ? attr : [attr];
    return items.map(item => {
      if (item instanceof KnUnorderedMap) {
        const typeName = getTypeName(item.type);
        if (typeName == null) {
          this.AddDiagnostic('KTB070', 'Inheritance metadata map requires a type entry.', String(item));
          return null;
        }
        return {
          Name: typeName,
          Inheritance: parseInheritanceKind(getTypeName(item.mode)),
          Access: parseAccessModifier(getTypeName(item.visibility)),
        };
      }
      const name = getTypeName(item);
      if (name == null) {
        this.AddDiagnostic('KTB071', 'Base reference must be a type name or metadata map.', String(item));
        return null;
      }
      return {
        Name: name,
        Inheritance: InheritanceKind.Real,
        Access: AccessModifier.Public,
      };
    }).filter(item => item?.Name != null);
  }

  private ReadMemberName(owner: string, knot: KnKnot): { name: string; origin: string } {
    if (knot.Name instanceof KnWord) {
      return {
        name: knot.Name.Value,
        origin: knot.Name.SourceQualifier ?? owner,
      };
    }
    const metadataName = this.ReadMetadataMemberName(knot);
    if (metadataName != null) {
      return {
        name: metadataName.name,
        origin: metadataName.origin ?? owner,
      };
    }
    return null;
  }

  private ReadMetadataMemberName(knot: KnKnot): { name: string; origin?: string } {
    if (!(knot.Metadata instanceof Map)) {
      return null;
    }
    const first = knot.Metadata.keys().next();
    if (first.done) {
      return null;
    }
    const key = first.value;
    if (key instanceof KnWord) {
      return { name: key.Value, origin: key.SourceQualifier };
    }
    const name = getTypeName(key);
    return name == null ? null : { name };
  }

  private GetMemberInOutTable(knot: KnKnot): KnTuple {
    return knot.InOutTable ?? knot.Next?.InOutTable ?? null;
  }

  private GetDeclarationName(knot: KnKnot, keyword: string): string {
    if (knot.Name instanceof KnWord) {
      return knot.Name.Value;
    }
    this.AddDiagnostic('KTB010', `${keyword} declaration must include a symbol name.`, keyword);
    return null;
  }

  private ParseAttributeAliasTarget(target: string): { Schema: string; Attribute: string } {
    const index = target.lastIndexOf('.');
    if (index <= 0 || index === target.length - 1) {
      return null;
    }
    return {
      Schema: target.slice(0, index),
      Attribute: target.slice(index + 1),
    };
  }

  private ReadTypeMetadata(knot: KnKnot): { [key: string]: any } {
    const metadata: { [key: string]: any } = {
      ...(knot.Attr ?? {}),
      ...(readConfigMap(knot) ?? {}),
    };
    if (knot.Metadata instanceof Map) {
      for (const [key, value] of knot.Metadata.entries()) {
        const name = getTypeName(key);
        if (name != null) {
          metadata[name] = value;
        }
      }
    }
    const sourceAnnotations = this.ReadSourceAnnotations(knot);
    if (sourceAnnotations != null) {
      metadata.source_annotations = sourceAnnotations;
    }
    return metadata;
  }

  private ReadSourceAnnotations(knot: KnKnot): { PreModifiers?: any; PostModifiers?: any } {
    const sourceAnnotations: { PreModifiers?: any; PostModifiers?: any } = {};
    const preModifiers = hasModifierContent(knot.PreModifiers)
      ? knot.PreModifiers
      : knot.Core?.PreModifiers;
    if (hasModifierContent(preModifiers)) {
      sourceAnnotations.PreModifiers = preModifiers;
    }
    if (hasModifierContent(knot.PostModifiers)) {
      sourceAnnotations.PostModifiers = knot.PostModifiers;
    }
    return Object.keys(sourceAnnotations).length === 0 ? null : sourceAnnotations;
  }

  private firstInOutInput(knot: KnKnot): any {
    const rows = knot.InOutTable?.RawValue as any[];
    return rows?.[0]?.[2]?.[0] ?? null;
  }

  private TryRequireRow(name: string): RowTypeSymbol {
    const symbol = this.typeSystem.Registry.TryGet(name);
    return symbol instanceof RowTypeSymbol ? symbol : null;
  }

  private PushTypeParameters(parameters: TypeParameter[]): Map<string, TypeParameter> {
    const previous = new Map(this.activeTypeParameters);
    this.activeTypeParameters.clear();
    for (const parameter of parameters) {
      this.activeTypeParameters.set(parameter.Name, parameter);
    }
    return previous;
  }

  private RestoreTypeParameters(previous: Map<string, TypeParameter>): void {
    this.activeTypeParameters.clear();
    for (const [name, parameter] of previous.entries()) {
      this.activeTypeParameters.set(name, parameter);
    }
  }

  private ClearPendingFunctionMetadata(): void {
    this.pendingFunctionEffectRow = null;
    this.pendingHandler = null;
  }

  private AddDiagnostic(code: string, message: string, location?: string): void {
    this.diagnostics.push(new TypeBindingDiagnostic(code, message, location));
  }
}

export function firstTypePrefix(node: any): any {
  return node?.PreModifiers?.Identifiers?.[0] ?? node?.Core?.PreModifiers?.Identifiers?.[0] ?? null;
}

export function getWord(node: any): string {
  if (node instanceof KnWord) {
    return node.Value;
  }
  if (node instanceof KnSymbol) {
    return node.Value;
  }
  if (typeof node === 'string') {
    return node;
  }
  return null;
}

export function getTypeName(node: any): string {
  if (node instanceof KnWord) {
    return node.GetFullNameStr();
  }
  if (node instanceof KnSymbol) {
    return node.Value;
  }
  if (typeof node === 'string') {
    return node;
  }
  return null;
}

function readArrayAttr(knot: KnKnot, attrName: string): any[] {
  const attr = knot.Attr?.[attrName];
  return Array.isArray(attr) ? attr : null;
}

function readAttrItems(knot: KnKnot, attrName: string): any[] {
  const attr = knot.Attr?.[attrName];
  if (attr == null) {
    return [];
  }
  return Array.isArray(attr) ? attr : [attr];
}

function readConfigMap(knot: KnKnot): { [key: string]: any } {
  if (knot.Conf == null) {
    return null;
  }
  const result: { [key: string]: any } = {};
  for (const [key, value] of Object.entries(knot.Conf)) {
    if (typeof value !== 'function') {
      result[key] = value;
    }
  }
  return result;
}

function readConfigValue(knot: KnKnot, name: string): any {
  const conf = readConfigMap(knot);
  return conf?.[name] ?? knot.Attr?.[name];
}

function hasConfigValue(knot: KnKnot, name: string): boolean {
  return readConfigValue(knot, name) != null;
}

function readConfigItems(knot: KnKnot, name: string): any[] {
  const value = readConfigValue(knot, name);
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function readBoolConfig(knot: KnKnot, name: string, defaultValue: boolean): boolean {
  return readBoolValue(readConfigValue(knot, name), defaultValue);
}

function readBoolAttr(knot: KnKnot, attrName: string, defaultValue: boolean): boolean {
  return readBoolValue(knot.Attr?.[attrName], defaultValue);
}

function readBoolValue(value: any, defaultValue: boolean): boolean {
  if (value == null) {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const name = getTypeName(value);
  if (name != null) {
    switch (name.toLowerCase()) {
      case 'true':
        return true;
      case 'false':
        return false;
    }
  }
  return Boolean(value);
}

function hasModifierContent(group: any): boolean {
  if (group == null) {
    return false;
  }
  return (group.Identifiers?.length ?? 0) > 0
    || (group.NamedValues?.size ?? 0) > 0
    || (group.Knots?.length ?? 0) > 0
    || group.UnorderedMap != null
    || group.OrderedMap != null
    || group.Vector != null;
}

function readQualifier(knot: KnKnot): RowQualifier {
  const raw = getTypeName(knot.Attr?.qualifier ?? knot.Attr?.mode);
  switch (raw?.toLowerCase()) {
    case 'virtual':
      return RowQualifier.Virtual;
    case 'final':
      return RowQualifier.Final;
    case 'override':
      return RowQualifier.Override;
    case 'inherit':
      return RowQualifier.Inherit;
    default:
      return RowQualifier.Default;
  }
}

function readAccess(knot: KnKnot): AccessModifier {
  return parseAccessModifier(getTypeName(knot.Attr?.visibility ?? knot.Attr?.access));
}

function parseInheritanceKind(value: string): InheritanceKind {
  return value?.toLowerCase() === 'virtual' ? InheritanceKind.Virtual : InheritanceKind.Real;
}

function parseAccessModifier(value: string): AccessModifier {
  switch (value?.toLowerCase()) {
    case 'private':
      return AccessModifier.Private;
    case 'protected':
    case 'protect':
      return AccessModifier.Protected;
    case 'internal':
      return AccessModifier.Internal;
    default:
      return AccessModifier.Public;
  }
}
