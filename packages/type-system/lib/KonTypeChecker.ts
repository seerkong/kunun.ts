import { KnKnot, KnotCallType } from 'kunun-core/Model/KnKnot';
import { KnWord } from 'kunun-core/Model/KnWord';
import { TypeBindingDiagnostic, KonTypeBinder, TypeBindingResult, firstTypePrefix, getTypeName, getWord } from './KonTypeBinder';
import { ParseKonSourceItems } from './KonSource';
import {
  AccessModifier,
  ClassTypeSymbol,
  EnumTypeSymbol,
  EnumValueSymbol,
  EffectRow,
  FunctionTypeSymbol,
  GenericFunctionTypeSymbol,
  RowMember,
  RowTypeSymbol,
  TypeProjection,
  TypeParameter,
  TypeReferenceSymbol,
  TypeSymbol,
} from './Types';

export class TypeCheckingResult {
  public constructor(
    public readonly Binding: TypeBindingResult,
    public readonly Diagnostics: TypeBindingDiagnostic[],
  ) {}

  public get TypeSystem() {
    return this.Binding.TypeSystem;
  }

  public get Functions() {
    return this.Binding.Functions;
  }

  public get Success(): boolean {
    return this.Diagnostics.length === 0;
  }
}

interface CheckedExpression {
  Outputs: TypeSymbol[];
  Location: string;
  EffectRow: EffectRow;
  ProjectionTarget?: TypeSymbol;
}

interface MemberReference {
  Name: string;
  Origin?: string;
  DisplayName: string;
}

interface CheckContext {
  CurrentClass?: ClassTypeSymbol;
  InClassBody?: boolean;
}

export class KonTypeChecker {
  private readonly diagnostics: TypeBindingDiagnostic[];

  private constructor(private readonly binding: TypeBindingResult) {
    this.diagnostics = binding.Diagnostics.slice();
  }

  public static CheckSource(source: string): TypeCheckingResult {
    const nodes = ParseKonSourceItems(source);
    const binding = new KonTypeBinder().Bind(nodes.filter(isTypeSystemDeclarationOrFunction));
    const checker = new KonTypeChecker(binding);
    if (!binding.Success) {
      return new TypeCheckingResult(binding, checker.diagnostics);
    }
    checker.Check(nodes.filter(isFunctionDeclaration));
    checker.CheckClassBodies(nodes.filter(isClassDeclaration));
    return new TypeCheckingResult(binding, checker.diagnostics);
  }

  private Check(functionDeclarations: any[]): void {
    for (const node of functionDeclarations) {
      if (node instanceof KnKnot) {
        this.CheckFunction(node);
      }
    }
  }

  private CheckFunction(fn: KnKnot): void {
    const functionName = fn.Name?.Value;
    const signature = functionName == null ? null : this.binding.Functions[functionName];
    if (signature == null) {
      return;
    }

    const environment = this.BuildParameterEnvironment(fn, signature);
    let last: CheckedExpression = null;
    let residualEffects = EffectRow.EmptyClosed;
    for (const bodyItem of fn.Body ?? []) {
      if (this.IsPostfixEffectHandle(bodyItem)) {
        for (const handlerName of this.ReadHandlerPostfixes(bodyItem)) {
          residualEffects = this.ApplyHandler(residualEffects, handlerName, String(handlerName));
        }
        continue;
      }
      last = this.CheckExpression(bodyItem, environment, signature.EffectRow);
      if (last != null) {
        residualEffects = residualEffects.Union(last.EffectRow);
      }
    }

    if (last != null && !this.AreOutputStacksCompatible(last.Outputs, signature.Outputs)) {
      this.AddDiagnostic('KTC040', `Return expression output stack '${formatTypeList(last.Outputs)}' is not compatible with expected '${formatTypeList(signature.Outputs)}'.`, last.Location);
    }

    if (!residualEffects.IsSubsetOf(signature.EffectRow)) {
      this.AddDiagnostic('KTC050', `Function '${functionName}' has unhandled residual effects ${residualEffects.Subtract(signature.EffectRow).ToDisplayString()}.`, functionName);
    }
  }

  private BuildParameterEnvironment(fn: KnKnot, signature: FunctionTypeSymbol): Map<string, TypeSymbol> {
    const environment = new Map<string, TypeSymbol>();
    const rows = fn.InOutTable?.RawValue as any[];
    const inputs = rows?.[0]?.[2] ?? [];
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const parameterName = getWord(input) ?? `arg${i}`;
      const parameterType = firstTypePrefix(input) != null
        ? this.ResolveTypeNode(firstTypePrefix(input))
        : signature.Parameters[i] ?? this.binding.TypeSystem.Registry.Any;
      environment.set(parameterName, parameterType);
    }
    return environment;
  }

  private CheckClassBodies(classDeclarations: any[]): void {
    for (const declaration of classDeclarations) {
      if (!(declaration instanceof KnKnot) || !(declaration.Name instanceof KnWord)) {
        continue;
      }
      const classType = this.ResolveTypeName(declaration.Name.Value);
      if (!(classType instanceof ClassTypeSymbol)) {
        continue;
      }
      for (const member of declaration.Body ?? []) {
        if (!(member instanceof KnKnot)) {
          continue;
        }
        const keyword = getWord(member.Core);
        if (keyword === 'method') {
          this.CheckClassMethodBody(classType, member);
        } else if (keyword === 'new') {
          this.CheckConstructorBody(classType, member);
        } else if (keyword === 'prop') {
          this.CheckPropertyBody(classType, member);
        }
      }
      this.ValidateClassCompanionAccessors(classType);
    }
  }

  private CheckClassMethodBody(classType: ClassTypeSymbol, member: KnKnot): void {
    const memberName = getTypeName(member.Name);
    const typedMember = memberName == null
      ? null
      : classType.DeclaredRows.EnumerateByName(memberName).find(candidate => candidate.IsMethod);
    if (!(typedMember?.Type instanceof FunctionTypeSymbol) || member.Body == null) {
      return;
    }
    const environment = this.BuildMemberEnvironment(classType, member, typedMember.Type);
    this.CheckBodyAgainstSignature(member.Body, environment, typedMember.Type, {
      CurrentClass: classType,
      InClassBody: true,
    }, `${classType.Name}.${memberName}`);
  }

  private CheckConstructorBody(classType: ClassTypeSymbol, member: KnKnot): void {
    if (member.Body == null) {
      return;
    }
    const environment = this.BuildMemberEnvironment(
      classType,
      member,
      new FunctionTypeSymbol(`${classType.Name}::new`, [], [classType]),
    );
    for (const bodyItem of member.Body) {
      this.CheckExpression(bodyItem, environment, EffectRow.EmptyClosed, {
        CurrentClass: classType,
        InClassBody: true,
      });
    }
  }

  private CheckPropertyBody(classType: ClassTypeSymbol, member: KnKnot): void {
    const propertyName = getTypeName(member.Name);
    const property = propertyName == null
      ? null
      : classType.Rows.EnumerateByName(propertyName).find(candidate => candidate.IsProperty);
    const getter = this.FindCompanionAccessor(classType, propertyName, 'get_');
    const setter = this.FindCompanionAccessor(classType, propertyName, 'set_');

    let current = member.Next;
    while (current != null) {
      const section = getWord(current.Core);
      if (section === 'get' && current.Body != null) {
        const companionSignature = getter?.Type instanceof FunctionTypeSymbol ? getter.Type : null;
        let signature = companionSignature;
        if (property != null) {
          signature = new FunctionTypeSymbol(
            `${classType.Name}::get_${propertyName}`,
            [],
            [property.Type],
            companionSignature?.EffectRow,
          );
        }
        const environment = this.BuildMemberEnvironment(
          classType,
          current,
          signature ?? new FunctionTypeSymbol(`${classType.Name}::get_${propertyName}`, [], [this.binding.TypeSystem.Registry.Any]),
        );
        if (property == null && signature == null) {
          for (const bodyItem of current.Body) {
            this.CheckExpression(bodyItem, environment, EffectRow.EmptyClosed, {
              CurrentClass: classType,
              InClassBody: true,
            });
          }
          current = current.Next;
          continue;
        }
        this.CheckBodyAgainstSignature(current.Body, environment, signature, {
          CurrentClass: classType,
          InClassBody: true,
        }, `${classType.Name}.${propertyName}.get`);
      } else if (section === 'set' && current.Body != null) {
        const companionSignature = setter?.Type instanceof FunctionTypeSymbol ? setter.Type : null;
        let signature = companionSignature
          ?? new FunctionTypeSymbol(`${classType.Name}::set_${propertyName}`, [this.binding.TypeSystem.Registry.Any], [this.binding.TypeSystem.Registry.Never]);
        if (property != null) {
          signature = new FunctionTypeSymbol(
            `${classType.Name}::set_${propertyName}`,
            [property.Type],
            [this.binding.TypeSystem.Registry.Never],
            companionSignature?.EffectRow,
          );
        }
        const environment = this.BuildMemberEnvironment(classType, current, signature);
        for (const bodyItem of current.Body) {
          this.CheckExpression(bodyItem, environment, signature.EffectRow, {
            CurrentClass: classType,
            InClassBody: true,
          });
        }
      }
      current = current.Next;
    }
  }

  private FindCompanionAccessor(classType: ClassTypeSymbol, propertyName: string, prefix: string): RowMember {
    if (propertyName == null) {
      return null;
    }
    return classType.Rows.EnumerateByName(`${prefix}${propertyName}`).find(candidate => candidate.IsMethod)
      ?? classType.Rows.EnumerateByName(propertyName).find(candidate => candidate.IsMethod)
      ?? null;
  }

  private ValidateClassCompanionAccessors(classType: ClassTypeSymbol): void {
    const propertyNames = new Set(
      classType.Rows.Members.filter(member => member.IsProperty).map(member => member.Name),
    );
    for (const propertyName of propertyNames) {
      const property = classType.Rows.EnumerateByName(propertyName).find(candidate => candidate.IsProperty);
      this.ValidateCompanionAccessor(
        property,
        this.FindCompanionAccessor(classType, propertyName, 'get_'),
        'getter',
      );
      this.ValidateCompanionAccessor(
        property,
        this.FindCompanionAccessor(classType, propertyName, 'set_'),
        'setter',
      );
    }
  }

  private ValidateCompanionAccessor(property: RowMember, accessor: RowMember, kind: 'getter' | 'setter'): void {
    if (accessor == null || !(accessor.Type instanceof FunctionTypeSymbol)) {
      return;
    }
    const signature = accessor.Type;
    let compatible: boolean;
    if (kind === 'getter') {
      compatible = signature.Outputs.length === 1
        && this.binding.TypeSystem.AreTypesCompatible(signature.Outputs[0], property.Type);
    } else {
      compatible = signature.Parameters.length > 0
        && this.binding.TypeSystem.AreTypesCompatible(property.Type, signature.Parameters[signature.Parameters.length - 1]);
    }
    if (!compatible) {
      this.AddDiagnostic(
        'KTC090',
        `Companion ${kind} '${accessor.Name}' is incompatible with property '${property.Name}' type '${property.Type.Name}'.`,
        `${property.Origin}.${property.Name}`,
      );
    }
  }

  private BuildMemberEnvironment(classType: ClassTypeSymbol, member: KnKnot, signature: FunctionTypeSymbol): Map<string, TypeSymbol> {
    const environment = new Map<string, TypeSymbol>();
    environment.set('self', classType);
    const rows = member.InOutTable?.RawValue as any[];
    const inputs = rows?.[0]?.[2] ?? [];
    const offset = this.SignatureHasImplicitReceiver(classType, signature, inputs.length) ? 1 : 0;
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const parameterName = getWord(input) ?? `arg${i}`;
      const parameterType = firstTypePrefix(input) != null
        ? this.ResolveTypeNode(firstTypePrefix(input))
        : signature.Parameters[i + offset] ?? this.binding.TypeSystem.Registry.Any;
      environment.set(parameterName, parameterType);
    }
    return environment;
  }

  private SignatureHasImplicitReceiver(classType: ClassTypeSymbol, signature: FunctionTypeSymbol, inputCount: number): boolean {
    if (signature.Parameters.length !== inputCount + 1) {
      return false;
    }
    const receiver = signature.Parameters[0];
    return receiver === classType
      || receiver.Name === classType.Name
      || receiver.Name === 'self';
  }

  private CheckBodyAgainstSignature(
    body: any[],
    environment: Map<string, TypeSymbol>,
    signature: FunctionTypeSymbol,
    context: CheckContext,
    locationPrefix: string,
  ): void {
    let last: CheckedExpression = null;
    for (const bodyItem of body) {
      last = this.CheckExpression(bodyItem, environment, signature.EffectRow, context);
    }
    if (last != null && !this.AreOutputStacksCompatible(last.Outputs, signature.Outputs, true)) {
      this.AddDiagnostic('KTC040', `Return expression output stack '${formatTypeList(last.Outputs)}' is not compatible with expected '${formatTypeList(signature.Outputs)}'.`, `${locationPrefix}: ${last.Location}`);
    }
  }

  private CheckExpression(
    node: any,
    environment: Map<string, TypeSymbol>,
    activeEffectRow: EffectRow,
    context: CheckContext = {},
  ): CheckedExpression {
    const literalType = this.GetLiteralType(node);
    if (literalType != null) {
      return single(literalType, String(node), EffectRow.EmptyClosed);
    }
    if (node instanceof KnKnot) {
      if (getWord(node.Core) === 'set') {
        return this.CheckSet(node, environment, activeEffectRow, context);
      }
      if (getWord(node.Core) === 'perform') {
        return this.CheckPerform(node, environment, context);
      }
      return this.CheckChain(node, environment, activeEffectRow, context);
    }
    if (node instanceof KnWord) {
      const variableType = environment.get(node.Value);
      if (variableType != null) {
        return single(variableType, node.Value, EffectRow.EmptyClosed);
      }
      const functionType = this.binding.Functions[node.Value];
      if (functionType != null) {
        return { Outputs: functionType.Outputs, Location: node.Value, EffectRow: functionType.EffectRow };
      }
      const genericFunction = this.binding.GenericFunctions[node.Value];
      if (genericFunction != null) {
        const signature = this.InstantiateGenericFunction(genericFunction, node, [], node.Value);
        return signature == null ? null : { Outputs: signature.Outputs, Location: node.GetFullNameStr(), EffectRow: signature.EffectRow };
      }
      const registered = this.binding.TypeSystem.Registry.TryGet(node.GetFullNameStr());
      if (registered instanceof EnumValueSymbol) {
        return single(registered.Owner, registered.QualifiedName, EffectRow.EmptyClosed);
      }
    }
    return null;
  }

  private CheckChain(knot: KnKnot, environment: Map<string, TypeSymbol>, activeEffectRow: EffectRow, context: CheckContext = {}): CheckedExpression {
    if (knot.Next == null) {
      const functionName = getWord(knot.Core);
      const fn = functionName == null ? null : this.binding.Functions[functionName];
      if (fn != null) {
        return { Outputs: fn.Outputs, Location: functionName, EffectRow: fn.EffectRow };
      }
      return this.CheckExpression(knot.Core, environment, activeEffectRow, context);
    }

    let target = this.CheckExpression(knot.Core, environment, activeEffectRow, context);
    let current = knot.Next;
    while (current != null && target != null) {
      target = this.CheckChainSegment(target, current, activeEffectRow, context);
      current = current.Next;
    }
    return target;
  }

  private CheckChainSegment(target: CheckedExpression, segment: KnKnot, activeEffectRow: EffectRow, context: CheckContext = {}): CheckedExpression {
    if (segment.CallType === KnotCallType.StaticIndex) {
      return this.CheckSlotAccess(target, segment, context);
    }
    if (segment.CallType === KnotCallType.InstanceCall) {
      const memberName = getWord(segment.Core);
      if (memberName === 'as') {
        return this.CheckProjectionSegment(target, segment);
      }
      return this.CheckReceiverCall(target, segment, activeEffectRow, context);
    }
    return this.CheckFunctionCallSegment(target, segment);
  }

  private CheckFunctionCallSegment(target: CheckedExpression, segment: KnKnot): CheckedExpression {
    const functionName = getWord(segment.Core);
    const fn = functionName == null ? null : this.ResolveFunctionSignature(functionName, segment.Core, target.Outputs, `${target.Location} ${functionName}`);
    if (fn == null) {
      return target;
    }

    const location = `${target.Location} ${functionName}`;
    if (!this.AreOutputStacksCompatible(target.Outputs, fn.Parameters)) {
      this.AddDiagnostic('KTC041', `Call '${functionName}' expects input stack '${formatTypeList(fn.Parameters)}' but received '${formatTypeList(target.Outputs)}'.`, location);
      return null;
    }

    return {
      Outputs: fn.Outputs,
      Location: location,
      EffectRow: target.EffectRow.Union(fn.EffectRow),
    };
  }

  private CheckSet(
    knot: KnKnot,
    environment: Map<string, TypeSymbol>,
    activeEffectRow: EffectRow,
    context: CheckContext,
  ): CheckedExpression {
    const nodes = this.KnotToArray(knot);
    if (nodes.length < 3) {
      return null;
    }
    const placeNodes = nodes.slice(1, -1);
    const valueNode = nodes[nodes.length - 1]?.Core;
    const value = this.CheckExpression(valueNode, environment, activeEffectRow, context);
    if (value == null) {
      return null;
    }

    if (placeNodes.length === 1 && placeNodes[0]?.Core instanceof KnWord) {
      const targetName = placeNodes[0].Core.Value;
      const targetType = environment.get(targetName);
      if (targetType != null && !this.AreOutputStacksCompatible(value.Outputs, [targetType], true)) {
        this.AddDiagnostic('KTC041', `Assignment '${targetName}' expects value stack '${formatTypeList([targetType])}' but received '${formatTypeList(value.Outputs)}'.`, `set ${targetName}`);
        return null;
      }
      return value;
    }

    let target = this.CheckExpression(placeNodes[0]?.Core, environment, activeEffectRow, context);
    for (let i = 1; i < placeNodes.length && target != null; i++) {
      const place = placeNodes[i];
      if (place.CallType !== KnotCallType.StaticIndex) {
        target = this.CheckChainSegment(target, place, activeEffectRow, context);
        continue;
      }
      const memberRef = this.ReadMemberReference(place.Core);
      const location = `${target.Location}.:${memberRef.DisplayName}`;
      const member = this.ResolveMember(target.Outputs[target.Outputs.length - 1], memberRef, false, location, undefined, context);
      if (member == null) {
        return null;
      }
      if (i === placeNodes.length - 1) {
        if (!this.AreOutputStacksCompatible(value.Outputs, [member.Type], true)) {
          this.AddDiagnostic('KTC041', `Assignment '${memberRef.DisplayName}' expects value stack '${formatTypeList([member.Type])}' but received '${formatTypeList(value.Outputs)}'.`, location);
          return null;
        }
        return value;
      }
      target = single(member.Type, location, target.EffectRow);
    }
    return value;
  }

  private CheckSlotAccess(target: CheckedExpression, segment: KnKnot, context: CheckContext = {}): CheckedExpression {
    const memberRef = this.ReadMemberReference(segment.Core);
    const location = `${target.Location}.:${memberRef.DisplayName}`;
    const member = this.ResolveMember(target.Outputs[target.Outputs.length - 1], memberRef, false, location, undefined, context);
    return member == null ? null : single(member.Type, location, target.EffectRow);
  }

  private CheckReceiverCall(target: CheckedExpression, segment: KnKnot, activeEffectRow: EffectRow, context: CheckContext = {}): CheckedExpression {
    const memberRef = this.ReadMemberReference(segment.Core);
    const location = `${target.Location} ~${memberRef.DisplayName}`;
    const member = this.ResolveMember(target.Outputs[target.Outputs.length - 1], memberRef, true, location, activeEffectRow, context);
    if (member?.Type instanceof FunctionTypeSymbol) {
      return {
        Outputs: member.Type.Outputs,
        Location: location,
        EffectRow: target.EffectRow.Union(member.Type.EffectRow),
      };
    }
    return null;
  }

  private CheckPerform(knot: KnKnot, environment: Map<string, TypeSymbol>, context: CheckContext = {}): CheckedExpression {
    const operation = this.ResolvePerformOperation(knot);
    const location = `perform ${operation.DisplayName}`;
    if (operation.Member == null || !(operation.Member.Type instanceof FunctionTypeSymbol)) {
      this.AddDiagnostic('KTC070', `Typed perform operation '${operation.DisplayName}' is not declared.`, location);
      return null;
    }

    const argTypes = this.ReadPerformArgNodes(knot)
      .map(arg => this.CheckExpression(arg, environment, operation.EffectRow, context))
      .map(arg => arg?.Outputs ?? []);
    const actual = ([] as TypeSymbol[]).concat(...argTypes);
    const signature = operation.Member.Type;
    if (!this.AreOutputStacksCompatible(actual, signature.Parameters)) {
      this.AddDiagnostic('KTC071', `Perform '${operation.DisplayName}' expects input stack '${formatTypeList(signature.Parameters)}' but received '${formatTypeList(actual)}'.`, location);
      return null;
    }

    return {
      Outputs: signature.Outputs,
      Location: location,
      EffectRow: operation.EffectRow,
    };
  }

  private CheckProjectionSegment(target: CheckedExpression, segment: KnKnot): CheckedExpression {
    const targetTypeName = getTypeName(
      (segment.Params?.Value as any[])?.[0]
      ?? (segment.InOutTable?.RawValue as any[])?.[0]?.[2]?.[0]
      ?? segment.Next?.Core,
    );
    const location = `${target.Location} ~as ${targetTypeName}`;
    const targetType = this.ResolveTypeName(targetTypeName);
    if (targetType == null) {
      this.AddDiagnostic('KTC020', `Projection target '${targetTypeName}' is not defined.`, location);
      return null;
    }
    const projection = new TypeProjection(target.Outputs[target.Outputs.length - 1], targetType);
    if (!projection.IsValidProjection(this.binding.TypeSystem)) {
      this.AddDiagnostic('KTC020', `Invalid projection: ${target.Outputs[target.Outputs.length - 1].Name} cannot be viewed as ${targetType.Name}.`, location);
      return null;
    }
    return single(new TypeProjection(target.Outputs[target.Outputs.length - 1], targetType), location, target.EffectRow, targetType);
  }

  private ResolveMember(
    type: TypeSymbol,
    memberRef: MemberReference,
    requireMethod: boolean,
    location: string,
    activeEffectRow?: EffectRow,
    context: CheckContext = {},
  ): RowMember {
    const rows = this.GetRows(type);
    if (rows == null) {
      this.AddDiagnostic('KTC010', `Type '${type?.Name}' does not expose slot '${memberRef.DisplayName}'.`, location);
      return null;
    }

    let candidates = rows.EnumerateByName(memberRef.Name)
      .filter(member => !member.IsVirtual)
      .filter(member => memberRef.Origin == null || member.Origin === memberRef.Origin)
      .filter(member => requireMethod
        ? member.IsMethod
        : !member.IsMethod && !member.IsSpreadParameter);
    if (activeEffectRow != null && candidates.some(member => member.EffectContext != null)) {
      candidates = candidates.filter(member => member.EffectContext == null || member.EffectContext.IsSubsetOf(activeEffectRow));
    }

    if (candidates.length === 0) {
      this.AddDiagnostic('KTC010', `Slot '${memberRef.DisplayName}' is not exposed by type '${type.Name}'.`, location);
      return null;
    }
    if (memberRef.Origin == null && candidates.length > 1 && !(type instanceof ClassTypeSymbol)) {
      const accessKind = requireMethod ? 'Receiver call' : 'Slot access';
      this.AddDiagnostic('KTC030', `${accessKind} '${memberRef.Name}' is ambiguous across origins: ${candidates.map(member => member.Origin).join(', ')}.`, location);
      return null;
    }
    const selected = candidates[0];
    if (!this.IsMemberAccessible(type, selected, context)) {
      this.AddDiagnostic('KTC080', `Member '${memberRef.DisplayName}' is not accessible from this context.`, location);
      return null;
    }
    return selected;
  }

  private IsMemberAccessible(type: TypeSymbol, member: RowMember, context: CheckContext): boolean {
    if (member.Access === AccessModifier.Public) {
      return true;
    }
    if (context.InClassBody && context.CurrentClass != null) {
      const owner = type instanceof TypeProjection ? type.SourceType : type;
      if (owner instanceof ClassTypeSymbol && owner.MethodResolutionOrder.includes(context.CurrentClass)) {
        return true;
      }
      if (owner === context.CurrentClass) {
        return true;
      }
    }
    return false;
  }

  private ReadMemberReference(node: any): MemberReference {
    if (node instanceof KnWord) {
      return {
        Name: node.Value,
        Origin: node.SourceQualifier,
        DisplayName: node.GetFullNameStr(),
      };
    }
    const name = getWord(node);
    return { Name: name, Origin: null, DisplayName: name };
  }

  private GetRows(type: TypeSymbol): RowTypeSymbol {
    if (type instanceof TypeProjection) {
      return this.GetRows(type.TargetType);
    }
    if (type instanceof RowTypeSymbol) {
      return type;
    }
    if (type instanceof ClassTypeSymbol) {
      return type.Rows;
    }
    return null;
  }

  private ResolveTypeNode(node: any): TypeSymbol {
    if (node instanceof KnWord && node.GenericArgs != null && node.GenericArgs.length > 0) {
      const base = this.ResolveTypeName(node.Value);
      const typeArgs = node.GenericArgs.map(arg => this.ResolveTypeNode(arg));
      if (base instanceof ClassTypeSymbol) {
        if (base.TypeParameters.length === 0) {
          this.AddDiagnostic('KTC070', `Type '${base.Name}' is not generic.`, node.GetFullNameStr());
          return new TypeReferenceSymbol(node.Value, typeArgs);
        }
        try {
          return this.binding.TypeSystem.InstantiateGenericClass(base, ...typeArgs);
        } catch (error) {
          this.AddDiagnostic('KTC070', error?.message ?? String(error), node.GetFullNameStr());
          return new TypeReferenceSymbol(node.Value, typeArgs);
        }
      }
      return new TypeReferenceSymbol(node.Value, typeArgs);
    }
    return this.ResolveTypeName(getTypeName(node)) ?? new TypeReferenceSymbol(getTypeName(node) ?? String(node));
  }

  private ResolveTypeName(name: string): TypeSymbol {
    if (name == null) {
      return null;
    }
    const primitive = this.ResolvePrimitiveAlias(name);
    if (primitive != null) {
      return primitive;
    }
    const registered = this.binding.TypeSystem.Registry.TryGet(name);
    if (registered != null) {
      return registered;
    }
    try {
      return this.binding.TypeSystem.RequireClassSymbol(name);
    } catch {
      return null;
    }
  }

  private ResolvePrimitiveAlias(name: string): TypeSymbol {
    switch (name) {
      case 'Unit':
      case 'unit':
      case 'Never':
      case 'never':
        return this.binding.TypeSystem.Registry.Never;
      case 'Int':
      case 'int':
        return this.binding.TypeSystem.Registry.Int;
      case 'String':
      case 'str':
        return this.binding.TypeSystem.Registry.String;
      case 'Bool':
      case 'bool':
        return this.binding.TypeSystem.Registry.Bool;
      case 'Any':
      case 'any':
        return this.binding.TypeSystem.Registry.Any;
      default:
        return null;
    }
  }

  private AreOutputStacksCompatible(actual: TypeSymbol[], expected: TypeSymbol[], allowAnyActual = false): boolean {
    if (actual.length !== expected.length) {
      return false;
    }
    for (let i = 0; i < actual.length; i++) {
      if (allowAnyActual && actual[i] === this.binding.TypeSystem.Registry.Any) {
        continue;
      }
      if (!this.binding.TypeSystem.AreTypesCompatible(actual[i], expected[i])) {
        return false;
      }
    }
    return true;
  }

  private ApplyHandler(residualEffects: EffectRow, handlerName: string, location: string): EffectRow {
    const handler = this.binding.EffectHandlers.find(candidate => candidate.Name === handlerName);
    if (handler == null) {
      this.AddDiagnostic('KTC060', `Unknown effect handler '${handlerName}'.`, location);
      return residualEffects;
    }
    const residual = residualEffects.Subtract(handler.HandledEffects);
    if (residual.Effects.length === residualEffects.Effects.length && residual.IsOpen === residualEffects.IsOpen) {
      this.AddDiagnostic('KTC061', `Effect handler '${handlerName}' does not affect residual effects ${residualEffects.ToDisplayString()}.`, location);
    }
    return residual;
  }

  private IsPostfixEffectHandle(node: any): boolean {
    return node instanceof KnKnot && node.CallType === KnotCallType.PostfixCall && getWord(node.Core) === 'effect';
  }

  private ReadHandlerPostfixes(node: KnKnot): string[] {
    if (!this.IsPostfixEffectHandle(node)) {
      return [];
    }
    const names: string[] = [];
    let current = node.Next;
    while (current != null) {
      const name = getTypeName(current.Name ?? current.Core);
      if (name != null && name !== 'handle') {
        names.push(name);
      }
      current = current.Next;
    }
    return names;
  }

  private ResolveFunctionSignature(functionName: string, node: any, actualInputs: TypeSymbol[], location: string): FunctionTypeSymbol {
    const generic = this.binding.GenericFunctions[functionName];
    if (generic != null) {
      return this.InstantiateGenericFunction(generic, node, actualInputs, location);
    }
    return this.binding.Functions[functionName] ?? null;
  }

  private InstantiateGenericFunction(
    generic: GenericFunctionTypeSymbol,
    node: any,
    actualInputs: TypeSymbol[],
    location: string,
  ): FunctionTypeSymbol {
    const explicitArgs = node instanceof KnWord && node.GenericArgs != null
      ? node.GenericArgs.map(arg => this.ResolveTypeNode(arg))
      : null;
    const substitutions = new Map<string, TypeSymbol>();

    if (explicitArgs != null) {
      if (explicitArgs.length !== generic.TypeParameters.length) {
        this.AddDiagnostic('KTC070', `Generic function '${generic.Name}' expects ${generic.TypeParameters.length} type arguments but received ${explicitArgs.length}.`, location);
        return null;
      }
      for (let i = 0; i < generic.TypeParameters.length; i++) {
        substitutions.set(generic.TypeParameters[i].Name, explicitArgs[i]);
      }
    } else {
      for (let i = 0; i < generic.Signature.Parameters.length && i < actualInputs.length; i++) {
        if (!this.InferGenericType(generic.Signature.Parameters[i], actualInputs[i], generic.TypeParameters, substitutions)) {
          this.AddDiagnostic('KTC071', `Generic function '${generic.Name}' cannot infer a consistent type argument for parameter stack '${formatTypeList(generic.Signature.Parameters)}'.`, location);
          return null;
        }
      }
      for (const parameter of generic.TypeParameters) {
        if (!substitutions.has(parameter.Name)) {
          substitutions.set(parameter.Name, this.binding.TypeSystem.Registry.Any);
        }
      }
    }

    return new FunctionTypeSymbol(
      generic.Signature.Name,
      generic.Signature.Parameters.map(type => this.SubstituteGenericType(type, substitutions)),
      generic.Signature.Outputs.map(type => this.SubstituteGenericType(type, substitutions)),
      generic.Signature.EffectRow,
    );
  }

  private InferGenericType(
    expected: TypeSymbol,
    actual: TypeSymbol,
    parameters: TypeParameter[],
    substitutions: Map<string, TypeSymbol>,
  ): boolean {
    const parameter = parameters.find(item => item.Name === expected.Name);
    if (parameter != null) {
      const existing = substitutions.get(parameter.Name);
      if (existing == null) {
        substitutions.set(parameter.Name, actual);
        return true;
      }
      return this.binding.TypeSystem.AreTypesCompatible(actual, existing)
        && this.binding.TypeSystem.AreTypesCompatible(existing, actual);
    }

    if (expected instanceof TypeReferenceSymbol && actual instanceof TypeReferenceSymbol) {
      if (expected.BaseName !== actual.BaseName || expected.TypeArguments.length !== actual.TypeArguments.length) {
        return false;
      }
      for (let i = 0; i < expected.TypeArguments.length; i++) {
        if (!this.InferGenericType(expected.TypeArguments[i], actual.TypeArguments[i], parameters, substitutions)) {
          return false;
        }
      }
    }

    return true;
  }

  private SubstituteGenericType(type: TypeSymbol, substitutions: Map<string, TypeSymbol>): TypeSymbol {
    const replacement = substitutions.get(type.Name);
    if (replacement != null) {
      return replacement;
    }
    if (type instanceof TypeReferenceSymbol && type.TypeArguments.length > 0) {
      return new TypeReferenceSymbol(
        type.BaseName,
        type.TypeArguments.map(argument => this.SubstituteGenericType(argument, substitutions)),
      );
    }
    if (type instanceof FunctionTypeSymbol) {
      return new FunctionTypeSymbol(
        type.Name,
        type.Parameters.map(parameter => this.SubstituteGenericType(parameter, substitutions)),
        type.Outputs.map(output => this.SubstituteGenericType(output, substitutions)),
        type.EffectRow,
      );
    }
    return type;
  }

  private ResolvePerformOperation(knot: KnKnot): { DisplayName: string; Member: RowMember; EffectRow: EffectRow } {
    const nameNode = knot.Name ?? this.ReadTupleInputNodes(knot.Params ?? knot.InOutTable)[0];
    const displayName = getTypeName(nameNode) ?? '<missing>';
    if (!(nameNode instanceof KnWord)) {
      return { DisplayName: displayName, Member: null, EffectRow: EffectRow.EmptyClosed };
    }

    const effectName = nameNode.SourceQualifier ?? (nameNode.Qualifiers.length > 0 ? nameNode.Qualifiers.join('.') : null);
    const operationName = nameNode.Value;
    if (effectName == null) {
      return { DisplayName: displayName, Member: null, EffectRow: EffectRow.EmptyClosed };
    }

    const effectType = this.binding.TypeSystem.Registry.TryGet(effectName);
    const effectRow = this.binding.TypeSystem.Registry.GetOrCreateEffect(effectName);
    const row = effectType instanceof RowTypeSymbol ? effectType : null;
    const member = row?.EnumerateByName(operationName).find(candidate => candidate.IsMethod) ?? null;
    return {
      DisplayName: displayName,
      Member: member,
      EffectRow: EffectRow.FromEffects([effectRow]),
    };
  }

  private ReadPerformArgNodes(knot: KnKnot): any[] {
    const nodes = this.ReadTupleInputNodes(knot.Params ?? knot.InOutTable);
    return knot.Name == null ? nodes.slice(1) : nodes;
  }

  private KnotToArray(knot: KnKnot): KnKnot[] {
    const nodes: KnKnot[] = [];
    let current: KnKnot = knot;
    while (current != null) {
      nodes.push(current);
      current = current.Next;
    }
    return nodes;
  }

  private ReadTupleInputNodes(tuple: any): any[] {
    const rows = tuple?.RawValue as any[];
    return rows?.[0]?.[2] ?? [];
  }

  private GetLiteralType(node: any): TypeSymbol {
    if (typeof node === 'number') {
      return this.binding.TypeSystem.Registry.Int;
    }
    if (typeof node === 'string') {
      return this.binding.TypeSystem.Registry.String;
    }
    if (typeof node === 'boolean') {
      return this.binding.TypeSystem.Registry.Bool;
    }
    return null;
  }

  private AddDiagnostic(code: string, message: string, location?: string): void {
    this.diagnostics.push(new TypeBindingDiagnostic(code, message, location));
  }
}

function isTypeSystemDeclarationOrFunction(node: any): boolean {
  return node instanceof KnKnot && ['type', 'class', 'trait', 'fn'].includes(getWord(node.Core));
}

function isFunctionDeclaration(node: any): boolean {
  return node instanceof KnKnot && getWord(node.Core) === 'fn';
}

function isClassDeclaration(node: any): boolean {
  return node instanceof KnKnot && ['class', 'trait'].includes(getWord(node.Core));
}

function single(type: TypeSymbol, location: string, effectRow: EffectRow, projectionTarget?: TypeSymbol): CheckedExpression {
  const output = projectionTarget == null ? type : new TypeProjection(type, projectionTarget);
  return { Outputs: [output], Location: location, EffectRow: effectRow, ProjectionTarget: projectionTarget };
}

function formatTypeList(types: TypeSymbol[]): string {
  return types.length === 0 ? 'never' : types.map(type => type.Name).join(', ');
}
