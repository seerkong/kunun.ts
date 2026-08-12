# Design

## Authority Boundary

Kunun owns typed Field and Property models plus generic annotations. ORM relation
semantics belong to depa ORM metadata attached to a Property. Therefore Kunun
must not expose a parser that turns a detached ORM relation node into a second
typed descriptor graph.

## Removal

1. Delete `OrmRelationAnnotations.ts` and its barrel export.
2. Delete positive parser/validator tests while retaining generic annotation and
   generic relation binding coverage.
3. Add a package test that scans live source and built public entrypoints for the
   retired symbol family and detached ORM marker.
4. Build and test to ensure stale generated exports are removed.

## Compatibility

This is an intentional hard authority cut. No migration reader remains in the
Kunun package. Generic relation types are unaffected.
