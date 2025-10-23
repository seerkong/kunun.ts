# 变更：Workflow 与 coding agent 的集成分发（skill + 示例 + 可移植性）

## 背景和动机 (Context And Why)

`add-workflow-host-runtime` 完成后，kunun 拥有可独立运行的 workflow CLI，但宿主 coding agent（Claude Code、Codex 等）还不知道如何使用它：缺 SKILL.md 教学、缺可参考的示例 workflow、且 `depa-actor` 依赖是机器相关的绝对路径 `file:`，CLI 无法分发到其他机器。本 track 完成"可集成到不同 coding agent"这最后一公里。

**依赖**：本 track 依赖 `add-workflow-host-runtime`（CLI 与宿主运行时）。

## "要做"和"不做" (Goals / Non-Goals)

**目标:**
- 解决 depa-actor 可移植性：消除绝对路径 file: 依赖（vendor 进仓库 / 发布 npm / git 依赖，实现期定），使 `bun install` 在任意机器可重现
- SKILL.md：教宿主 agent 写纯 Kon DSL workflow（语法、六个 ai_* 节点、绑定与 schema 用法、最佳实践）并调用 CLI（run --args --wait、查询结果、pause/resume）
- 示例 workflow：移植参考项目的代表性模式为 .kon —— deep-research、fan-out-reduce、adversarial-verify、loop-until-dry、routing（至少 5 个），每个可被 mock 适配器端到端执行
- 安装与分发说明：README 集成章节、配置样例（适配器配置模板）

**非目标:**
- 不做二进制单文件打包（SEA/bun compile，留后续）
- 不做 web dashboard
- 不做 npm 正式发布流程（版本策略另行决策；本 track 只保证依赖可移植）

## 变更内容（What Changes）

- 修复 depa-actor 依赖引用方式（可能 **BREAKING**：依赖声明变化，需重新 install）
- 新增 skill/SKILL.md 与适配器配置样例
- 新增 examples/*.kon（5+ 个）及对应端到端测试（mock 适配器）
- README 增加集成指引

## 影响范围（Impact）

- 受影响的功能规范：新增 workflow-agent-integration capability
- 受影响的代码：packages/runtime/package.json（depa-actor 引用）、examples/、skill/、README
- 上游依赖：add-workflow-host-runtime
