import { ClassTypeSymbol, EffectSymbol, RowMember, TypeSymbol } from './Types';
import { TypeSystem } from './TypeSystem';
import { KonTypedExecutionContext, ObjectValue, TypedValue } from './KonTypedExecutionContext';
import { TypeBindingDiagnostic, TypeBindingResult } from './KonTypeBinder';
import { KnNodeType } from 'kunun-core/Model/KnNodeType';
interface FieldStorage {
    Member: RowMember;
    Value: TypedRuntimeValue;
    Initialized: boolean;
}
export type TypedRuntimeValueKind = 'primitive' | 'list' | 'map' | 'function' | 'object' | 'projected-object' | 'any';
export interface TypedRuntimeValue {
    kind: TypedRuntimeValueKind;
    value: any;
    type?: TypeSymbol;
}
export declare function WrapTypedRuntimeValue(value: any, typeSystem?: TypeSystem): TypedRuntimeValue;
export declare function UnwrapTypedRuntimeValue(value: TypedRuntimeValue): any;
export declare class KonTypedRuntimeBindingResult {
    readonly Binding: TypeBindingResult;
    readonly Context: KonTypedRuntimeContext;
    constructor(Binding: TypeBindingResult, Context: KonTypedRuntimeContext);
    get Diagnostics(): TypeBindingDiagnostic[];
    get Success(): boolean;
}
export declare class KonTypedObject {
    readonly Class: ClassTypeSymbol;
    readonly Fields: {
        [name: string]: FieldStorage[];
    };
    readonly Parents: {
        [className: string]: KonTypedObject;
    };
    readonly Prototype?: any;
    readonly Projection?: ClassTypeSymbol;
    readonly _Type = KnNodeType.KonTypedObject;
    constructor(Class: ClassTypeSymbol, Fields: {
        [name: string]: FieldStorage[];
    }, Parents?: {
        [className: string]: KonTypedObject;
    }, Prototype?: any, Projection?: ClassTypeSymbol);
}
export declare class KonTypedRuntimeContext {
    readonly TypeSystem: TypeSystem;
    PrototypeResolver?: (className: string) => any;
    private readonly effectScopes;
    private readonly globals;
    readonly Execution: KonTypedExecutionContext;
    private constructor();
    static BindSource(source: string): KonTypedRuntimeBindingResult;
    static Bind(nodes: any[]): KonTypedRuntimeBindingResult;
    static BindSourceOptional(source: string): KonTypedRuntimeBindingResult;
    CreateObject(className: string, prototype?: any): KonTypedObject;
    Instantiate(className: string): ObjectValue;
    ToTypedValue(value: any): TypedValue;
    FromTypedValue(value: TypedValue): any;
    Project(target: KonTypedObject, targetTypeName: string): KonTypedObject;
    ReadField(target: KonTypedObject, memberName: string): any;
    WriteField(target: KonTypedObject, memberName: string, value: any): void;
    ReadValueField(target: KonTypedObject, memberName: string): TypedValue;
    WriteValueField(target: KonTypedObject, memberName: string, value: TypedValue): void;
    WriteNodeField(target: KonTypedObject, memberName: string, value: any): void;
    SetGlobal(name: string, value: any): void;
    GetGlobal(name: string): any;
    GetGlobalValue(name: string): TypedRuntimeValue;
    GetCoreGlobal(name: string): TypedValue;
    ReadKonField(target: KonTypedObject, memberName: string): any;
    WriteKonField(target: KonTypedObject, memberName: string, value: any): void;
    PushEffectScope(...effects: Array<string | EffectSymbol>): {
        dispose: () => void;
    };
    Invoke(target: KonTypedObject, memberName: string, ...args: any[]): any;
    InvokeWithProjection(target: KonTypedObject, targetTypeName: string, memberName: string, ...args: any[]): any;
    GetMethodImplementation(target: KonTypedObject, memberName: string): any;
    GetPropertyGetter(target: KonTypedObject, memberName: string): any;
    GetPropertySetter(target: KonTypedObject, memberName: string): any;
    private CreateFieldStorage;
    private CreateParentStorage;
    private HydrateFieldsFromPrototype;
    private ResolveFieldStorage;
    private ResolvePropertyAccessor;
    private ResolveMethodMember;
    private SelectByActiveEffectContext;
    private GetActiveEffectRow;
    private EnsureEffectsAllowed;
    private ResolvePrototypeMethod;
    private ResolveInheritedPrototypeMethod;
    private EnumeratePrototypeCandidates;
    private ResolvePrototypeForAccessor;
    private TargetExposesField;
    private EnsureProjectionExposesField;
    private ViewExposesMethod;
    private EnsureProjectionExposesMethod;
    private IsAccessible;
    private IsDerivedFrom;
    private ToRuntimeValue;
    private ToKonValue;
}
export {};
