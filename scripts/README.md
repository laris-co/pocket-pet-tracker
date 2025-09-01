# Scripts Overview

This repo’s scripts are grouped by purpose. Use this as a task map.

## Dev / Local Running
- `scripts/pbgo_tmux.sh`: Run PocketBase Go server in tmux (left pane: server, right pane: commands).  
  Examples:
  - `TMUX_SESSION=pbgo-dev PBGO_PORT=9999 bash scripts/pbgo_tmux.sh start`
  - `TMUX_SESSION=pbgo-dev bash scripts/pbgo_tmux.sh run 'bash scripts/recv_post.sh 9999'`
  - `TMUX_SESSION=pbgo-dev bash scripts/pbgo_tmux.sh status`
- `scripts/reset_and_import.sh`: One-step demo — reset DB, start server, create superuser, import, show counts.  
  Example: `PORT=9999 TMUX_SESSION=pbgo-dev ./scripts/reset_and_import.sh`

## Ingest
- `import_tags.sh`: Send Items.data to `/recv` (legacy default 8090, now overridable).  
  Examples:
  - `API_URL="http://localhost:9999/recv" ./import_tags.sh`
  - `./import_tags.sh --url http://localhost:9999/recv --file /tmp/Items.data`
- `scripts/recv_post.sh`: Post Items.data to `/recv` using jq/curl.  
  Example: `bash scripts/recv_post.sh 9999`

## Export / Analytics
- `scripts/pet_tracker_export.sh`: Main export pipeline (Parquet + stats); supports JSON/CSV via `--json`.
- `scripts/export_tags.sql`, `scripts/export_tags_incremental.sql`, `scripts/export_tags_json.sh`: Export helpers used by the main pipeline.

## Cron / Ops
- `scripts/setup_cron.sh`: Create a cron job that runs the export pipeline.
- `scripts/cron_wrapper.sh`: Minimal wrapper invoked by cron.  
- `scripts/manage_cron.sh`: (Deprecated) Prefer `setup_cron.sh`.

## Tools / Checks
- `scripts/anonymize_locations.py`: Scrub coordinates in `Items.data` with demo values.
- `scripts/validate_import.sh`: Basic health checks for data, API, DB counts, GPS precision.
- `scripts/security_audit.sh`: Safety checks for ignored files, permissions, data leaks.

## Conventions
- Repo-relative defaults; overrides via env or flags.  
  Example: `API_URL`, `ITEMS_FILE`, `PORT`, `TMUX_SESSION`.
- Use `--help` where supported.
- Prefer tmux capture for repeatability:
  - `tmux capture-pane -p -S -120 -t pbgo-dev:pbgo.0`

See the top-level README’s Runbook for end-to-end examples.
