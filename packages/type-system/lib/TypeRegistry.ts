import {
  AnyTypeSymbol,
  EffectRow,
  EffectSymbol,
  FunctionTypeSymbol,
  NeverTypeSymbol,
  PrimitiveTypeSymbol,
  TypeSymbol,
} from './Types';

export class TypeRegistry {
  private readonly symbols = new Map<string, TypeSymbol>();
  private readonly lazySymbols = new Map<string, () => TypeSymbol>();
  private readonly effects = new Map<string, EffectSymbol>();

  public readonly Any = new AnyTypeSymbol();
  public readonly Never = new NeverTypeSymbol();
  public readonly Int = new PrimitiveTypeSymbol('int');
  public readonly String = new PrimitiveTypeSymbol('str');
  public readonly Bool = new PrimitiveTypeSymbol('bool');

  public constructor() {
    this.Register(this.Any);
    this.Register(this.Never);
    this.Register(this.Int);
    this.Register(this.String);
    this.Register(this.Bool);
  }

  public Register(symbol: TypeSymbol): TypeSymbol {
    this.symbols.set(symbol.Name, symbol);
    return symbol;
  }

  public RegisterLazy(name: string, factory: () => TypeSymbol): void {
    this.lazySymbols.set(name, factory);
  }

  public Require(name: string): TypeSymbol {
    const direct = this.symbols.get(name);
    if (direct != null) {
      return direct;
    }
    const lazy = this.lazySymbols.get(name);
    if (lazy != null) {
      const symbol = lazy();
      this.Register(symbol);
      this.lazySymbols.delete(name);
      return symbol;
    }
    throw new Error(`Type '${name}' is not registered.`);
  }

  public TryGet(name: string): TypeSymbol {
    try {
      return this.Require(name);
    } catch {
      return null;
    }
  }

  public CreateFunctionType(
    name: string,
    parameters: TypeSymbol[],
    outputs: TypeSymbol[] | TypeSymbol,
    effectRow?: EffectRow,
  ): FunctionTypeSymbol {
    return new FunctionTypeSymbol(name, parameters, Array.isArray(outputs) ? outputs : [outputs], effectRow);
  }

  public GetOrCreateEffect(name: string): EffectSymbol {
    const existing = this.effects.get(name);
    if (existing != null) {
      return existing;
    }
    const effect = new EffectSymbol(name);
    this.effects.set(name, effect);
    this.Register(effect);
    return effect;
  }

  public TryGetEffect(name: string): EffectSymbol {
    return this.effects.get(name) ?? null;
  }
}
