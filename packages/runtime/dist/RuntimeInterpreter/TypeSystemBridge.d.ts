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
export interface TypeSystemBridge {
    CheckSource(source: string): TypeCheckingResultLike;
    BindSource(source: string): TypedRuntimeBindingLike;
    IsTypedObject(target: any): boolean;
}
export declare function RegisterTypeSystemBridge(bridge: TypeSystemBridge): void;
export declare function ClearTypeSystemBridge(): void;
export declare function GetTypeSystemBridge(): TypeSystemBridge | null;
export declare function RequireTypeSystemBridge(): TypeSystemBridge;
