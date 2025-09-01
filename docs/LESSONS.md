# Lessons Learned (Do/Don't)

## Mistakes to Avoid
- **Wrong hook type**: Using `OnRecordCreateRequest` for records saved internally.  
  Use `OnRecordAfterCreateSuccess("collection")` for `app.Save()` paths.
- **Assuming JSON decode**: Treating JSON fields as native objects.  
  Decode `types.JSONRaw`/`[]byte`/`string` explicitly to `[]any` or `map[string]any`.
- **Shell quoting pain**: Inline jq/curl breaks easily in tmux.  
  Use `scripts/recv_post.sh` to avoid quoting errors.
- **Port contention**: Forgetting to free :9999 leads to confused tests.  
  `lsof -nP -iTCP:9999 -sTCP:LISTEN -t | xargs -r kill`.
- **Hardcoded paths**: Absolute paths in scripts reduce portability.  
  Prefer repo‑relative defaults with env/flag overrides (e.g., `API_URL`, `ITEMS_FILE`).
- **Hash drift**: Inconsistent `content_hash` / `location_hash` across components.  
  Document and standardize once; apply everywhere.
- **No visibility**: Not capturing logs/commands makes sessions opaque.  
  Use tmux + `capture-pane` after each key action.

## Tricks That Helped
- **tmux helper**: `scripts/pbgo_tmux.sh` to run server + commands, then capture tails.
- **One-step demo**: `scripts/reset_and_import.sh` resets DB, restarts, imports, and prints counts.
- **Stable stringify**: Canonical JSON via key‑sorted stringify → deterministic MD5.
- **Server-side MD5**: Compute `content_hash` on the server; treat client MD5 as advisory.
- **Env overrides**: `API_URL`, `ITEMS_FILE`, `PORT`, `TMUX_SESSION` for flexible runs.
- **Migrations only in JSVM**: Disable JS hooks; run app migrations on bootstrap.

## Hashing Spec (Quick Reference)
- `content_hash = md5(stableStringify(content))`
- `location_hash = md5(pet_name + latitude + longitude + accuracy)` (timestamp excluded)

## Rituals (Repeat Every Session)
- Reset, run, import, count. Let the system answer.
- Capture tmux panes after sends; keep evidence.
- Prefer scripts over ad‑hoc shell for repeatability.
