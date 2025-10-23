---
name: kunun-dynamic-workflow
description: Write and run durable multi-agent workflows in the kunun Kon DSL via the kwf CLI. Use when a task needs orchestrating multiple agent calls (fan-out, pipelines, routing, adversarial verification) with pause/resume and crash recovery.
---

# kunun dynamic workflows

`kwf` runs workflow scripts written in the kunun **Kon DSL**. Every agent call
is a checkpoint boundary: the full interpreter state is persisted to disk before
agents are dispatched, so a run can be paused, resumed, or recovered after a
crash **from the middle of the workflow** without redoing completed agent work.

This file is a navigation entry plus the `kwf` operational cheat-sheet. The full,
verified language manual lives next to it (中文正文，代码与术语用英文):

## 文档导航 / Manual map

kunun 对外分四层。前三层是**语言本体**，第四层是建立在其上的**动态工作流扩展**：

| 层 | 内容 | 文档 |
|----|------|------|
| 1 · kon 数据格式 | 容器（`()` knot / `[]` vector / `{}` map）、knot 结构、字符串与插值；空白分隔，无逗号 | [reference/03-kon-data-format.md](reference/03-kon-data-format.md)、[reference/04-strings.md](reference/04-strings.md) |
| 2 · ExtensibleScopedRowType 类型系统 | row / class / trait / 泛型 / 类型化 effect | [reference/09-type-system.md](reference/09-type-system.md)、[reference/10-effects-and-typed-execution.md](reference/10-effects-and-typed-execution.md) |
| 3 · 解释器标准内置语法 | 双栈求值模型、内置特殊形式、函数/对象、host 标准库 | [reference/05-evaluation-model.md](reference/05-evaluation-model.md)、[reference/06-builtins-control-flow.md](reference/06-builtins-control-flow.md)、[reference/07-functions-objects.md](reference/07-functions-objects.md)、[reference/08-host-stdlib.md](reference/08-host-stdlib.md) |
| 4 · dynamic workflow 扩展 | 如何用 `ai_*` 节点写可恢复的多 agent 工作流 | [dynamic-workflow/](dynamic-workflow/README.md) |

- **要理解或编写 kunun / kon 语言本体** → 从 [reference/README.md](reference/README.md) 开始（含词法、数据格式、求值模型、类型系统等十章）。
- **要编写动态工作流（本文件的主题）** → 看 [dynamic-workflow/README.md](dynamic-workflow/README.md)：
  [00 生成速查表（生成内核）](dynamic-workflow/00-cheatsheet.md) ·
  [01 总览](dynamic-workflow/01-overview.md) ·
  [02 DSL 参考](dynamic-workflow/02-dsl-reference.md) ·
  [03 编写范式与陷阱](dynamic-workflow/03-authoring-patterns.md) ·
  [04 用 kwf 运行](dynamic-workflow/04-running-kwf.md)。
  其中 [00-cheatsheet.md](dynamic-workflow/00-cheatsheet.md) 是 `kwf agent` 注入的**生成内核**（最小语法 + 陷阱），也可用 `kwf docs` 检索全部章节。

The sections below are the minimum needed to operate `kwf`; the DSL itself, the
node-by-node reference, authoring patterns and gotchas all live in
[dynamic-workflow/](dynamic-workflow/README.md).

## One-shot agent wizard

`kwf agent` combines workflow generation, input inference, and execution into a
single interactive wizard — no Kon DSL knowledge required:

```bash
bun packages/workflow-host/bin/kwf.ts agent "analyse the sentiment of customer reviews in reviews.csv"
bun packages/workflow-host/bin/kwf.ts agent "fan-out search 5 angles then synthesise a report" --output-dir ./workflows
```

It runs four stages: **Generate** a `.kon` workflow for the requirement →
**Infer** the input JSON → **Review** both files (Enter to confirm, `n` to
cancel) → **Execute**. Generated files can be re-run with
`kwf run <name>.kon --args "$(cat <name>-input.json)"`. Details:
[dynamic-workflow/04-running-kwf.md](dynamic-workflow/04-running-kwf.md).

## Commands

`kwf` runs from source (`bun packages/workflow-host/bin/kwf.ts ...`) or as a
self-contained single executable built with `bun run build:bin` (output:
`dist-bin/kwf`; prompts, examples and this skill document are embedded into the
binary via bunfs, so it works outside the repository).

```bash
bun packages/workflow-host/bin/kwf.ts agent "requirement text"      # generate + infer + confirm + run
bun packages/workflow-host/bin/kwf.ts run my-workflow.kon --wait
bun packages/workflow-host/bin/kwf.ts run my-workflow.kon            # detached background worker
bun packages/workflow-host/bin/kwf.ts validate my-workflow.kon       # parse + first yield, no agent calls
bun packages/workflow-host/bin/kwf.ts dry-run my-workflow.kon        # full simulation, no agent calls
bun packages/workflow-host/bin/kwf.ts status <runId>
bun packages/workflow-host/bin/kwf.ts logs <runId>
bun packages/workflow-host/bin/kwf.ts result <runId>
bun packages/workflow-host/bin/kwf.ts pause <runId>
bun packages/workflow-host/bin/kwf.ts resume <runId>                 # also recovers crashed runs
bun packages/workflow-host/bin/kwf.ts stop <runId>
bun packages/workflow-host/bin/kwf.ts list
bun packages/workflow-host/bin/kwf.ts examples
bun packages/workflow-host/bin/kwf.ts examples show routing
bun packages/workflow-host/bin/kwf.ts examples export ./my-workflows
bun packages/workflow-host/bin/kwf.ts docs list                     # embedded kunun language manual
bun packages/workflow-host/bin/kwf.ts docs show reference/README.md  # one chapter by relative path
bun packages/workflow-host/bin/kwf.ts docs search "output_schema"    # per-line hits across all chapters
bun packages/workflow-host/bin/kwf.ts skill
bun packages/workflow-host/bin/kwf.ts mcp stdio
```

Full flag reference (`--args` / `--wait` / `--name` / `--config` / `--runs-root`
/ `--json` / `--show-prompts` / `--max-yields`) and exit codes:
[dynamic-workflow/04-running-kwf.md](dynamic-workflow/04-running-kwf.md).

## Validate and dry-run (no agent calls)

Before running for real, check a workflow without spending any agent calls. Both
commands reuse the workflow engine but never dispatch an agent adapter, so they
are safe and free to run from a coding agent that just generated a `.kon`.

```bash
bun packages/workflow-host/bin/kwf.ts validate my-workflow.kon --json --show-prompts
bun packages/workflow-host/bin/kwf.ts dry-run my-workflow.kon --args '{"q":"x"}' --max-yields 20 --json
```

- `validate` parses, lowers the DSL, and executes to the **first yield or
  completion**, returning `ok`, `status` (`yielded`/`completed`/`error`),
  `diagnostics`, and a `firstYield` summary.
- `dry-run` repeatedly yields and resumes, injecting **schema-shaped mock
  results** (from each job's `output_schema`, else `dry-run:<job>`) so downstream
  field reads keep working; returns every `yields` summary and the final result.
- `--json` for machine output (same shape as the MCP tools); prompts are redacted
  unless `--show-prompts`; exit codes `0`/`1`/`2` (success / failure / arg error).

## MCP server

`kwf mcp stdio` starts an MCP server (stdio transport) exposing every CLI
operation as `kwf_` tools: `kwf_run_workflow`, `kwf_validate_workflow`,
`kwf_dry_run_workflow`, `kwf_run_status`, `kwf_run_events`, `kwf_run_result`,
`kwf_pause_run`, `kwf_resume_run`, `kwf_stop_run`, `kwf_list_runs`,
`kwf_list_examples`, `kwf_get_example`, `kwf_get_skill`. `kwf_validate_workflow`
and `kwf_dry_run_workflow` accept inline `source` (or `script_path`) so a coding
agent can check generated Kon before writing it to disk; their JSON output
matches the CLI `--json` shape and `isError` follows `result.ok`.

```json
{
  "mcpServers": {
    "kwf": { "command": "/path/to/dist-bin/kwf", "args": ["mcp", "stdio"] }
  }
}
```

## Bundled examples

Ready-to-run workflow patterns (`kwf examples show <name>` / `kwf examples export <dir>`).
Walkthroughs in [dynamic-workflow/03-authoring-patterns.md](dynamic-workflow/03-authoring-patterns.md):

- `fan-out-reduce.kon` — fan out N drafts in parallel, then synthesise one result.
- `routing.kon` — classify the request, then dispatch only the matching specialist.
- `deep-research.kon` — plan → parallel search → extract → adversarial pipeline review → report.
- `adversarial-verify.kon` — find claims → parallel challenge → keep survivors.
- `loop-until-dry.kon` — repeat rounds until one finds nothing new.

## Host configuration

Adapters are configuration, not code. Default adapters: `claude`, `codex`,
`gemini`. Add your own CLI in `kwf.config.json` (see
[kwf.config.example.json](kwf.config.example.json)); full reference in
[dynamic-workflow/04-running-kwf.md](dynamic-workflow/04-running-kwf.md):

```json
{
  "defaultAdapter": "claude",
  "concurrency": 8,
  "adapters": {
    "my_agent": {
      "label": "My agent CLI",
      "command": ["my-agent", "--cwd", "{workspace}"],
      "stdin": "{prompt}",
      "flags": { "model": ["--model"] }
    }
  }
}
```

Placeholders: `{prompt}` (stdin or argv), `{prompt_file}` (temp file path),
`{workspace}`, plus per-call `model` via `flags`.
