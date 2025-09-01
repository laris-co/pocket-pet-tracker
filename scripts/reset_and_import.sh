#!/usr/bin/env bash
set -euo pipefail

# Reset DB, start server (tmux), create superuser, import Items.data, print counts.
# Usage: PORT=9999 TMUX_SESSION=pbgo-dev ./scripts/reset_and_import.sh

PORT=${PORT:-9999}
SESSION=${TMUX_SESSION:-pbgo-dev}
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1" >&2; exit 1; }; }
need jq
need sqlite3
need tmux
need lsof
need go

cd "$ROOT_DIR"

echo "Killing any listeners on :$PORT..."
PIDS=$(lsof -nP -iTCP:$PORT -sTCP:LISTEN -t || true)
if [ -n "$PIDS" ]; then kill $PIDS || true; sleep 1; fi
LEFT=$(lsof -nP -iTCP:$PORT -sTCP:LISTEN -t || true)
if [ -n "$LEFT" ]; then kill -9 $LEFT || true; sleep 1; fi

echo "Resetting pb_data..."
rm -rf pb_data && mkdir -p pb_data

echo "Starting server in tmux ($SESSION)..."
TMUX_SESSION="$SESSION" PBGO_PORT="$PORT" bash scripts/pbgo_tmux.sh start
sleep 6

echo "Creating superuser..."
tmux send-keys -t "$SESSION:pbgo.1" 'cd pbgo && go run ./cmd/pbgo superuser upsert nat@catlabs.me changeme --dir ../pb_data' C-m
sleep 2

echo "Posting import..."
tmux send-keys -t "$SESSION:pbgo.1" "cd .. && bash scripts/recv_post.sh $PORT" C-m
sleep 3

echo "Printing counts..."
sqlite3 pb_data/data.db 'SELECT id,status,item_count FROM data_imports ORDER BY import_date DESC LIMIT 1; SELECT COUNT(*) FROM pet_locations;'

echo "Done."

