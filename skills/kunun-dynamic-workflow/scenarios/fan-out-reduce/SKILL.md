---
name: fan-out-reduce
description: 对一组独立输入并行跑同类 agent，再归并成一个结果
---

# 场景：扇出归并（fan-out / reduce）

## 何时用
有一组**互相独立**的输入，要对每个并行跑同一类处理，再把所有结果交给一个 agent 归并。典型：多角度起草、并行打分、批量翻译后汇总、对一批条目各自处理后合并。

## 流程骨架
1. **#扇出** —— 准备输入数组（`(var items [...])` 或来自上游），`ai_parallel` 遍历：`input = items item = item index = i`，并行体里**只放一个** ai_agent，对每个元素处理。结果按元素顺序拼成数组。
2. **#归并** —— 一个普通 ai_agent（顺序 var 捕获），在 user_prompt 里插值上一步那个数组变量，把它们综合成单一结果。

`:output = [各元素结果 归并结果]`。

## 关键陷阱
- `ai_parallel` 的 `input` **必须是数组**；非数组会被当成空 `[]`、一个 job 都不派发。
- 每个并行项体**只能有一个** ai_agent（只有最后一个表达式会被派发）；不能嵌套 ai_parallel / ai_pipeline。
- 下游若要字段访问每个结果，给并行里的 agent 加 output_schema。

## 完整范例
`{{KWF}} examples show fan-out-reduce`
