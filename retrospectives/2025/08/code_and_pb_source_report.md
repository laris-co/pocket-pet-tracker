# Pocket Pet Tracker – Codebase and PocketBase Source Review

Date: 2025-08-30
Branch: main

## Executive Summary
- Overall architecture is solid: PocketBase hooks for ingestion + DuckDB export pipeline for analytics/exports.
- Schemas and indexes are well-chosen; utilities abstract common patterns; shell tooling covers validation, security, and ops.
- Two key gaps: server-side trust of client-provided MD5 in import endpoint; incomplete processing from `data_imports` into `pet_locations`.
- PocketBase source vendored here is modern, modular, with a robust JS VM plugin. A few JSVM “quirks” require care and are already noted in CLAUDE.md.

## Repo Snapshot & Metrics
- Files: 37
- JS hooks: 429 LoC (active), 1134 LoC (archive)
- Shell scripts: 1000 LoC
- SQL: 159 LoC
- Active routes: `GET /test`, `POST /recv`
- Archived but useful API: `/api/pets/current`, `/api/pets/{id}/current`, `/api/pets/{id}/history`, `/api/pets/timeframe`

## Application Code Review

### What’s Very Good
- Schema discipline
  - `pet_locations`: unique `location_hash`, bounds on lat/lng, accuracy non-negative, timestamp required.
  - `data_imports`: unique `content_hash`, `import_date`, status, item_count, error_message.
  - Extra indexes added for `pet_name,timestamp` and timestamp-only aid common queries.
- Utility separation (`pb_hooks/utils.js`)
  - Clear split: PetUtils, LocationUtils, DbUtils (with safe “no rows” handling), PaginationUtils, ImportUtils, StatusUtils.
  - Dedup hash builder and record factory functions reduce repetition; consistent param filters.
- Defensive error handling
  - `findRecordSafely` swallows expected “no rows” while rethrowing real errors.
  - Import path uses try/catch per item and tallies `processed/duplicates/errors`.
- Operational hygiene
  - `.gitignore` excludes sensitive artifacts (`Items.data`, `pb_data/`, Parquet, logs, backups).
  - `scripts/security_audit.sh` and `scripts/validate_import.sh` provide practical guardrails and sanity checks.
  - Cron manager and export pipeline (`pet_tracker_export.sh`) handle initial vs incremental, plus stats and JSON/CSV exports.

### What’s Weird or Risky
- Trusting client MD5 for dedup (POST /recv)
  - Current handler uses `body.md5` as `content_hash`. A malicious or mistaken client could spoof or collide.
  - Recommendation: compute `computed_hash = md5(JSON.stringify(body.content))` server-side and dedup on that.
- Incomplete import pipeline
  - `onRecordCreate` for `data_imports` logs but does not process `json_content` into `pet_locations` via `ImportUtils.processPetLocations` or set final status.
  - Recommendation: parse `json_content`, call ImportUtils, update `status` to `ok` with `processed/duplicates/errors` counts.
- Hash alignment mismatch
  - DuckDB export hash omits timestamp; server `LocationUtils.createLocationHash` includes timestamp and accuracy, leading to inconsistent dedup semantics.
  - Recommendation: unify hashing components across DB and export.
- Portability in scripts
  - `import_tags.sh` uses absolute `ITEMS_FILE` path and macOS `md5`; better to default to repo `./Items.data` and use `md5sum` fallback.
- JSON field type
  - `json_content` is a JSON column; code calls `JSON.parse(e.record.get("json_content"))`. Depending on JSVM binding, it may already be an object; current try/catch is fine but confirm actual type to avoid double-parse.
- Useful API parked in archive
  - The pet API endpoints are robust but inactive. If you want them, move into active hooks, reuse `utils`, and ensure index usage.

### Quick Wins
1) Compute server-side content hash in /recv and ignore provided hash for dedup.
2) Finish `data_imports` create hook to process and update status + counts.
3) Standardize `location_hash` fields across pipeline.
4) Make `import_tags.sh` path and hashing cross-platform.
5) Promote pet API routes from archive and align with `utils`.

## PocketBase Source Review (vendored `pocketbase-source`)

### What’s Very Good
- JS VM plugin (plugins/jsvm)
  - Clean integration with goja/goja_nodejs; `HooksWatch` for live reload; flexible `HooksFilesPattern`; resolves `require` reliably via `defaultScriptPath` workaround.
  - Strong separation of loader VM vs executor VMs; aligns with your CLAUDE.md notes on scoping.
- Router and API ergonomics (`tools/router`, `apis/*`)
  - Typed router with groups; `ApiError` helpers; body reread and response tracking (middlewares set `RereadableReadCloser` and wrapper response writer).
  - Clear separation of core APIs (files, logs, settings, record CRUD/auth, batch, cron, health).
- Modularity and tooling
  - `tools/*` packages encapsulate filesystem, cron, hooks, DB utils, subscriptions, search; good cohesion.
  - Admin UI embedded; examples available for custom server.
- Modern deps
  - Up-to-date goja and sqlite (modernc), strong x/* packages, consistent module layout.

### Quirks / Gotchas (expected but non-obvious)
- JSVM environment is not Node
  - No timers (`setTimeout`, `setInterval`), no fetch; limited globals; must use PB-provided `$app`, `$os`, `$security`, etc.
  - Functions defined at top-level in a `.pb.js` aren’t auto-visible in per-hook executor contexts; define inside handlers.
- Request parsing differs from typical HTTP libraries
  - In hooks, prefer `e.requestInfo()` which returns `{ body, headers, ... }` over raw `e.request.body`.
  - Headers exposed via snake_case; raw body is a Go `io.ReadCloser` (needs helper to read string).
- Module resolution hack
  - `defaultScriptPath` rebind enables `require` parent traversal; surprising but necessary given goja_nodejs behavior.

### Overall PB Assessment
PocketBase is well-structured and pragmatic. The JSVM plugin is thoughtfully engineered for safety and hot-reload ergonomics. Router and API surfaces are expressive. The non-Node JS semantics and VM isolation are the main “weird” points, but they’re documented and consistent.

## Recommendations Roadmap
1. Security: Server-side content hashing in `/recv`; reject mismatched hashes; log both for diagnostics.
2. Correctness: Implement `data_imports` processing → `pet_locations` and status updates.
3. Consistency: Align `location_hash` formula across DB and DuckDB exports.
4. API: Activate pet endpoints; add pagination metadata via `PaginationUtils`; ensure indexes cover queries.
5. Tooling: Portability fixes in scripts; extend `security_audit.sh` to verify `content_hash` uniformity across imports.
6. Docs: Fill CLAUDE.md’s Project Context, Architecture, Env vars; wire short codes (`ccc`, `nnn`, `gogogo`, `rrr`) to small wrapper scripts.

## Appendix
- Indexes present
  - pet_locations: `idx_location_hash` (UNIQUE), `idx_pet_name_timestamp`, `idx_timestamp`.
  - data_imports: `idx_content_hash` (UNIQUE), `idx_import_date`, `idx_status`.
- Active hooks
  - `000_test_route.pb.js`: GET /test
  - `100_data_import_handler.pb.js`: POST /recv
- Archived routes (promote as needed)
  - `/api/pets/current`, `/api/pets/{id}/current`, `/api/pets/{id}/history`, `/api/pets/timeframe`.

