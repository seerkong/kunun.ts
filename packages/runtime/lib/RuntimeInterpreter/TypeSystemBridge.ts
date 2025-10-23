export interface TypeCheckingDiagnosticLike {
  Code: string;
  Message: string;
}

export interface TypeCheckingResultLike {
  Success: boolean;
  Diagnostics: TypeCheckingDiagnosticLike[];
}

export interface TypedRuntimeBindingLike extends TypeCheckingResultLike {
  Context?: any;
}

// Runtime-side hook for the optional type system. The runtime package must not
// import kunun-type-system statically; the type-system package implements this
// interface and registers it (the kunun umbrella package does so on import).
export interface TypeSystemBridge {
  CheckSource(source: string): TypeCheckingResultLike;
  BindSource(source: string): TypedRuntimeBindingLike;
  IsTypedObject(target: any): boolean;
}

let activeBridge: TypeSystemBridge | null = null;

export function RegisterTypeSystemBridge(bridge: TypeSystemBridge): void {
  activeBridge = bridge;
}

export function ClearTypeSystemBridge(): void {
  activeBridge = null;
}

export function GetTypeSystemBridge(): TypeSystemBridge | null {
  return activeBridge;
}

export function RequireTypeSystemBridge(): TypeSystemBridge {
  if (activeBridge == null) {
    throw new Error(
      'TypeSystem bridge not registered. Import the kunun package, '
      + 'or call registerTypeSystemBridge() from kunun-type-system.',
    );
  }
  return activeBridge;
}
