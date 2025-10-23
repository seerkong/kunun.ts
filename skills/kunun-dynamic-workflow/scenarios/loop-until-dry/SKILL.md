---
name: loop-until-dry
description: 未知规模的发现 / 收集——反复跑直到连续若干轮无新增
---

# 场景：循环到枯竭（loop until dry）

## 何时用
要**穷尽式**发现 / 收集、但规模未知：找 bug、挖边界情况、收集条目。简单的"跑 N 次"会漏掉尾巴，要循环到连续若干轮没有新增为止。

## 流程骨架
- 在一个 phase 里 `(var total 0)`，用 `(foreach round in [0 1 2 3] :[ ... ])` 设定最大轮数。
- 每轮一个 agent（output_schema 含本轮 `findings` 数组与 `count`），只报**之前没见过的**新增。
- `(if (:== (batch.:count) 0) :[ (set dryRound round) (:break) ] else :[ (set total (total (batch.:count) :+)) ])`：本轮无新增就记录并 `(:break)`，否则累加。

`:output = [累计数 枯竭轮次]`。

## 关键陷阱
- 去重要对照"**所有已见**"，否则被否的结果每轮重现、永不收敛。
- `(:break)` 跳出 `foreach`；比较 `:==`、加法 `:+`。

## 完整范例
`{{KWF}} examples show loop-until-dry`
