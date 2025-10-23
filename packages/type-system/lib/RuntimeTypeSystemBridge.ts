import { RegisterTypeSystemBridge } from 'kunun-runtime/RuntimeInterpreter/TypeSystemBridge';
import { KonTypeChecker } from './KonTypeChecker';
import { KonTypedObject, KonTypedRuntimeContext } from './KonTypedRuntimeContext';

// Implements the runtime-side TypeSystemBridge hook with the real type system.
// Registration is what makes RuntimeInterpreter's opt-in typed entry points work.
export function registerTypeSystemBridge(): void {
  RegisterTypeSystemBridge({
    CheckSource: source => KonTypeChecker.CheckSource(source),
    BindSource: source => KonTypedRuntimeContext.BindSource(source),
    IsTypedObject: target => target instanceof KonTypedObject,
  });
}
