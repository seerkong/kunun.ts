---
name: generic
description: 不属于上述任何典型场景时的通用多步编排兜底
---

# 场景：通用编排（兜底）

## 何时用
任务不贴合 调研 / 扇出归并 / 分类分支 / 对抗验证 / 循环枯竭 任一典型场景时，用这套通用思路自己搭。

## 思路
1. 把用户需求拆成**真实的执行步骤**（不是"分析需求"这类元步骤），每步用一个 `ai_phase` 串起来。
2. 需要**外部数据 / 实时信息 / 真实动作**的步骤，让 agent 用 shell + 网络去真做（curl/wget 抓取、读写文件），别凭记忆编。
3. 步骤间要传结果就**顺序 `(var ...)`** 或用 `ai_pipeline` 的 value（结果只能向前流动）；独立的批量处理用 `ai_parallel`。
4. 最后一步产出**用户要的成品**（用需求的语言）。
5. 被字段访问 / 扇出的 agent 结果都加 output_schema。

## 更多
- 范式与陷阱详解：`{{KWF}} docs show dynamic-workflow/03-authoring-patterns.md`
- 各类完整范例：`{{KWF}} examples list`
