# Decisions

## Usage
- 用于记录需要用户确认的决策问题、选项、最终结论与理由
- 问题标题不用字母前缀；字母只用于选项
- 后续执行过程中出现的新决策，也继续追加到本文件，不新建分散的决策记录

### 1. 【P0】包拆分粒度

- 背景：lib 模块间存在 RuntimeInterpreter ↔ TypeSystem 循环依赖；Model/Util/Algo/StateManagement 构成强连通块。
- 需要决定：拆几个包、是否解环。
- 选项：
  - A) 5 包，解开循环依赖（core/converter/runtime/type-system/总包，runtime 定义钩子接口由 type-system 注入）
  - B) 4 包，runtime 与 type-system 合并，不动代码逻辑
  - C) 2 包，仅搭 workspace 骨架
- 当前建议：A
- 用户答复：A（2026-06-10，通过多问题 ToolCall 确认）
- 最终决策：5 包 + TypeSystemBridge 依赖注入解环
- 决策理由：边界最干净，依赖方向被包管理器强制，为后续修改铺路；反向依赖仅一处 import，解环成本可控。
- 状态：confirmed

### 2. 【P0】测试与构建工具链

- 背景：现状 mocha+chai+ts-node 测试、vite 打包、tsc 类型检查。
- 需要决定：bun 迁移范围。
- 选项：
  - A) 全面迁到 bun（bun test + bun build + tsc --noEmit，移除 vite/mocha/ts-node/rimraf）
  - B) bun 只管 workspace，工具先不动
  - C) bun workspace + bun test，打包保留 vite
- 当前建议：A
- 用户答复：A（2026-06-10，通过多问题 ToolCall 确认）
- 最终决策：全面迁到 bun
- 决策理由：测试为 mocha 全局风格 + node assert，bun test 原生兼容，迁移成本低；单一工具链简化开发循环。
- 状态：confirmed

### 3. 【P1】dist 产物格式

- 背景：bun build 不支持 UMD；现有 dist 为 ES + UMD（vite 产出）。
- 需要决定：放弃 UMD 还是为 UMD 保留 vite。
- 选项：
  - A) dist 改为 ESM + CJS，放弃 UMD（BREAKING，已在 proposal 标注）
  - B) 保留 vite 仅用于 UMD 产物
- 当前建议：A（决策 2 已确认移除 vite，且未发现 UMD 消费方）
- 用户答复：随 proposal 评审一并确认，未提出异议（2026-06-10）
- 最终决策：A
- 决策理由：与"全面迁 bun"决策一致；如未来需要浏览器单文件产物可用 IIFE 格式补充。
- 状态：confirmed

### 4. 【P2】子包命名与发布策略

- 背景：现有包名 `@symtable/kunun`，消费方依赖该名称。
- 需要决定：子包 scope 与是否发布。
- 选项：
  - A) 子包用 `kunun-*`，总包保留 `@symtable/kunun`，子包不发布（private workspace 内部使用）
  - B) 子包用 `@symtable/kunun-*` 并发布
  - C) 子包用 `kunun-*`，总包改名为 `kunun`
- 当前建议：A
- 用户答复：C —— 子包命名为 kunun-*，总包命名为 kunun（2026-06-10，通过多问题 ToolCall 确认）
- 最终决策：子包 `kunun-core` / `kunun-converter` / `kunun-runtime` / `kunun-type-system`，总包 `kunun`；子包不发布 npm
- 决策理由：统一无 scope 命名更简洁；总包由 `@symtable/kunun` 改名为 `kunun` 属 BREAKING，已在 proposal 标注，由用户自行承担消费方迁移。
- 状态：confirmed

### 5. 【P1】校验模式与粒度

- 背景：plan.xml 需要确定 validation_mode 与 granularity。
- 需要决定：gap-loop 还是人工确认；每 phase 还是仅最后 phase。
- 选项：
  - A) gap-loop，仅最后 phase
  - B) gap-loop，每个 phase
  - C) yield-human-confirm
- 当前建议：A
- 用户答复：B（2026-06-10，通过多问题 ToolCall 确认）
- 最终决策：yield-gap-loop + every_phase；提交模式 manual
- 决策理由：结构性迁移每个 phase 改动面大，逐 phase gap 检查更稳。
- 状态：confirmed
