# Decisions

## Usage
- 用于记录需要用户确认的决策问题、选项、最终结论与理由
- 后续执行过程中出现的新决策，也继续追加到本文件

### 1. 【P0】MCP transport 与 SDK
- 选项：A) stdio + @modelcontextprotocol/sdk + zod（参考 multica/terminal） B) 自实现协议 C) HTTP/SSE
- 用户答复：A（2026-06-11，用户指定参考 multica/terminal 实现）
- 最终决策：A
- 状态：confirmed

### 2. 【P0】文本资产的内嵌方式
- 选项：A) bunfs（`import ... with {type:"file"}`，编译时嵌入，运行时 Bun.file 加载） B) 构建脚本拼接进源码 C) 不内嵌、随包分发
- 用户答复：A（2026-06-11，用户明确指定 bunfs；资产在仓库中保持独立文本文件）
- 最终决策：A —— assets/ 独立文本文件 + `with {type:"file"}` import；dev（未编译）与 compiled 双模式同一 API（已在 bun 1.3.6 实证：编译后路径为 /$bunfs/root/*，Bun.file 可读）
- 状态：confirmed

### 3. 【P1】CLI 参数解析器
- 背景：参考工程用 commander 声明式命令树；kwf 现为手写 switch 且已有 CLI 测试。
- 选项：A) 保留手写解析，仅按参考工程引入 Backend 共享层与 mcp 子命令 B) 整体迁移 commander
- 当前建议：A —— 减少新依赖与重写面，结构性收益（共享 backend）不依赖解析器
- 用户答复：（未异议则按 A）
- 最终决策：A
- 状态：confirmed-by-default（用户可随时翻案，翻案成本低）

### 4. 【P2】MCP tool 命名
- 最终决策：统一 `kwf_` 前缀（kwf_run_workflow / kwf_run_status / kwf_run_events / kwf_run_result / kwf_pause_run / kwf_resume_run / kwf_stop_run / kwf_list_runs / kwf_list_examples / kwf_get_example / kwf_get_skill）
- 状态：confirmed

### 5. 【P2】examples/ 与 skill/ 的真相源
- 背景：bunfs import 路径必须在包内可解析；根 examples/、skill/ 是 Track C 交付物且有测试锁定。
- 最终决策：真相源保留在仓库根 examples/ 与 skill/（路径不变，既有测试不动）；workflow-host 经相对路径 import 嵌入这些文件。若 bun 编译期不接受包外相对 import，则回退为"构建前同步副本到包内 assets/ 并以测试锁定一致性"，实施时验证后回写。
- 状态：confirmed（实施验证点）

### 6. 【P1】TypeScript 升级（实现期新增）
- 背景：import attributes（with {type:"file"}）需要 TS 5.3+，仓库原为 4.6。
- 最终决策：升级 typescript@~5.4.5（5.5+ 会移除 tsconfig 现用的废弃宽松选项）；tsconfig module commonjs→esnext、新增 skipLibCheck（MCP SDK d.ts 需 DOM fetch 类型）；3 处 TS5 narrowing 旧代码最小 cast 修复。
- 状态：confirmed

### 7. 【P2】编译态判定（实现期回写）
- 最终决策：用 Bun.main.startsWith('/$bunfs')。__dirname/import.meta.dir 在 bundle 时被固化为构建机源码路径，不可用于运行时判定（实测踩坑）。
- 状态：confirmed

### 8. 【P2】zod 版本（实现期新增）
- 最终决策：锁 zod@^3.25（bun add 默认装 v4，与 @modelcontextprotocol/sdk@1.x 的 inputSchema 类型不兼容）。
- 状态：confirmed
