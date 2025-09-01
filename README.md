# Pocket Pet Tracker — PocketBase (Go) + Runbook

This repo ingests Apple Find My “Items” JSON and stores tag location history in PocketBase. A native Go app under `pbgo/` exposes `POST /recv` and a model lifecycle hook processes imports into `pet_locations` with dedupe and status.

## Quick Start

- Prereqs: Go 1.21+, jq, sqlite3, tmux (optional)
- Start server (port 9999):
  - `cd pbgo && go run ./cmd/pbgo serve --http 0.0.0.0:9999 --dir ../pb_data`
- Import current `Items.data`:
  - `bash scripts/recv_post.sh 9999`
- Verify counts:
  - `sqlite3 pb_data/data.db 'SELECT COUNT(*) FROM data_imports; SELECT COUNT(*) FROM pet_locations;'`

## Runbook

- Reset + run + import (manual):
  - Stop any server on 9999: `lsof -nP -iTCP:9999 -sTCP:LISTEN -t | xargs -r kill`
  - `rm -rf pb_data && mkdir pb_data`
  - Start: `cd pbgo && go run ./cmd/pbgo serve --http 0.0.0.0:9999 --dir ../pb_data`
  - Create superuser: `cd pbgo && go run ./cmd/pbgo superuser upsert nat@catlabs.me changeme --dir ../pb_data`
  - Import: `cd .. && bash scripts/recv_post.sh 9999`
  - Counts: `sqlite3 pb_data/data.db 'SELECT id,status,item_count FROM data_imports ORDER BY import_date DESC LIMIT 1; SELECT COUNT(*) FROM pet_locations;'`

- With tmux helper (split panes):
  - `TMUX_SESSION=pbgo-dev PBGO_PORT=9999 bash scripts/pbgo_tmux.sh start`
  - `TMUX_SESSION=pbgo-dev bash scripts/pbgo_tmux.sh run 'bash scripts/recv_post.sh 9999'`
  - `TMUX_SESSION=pbgo-dev bash scripts/pbgo_tmux.sh status`

## Hashing Spec

- `content_hash`: `md5(stableStringify(content))`
  - stableStringify = deterministic JSON (keys sorted, arrays preserved)
- `location_hash`: `md5(pet_name + latitude + longitude + accuracy)`
  - Timestamp excluded to align with DuckDB exports

## Compatibility

- `/recv` responds with:
  - On new import: `{ status: "ok", import_id, items_count, processed_locations: 0 }`
  - On duplicate: `{ status: "duplicated", import_id, imported_at, processed_locations: 0 }`
  - Note: processing is asynchronous via a model lifecycle hook; counts show 0 at ingest time by design.

## import_tags.sh

- Now supports overrides:
  - `API_URL="http://localhost:9999/recv" ./import_tags.sh`
  - `./import_tags.sh --url http://localhost:9999/recv --file /path/to/Items.data`
- Default endpoint remains `http://localhost:8090/recv` unless overridden.

## Timezone

- Primary display is GMT+7 (Bangkok). UTC omitted for brevity in retrospectives.

## Notes

- JSVM is used only for migrations; JS hooks are disabled in the Go path.
- The model lifecycle hook (`OnRecordAfterCreateSuccess("data_imports")`) performs JSON decode, dedupe, insert, and status derivation.

