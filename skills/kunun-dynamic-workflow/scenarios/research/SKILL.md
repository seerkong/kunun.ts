---
name: research
description: 调研 / 查找 / 对比 / 出报告——答案要去网上搜、读、再汇总的任务
---

# 场景：联网调研（搜索 → 并行抓取 → 汇总）

## 何时用
需求的答案依赖**外部 / 实时 / 事实性**信息：调研某主题、对比方案、查"业界怎么做 X"、出一份报告。需要真去网上搜、抓网页、再综合。

## 流程骨架（三段，照此搭）
1. **#Search** —— 一个 agent 用 shell 联网搜索，返回它**真实找到**的来源列表。
   - output_schema 必须是 object，含一个 `sources` 数组，`items` 是 **object**（带 `url` / `title` / `why`）——这样下游既能迭代、又能逐字段访问。
   - sys_prompt 要求：用 shell + curl/wget 调搜索引擎搜索；只返回**真实找到、可访问**的 URL；不编造。
2. **#Read（扇出）** —— `ai_parallel` 遍历上一步的 `sources`，每个来源一个 agent，用 curl 抓取**那一个** URL、读真实内容、提炼要点，结果上保留来源 url。
   - `input = (searchResults.:sources)`，`item = source`，`index = i`；每个并行项体里**只放一个** ai_agent。
   - 每个抓取 agent 给 output_schema（object，含 url / reachable / 提炼要点数组等）。
   - sys_prompt 要求：核验抓到的是真实正文（非 404 / 同意墙 / 空），够不着就标 unreachable、不要猜。
3. **#Synthesize** —— 一个用**顺序 `(var ...)`** 捕获的 agent，读前一步已注入的抓取结果，写出最终成品（报告）。
   - **绝不让它重新抓取 / 重新搜索**——它必须**复用 #Read 阶段已经抓好的提炼结果**（在它 user_prompt 里插值那个 extracts 变量）。重抓整批 URL 会拖垮整个扇出、并超时。
   - 用**用户需求的语言**写报告，逐条引用来源 URL，区分证据充分的结论与较弱 / 单源的观察。

`:output = [来源列表 各来源提炼 最终报告]`。

## 关键陷阱
- **汇总重抓 = 超时**：第 3 段一定要用第 2 段的 extracts，别再 curl 一遍。
- `sources` 的 `items` 要用 **object** 而非 string，否则 `ai_parallel` 绑定 `item = source` 后 `\((source.:title))` 取不到。
- 搜索可能返回较多来源 → 扇出 job 数随之变多，注意运行时的 agent 上限 / 并发。

## 完整范例
`{{KWF}} examples show deep-research`（注意范例用的是 claude 的 WebSearch 工具；若你的 agent 跑在 codex / shell 环境，就把搜索 / 抓取换成 curl/wget）。
