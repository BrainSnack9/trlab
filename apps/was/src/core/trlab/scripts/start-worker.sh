#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
LOG_DIR="$ROOT/logs"
OUT_LOG="$LOG_DIR/collector.out.log"
ERR_LOG="$LOG_DIR/collector.err.log"
PID_FILE="$LOG_DIR/collector.pid"

BASE_URL="${TRLAB_URL:-${WAS_URL:-http://localhost:5174}}"
COLLECT_MINUTES="${COLLECT_EVERY_MINUTES:-30}"
RANK_SCHEDULE="${RANK_TIMES:-00:00,06:00,12:00,18:00}"

mkdir -p "$LOG_DIR"

if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE")"
  if kill -0 "$PID" 2>/dev/null; then
    echo "TrLab collector is already running. PID=$PID"
    echo "Log: $OUT_LOG"
    echo "Error log: $ERR_LOG"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

(
  cd "$ROOT"
  TRLAB_URL="$BASE_URL" \
  COLLECT_EVERY_MINUTES="$COLLECT_MINUTES" \
  RANK_TIMES="$RANK_SCHEDULE" \
  nohup node src/core/trlab/scripts/collector.js >> "$OUT_LOG" 2>> "$ERR_LOG" &
  echo "$!" > "$PID_FILE"
)

echo "TrLab collector started. PID=$(cat "$PID_FILE")"
echo "Log: $OUT_LOG"
echo "Error log: $ERR_LOG"
