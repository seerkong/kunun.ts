# Decisions

## Usage
- 用于记录需要用户确认的决策问题、选项、最终结论与理由
- 问题标题不用字母前缀；字母只用于选项
- 后续执行过程中出现的新决策，也继续追加到本文件，不新建分散的决策记录

### 1. 【P0】能力归属
- 背景：validate/dry-run 需要复用 workflow DSL execution，但输出、prompt preview、CLI/MCP 语义是宿主工具层问题。
- 需要决定：放在哪个包实现。
- 选项：
  - A) `kunun-workflow-host`（backend + CLI/MCP）
  - B) `kunun-workflow-dsl`
  - C) `kunun-runtime`
- 当前建议：A
- 用户答复：按本次请求创建 CLI/MCP 版本能力，默认采用 A
- 最终决策：A
- 决策理由：避免把 CLI/MCP 与 prompt-preview/schema-mock 语义下沉到 DSL 或 runtime；保持 runtime 通用、DSL 只管 lowering/resume。
- 状态：confirmed

### 2. 【P1】prompt 输出策略
- 背景：validate/dry-run 会展示 job prompt 信息，但 prompt 可能包含用户上下文。
- 需要决定：默认是否展示完整 prompt。
- 选项：
  - A) 默认截断 preview，`showPrompts` 才展示完整 prompt
  - B) 默认完整展示
- 当前建议：A
- 用户答复：未单独指定，采用保守默认
- 最终决策：A
- 决策理由：更安全，仍保留调试开关。
- 状态：confirmed

### 3. 【P1】dry-run mock 生成策略
- 背景：dry-run 需要在不调用模型的情况下推进 workflow。
- 需要决定：mock 值如何生成。
- 选项：
  - A) 有 output_schema 按 schema 生成，无 schema 返回 deterministic string
  - B) 一律返回 string
  - C) 要求用户提供 fixture
- 当前建议：A
- 用户答复：未单独指定，采用能最大化推进流程的方案
- 最终决策：A
- 决策理由：schema-shaped mock 能让后续 `(result.:field)` 继续执行，最适合作为默认 dry-run。
- 状态：confirmed
