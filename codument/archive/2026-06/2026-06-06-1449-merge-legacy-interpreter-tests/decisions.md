# Decisions

## Usage
- 用于记录需要用户确认的决策问题、选项、最终结论与理由。
- 问题标题不用字母前缀；字母只用于选项。
- 后续执行过程中出现的新决策，也继续追加到本文件。

### 1. 【P0】实施范围
- 背景：旧解释器测试中既有重复测试，也有需要新运行时补齐的行为。
- 需要决定：本 track 是否只迁移测试，还是同时补齐必要的新 runtime 能力。
- 选项：
  - A) 迁移测试 + 必要的新 RuntimeInterpreter 能力补齐
  - B) 只迁移已经支持的测试，不补运行时能力
  - C) 只做测试清理计划，不实际改测试
- 当前建议：A
- 用户答复：Q1=A
- 最终决策：A
- 决策理由：旧测试中包含 JS interop、embedding API、control-flow 等新 runtime 尚未完整覆盖的有价值行为。
- 状态：decided

### 2. 【P0】重复旧测试处理方式
- 背景：大量旧 `Interpreter.test.ts` 断言已经被 `RuntimeInterpreter` 测试覆盖。
- 需要决定：重复旧断言删除、隔离还是保留。
- 选项：
  - A) 删除重复断言，只保留新 `RuntimeInterpreter` 测试
  - B) 先 skip 或隔离旧断言，后续再删除
  - C) 暂不删除，只新增新测试
- 当前建议：A
- 用户答复：Q2=A
- 最终决策：A
- 决策理由：新 runtime 已成为迁移基座，重复旧断言会继续绑定旧语法和旧实现细节。
- 状态：decided

### 3. 【P0】旧 Interpreter API 兼容面
- 背景：旧 API 可能仍被外部或旧测试依赖。
- 需要决定：是否保留 legacy smoke suite。
- 选项：
  - A) 保留极小 smoke suite：`EvalSync`、`ExecAsync`、`PrepareState/ExecWithStateAsync`
  - B) 不保留，完全移除旧解释器回归
  - C) 保留更多旧 API 行为回归
- 当前建议：A
- 用户答复：Q3=A
- 最终决策：A
- 决策理由：保留最小兼容信号，同时避免旧解释器继续承担主要行为规范。
- 状态：decided

### 4. 【P0】JS 交互迁移范围
- 背景：JS imperative bridge 和脚本函数导出为 JS callable 对业务侧重要。
- 需要决定：这些能力是否进入本 track。
- 选项：
  - A) 本 track 纳入 JS object bridge 和 `MakeFuncSync` 等价能力，并设计新 runtime API
  - B) 只写入迁移计划，暂不实现
  - C) 单独拆出后续 track
- 当前建议：A
- 用户答复：Q4=A
- 最终决策：A
- 决策理由：JS 交互是重要 embedding 能力，应与测试迁移一起落入新 runtime 基座。
- 状态：decided

### 5. 【P1】本 track 排除项
- 背景：event queue、async host interop、self-update operators 都需要额外语义设计。
- 需要决定：是否纳入本 track。
- 选项：
  - A) 本 track 明确排除，记录为后续独立 track
  - B) event queue 纳入本 track
  - C) async host interop 纳入本 track
  - D) self-update operators 纳入本 track
- 当前建议：A
- 用户答复：Q5=A
- 最终决策：A
- 决策理由：这些能力会扩大调度、异步、语法设计范围，不适合和测试合并同批处理。
- 状态：decided

### 6. 【P0】提交模式与验证模式
- 背景：本 track 会触及测试、运行时和兼容性策略，需要可审查的手动提交和独立 gap-loop 验证。
- 需要决定：Codument 提交和验证设置。
- 选项：
  - A) 自动提交模式 `auto`
  - B) 手动提交模式 `manual`
  - C) 人工确认 `yield-human-confirm`
  - D) Gap Loop `yield-gap-loop`
  - E) 仅最终阶段校验 `final_phase`
  - F) 每个阶段都校验 `every_phase`
- 当前建议：B + D + E
- 用户答复：Q6=B+D+E
- 最终决策：手动提交、最终阶段 gap-loop 校验。
- 决策理由：本 track 有多个设计点，但阶段之间可以顺序推进；最终用 fresh gap-loop 做完整目标对比。
- 状态：decided
