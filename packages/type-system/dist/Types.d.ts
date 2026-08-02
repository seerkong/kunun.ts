import { TypeSystem } from './TypeSystem';
export interface TypeSymbol {
    Name: string;
}
export type MethodImplementation = (context: any, args: any[]) => any;
export declare class PrimitiveTypeSymbol implements TypeSymbol {
    readonly Name: string;
    constructor(Name: string);
}
export interface TypeMetadata {
    [key: string]: any;
}
export declare class AnyTypeSymbol implements TypeSymbol {
    readonly Name = "any";
}
export declare class NeverTypeSymbol implements TypeSymbol {
    readonly Name = "never";
}
export declare class TypeReferenceSymbol implements TypeSymbol {
    readonly BaseName: string;
    readonly TypeArguments: TypeSymbol[];
    readonly Name: string;
    constructor(BaseName: string, TypeArguments?: TypeSymbol[]);
}
export declare class FunctionTypeSymbol implements TypeSymbol {
    readonly Name: string;
    readonly Parameters: TypeSymbol[];
    readonly Outputs: TypeSymbol[];
    readonly EffectRow: EffectRow;
    constructor(Name: string, Parameters: TypeSymbol[], Outputs: TypeSymbol[], effectRow?: EffectRow);
    get ReturnType(): TypeSymbol;
    get Effects(): EffectSymbol[];
}
export declare class MethodBody {
    readonly Member: RowMember;
    readonly Implementation: MethodImplementation;
    constructor(Member: RowMember, Implementation: MethodImplementation);
}
export declare class MethodBuilder {
    static FromFunction(member: RowMember, implementation: MethodImplementation): MethodBody;
    static FromLambda(owner: string, name: string, signature: FunctionTypeSymbol, implementation: MethodImplementation, qualifier?: RowQualifier, access?: AccessModifier): MethodBody;
}
export declare class GenericFunctionTypeSymbol implements TypeSymbol {
    readonly Name: string;
    readonly TypeParameters: TypeParameter[];
    readonly Signature: FunctionTypeSymbol;
    constructor(Name: string, TypeParameters: TypeParameter[], Signature: FunctionTypeSymbol);
}
export declare class EffectSymbol implements TypeSymbol {
    readonly Name: string;
    constructor(Name: string);
}
export declare class BrandedScalarTypeSymbol implements TypeSymbol {
    readonly Name: string;
    readonly Representation: TypeSymbol;
    readonly Metadata: TypeMetadata;
    constructor(Name: string, Representation: TypeSymbol, Metadata?: TypeMetadata);
}
export interface EnumValueInput {
    Name: string;
    Code?: any;
    Metadata?: TypeMetadata;
}
export declare class EnumTypeSymbol implements TypeSymbol {
    readonly Name: string;
    readonly Representation: TypeSymbol;
    readonly Metadata: TypeMetadata;
    readonly Values: EnumValueSymbol[];
    readonly IsClosed = true;
    constructor(Name: string, Representation: TypeSymbol, Metadata?: TypeMetadata);
    AddValue(name: string, code?: any, metadata?: TypeMetadata): EnumValueSymbol;
    RequireValue(name: string): EnumValueSymbol;
}
export declare class EnumValueSymbol implements TypeSymbol {
    readonly ValueName: string;
    readonly Owner: EnumTypeSymbol;
    readonly Code: any;
    readonly Metadata: TypeMetadata;
    readonly Name: string;
    readonly QualifiedName: string;
    constructor(ValueName: string, Owner: EnumTypeSymbol, Code?: any, Metadata?: TypeMetadata);
}
export interface TypeParameter extends TypeSymbol {
    IsRowParameter?: boolean;
}
export declare enum RowQualifier {
    Default = "default",
    Virtual = "virtual",
    Final = "final",
    Override = "override",
    Inherit = "inherit"
}
export declare enum AccessModifier {
    Public = "public",
    Protected = "protected",
    Private = "private",
    Internal = "internal"
}
export declare class EffectRow {
    readonly Effects: EffectSymbol[];
    readonly IsOpen: boolean;
    static readonly EmptyClosed: EffectRow;
    private constructor();
    get IsClosed(): boolean;
    get IsEmpty(): boolean;
    static FromEffects(effects: EffectSymbol[], isOpen?: boolean): EffectRow;
    Contains(effect: EffectSymbol): boolean;
    IsSubsetOf(target: EffectRow): boolean;
    Subtract(handled: EffectRow): EffectRow;
    Union(other: EffectRow): EffectRow;
    ToDisplayString(): string;
}
export declare class RowMember {
    readonly Name: string;
    readonly Type: TypeSymbol;
    readonly Qualifier: RowQualifier;
    readonly Origin: string;
    readonly IsMethod: boolean;
    readonly Access: AccessModifier;
    readonly EffectContext?: EffectRow;
    constructor(Name: string, Type: TypeSymbol, Qualifier: RowQualifier, Origin: string, IsMethod: boolean, options?: {
        Access?: AccessModifier;
        EffectContext?: EffectRow;
        Metadata?: TypeMetadata;
    });
    readonly Metadata: TypeMetadata;
    get IsVirtual(): boolean;
    get IsFinal(): boolean;
    get IsOverride(): boolean;
    get IsInherit(): boolean;
    get ShouldForward(): boolean;
    get IsSpreadParameter(): boolean;
    get EffectContextKey(): string;
    WithEffectContext(effectContext: EffectRow): RowMember;
    WithType(type: TypeSymbol): RowMember;
}
export declare class RowMemberBuilder {
    static Method(origin: string, name: string, type: TypeSymbol, qualifier?: RowQualifier, access?: AccessModifier, metadata?: TypeMetadata): RowMember;
    static Field(origin: string, name: string, type: TypeSymbol, qualifier?: RowQualifier, access?: AccessModifier, metadata?: TypeMetadata): RowMember;
    static Spread(origin: string, name: string, type: TypeSymbol, metadata?: TypeMetadata): RowMember;
}
export declare enum RowMemberResolutionStatus {
    Success = "success",
    NotFound = "not_found",
    Ambiguous = "ambiguous"
}
export declare class RowMemberResolutionResult {
    readonly Status: RowMemberResolutionStatus;
    readonly Member: RowMember;
    readonly Candidates: RowMember[];
    constructor(Status: RowMemberResolutionStatus, Member: RowMember, Candidates: RowMember[]);
    get Success(): boolean;
}
export declare class RowTypeSymbol implements TypeSymbol {
    readonly Name: string;
    readonly Members: RowMember[];
    readonly IsOpen: boolean;
    constructor(Name: string, Members: RowMember[], IsOpen: boolean);
    Resolve(name: string, origin?: string): RowMember;
    ResolveWithEffectContext(name: string, activeEffectContext: EffectRow): RowMemberResolutionResult;
    Append(other: RowTypeSymbol): RowTypeSymbol;
    EnumerateByName(name: string): RowMember[];
}
export declare class SchemaMixinSymbol implements TypeSymbol {
    readonly Name: string;
    readonly Row: RowTypeSymbol;
    readonly Metadata: TypeMetadata;
    constructor(Name: string, Row: RowTypeSymbol, Metadata?: TypeMetadata);
}
export declare class SchemaTypeSymbol implements TypeSymbol {
    readonly Name: string;
    readonly DeclaredRow: RowTypeSymbol;
    readonly EffectiveRow: RowTypeSymbol;
    readonly Parent?: SchemaTypeSymbol;
    readonly Mixins: SchemaMixinSymbol[];
    readonly Metadata: TypeMetadata;
    constructor(Name: string, DeclaredRow: RowTypeSymbol, EffectiveRow: RowTypeSymbol, Parent?: SchemaTypeSymbol, Mixins?: SchemaMixinSymbol[], Metadata?: TypeMetadata);
}
export declare class RelationTypeSymbol implements TypeSymbol {
    readonly Name: string;
    readonly From: SchemaTypeSymbol;
    readonly To: SchemaTypeSymbol;
    readonly Directed: boolean;
    readonly Metadata: TypeMetadata;
    constructor(Name: string, From: SchemaTypeSymbol, To: SchemaTypeSymbol, Directed?: boolean, Metadata?: TypeMetadata);
}
export declare abstract class GenericTypeSymbol implements TypeSymbol {
    readonly Name: string;
    readonly TypeParameters: TypeParameter[];
    constructor(Name: string, TypeParameters: TypeParameter[]);
    protected ValidateTypeArguments(typeArguments: TypeSymbol[]): void;
    abstract Instantiate(typeArguments: TypeSymbol[]): TypeSymbol;
}
export declare class GenericRowTypeSymbol extends GenericTypeSymbol {
    readonly Members: RowMember[];
    readonly IsOpen: boolean;
    constructor(name: string, typeParameters: TypeParameter[], Members: RowMember[], IsOpen: boolean);
    Instantiate(typeArguments: TypeSymbol[]): TypeSymbol;
}
export declare enum InheritanceKind {
    Real = "real",
    Virtual = "virtual"
}
export interface BaseTypeReference {
    Type: ClassTypeSymbol;
    Inheritance: InheritanceKind;
    Access: AccessModifier;
}
export declare class ClassTypeSymbol implements TypeSymbol {
    readonly Name: string;
    readonly DeclaredRows: RowTypeSymbol;
    readonly Bases: BaseTypeReference[];
    readonly ImplementedTraits: ClassTypeSymbol[];
    readonly IsTrait: boolean;
    readonly TypeParameters: TypeParameter[];
    private rowsCache?;
    private mroCache?;
    constructor(Name: string, DeclaredRows: RowTypeSymbol, Bases: BaseTypeReference[], ImplementedTraits: ClassTypeSymbol[], IsTrait: boolean, TypeParameters?: TypeParameter[]);
    get MethodResolutionOrder(): ClassTypeSymbol[];
    get Rows(): RowTypeSymbol;
    Instantiate(typeArguments: TypeSymbol[]): ClassTypeSymbol;
}
export declare class ClassDefinition implements TypeSymbol {
    readonly Type: ClassTypeSymbol;
    readonly Methods: MethodBody[];
    constructor(Type: ClassTypeSymbol, Methods: MethodBody[]);
    get Name(): string;
    get DeclaredRows(): RowTypeSymbol;
    get Bases(): BaseTypeReference[];
    get ImplementedTraits(): ClassTypeSymbol[];
    get IsTrait(): boolean;
    get MethodResolutionOrder(): ClassTypeSymbol[];
    get Rows(): RowTypeSymbol;
}
export declare class TypeProjection implements TypeSymbol {
    readonly SourceType: TypeSymbol;
    readonly TargetType: TypeSymbol;
    readonly Name: string;
    constructor(SourceType: TypeSymbol, TargetType: TypeSymbol);
    IsValidProjection(typeSystem: TypeSystem): boolean;
}
