import { RuntimeState } from 'kunun-runtime/RuntimeInterpreter/RuntimeState';
import type { BaseTypeInput, TypeSystem } from './TypeSystem';
import type { ClassTypeSymbol, ClassDefinition, EnumTypeSymbol, EnumValueInput, GenericRowTypeSymbol, RowMember, RowTypeSymbol, TypeParameter, TypeSymbol } from './Types';
export declare const TypeComputationOps: {
    readonly DefineRowType: "type.compute.define_row_type";
    readonly DefineGenericRowType: "type.compute.define_generic_row_type";
    readonly InstantiateGenericRowType: "type.compute.instantiate_generic_row_type";
    readonly DefineClass: "type.compute.define_class";
    readonly DefineEnum: "type.compute.define_enum";
    readonly InstantiateGenericClass: "type.compute.instantiate_generic_class";
    readonly MergeRows: "type.compute.merge_rows";
    readonly IsSubtype: "type.compute.is_subtype";
    readonly AreTypesCompatible: "type.compute.are_types_compatible";
};
export interface TypeComputationTraceEntry {
    op: string;
    args: any[];
}
export declare class KonTypeComputationRuntime {
    readonly Runtime: RuntimeState;
    readonly Trace: TypeComputationTraceEntry[];
    constructor();
    defineRowType(typeSystem: TypeSystem, name: string, members: RowMember[], isOpen: boolean): RowTypeSymbol;
    defineGenericRowType(typeSystem: TypeSystem, name: string, typeParameters: TypeParameter[], members: RowMember[], isOpen: boolean): GenericRowTypeSymbol;
    instantiateGenericRowType(typeSystem: TypeSystem, genericType: GenericRowTypeSymbol, typeArguments: TypeSymbol[]): RowTypeSymbol;
    defineClass(typeSystem: TypeSystem, name: string, members: RowMember[], isOpen: boolean, bases: BaseTypeInput[], methodBodies: any[], isTrait: boolean, typeParameters: TypeParameter[]): ClassDefinition;
    defineEnum(typeSystem: TypeSystem, name: string, values: Array<string | EnumValueInput>, options: {
        Representation?: TypeSymbol;
        Metadata?: {
            [key: string]: any;
        };
    }): EnumTypeSymbol;
    instantiateGenericClass(typeSystem: TypeSystem, classType: ClassTypeSymbol, typeArguments: TypeSymbol[]): ClassTypeSymbol;
    mergeRows(typeSystem: TypeSystem, resultName: string, rows: RowTypeSymbol[]): RowTypeSymbol;
    isSubtype(typeSystem: TypeSystem, candidate: RowTypeSymbol | ClassTypeSymbol, target: RowTypeSymbol | ClassTypeSymbol): boolean;
    areTypesCompatible(typeSystem: TypeSystem, candidate: TypeSymbol, required: TypeSymbol): boolean;
    private call;
    private RegisterOperations;
}
