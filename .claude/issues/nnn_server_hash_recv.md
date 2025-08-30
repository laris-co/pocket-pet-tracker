# Plan: Server-side content hashing for /recv (data_imports)

## Overview
Refactor the POST /recv handler to compute a canonical MD5 hash of the request content on the server using PocketBase’s $security API, and use it for deduplication and storage (content_hash). This removes trust in client-provided md5 while maintaining backward-compatible duplicate detection.

## Current Behavior
- Handler uses `body.md5` for dedup and stores it as `content_hash`.
- Accepts `body.content` (parsed JSON) from `e.requestInfo()`.

## Proposed Solution
- Compute `computed_hash = $security.md5(stableStringify(body.content))` server-side.
- Deduplicate by `content_hash = computed_hash`.
- Backward-compat check: if no match, and client provided a 32-hex md5, also check `content_hash = body.md5` (transition safety).
- Store `content_hash = computed_hash`. Keep `status=pending`, `item_count` as today.
- Response includes `computed_hash` (and `provided_hash` if sent) for transparency.

## Canonicalization
Implement `stableStringify(v)` that deterministically stringifies JSON:
- Primitives: `JSON.stringify(v)`.
- Arrays: `[` + join of stableStringify(element) + `]`.
- Objects: sort keys (ASCII), stringify each value recursively, and build `{k:v}` in key order.

## Implementation Steps
1) Update `pb_hooks/100_data_import_handler.pb.js`:
   - Add `stableStringify` helper inside the route handler (or load via utils if preferred).
   - Compute `computed_hash` and replace all uses of `body.md5` with `computed_hash` for creation and duplicate check.
   - Add fallback duplicate check on `body.md5` (32-hex) only if needed.
   - Return `computed_hash` in success/duplicate responses and log both hashes.
2) No schema changes required (reuse `content_hash`).
3) Validate with existing script `import_tags.sh` (works unchanged; server ignores provided md5 for storage).

## Risks & Mitigations
- Large JSON cost: Items.data scale is acceptable; consider chunking if needed later.
- Client/server mismatch: Expected; dedup happens server-side; include both hashes in response for visibility.
- Canonicalization correctness: Unit-test stringify on representative nested objects/arrays.

## Acceptance Criteria
- New import with same content twice → second returns `duplicated`.
- Legacy import created with client md5 → re-posting same content returns `duplicated` (fallback check).
- New records store `content_hash = computed_hash`.
- Response includes `computed_hash` and optionally `provided_hash`.

## Follow-ups (later PRs)
- Add per-import processed/duplicate/error counters.
- Standardize location_hash across pipeline and DuckDB.
- Promote pet API from archive.
