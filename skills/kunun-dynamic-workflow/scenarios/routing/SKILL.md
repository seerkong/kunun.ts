---
name: routing
description: 先分类、再按类别走不同分支处理
---

# 场景：分类分支（routing）

## 何时用
请求要**先判类型、再分流**到不同处理：工单分流、意图识别后走不同应答、按难度 / 领域选不同专家。

## 流程骨架
1. **#Classify** —— 一个 classify agent，output_schema 含 `category`（建议加 `enum` 限定取值），把输入归到某一类。
2. **#分支** —— 先 `(var answer "")`，再用 `(if (:== (classification.:category) "某类") :[ (set answer (ai_agent ...)) ] else :[ ... ])` 按类别派不同 agent。
3.（可选）**#汇总** —— 一个 agent 收口。

`:output = [分类 答案]`。

## 关键陷阱
- 只有命中分支里的 agent 会 yield；没命中的不执行。
- 比较运算用命名 host fn **`:==`** / `:lt` / `:gt`（裸 `<` / `>` 是有序 map / 泛型定界符，会出错）。

## 完整范例
`{{KWF}} examples show routing`
