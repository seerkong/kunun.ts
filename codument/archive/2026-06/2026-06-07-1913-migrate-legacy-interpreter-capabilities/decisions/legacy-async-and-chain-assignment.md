# Decision: Legacy async/fiber migration and restricted chain assignment

## Status

Accepted

## Context

The project has a new RuntimeInterpreter with instruction-stack expansion and workflow checkpoint support. The old interpreter still contains async host, timer, fiber scheduling, and several syntax compatibility behaviors.

The equals token is already used by current data syntax, including map entries, metadata, configuration values, and parser value flags.

## Decision

- Legacy async host/timer/fiber behavior SHALL be migrated to the new RuntimeInterpreter.
- This behavior is lower-level pause/resume machinery and SHALL NOT be treated as workflow checkpoint-only behavior.
- Legacy scheduler operations SHALL receive RuntimeInterpreter equivalents using fiber state and instruction-stack continuation.
- Chain assignment compatibility SHALL be supported only for writable knot chain expression targets.
- Supported compatibility forms include `target.:field = value` and `target.:field := value`.
- Equals in data syntax SHALL keep its current meaning and SHALL NOT become general assignment.

## Rationale

Both legacy async/fiber and workflow checkpoint need continuation preservation, but they serve different layers. Workflow checkpoint is a durable safe-point for host workflow orchestration. Legacy async/fiber is a general runtime scheduling and pause/resume capability. Keeping them separate avoids losing low-level interpreter expressiveness.

Restricting `=` and `:=` assignment to chain targets prevents conflict with Kon/Knl data representation while preserving practical compatibility for hand-written object update scripts.

## Consequences

- RuntimeInterpreter needs explicit scheduler and async/timer tests.
- The implementation should use controllable host scheduler abstractions in tests instead of real-time sleeps where possible.
- Parser/data syntax must remain stable when equals appears in map, metadata, and configuration contexts.
