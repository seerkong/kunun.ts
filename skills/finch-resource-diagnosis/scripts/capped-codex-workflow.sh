#!/usr/bin/env bash
# capped-codex-workflow.sh — 在 Finch 内存+CPU 封顶容器里跑 kunun 的 dynamic
# workflow，并让它真实调用本机的 codex CLI。把 kunun 解释器/调度的 runaway
# （无限循环 / 无界分配 / fork 爆炸）隔离在容器内，宿主毫发无伤；codex 是网络
# IO，不会爆 CPU/内存，但会真实调用 LLM（**花钱**）。
#
# 隔离边界（务必清楚）：
#   ✅ 挡：CPU 占满(--cpus)、内存暴涨(--memory + --memory-swap 禁 swap)、进程爆炸(--pids-limit)
#   ❌ 不挡：网络外联、codex 的 token 花费 / API 限流 —— 靠 maxAgents/timeout/最小输入控制
#
# 它替你解决的 4 个坑（都是实测踩出来的）：
#   1. 跨平台二进制：codex(@openai/codex) 是 Rust 二进制，npm 包 vendor/ 自带各平台版本，
#      直接挂载本机包、按容器 arch 选 *-unknown-linux-musl 版，无需容器内装 node/codex。
#   2. 认证：~/.codex 只读挂载，auth.json 复制进容器内可写 CODEX_HOME（本机 .codex 不被写）。
#      auth.json 即足够认证。若遇 403（额度/Invalid token 类），多半是网关瞬时状态（限流/
#      余额），重试或换有余额的网关——别急着归因到"缺认证文件"。
#   3. 自定义网关：复制本机 config.toml（model/model_provider/base_url），但剥离 [mcp_servers]
#      段（容器内 npx 起不来会卡 startup_timeout）和 notify 行（指向本机 .app）。
#   4. TLS：容器(oven/bun debian-slim)无 CA 证书 → reqwest TLS 验证失败（TCP 连上但发请求失败）。
#      容器内装 ca-certificates 修复（bun 用内置 CA 不受影响，codex/reqwest 用系统 CA）。
#
# 用法：
#   REPO=/path/to/kunun.ts skills/finch-resource-diagnosis/scripts/capped-codex-workflow.sh
#   # 默认跑 E2E 的单个 ai_agent 用例（KWF_E2E=1）。自定义在容器 /w 下执行的命令：
#   CMD='KWF_E2E=1 KWF_E2E_ADAPTER=codex bun test packages/workflow-host/__tests__/Case/E2E.test.ts' \
#     REPO=... capped-codex-workflow.sh
#
# Env（均可选）：
#   REPO        kunun 仓库绝对路径（挂到容器 /w）            默认：cwd
#   IMAGE       容器镜像（需 bun + apt）                      默认：oven/bun:1.3.6
#   MEM/CPUS    封顶（给 kunun+codex 留足，又能及时 OOM-kill）默认：3g / 2
#   WALL        容器内 wall-clock 秒（SIGKILL 兜底）          默认：240
#   HOST_CODEX  本机 codex 配置目录                           默认：~/.codex
#   CMD         容器 /w 下执行的命令                          默认：E2E 单 ai_agent 用例
#
# 前置：本机已安装 @openai/codex（codex 在 PATH），~/.codex/auth.json + config.toml 可用。
set -u

REPO="${REPO:-$(pwd)}"
IMAGE="${IMAGE:-oven/bun:1.3.6}"
MEM="${MEM:-3g}"
CPUS="${CPUS:-2}"
WALL="${WALL:-240}"
HOST_CODEX="${HOST_CODEX:-$HOME/.codex}"
CMD="${CMD:-KWF_E2E=1 KWF_E2E_ADAPTER=codex bun test -t \"single ai_agent\" packages/workflow-host/__tests__/Case/E2E.test.ts}"

# --- 定位本机 codex npm 包目录（含 vendor/<triple>/codex 的各平台二进制）---
CODEX_BIN="$(command -v codex || true)"
[ -n "$CODEX_BIN" ] || { echo "[ERR] codex 不在 PATH，请先安装 @openai/codex"; exit 2; }
CODEX_LINK="$(readlink "$CODEX_BIN" 2>/dev/null || echo "$CODEX_BIN")"
case "$CODEX_LINK" in
  /*) CODEX_TARGET="$CODEX_LINK" ;;
  *)  CODEX_TARGET="$(cd "$(dirname "$CODEX_BIN")" && cd "$(dirname "$CODEX_LINK")" && pwd)/$(basename "$CODEX_LINK")" ;;
esac
# CODEX_TARGET 形如 .../@openai/codex/bin/codex.js → 包目录 = 上两级
CODEX_PKG="$(cd "$(dirname "$CODEX_TARGET")/.." && pwd)"
[ -d "$CODEX_PKG/vendor" ] || { echo "[ERR] 未找到 codex vendor 目录: $CODEX_PKG/vendor"; exit 2; }
[ -f "$HOST_CODEX/auth.json" ] || { echo "[ERR] 未找到 $HOST_CODEX/auth.json"; exit 2; }

echo "[capped-codex] repo=$REPO image=$IMAGE mem=$MEM cpus=$CPUS wall=${WALL}s"
echo "[capped-codex] codex pkg=$CODEX_PKG  host codex=$HOST_CODEX"
echo "[capped-codex] cmd: $CMD"

# 容器内：选 triple → 装 CA → 备认证/精简 config → PATH 加 codex 二进制 → 跑命令。
# 注意 CMD 经环境变量传入，容器内 eval 执行。
finch run --rm \
  --memory="$MEM" --memory-swap="$MEM" --cpus="$CPUS" --pids-limit=512 \
  -v "$REPO":/w -w /w \
  -v "$CODEX_PKG":/codex:ro \
  -v "$HOST_CODEX":/host-codex:ro \
  -e CODEX_HOME=/tmp/ch \
  -e KWF_CMD="$CMD" \
  "$IMAGE" \
  sh -c '
    set -e
    case "$(uname -m)" in
      aarch64|arm64) T=aarch64-unknown-linux-musl ;;
      x86_64|amd64)  T=x86_64-unknown-linux-musl ;;
      *) echo "[ERR] unsupported arch: $(uname -m)"; exit 3 ;;
    esac
    if [ ! -f /etc/ssl/certs/ca-certificates.crt ] || ! command -v curl >/dev/null 2>&1; then
      (apt-get update -qq && apt-get install -y -qq ca-certificates curl) >/dev/null 2>&1 \
        && echo "[capped-codex] ca-certificates + curl installed" || echo "[capped-codex][WARN] apt install failed (TLS/curl may fail)"
    fi
    mkdir -p /tmp/ch
    # auth.json 即含登录所需信息（足够认证）。config.toml 随后用 sed 单独覆盖（剥 mcp/notify）。
    # 注意 ~/.codex/auth-keys/ 是用户自己备份的各 provider auth.json，不要复制进容器。
    cp /host-codex/auth.json /tmp/ch/
    # 复制 config.toml，剥离 [mcp_servers] 段（到文件尾）和 notify 行（容器内无效/会卡）
    if [ -f /host-codex/config.toml ]; then
      sed -e "/^[[:space:]]*notify[[:space:]]*=/d" -e "/^\[mcp_servers/,\$d" /host-codex/config.toml > /tmp/ch/config.toml
    fi
    export PATH="/codex/vendor/$T/codex:/codex/vendor/$T/path:$PATH"
    echo "[capped-codex] codex: $(command -v codex) ($(codex --version 2>&1))"
    echo "[capped-codex] --- running workflow (capped) ---"
    timeout -s KILL '"$WALL"' sh -c "$KWF_CMD"
    code=$?
    echo "[capped-codex] --- end (exit $code) ---"
    exit $code
  '
rc=$?
case $rc in
  0)   echo "[RESULT] OK — workflow ran under cap, no runaway";;
  137) echo "[RESULT] ⚠ KILLED (137) — kunun MEMORY runaway hit the cap (host safe), or wall SIGKILL";;
  124) echo "[RESULT] ⚠ KILLED (124) — wall timeout: kunun CPU loop or codex stuck";;
  *)   echo "[RESULT] exit $rc — workflow/test failed (see output above; not necessarily a runaway)";;
esac
exit $rc
