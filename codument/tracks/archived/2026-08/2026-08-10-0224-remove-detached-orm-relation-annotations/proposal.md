# Change: remove detached ORM relation annotations

## Context And Why

Kunun now provides typed class Properties as the language-level navigation
model. The older `OrmRelationAnnotationProfile` still makes detached
`#(orm #relation ...)` nodes a public, positively tested ORM authoring API. That
creates a second relation authority downstream even though Kunun's generic
ontology `relation` type remains valid for non-ORM use.

## Goals / Non-Goals

Goals:

- Remove the public detached ORM relation annotation parser, validator, types,
  exports, positive tests, and generated package artifacts.
- Keep generic annotation extraction and generic relation type-system behavior.
- Add a source and public-artifact residue guard.
- Preserve typed Property source/code-first behavior.

Non-goals:

- Do not remove Kunun's generic ontology relation type.
- Do not move depa ORM metadata semantics into Kunun core.
- Do not change Field or Property runtime behavior.

## What Changes

- **BREAKING:** `OrmRelationAnnotationProfile` and related descriptor/validator
  exports are removed from `kunun-type-annotations` and `kunun`.
- Positive detached ORM relation tests are removed.
- Package-boundary tests reject the retired symbols and syntax in live source
  and built public artifacts.

## Impact

- Behavior: `kunun-annotation-authority`
- Code: type-annotations source/tests and generated package exports
