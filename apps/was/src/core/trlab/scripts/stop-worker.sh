#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
PID_FILE="$ROOT/logs/collector.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "No TrLab collector worker is running."
  exit 0
fi

PID="$(cat "$PID_FILE")"
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  echo "Stopped TrLab collector worker. PID=$PID"
else
  echo "No TrLab collector worker is running."
fi

rm -f "$PID_FILE"
