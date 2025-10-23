# Decisions

## Usage
- 用于记录需要用户确认的决策问题、选项、最终结论与理由

### 1. 【P0】集成形态
- 选项：A) 独立 CLI + skill（库 API 顺带导出） B) 仅库嵌入
- 用户答复：A（2026-06-10）
- 最终决策：A
- 状态：confirmed

### 2. 【P2】CLI 命名
- 选项：A) kunun-wf B) kwf C) 其他
- 当前建议：B
- 用户答复：B（用户在实现前手动将"当前建议"改为 B，即 kwf）
- 最终决策：B —— CLI 名为 `kwf`（bin/kwf.ts，配置文件 kwf.config.json，env KWF_CONFIG，runsRoot ~/.kwf/runs）
- 决策理由：用户指定；更简短。
- 勘误：实现期未察觉用户的手动修改，曾误以 kunun-wf 落地并把本决策覆盖为 A；2026-06-11 经用户指出后全仓更正为 kwf。
- 状态：confirmed

### 3. 【P2】暂停语义（实现期新增）
- 背景：pause 可以是进程内等待或退出进程留待续跑。
- 最终决策：pause/stop 在 yield 边界生效并退出执行循环（状态 paused/stopped 落盘）；resume = 清除 control + 重新 executeRun，从 checkpoint 续跑。与 durable 设计一致，无 daemon。
- 状态：confirmed

### 4. 【P2】子进程实现（实现期新增）
- 背景：bun 子进程语义差异风险（plan R1）。
- 最终决策：用 node:child_process spawn（bun 兼容层）；detached worker 经 process.execPath（bun 二进制）重入 bin 的 __worker 命令；实测后台运行可达 done。
- 状态：confirmed
