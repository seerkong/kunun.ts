#!/usr/bin/env bash
# capped-probe.sh — run ONE suspect snippet inside a memory+CPU-capped Finch
# container so a runaway (infinite loop / memory blowup) is killed by the cap
# instead of taking down the host.
#
# Reads the probe source (TypeScript/JS for `bun`) from STDIN, writes it to a
# temp file inside the repo, and runs it in a Finch container with hard limits.
#
# Usage:
#   echo '<bun source>' | REPO=/path/to/repo MEM=512m CPUS=1 WALL=8 \
#     skills/finch-resource-diagnosis/scripts/capped-probe.sh
#
# Env (all optional):
#   REPO   absolute path of the repo to mount        (default: cwd)
#   IMAGE  container image with a matching bun        (default: oven/bun:1.3.6)
#   MEM    hard memory cap                            (default: 512m)
#   CPUS   cpu cap                                    (default: 1)
#   WALL   wall-clock seconds before SIGKILL          (default: 8)
#
# Exit-code meaning (the whole point — localizes the runaway):
#   0     completed within caps          -> NO runaway on this input
#   137   OOM / SIGKILL                  -> MEMORY runaway (or wall SIGKILL) HERE
#   124   wall timeout                   -> CPU infinite loop HERE
#   other code threw a normal error      -> NOT a runaway (it threw fast)
set -u

REPO="${REPO:-$(pwd)}"
IMAGE="${IMAGE:-oven/bun:1.3.6}"
MEM="${MEM:-512m}"
CPUS="${CPUS:-1}"
WALL="${WALL:-8}"

mkdir -p "$REPO/.tmp"
PROBE_FILE="$REPO/.tmp/_capped_probe.ts"
cat > "$PROBE_FILE"

echo "[PROBE] image=$IMAGE mem=$MEM cpus=$CPUS wall=${WALL}s  (swap disabled, host protected)"
echo "[PROBE] source:"; sed 's/^/    /' "$PROBE_FILE"
echo "[PROBE] --- output ---"

# --memory-swap == --memory  => swap disabled: a memory runaway is OOM-killed
#   inside the container's VM and CANNOT thrash host swap.
# --pids-limit                => guards against fork/process explosion.
# timeout -s KILL             => hard wall-clock backstop for pure-CPU loops.
finch run --rm \
  --memory="$MEM" --memory-swap="$MEM" --cpus="$CPUS" --pids-limit=256 \
  -v "$REPO":/w -w /w \
  "$IMAGE" \
  sh -c "timeout -s KILL ${WALL}s bun /w/.tmp/_capped_probe.ts"
code=$?

echo "[PROBE] --- end ---"
case $code in
  0)   echo "[RESULT] OK (exit 0) — no runaway on this input";;
  137) echo "[RESULT] ⚠ KILLED (137) — OOM/SIGKILL: MEMORY runaway (or wall-clock SIGKILL) HERE";;
  124) echo "[RESULT] ⚠ KILLED (124) — wall timeout: CPU infinite loop HERE";;
  *)   echo "[RESULT] threw/errored (exit $code) — NOT a runaway (normal throw, fast)";;
esac
exit $code
