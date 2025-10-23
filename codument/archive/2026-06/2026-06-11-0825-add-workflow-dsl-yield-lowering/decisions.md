# Decisions

## Usage
- 用于记录需要用户确认的决策问题、选项、最终结论与理由
- 问题标题不用字母前缀；字母只用于选项
- 后续执行过程中出现的新决策，也继续追加到本文件

### 1. 【P0】workflow 书写格式

- 背景：业界常见做法是用 JS 方言书写 workflow 脚本；kunun 有同构的 Kon DSL。
- 选项：
  - A) 纯 Kon DSL
  - B) 同时兼容 JS 方言（需 JS→kunun 翻译层）
- 用户答复：A（2026-06-10，用户直接答复）
- 最终决策：纯 Kon DSL，不做 JS 方言兼容
- 决策理由：同构数据=代码是 kunun 本色，agent 可程序化生成/变换 workflow；避免翻译层复杂度。
- 状态：confirmed

### 2. 【P1】retry/timeout 语义归属

- 背景：DSL 上可声明 retry/timeout，执行方可以是 runtime 或宿主。
- 选项：
  - A) runtime 透传 metadata，宿主执行（推荐）
  - B) runtime 内置定时器与重试循环
- 用户答复：随 track 创建采纳建议（未异议）
- 最终决策：A —— runtime 只 lower 进 job metadata
- 决策理由：真实的超时/重试发生在 agent 子进程层面，宿主才有执行手段；runtime 保持纯粹。
- 状态：confirmed

### 3. 【P1】ai_phase / ai_log 是否 yield

- 选项：
  - A) 不 yield，内联记录到事件缓冲（推荐）
  - B) 也作为 job yield 给宿主
- 最终决策：A
- 决策理由：phase/log 是观测信号而非工作单元，yield 会让宿主循环充斥琐碎 effect。
- 状态：confirmed
