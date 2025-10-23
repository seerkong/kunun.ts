---
name: generate-and-filter
description: 先广度生成大量候选，去重，再用评分标准（rubric）只留高质量的
---

# 场景：生成后过滤（generate & filter）

## 何时用
要先要**广度**、再要**质量**：头脑风暴、出点子、列方案 —— 先并行多角度生成一大批候选，去重后用一套评分标准（rubric）筛掉平庸的、只留最好的若干个。

## 流程骨架
1. **#Generate（扇出）** —— `ai_parallel` 用**不同视角 / lens**（最便宜最快见效、反直觉的非显然角度、10 倍雄心的团队会怎么做、最能替用户省事……）并行多个生成器，每个产出若干候选（output_schema 含 `ideas` 数组，item = object{title, pitch}）。不同 lens 让候选发散，而不是 N 个都给同样显而易见的答案。
2. **#Filter** —— 对候选评分筛选，两种做法：
   - 简单：一个 agent 拿到全部候选，**去重 + 按 rubric 打分 + 选出 top N**（output_schema 含 `kept` 数组，每个带 score / reason）。
   - 更严：`ai_parallel` 对每个候选并行打分（score 0..1 + verdict keep/drop），再一个 agent 汇总保留 keep 且过阈值的、排序取 top。

`:output = [生成候选 保留结果]`。

## 关键陷阱
- 生成器要用**不同 lens**，否则并行 N 个只是重复同一批答案。
- 去重 / 排序 / 取 top 这类数据处理 kon 不擅长 —— 交给一个 agent 在 prompt 里做（"去重、按 rubric 打分、返回 top N"），别想在 kon 里手写。
- 评分要有明确 rubric + 阈值，避免 agent 要么全留要么全弃。

## 完整范例
`{{KWF}} examples show generate-and-filter`
