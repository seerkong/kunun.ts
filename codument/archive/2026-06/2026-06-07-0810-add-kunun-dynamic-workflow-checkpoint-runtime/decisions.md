# Decisions

## Usage
- 用于记录需要用户确认的决策问题、选项、最终结论与理由。
- 问题标题不用字母前缀；字母只用于选项。
- 后续执行过程中出现的新决策，也继续追加到本文件，不新建分散的决策记录。

### 1. 【P0】恢复模型
- 背景：Dynamic workflow 可以用 replay-cache，也可以用 Kunun continuation checkpoint。
- 需要决定：第一版实现采用哪种恢复模型。
- 选项：
  - A) replay-cache runtime 作为主模型
  - B) Kunun yield 边界 checkpoint 作为主模型
  - C) 其他（可填写）
- 当前建议：B
- 用户答复：选择直接做路线 B：yield 边界 checkpoint。
- 最终决策：Kunun yield 边界 checkpoint 作为主恢复模型。
- 决策理由：这能发挥 Kunun 解释器、双栈、frame、effect system 的优势，并避免退化为 JS 进程内存 + replay 模型。
- 状态：confirmed

### 2. 【P0】Workflow 操作的语言定位
- 背景：`ai_workflow / ai_agent / ai_parallel / ai_pipeline / ai_phase / ai_log / json_schema` 可以做成语言内建，也可以由宿主注册。
- 需要决定：这些操作是否成为 Kunun 内建原语。
- 选项：
  - A) 做成 Kunun 语言内建原语
  - B) 由 Bun coding agent 基于 Kunun runtime 注册宏或函数扩展
  - C) 其他（可填写）
- 当前建议：B
- 用户答复：这些应当是 coding agent 在 Kunun 基础上扩展函数或者宏，实现同等功能。
- 最终决策：由 Bun coding agent 注册为 Kunun 宏或函数扩展。
- 决策理由：Kunun 保持通用语言基座，workflow 语义归属于具体 agent runtime。
- 状态：confirmed

### 3. 【P0】宏实现策略
- 背景：本项目已有 prefix/infix keyword expander，且 infix 宏是 Kunun 相比一般语言的重要能力。
- 需要决定：`ai_agent / ai_parallel / ai_pipeline` 是否通过宏实现。
- 选项：
  - A) 不使用宏，只做普通 host function
  - B) 使用宏/keyword 暴露语法，但 lower 到 checkpoint-aware effect/opcode
  - C) 其他（可填写）
- 当前建议：B
- 用户答复：关注为什么不通过宏实现；确认应发挥宏机制优势。
- 最终决策：使用宏/keyword 作为主要语法承载，但不能只是普通函数调用，必须 lower 到 checkpoint-aware effect/opcode。
- 决策理由：宏能控制求值结构、保留 source node id，并让 ai_parallel/ai_pipeline 建立稳定 batch/stage path。
- 状态：confirmed

### 4. 【P0】与行为树模型的关系
- 背景：XML/行为树 DSL 也能把循环状态挂在节点上恢复。
- 需要决定：本路线是否采用行为树 tick model。
- 选项：
  - A) 改造成 behavior-tree tick model
  - B) 保持 Kunun interpreter continuation，node id 只作为 checkpoint metadata
  - C) 其他（可填写）
- 当前建议：B
- 用户答复：希望发挥 Kunun 优势，直接做路线 B。
- 最终决策：保持 Kunun interpreter continuation，不采用 behavior-tree tick model。
- 决策理由：Kunun 需要保留编程语言能力，包括 infix 宏、闭包、局部变量、异常、effect system。
- 状态：confirmed

### 5. 【P1】depa-actor 责任边界
- 背景：Dynamic workflow runtime 需要栈、dispatcher、snapshot、fiber 调度等通用能力。
- 需要决定：depa-actor 是否加入 AI 或 Dynamic Workflow 语义。
- 选项：
  - A) depa-actor 内置 Dynamic Workflow/AI agent 语义
  - B) depa-actor 只提供通用执行内核能力
  - C) 其他（可填写）
- 当前建议：B
- 用户答复：此前已明确 depa-actor 不写入 AI 语义，支持独立组合能力。
- 最终决策：depa-actor 只提供通用执行内核能力。
- 决策理由：保持 depa-actor 可作为 actor system、解释器内核、AI OS kernel 的通用基座。
- 状态：confirmed
