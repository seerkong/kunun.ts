# 变更：把 kunun 语言手册接通给 AI（生成内核 + 文档检索/索引）

## 背景和动机 (Context And Why)

`kwf agent` 的痛点一直是「常常无法正确生成符合 Kon 语法的 dynamic workflow」。根因是给生成器的素材太薄：scaffold meta-workflow 把 `SKILL.md` 的 `## DSL reference` 切片当系统提示注入。

我们已经补齐了完善的语言手册（`skill/reference/` 10 章 + `skill/dynamic-workflow/` 4 章），但同时把 `SKILL.md` 精简成了纯导航入口——`## DSL reference` 段已移出。这造成两个问题：

1. **生成通路回归**：`cli.ts` 的 `dslStart = fullSkillDoc.indexOf('\n## DSL reference')` 现在恒为 -1，回退到注入**整篇导航文档**（无任何 DSL 语法）。`kwf agent` 生成质量比改之前更差。
2. **手册够不到**：手册只在 repo 目录里，`assets.ts` 只内嵌 `SKILL.md`，编译态 kwf / MCP 取不到手册；也没有「列索引 / 取章节 / 搜索」的入口，AI 想查也查不了。

本 track 接通这条通路（范围 ①+②，自纠错循环留作后续）。

## "要做"和"不做" (Goals / Non-Goals)

**目标:**
- **① 生成内核**：新建紧凑、防陷阱的 `skill/dynamic-workflow/00-cheatsheet.md`（约 8KB：6 节点 + 配置键、`:input`/`:output`、关键陷阱清单、1 个已 dry-run 验证的端到端示例）。修复 scaffold 注入：改为注入 cheatsheet，不再注入导航文档。
- **② 检索与索引**：把 `skill/reference/` 与 `skill/dynamic-workflow/` 全部嵌入 kwf 二进制；新增 `kwf docs list|show <path>|search <kw>` CLI 与 `kwf_list_docs`/`kwf_get_doc`/`kwf_search_docs` MCP 工具，外部 AI 经 CLI/MCP 列索引→取章节→搜索。

**非目标:**
- 不做自纠错循环（validate→诊断→回查→重生成）——列为后续 track。
- 不改语言本体语法或类型系统。
- 不重写手册内容（仅新增 cheatsheet 一篇）。

## 变更内容（What Changes）

- 新增 `skill/dynamic-workflow/00-cheatsheet.md`（生成内核，需 dry-run 验证其内嵌示例）。
- `packages/workflow-host/lib/cli.ts`：scaffold 注入源从 SKILL.md 切片改为 cheatsheet（**修复回归**）。
- `packages/workflow-host/lib/assets.ts`：内嵌 `reference/*.md` + `dynamic-workflow/*.md`，新增 `listDocNames()` / `readDocAsset()` 资源 API。
- `packages/workflow-host/lib/backend.ts`：新增 docs 列举 / 读取 / 搜索 backend 方法。
- `packages/workflow-host/lib/cli.ts`：新增 `docs` 子命令（list/show/search）。
- `packages/workflow-host/lib/mcp.ts`：新增 `kwf_list_docs`/`kwf_get_doc`/`kwf_search_docs` 工具。
- 测试：assets 嵌入、CLI、MCP、CompiledBinary 冒烟，仿现有 `Assets`/`ExamplesCli`/`Mcp`/`CompiledBinary` 测试模式。

## 影响范围（Impact）

- 受影响能力（behaviors）：`workflow-agent-integration`（scaffold 注入生成内核）、`workflow-host-runtime`（manual 嵌入、`kwf docs` CLI、MCP 工具）。
- 受影响代码：`packages/workflow-host/lib/{cli,assets,backend,mcp}.ts`，`skill/dynamic-workflow/00-cheatsheet.md`（新文件），相关 `__tests__/`。
- 体积：二进制将多嵌约 350KB Markdown（已知权衡，确认可接受）。
- 文档联动：`SKILL.md` 导航与 `dynamic-workflow/README.md` 增列 cheatsheet 与 `kwf docs` 入口。
