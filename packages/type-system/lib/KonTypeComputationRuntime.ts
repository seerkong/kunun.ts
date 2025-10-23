import { RuntimeState } from 'kunun-runtime/RuntimeInterpreter/RuntimeState';
import type {
  BaseTypeInput,
  TypeSystem,
} from './TypeSystem';
import type {
  ClassTypeSymbol,
  ClassDefinition,
  EnumTypeSymbol,
  EnumValueInput,
  GenericRowTypeSymbol,
  RowMember,
  RowTypeSymbol,
  TypeParameter,
  TypeSymbol,
} from './Types';

export const TypeComputationOps = {
  DefineRowType: 'type.compute.define_row_type',
  DefineGenericRowType: 'type.compute.define_generic_row_type',
  InstantiateGenericRowType: 'type.compute.instantiate_generic_row_type',
  DefineClass: 'type.compute.define_class',
  DefineEnum: 'type.compute.define_enum',
  InstantiateGenericClass: 'type.compute.instantiate_generic_class',
  MergeRows: 'type.compute.merge_rows',
  IsSubtype: 'type.compute.is_subtype',
  AreTypesCompatible: 'type.compute.are_types_compatible',
} as const;

export interface TypeComputationTraceEntry {
  op: string;
  args: any[];
}

export class KonTypeComputationRuntime {
  public readonly Runtime: RuntimeState;
  public readonly Trace: TypeComputationTraceEntry[] = [];

  public constructor() {
    this.Runtime = new RuntimeState();
    this.RegisterOperations();
  }

  public defineRowType(typeSystem: TypeSystem, name: string, members: RowMember[], isOpen: boolean): RowTypeSymbol {
    return this.call(TypeComputationOps.DefineRowType, [typeSystem, name, members, isOpen]);
  }

  public defineGenericRowType(
    typeSystem: TypeSystem,
    name: string,
    typeParameters: TypeParameter[],
    members: RowMember[],
    isOpen: boolean,
  ): GenericRowTypeSymbol {
    return this.call(TypeComputationOps.DefineGenericRowType, [typeSystem, name, typeParameters, members, isOpen]);
  }

  public instantiateGenericRowType(
    typeSystem: TypeSystem,
    genericType: GenericRowTypeSymbol,
    typeArguments: TypeSymbol[],
  ): RowTypeSymbol {
    return this.call(TypeComputationOps.InstantiateGenericRowType, [typeSystem, genericType, typeArguments]);
  }

  public defineClass(
    typeSystem: TypeSystem,
    name: string,
    members: RowMember[],
    isOpen: boolean,
    bases: BaseTypeInput[],
    methodBodies: any[],
    isTrait: boolean,
    typeParameters: TypeParameter[],
  ): ClassDefinition {
    return this.call(TypeComputationOps.DefineClass, [
      typeSystem,
      name,
      members,
      isOpen,
      bases,
      methodBodies,
      isTrait,
      typeParameters,
    ]);
  }

  public defineEnum(
    typeSystem: TypeSystem,
    name: string,
    values: Array<string | EnumValueInput>,
    options: { Representation?: TypeSymbol; Metadata?: { [key: string]: any } },
  ): EnumTypeSymbol {
    return this.call(TypeComputationOps.DefineEnum, [typeSystem, name, values, options]);
  }

  public instantiateGenericClass(
    typeSystem: TypeSystem,
    classType: ClassTypeSymbol,
    typeArguments: TypeSymbol[],
  ): ClassTypeSymbol {
    return this.call(TypeComputationOps.InstantiateGenericClass, [typeSystem, classType, typeArguments]);
  }

  public mergeRows(typeSystem: TypeSystem, resultName: string, rows: RowTypeSymbol[]): RowTypeSymbol {
    return this.call(TypeComputationOps.MergeRows, [typeSystem, resultName, rows]);
  }

  public isSubtype(
    typeSystem: TypeSystem,
    candidate: RowTypeSymbol | ClassTypeSymbol,
    target: RowTypeSymbol | ClassTypeSymbol,
  ): boolean {
    return this.call(TypeComputationOps.IsSubtype, [typeSystem, candidate, target]);
  }

  public areTypesCompatible(typeSystem: TypeSystem, candidate: TypeSymbol, required: TypeSymbol): boolean {
    return this.call(TypeComputationOps.AreTypesCompatible, [typeSystem, candidate, required]);
  }

  private call<T>(op: string, args: any[]): T {
    this.Trace.push({ op, args });
    return this.Runtime.callHostFunction(op, args) as T;
  }

  private RegisterOperations(): void {
    this.Runtime.registerHostFunction(TypeComputationOps.DefineRowType, (
      typeSystem: TypeSystem,
      name: string,
      members: RowMember[],
      isOpen: boolean,
    ) => typeSystem.defineRowTypeDirect(name, members, isOpen), 4);

    this.Runtime.registerHostFunction(TypeComputationOps.DefineGenericRowType, (
      typeSystem: TypeSystem,
      name: string,
      typeParameters: TypeParameter[],
      members: RowMember[],
      isOpen: boolean,
    ) => typeSystem.defineGenericRowTypeDirect(name, typeParameters, members, isOpen), 5);

    this.Runtime.registerHostFunction(TypeComputationOps.InstantiateGenericRowType, (
      typeSystem: TypeSystem,
      genericType: GenericRowTypeSymbol,
      typeArguments: TypeSymbol[],
    ) => typeSystem.instantiateGenericRowTypeDirect(genericType, ...typeArguments), 3);

    this.Runtime.registerHostFunction(TypeComputationOps.DefineClass, (
      typeSystem: TypeSystem,
      name: string,
      members: RowMember[],
      isOpen: boolean,
      bases: BaseTypeInput[],
      methodBodies: any[],
      isTrait: boolean,
      typeParameters: TypeParameter[],
    ) => typeSystem.defineClassDirect(name, members, isOpen, bases, methodBodies, isTrait, typeParameters), 8);

    this.Runtime.registerHostFunction(TypeComputationOps.DefineEnum, (
      typeSystem: TypeSystem,
      name: string,
      values: Array<string | EnumValueInput>,
      options: { Representation?: TypeSymbol; Metadata?: { [key: string]: any } },
    ) => typeSystem.defineEnumDirect(name, values, options), 4);

    this.Runtime.registerHostFunction(TypeComputationOps.InstantiateGenericClass, (
      typeSystem: TypeSystem,
      classType: ClassTypeSymbol,
      typeArguments: TypeSymbol[],
    ) => typeSystem.instantiateGenericClassDirect(classType, ...typeArguments), 3);

    this.Runtime.registerHostFunction(TypeComputationOps.MergeRows, (
      typeSystem: TypeSystem,
      resultName: string,
      rows: RowTypeSymbol[],
    ) => typeSystem.mergeRowsDirect(resultName, ...rows), 3);

    this.Runtime.registerHostFunction(TypeComputationOps.IsSubtype, (
      typeSystem: TypeSystem,
      candidate: RowTypeSymbol | ClassTypeSymbol,
      target: RowTypeSymbol | ClassTypeSymbol,
    ) => typeSystem.isSubtypeDirect(candidate, target), 3);

    this.Runtime.registerHostFunction(TypeComputationOps.AreTypesCompatible, (
      typeSystem: TypeSystem,
      candidate: TypeSymbol,
      required: TypeSymbol,
    ) => typeSystem.areTypesCompatibleDirect(candidate, required), 3);
  }
}
