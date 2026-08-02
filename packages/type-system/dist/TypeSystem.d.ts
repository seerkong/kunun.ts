import { AccessModifier, BrandedScalarTypeSymbol, ClassDefinition, ClassTypeSymbol, EnumTypeSymbol, EnumValueInput, GenericRowTypeSymbol, InheritanceKind, RelationTypeSymbol, RowMember, RowTypeSymbol, SchemaMixinSymbol, SchemaTypeSymbol, TypeParameter, TypeSymbol } from './Types';
import { TypeRegistry } from './TypeRegistry';
import { KonTypeComputationRuntime } from './KonTypeComputationRuntime';
export interface BaseTypeInput {
    Name: string;
    Inheritance?: InheritanceKind;
    Access?: AccessModifier;
}
export declare class TypeSystem {
    private readonly classes;
    private readonly enums;
    private readonly brandedScalars;
    private readonly schemaMixins;
    private readonly schemaTypes;
    private readonly relations;
    private readonly schemaTypeAliases;
    private readonly relationAliases;
    private readonly attributeAliases;
    private readonly computationRuntime;
    readonly Registry: TypeRegistry;
    constructor(computationRuntime?: KonTypeComputationRuntime);
    get TypeComputationRuntime(): KonTypeComputationRuntime;
    DefineRowType(name: string, members: RowMember[], isOpen: boolean): RowTypeSymbol;
    defineRowTypeDirect(name: string, members: RowMember[], isOpen: boolean): RowTypeSymbol;
    DefineGenericRowType(name: string, typeParameters: {
        Name: string;
        IsRowParameter?: boolean;
    }[], members: RowMember[], isOpen: boolean): GenericRowTypeSymbol;
    defineGenericRowTypeDirect(name: string, typeParameters: {
        Name: string;
        IsRowParameter?: boolean;
    }[], members: RowMember[], isOpen: boolean): GenericRowTypeSymbol;
    InstantiateGenericRowType(genericType: GenericRowTypeSymbol, ...typeArguments: TypeSymbol[]): RowTypeSymbol;
    instantiateGenericRowTypeDirect(genericType: GenericRowTypeSymbol, ...typeArguments: TypeSymbol[]): RowTypeSymbol;
    DefineClass(name: string, members: RowMember[], isOpen: boolean, bases: BaseTypeInput[], methodBodies?: any[], isTrait?: boolean, typeParameters?: TypeParameter[]): ClassDefinition;
    defineClassDirect(name: string, members: RowMember[], isOpen: boolean, bases: BaseTypeInput[], methodBodies?: any[], isTrait?: boolean, typeParameters?: TypeParameter[]): ClassDefinition;
    InstantiateGenericClass(classType: ClassTypeSymbol, ...typeArguments: TypeSymbol[]): ClassTypeSymbol;
    instantiateGenericClassDirect(classType: ClassTypeSymbol, ...typeArguments: TypeSymbol[]): ClassTypeSymbol;
    RequireClassSymbol(name: string): ClassTypeSymbol;
    RequireClass(name: string): ClassDefinition;
    DefineEnum(name: string, values: Array<string | EnumValueInput>, options?: {
        Representation?: TypeSymbol;
        Metadata?: {
            [key: string]: any;
        };
    }): EnumTypeSymbol;
    defineEnumDirect(name: string, values: Array<string | EnumValueInput>, options?: {
        Representation?: TypeSymbol;
        Metadata?: {
            [key: string]: any;
        };
    }): EnumTypeSymbol;
    RequireEnum(name: string): EnumTypeSymbol;
    DefineBrandedScalar(name: string, representation?: TypeSymbol, metadata?: {
        [key: string]: any;
    }): BrandedScalarTypeSymbol;
    RequireBrandedScalar(name: string): BrandedScalarTypeSymbol;
    DefineSchemaMixin(name: string, members: RowMember[], isOpen?: boolean, metadata?: {
        [key: string]: any;
    }): SchemaMixinSymbol;
    RequireSchemaMixin(name: string): SchemaMixinSymbol;
    DefineSchemaType(name: string, members: RowMember[], options?: {
        IsOpen?: boolean;
        Parent?: string | SchemaTypeSymbol;
        Mixins?: Array<string | SchemaMixinSymbol>;
        Metadata?: {
            [key: string]: any;
        };
    }): SchemaTypeSymbol;
    RequireSchemaType(name: string): SchemaTypeSymbol;
    IsSchemaSubtype(candidate: SchemaTypeSymbol, target: SchemaTypeSymbol): boolean;
    DefineRelation(name: string, from: string | SchemaTypeSymbol, to: string | SchemaTypeSymbol, directed?: boolean, metadata?: {
        [key: string]: any;
    }): RelationTypeSymbol;
    RequireRelation(name: string): RelationTypeSymbol;
    CheckRelationEndpoints(relation: RelationTypeSymbol, from: SchemaTypeSymbol, to: SchemaTypeSymbol): boolean;
    GetSchemaTypeSet(type: string | SchemaTypeSymbol, options?: {
        exact?: boolean;
    }): SchemaTypeSymbol[];
    DefineSchemaTypeAlias(alias: string, canonical: string): void;
    DefineRelationAlias(alias: string, canonical: string): void;
    DefineAttributeAlias(typeName: string, alias: string, canonical: string): void;
    ResolveSchemaTypeName(name: string): string;
    ResolveRelationName(name: string): string;
    ResolveAttributeName(typeName: string, name: string): string;
    private BuildSchemaEffectiveRow;
    private ResolveAlias;
    MergeRows(resultName: string, ...rows: RowTypeSymbol[]): RowTypeSymbol;
    mergeRowsDirect(resultName: string, ...rows: RowTypeSymbol[]): RowTypeSymbol;
    IsSubtype(candidate: RowTypeSymbol | ClassTypeSymbol, target: RowTypeSymbol | ClassTypeSymbol): boolean;
    isSubtypeDirect(candidate: RowTypeSymbol | ClassTypeSymbol, target: RowTypeSymbol | ClassTypeSymbol): boolean;
    private MemberTypesAreCompatible;
    AreTypesCompatible(candidate: TypeSymbol, required: TypeSymbol): boolean;
    areTypesCompatibleDirect(candidate: TypeSymbol, required: TypeSymbol): boolean;
}
