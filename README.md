kunun is a experimental language inspired by lisp and forth


it supports both Polish notation: `[+ (1 2)]` and Reverse Polish notation: `[3 4 +;]`

it has a dynamic instruction stack, used to implement continuation.
each sentence may have one or more clauses, and the clauses in a sentence share same operand stack.

function is evaluated when the operand stack has enough arguments
the following sentence
```
[add4args (1 2) (3 4)]
```
is evaluated by such steps
- lookup add4args and push to operand stack
- push 1 to operand stack
- push 2 to operand stack
- check if has enough arguments for add4args
- push 3 to operand stack
- push 4 to operand stack
- check if has enough arguments for add4args
- eval add4args



`;` is a syntax sugar to apply arguments to the function on operand stack top
the following sentence
```
[3 4 +;]
```
is evaluated by such steps
- push 3 to operand stack
- push 4 to operand stack
- lookup `+` and push to operand stack
- apply to the function `+`




influenced by lisp, in kunun language, the data part and the expression part use same structure
vector:
`{1 2 3}`
map:
`(a =1 b = 2)`

`knot`, a data structure has a list of nodes. each node has following fields
```
export interface IKnKnot {
  Annotations?: any[];
  Flags?: any[];
  TypeVars?: any[];

  Core?: any;
  DoApply?: boolean;

  GenericParam?: any[];
  ContextParam?: any[];
  Param?: any[];

  Definition?: any;
  Refinements?: any[];

  Header?: any;
  Body?: any[];

  Next?: any;
}
```

all expressions is represented by `knot` structure
for example, a for loop syntax:
```
[do {
    [var a ${1 2 3}]
    [var b 0]
    [for %i = 0% [i [a .length] <;] [++ i] {
        [var x [a .:i]]
        [if [== (x 2)] {
            [break;]
          }
        ]
        [Writeln (x)]
        [set b x]
      }
    ]
    b
  }
]
```

---


## Workspace layout

This repo is a bun workspaces monorepo. Dependency direction is acyclic and enforced by package boundaries:

```
packages/core         kunun-core         Model / Util / Algo / StateManagement / TaskQueue
packages/converter    kunun-converter    parser, formatter, syntax profiles (Knl / Kon / Kjson)
packages/runtime      kunun-runtime      RuntimeInterpreter, HostSupport (depends on depa-actor;
                                         defines the TypeSystemBridge hook, never imports type-system;
                                         workflow mechanics are generic: explicit job expansion, no ai_* semantics)
packages/workflow-dsl kunun-workflow-dsl ai_* workflow DSL: lowering, RunWorkflowSync/ResumeWorkflowSync
packages/type-system  kunun-type-system  row/effect type system (implements and registers the bridge)
packages/kunun        kunun              umbrella package: re-exports everything; importing it
                                         auto-registers the TypeSystemBridge for typed execution
```

Each package keeps its sources in `lib/` and its tests in `__tests__/`. Cross-package imports must use package names (`kunun-core/Model/KnKnot`), resolved through the root `tsconfig.json` paths (bun reads them natively).

## Dynamic workflows for coding agents

kunun ships a durable multi-agent workflow system: workflows are written in
the Kon DSL (`examples/*.kon`), executed by the `kwf` CLI
(`packages/workflow-host`), and every agent call is a checkpoint boundary —
runs can be paused, resumed, and crash-recovered from mid-workflow.

```bash
bun packages/workflow-host/bin/kwf.ts run examples/fan-out-reduce.kon --wait
```

Before running for real, `kwf validate <file.kon>` and `kwf dry-run <file.kon>`
check a workflow **without dispatching any agent**: `validate` executes to the
first yield or completion, `dry-run` simulates the whole flow with schema-shaped
mock results. Both support `--json` / `--show-prompts` and are also exposed as
the `kwf_validate_workflow` / `kwf_dry_run_workflow` MCP tools.

Host agents (Claude Code, Codex, …) integrate via [skill/SKILL.md](skill/SKILL.md)
or the MCP server (`kwf mcp stdio`, exposing `kwf_*` tools); agent CLIs are
configured declaratively (see
[skill/kwf.config.example.json](skill/kwf.config.example.json)).

`bun run build:bin` produces a self-contained single executable
(`dist-bin/kwf`): prompts, bundled examples, and the skill document are
embedded via bunfs, so `kwf examples export` / `kwf skill` / `kwf mcp stdio`
work on machines without the repository or bun installed.

## Develop

install dependencies
```
bun install
```

run all tests
```
bun test
```

run a single test file or filter by name
```
bun test packages/runtime
bun test -t 'AddWith4Args'
```

type check / build the distributable umbrella package (ESM + CJS)
```
npm run typecheck
npm run dist
```

