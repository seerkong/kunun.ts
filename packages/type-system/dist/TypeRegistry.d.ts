import { AnyTypeSymbol, EffectRow, EffectSymbol, FunctionTypeSymbol, NeverTypeSymbol, PrimitiveTypeSymbol, TypeSymbol } from './Types';
export declare class TypeRegistry {
    private readonly symbols;
    private readonly lazySymbols;
    private readonly effects;
    readonly Any: AnyTypeSymbol;
    readonly Never: NeverTypeSymbol;
    readonly Int: PrimitiveTypeSymbol;
    readonly String: PrimitiveTypeSymbol;
    readonly Bool: PrimitiveTypeSymbol;
    constructor();
    Register(symbol: TypeSymbol): TypeSymbol;
    RegisterLazy(name: string, factory: () => TypeSymbol): void;
    Require(name: string): TypeSymbol;
    TryGet(name: string): TypeSymbol;
    CreateFunctionType(name: string, parameters: TypeSymbol[], outputs: TypeSymbol[] | TypeSymbol, effectRow?: EffectRow): FunctionTypeSymbol;
    GetOrCreateEffect(name: string): EffectSymbol;
    TryGetEffect(name: string): EffectSymbol;
}
