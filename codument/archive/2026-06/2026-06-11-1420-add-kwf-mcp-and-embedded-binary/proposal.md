# 变更：kwf MCP server 与 bunfs 内嵌资产的单可执行分发

## 背景和动机 (Context And Why)

kwf 目前只有手写 CLI，且以"bun + 仓库源码"形态运行：没有 MCP 接口（宿主 coding agent 只能 shell 出 CLI），没有可分发的单可执行文件，提示词/示例等文本资产部分硬编码在代码里。参考工程 multica/terminal 给出了成熟形态：CLI 与 MCP server 共享同一 Backend 业务层、`<cli> mcp stdio` 子命令共存、`bun build --compile` 产单可执行文件。用户另确认：提示词、.kon 示例、SKILL 模板等应在代码仓库中保持**独立文本文件**，通过 **bunfs**（`import ... with { type: "file" }`）嵌入单可执行文件，运行时用 bunfs 加载（已在 bun 1.3.6 实证可行，dev 模式同代码直接走真实文件路径）。

## "要做"和"不做" (Goals / Non-Goals)

**目标:**
- **Backend 共享层**：抽出 `WorkflowBackend`（run/status/logs/result/pause/resume/stop/list/examples/skill），CLI 与 MCP tools 共用
- **MCP server**：`kwf mcp stdio` 子命令，@modelcontextprotocol/sdk + zod，`kwf_` 前缀 tools 覆盖 Backend 全部操作
- **资产外置 + bunfs**：schema 纠错提示词、SKILL.md、examples/*.kon、配置样例保持独立文本文件，经 `with {type:"file"}` import 嵌入；新增 `kwf examples`/`kwf skill` 命令（list/show/导出），MCP 侧对应 tools
- **单可执行构建**：`bun build --compile` 产 dist/kwf；detached worker 重入适配编译态（process.execPath 即 kwf 自身）；编译产物冒烟（跑 example、MCP 握手、embeddedFiles 校验）

**非目标:**
- 不做 HTTP/SSE transport（仅 stdio）
- 不做 MCP resources/prompts 能力（仅 tools，与参考工程一致）
- 不重写 CLI 为 commander（保留现有手写解析与既有测试；见 decisions）
- 不做多平台交叉编译 CI（本地单平台产物验证为准）

## 变更内容（What Changes）

- packages/workflow-host 新增 `assets/`（独立文本文件）、`lib/assets.ts`（bunfs 加载层）、`lib/backend.ts`、`lib/mcp.ts`；bridge 的纠错提示词改为资产文件
- CLI 新增子命令：`mcp stdio`、`examples [list|show|export]`、`skill`
- 新增依赖（仅 workflow-host 包）：@modelcontextprotocol/sdk、zod
- 新增构建脚本 `build:bin`（bun build --compile）与编译态 worker 重入分支
- skill/ 与 examples/ 的真相源迁移说明（见 design）

## 影响范围（Impact）

- 受影响的功能规范：workflow-host-runtime（新增 mcp-server 与 embedded-assets-binary requirement）
- 受影响的代码：packages/workflow-host 全部；根 examples/、skill/ 的引用关系
- 上游依赖：add-workflow-host-runtime、add-workflow-agent-integration（均已完成）
