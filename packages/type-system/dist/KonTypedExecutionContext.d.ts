import { ClassTypeSymbol, EffectSymbol, FunctionTypeSymbol, RowMember, TypeSymbol } from './Types';
import { TypeSystem } from './TypeSystem';
export declare abstract class TypedValue {
    readonly Type: TypeSymbol;
    constructor(Type: TypeSymbol);
}
export declare class IntValue extends TypedValue {
    readonly Value: number;
    constructor(Value: number, typeSystem?: TypeSystem);
}
export declare class StringValue extends TypedValue {
    readonly Value: string;
    constructor(Value: string, typeSystem?: TypeSystem);
}
export declare class BoolValue extends TypedValue {
    readonly Value: boolean;
    constructor(Value: boolean, typeSystem?: TypeSystem);
}
export declare class ListValue extends TypedValue {
    readonly Elements: TypedValue[];
    constructor(Elements: TypedValue[], typeSystem?: TypeSystem);
}
export declare class MapValue extends TypedValue {
    readonly Properties: {
        [name: string]: TypedValue;
    };
    constructor(Properties: {
        [name: string]: TypedValue;
    }, typeSystem?: TypeSystem);
}
export declare class AnyValue extends TypedValue {
    readonly Value: any;
    constructor(Value: any, typeSystem?: TypeSystem);
}
export declare class FunctionValue extends TypedValue {
    readonly Signature: FunctionTypeSymbol;
    readonly Body: (context: InvocationContext, args: TypedValue[]) => TypedValue;
    constructor(Signature: FunctionTypeSymbol, Body: (context: InvocationContext, args: TypedValue[]) => TypedValue);
}
export declare class ObjectValue extends TypedValue {
    readonly Class: ClassTypeSymbol;
    readonly Rows: {
        [name: string]: RowImplementation[];
    };
    readonly Fields: {
        [name: string]: FieldStorage[];
    };
    readonly Parents: {
        [className: string]: ObjectValue;
    };
    constructor(Class: ClassTypeSymbol, Rows: {
        [name: string]: RowImplementation[];
    }, Fields: {
        [name: string]: FieldStorage[];
    }, Parents: {
        [className: string]: ObjectValue;
    });
}
export declare class ProjectedObjectValue extends TypedValue {
    readonly Instance: ObjectValue;
    readonly TargetType: ClassTypeSymbol;
    constructor(Instance: ObjectValue, TargetType: ClassTypeSymbol);
}
export declare class RowImplementation {
    readonly Member: RowMember;
    readonly Function: FunctionValue;
    constructor(Member: RowMember, Function: FunctionValue);
    WithFunction(fn: FunctionValue): RowImplementation;
}
export declare class FieldStorage {
    readonly Member: RowMember;
    Value?: TypedValue;
    constructor(Member: RowMember, Value?: TypedValue);
}
export declare class InvocationContext {
    readonly Execution: KonTypedExecutionContext;
    readonly Self?: ObjectValue;
    constructor(Execution: KonTypedExecutionContext, Self?: ObjectValue);
    get Context(): KonTypedExecutionContext;
}
export declare class KonTypedExecutionContext {
    readonly TypeSystem: TypeSystem;
    private static runtimeTypeSystem;
    private readonly globals;
    private readonly effectScopes;
    constructor(TypeSystem: TypeSystem);
    static InitializeRuntimeTypes(typeSystem: TypeSystem): void;
    static GetRuntimeTypeSystem(): TypeSystem;
    GetGlobal(name: string): TypedValue;
    SetGlobal(name: string, value: TypedValue): void;
    PushEffectScope(...effects: Array<string | EffectSymbol>): {
        dispose: () => void;
    };
    Instantiate(className: string): ObjectValue;
    CreateObject(className: string): ObjectValue;
    Project(instance: ObjectValue, targetTypeName: string): ProjectedObjectValue;
    InvokeWithProjection(instance: ObjectValue, targetTypeName: string, memberName: string, ...args: TypedValue[]): TypedValue;
    InvokeOrigin(instance: ObjectValue, memberName: string, origin: string, ...args: TypedValue[]): TypedValue;
    Invoke(target: ObjectValue | ProjectedObjectValue, memberName: string, ...args: TypedValue[]): TypedValue;
    ReadField(target: ObjectValue | ProjectedObjectValue, memberName: string, origin?: string): TypedValue;
    ReadFieldOrigin(instance: ObjectValue, memberName: string, origin?: string): TypedValue;
    WriteField(target: ObjectValue | ProjectedObjectValue, memberName: string, value: TypedValue, origin?: string): void;
    WriteFieldOrigin(instance: ObjectValue, memberName: string, value: TypedValue, origin?: string): void;
    ToTypedValue(value: any): TypedValue;
    FromTypedValue(value: TypedValue): any;
    private CreateFieldStorage;
    private CreateParentStorage;
    private RequiresVirtualOverride;
    private TakeNextMethodBody;
    private FindInheritedMethodTarget;
    private InvokeTraitMember;
    private InvokeObject;
    private FindMethodImplementationByOrigin;
    private ReadFieldFromObject;
    private WriteFieldToObject;
    private ResolveFieldStorage;
    private EnsureProjectionExposesField;
    private EnsureProjectionExposesMethod;
    private SelectImplementationsForActiveEffectContext;
    private GetAllowedEffects;
    private EnsureEffectsAllowed;
    private IsAccessible;
    private IsDerivedFrom;
    private RequireFunctionSignature;
}
