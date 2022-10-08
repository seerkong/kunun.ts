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


install dependencies
```
npm install -g ts-node
npm install
```


run all interpreter test cases
modify `.vscode/launch.json` args
```
"args": [
    "test/Case/Interpreter.test.ts",
    "--no-timeouts"
],
```

run a test case in vscode:
modify `.vscode/launch.json` args
for example：AddWith4Args
```
"args": [
    "test/Case/Interpreter.test.ts",
    "-g",
    "'AddWith4Args'",
    "--no-timeouts"
],

```
