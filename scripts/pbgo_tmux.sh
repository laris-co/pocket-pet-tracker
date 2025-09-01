#!/usr/bin/env bash
set -euo pipefail

# Tmux helper for running the PocketBase Go server in a tmux window.
# Default behavior: use the first existing tmux session, or create one named "pbgo".
# Environment overrides:
#   TMUX_SESSION  - session name to use (default: first existing, else "pbgo")
#   PBGO_PORT     - port to bind (default: 9999)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PBGO_DIR="${PROJECT_DIR}/pbgo"
PB_DATA_DIR="${PROJECT_DIR}/pb_data"
WINDOW="pbgo"
SESSION="${TMUX_SESSION:-}"
PORT="${PBGO_PORT:-9999}"

need_tmux() {
  if ! command -v tmux >/dev/null 2>&1; then
    echo "tmux not found. Please install tmux." >&2
    exit 1
  fi
}

detect_session() {
  if [[ -n "${SESSION}" ]]; then
    return
  fi
  local first
  first=$(tmux ls 2>/dev/null | awk -F: 'NR==1{print $1}') || true
  if [[ -n "${first}" ]]; then
    SESSION="$first"
  else
    SESSION="pbgo"
  fi
}

ensure_session() {
  if ! tmux has-session -t "$SESSION" 2>/dev/null; then
    tmux new-session -d -s "$SESSION"
  fi
}

ensure_window() {
  # Compare by window name for reliability
  if ! tmux list-windows -t "$SESSION" -F '#{window_name}' | grep -Fxq "$WINDOW"; then
    tmux new-window -t "$SESSION" -n "$WINDOW"
  fi
}

start() {
  need_tmux
  detect_session
  ensure_session
  ensure_window

  # Stop previous process if any (Ctrl-C)
  tmux send-keys -t "$SESSION:$WINDOW.0" C-c 2>/dev/null || true

  local cmd="cd '$PBGO_DIR' && go run ./cmd/pbgo serve --http 0.0.0.0:${PORT} --dir '${PB_DATA_DIR}'"
  tmux send-keys -t "$SESSION:$WINDOW.0" "$cmd" C-m
  echo "Started pbgo in tmux session '$SESSION', window '$WINDOW' on port ${PORT}."
}

stop() {
  need_tmux
  detect_session
  tmux send-keys -t "$SESSION:$WINDOW.0" C-c || true
  echo "Sent Ctrl-C to $SESSION:$WINDOW.0"
}

status() {
  need_tmux
  detect_session
  echo "Session: $SESSION | Window: $WINDOW"
  tmux list-windows -t "$SESSION" || true
  echo "--- last 120 lines ---"
  tmux capture-pane -p -S -120 -t "$SESSION:$WINDOW.0" || true
}

capture() {
  need_tmux
  detect_session
  local lines="${1:-200}"
  tmux capture-pane -p -S -"$lines" -t "$SESSION:$WINDOW.0"
}

attach() {
  need_tmux
  detect_session
  tmux select-window -t "$SESSION:$WINDOW" || true
  tmux attach -t "$SESSION"
}

usage() {
  cat <<EOF
pbgo tmux helper

Usage: $(basename "$0") <start|stop|status|capture [N]|attach|split|run CMD>

Env:
  TMUX_SESSION=name   target session (default: first existing or 'pbgo')
  PBGO_PORT=9999      port to run the server (default: 9999)

Examples:
  TMUX_SESSION=0 PBGO_PORT=9999 $(basename "$0") start
  $(basename "$0") status
  $(basename "$0") capture 300
  $(basename "$0") attach
  $(basename "$0") split
  $(basename "$0") run 'echo hello && date'
EOF
}

case "${1:-}" in
  start)   start ;;
  stop)    stop ;;
  status)  status ;;
  capture) shift; capture "${1:-200}" ;;
  attach)  attach ;;
  split)
    need_tmux; detect_session; ensure_session; ensure_window;
    # Ensure 2 panes exist
    if [ "$(tmux list-panes -t "$SESSION:$WINDOW" | wc -l | tr -d ' ')" -lt 2 ]; then
      tmux split-window -h -t "$SESSION:$WINDOW"
    fi
    echo "Split ready in $SESSION:$WINDOW (2 panes)."
    ;;
  run)
    shift
    need_tmux; detect_session; ensure_session; ensure_window;
    # Ensure right pane for commands
    if [ "$(tmux list-panes -t "$SESSION:$WINDOW" | wc -l | tr -d ' ')" -lt 2 ]; then
      tmux split-window -h -t "$SESSION:$WINDOW"
    fi
    tmux send-keys -t "$SESSION:$WINDOW.1" "$*" C-m
    sleep 1
    echo "--- pane 1 output (tail 120) ---"
    tmux capture-pane -p -S -120 -t "$SESSION:$WINDOW.1"
    ;;
  *) usage; exit 1 ;;
esac
