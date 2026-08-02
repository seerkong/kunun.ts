import { EffectRow, FunctionTypeSymbol, GenericFunctionTypeSymbol, TypeSymbol } from './Types';
import { TypeSystem } from './TypeSystem';
export declare class TypeBindingDiagnostic {
    readonly Code: string;
    readonly Message: string;
    readonly Location?: string;
    constructor(Code: string, Message: string, Location?: string);
}
export interface EffectHandlerBinding {
    Name: string;
    FunctionName: string;
    ImplementationFunctionName: string;
    HandledEffects: EffectRow;
}
export declare class TypeBindingResult {
    readonly TypeSystem: TypeSystem;
    readonly Diagnostics: TypeBindingDiagnostic[];
    readonly Functions: {
        [name: string]: FunctionTypeSymbol;
    };
    readonly GenericFunctions: {
        [name: string]: GenericFunctionTypeSymbol;
    };
    readonly EffectHandlers: EffectHandlerBinding[];
    constructor(TypeSystem: TypeSystem, Diagnostics: TypeBindingDiagnostic[], Functions: {
        [name: string]: FunctionTypeSymbol;
    }, GenericFunctions: {
        [name: string]: GenericFunctionTypeSymbol;
    }, EffectHandlers: EffectHandlerBinding[]);
    get Success(): boolean;
    ApplyEffectHandler(row: EffectRow, handlerName: string): EffectRow;
    ApplyEffectHandlers(row: EffectRow, handlerNames: string[]): EffectRow;
    ValidateClosedEffectBoundary(functionName: string, residualEffects: EffectRow): void;
}
export declare class KonTypeBinder {
    private readonly typeSystem;
    private readonly diagnostics;
    private readonly activeTypeParameters;
    private readonly functions;
    private readonly genericFunctions;
    private readonly effectHandlers;
    private pendingFunctionEffectRow;
    private pendingHandler;
    constructor(typeSystem?: TypeSystem);
    static BindSource(source: string): TypeBindingResult;
    Bind(declarations: any[]): TypeBindingResult;
    private BindTopLevelDeclaration;
    private BindTypeDeclaration;
    private BindMergedRowType;
    private BindClassDeclaration;
    private BindEnumDeclaration;
    private BindScalarDeclaration;
    private BindSchemaMixinDeclaration;
    private BindSchemaDeclaration;
    private BindSchemaAliasDeclaration;
    private BindRelationDeclaration;
    private BindRelationAliasDeclaration;
    private BindTopLevelAttributeDeclaration;
    private BindFunctionDeclaration;
    private BindMember;
    private BindSchemaMembers;
    private BindMethodMember;
    private BindFieldMember;
    private BindFunctionSignature;
    private BindInOutItemType;
    BindTypeNode(node: any): TypeSymbol;
    private TryResolvePrimitiveAlias;
    private ReadEffectPrefixes;
    private BindEffectHandlerPrefix;
    private BindEffectRowMarker;
    private CreateTypeParameters;
    private TryBindSpreadMember;
    private IsClosedRowMarker;
    private TryReadSpreadName;
    private ReadBaseReferences;
    private ReadMemberName;
    private ReadMetadataMemberName;
    private GetMemberInOutTable;
    private GetDeclarationName;
    private ParseAttributeAliasTarget;
    private ReadTypeMetadata;
    private ReadSourceAnnotations;
    private firstInOutInput;
    private TryRequireRow;
    private PushTypeParameters;
    private RestoreTypeParameters;
    private ClearPendingFunctionMetadata;
    private AddDiagnostic;
}
export declare function firstTypePrefix(node: any): any;
export declare function getWord(node: any): string;
export declare function getTypeName(node: any): string;
