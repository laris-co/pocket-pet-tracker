# Plan: /recv response compatibility – include processed_locations

## Overview
`import_tags.sh` expects a `processed_locations` field in the /recv response. Currently the response omits it, leading to `null` in CLI output. We will add a default `processed_locations: 0` (and keep other metadata) to maintain client compatibility without changing scripts.

## Current Behavior
- Success response: `{ status, import_id, items_count, timestamp }` plus computed/provided hashes we added.
- No `processed_locations` → CLI prints `null`.

## Proposed Change
- Augment success and duplicate responses with `processed_locations: 0` (placeholder), to be updated by downstream processing later.
- Preserve existing fields: `computed_hash`, `provided_hash`, `hash_match`, `import_id`, `items_count`, `imported_at`.

### Response Shapes
- OK (create):
  - `{ status: "ok", import_id, items_count, processed_locations: 0, computed_hash, provided_hash?, hash_match?, timestamp }`
- DUPLICATED:
  - `{ status: "duplicated", import_id, imported_at, processed_locations: 0, computed_hash, provided_hash?, hash_match?, timestamp }`

## Implementation Steps
1) Update `pb_hooks/100_data_import_handler.pb.js`:
   - `buildSuccessResponse`: include `processed_locations: 0`.
   - Duplicate path: inject `processed_locations: 0` in the assembled response.
2) Do not change `import_tags.sh` (per user preference).
3) Add logs to confirm values.

## Backward Compatibility
- Clients relying on `processed_locations` will now see `0` instead of `null`.
- No schema changes; only response augmentation.

## Risks
- Minimal; field is additive and set to 0.

## Acceptance Criteria
- Running `import_tags.sh` shows `Processed Locations: 0` (not null) on both success and duplicate responses.
- No regressions in dedup behavior.

## Follow-ups (separate PR)
- Implement `data_imports` post-create processing that calculates `processed/duplicates/errors` and optionally updates a separate status endpoint.
