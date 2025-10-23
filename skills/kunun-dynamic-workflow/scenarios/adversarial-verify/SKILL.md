---
name: adversarial-verify
description: 先生成候选，再多视角对抗验证 / 投票筛选
---

# 场景：对抗验证（adversarial verify）

## 何时用
要**提高结论可信度**：先产出一批候选（声明、答案、bug……），再让独立的审查者去**反驳 / 多视角校验**，只保留扛得住的。

## 流程骨架
1. **#Find** —— 一个 agent 产出候选数组（output_schema 含 `claims` / `candidates` 数组）；`(var claims (found.:claims))` 取出。
2. **#Challenge（扇出）** —— `ai_parallel` 遍历候选，每个候选一个**对抗审查** agent（sys_prompt 让它尽力反驳），output_schema 含 `verdict`。要更强可对每个候选并行多个不同**视角**的审查者。
3. **#Filter** —— `(foreach ...)` 统计扛住的数量 / 过滤出幸存者（`(set n (n 1 :+))`）。

`:output = [候选 裁决 幸存数]`。

## 关键陷阱
- 多个**视角各异**的审查者比多个雷同的更能发现问题。
- 加法等用命名 host fn：`(n 1 :+)`；比较用 `:==`。

## 完整范例
`{{KWF}} examples show adversarial-verify`
