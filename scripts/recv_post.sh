#!/usr/bin/env bash
set -euo pipefail

PORT=${1:-9999}
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
ITEM_FILE="$ROOT_DIR/Items.data"

if [ ! -f "$ITEM_FILE" ]; then
  echo "Items.data not found at $ITEM_FILE" >&2
  exit 1
fi

MD5_HASH=""
if command -v md5 >/dev/null 2>&1; then
  MD5_HASH=$(md5 -q "$ITEM_FILE")
elif command -v md5sum >/dev/null 2>&1; then
  MD5_HASH=$(md5sum "$ITEM_FILE" | awk '{print $1}')
else
  echo "No md5 or md5sum command found" >&2
  exit 1
fi

jq -n --slurpfile data "$ITEM_FILE" \
   --arg md5 "$MD5_HASH" \
   --arg source "manual_import" \
   '{md5:$md5, content:$data[0], source:$source}' \
  | curl -sS -X POST "http://127.0.0.1:$PORT/recv" \
      -H 'Content-Type: application/json' \
      -d @-

echo
