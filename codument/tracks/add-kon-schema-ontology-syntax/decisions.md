# Decisions

## D1: Alias declarations are same-level declarations

Decision: use same-level alias declarations:

```kon
(schema #Machine :{ alias_of = Server })
(relation #member_of :{ alias_of = works_in })
(attr #host :{ alias_of = Server.hostname })
```

Reason:

- The core keyword states what kind of alias is being declared.
- The `#name` slot always names the new alias.
- `alias_of` in `:{ ... }` carries the canonical target.
- Attribute alias scope is encoded in the qualified target, e.g. `Server.hostname`.
- Nested aliases inside `schema` bodies are not supported.

This supersedes earlier drafts that used `attr-alias`, `schema-alias`, `relation-alias`, a generic `alias` keyword, or nested alias declarations.
