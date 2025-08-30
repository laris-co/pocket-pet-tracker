/// <reference path="../pb_data/types.d.ts" />

// Data import handler - receives JSON data with MD5 hash and stores in data_imports collection
// Test with: jq -n --slurpfile data Items.data '{md5: "hash", content: $data[0]}' | curl -X POST http://localhost:8090/recv -H "Content-Type: application/json" -d @-

// Main Handler - Clean and Focused (All functions inside handler for PocketBase compatibility)
routerAdd("POST", "/recv", (e) => {
  const utils = require(`${__hooks}/utils.js`)
  const { DbUtils, ImportUtils } = utils

  // Configuration constants
  const CONFIG = {
    COLLECTIONS: { DATA_IMPORTS: "data_imports" },
    STATUSES: { PENDING: "pending", OK: "ok", DUPLICATED: "duplicated", ERROR: "error" },
    SOURCES: { API: "api", MANUAL: "manual_import" }
  }

  // Validation Functions
  function validateImportRequest(body) {
    if (!body?.content) {
      return { valid: false, error: "Missing required field: content" }
    }
    return { valid: true }
  }

  function isValidMd5Hash(hash) {
    return typeof hash === 'string' && /^[a-f0-9]{32}$/i.test(hash)
  }

  // Deterministic JSON stringifier to ensure stable hashing
  function stableStringify(value) {
    const type = typeof value
    if (value === null || type === 'number' || type === 'boolean' || type === 'string') {
      return JSON.stringify(value)
    }
    if (Array.isArray(value)) {
      const parts = value.map(v => stableStringify(v))
      return `[${parts.join(',')}]`
    }
    if (type === 'object') {
      const keys = Object.keys(value).sort()
      const parts = []
      for (const k of keys) {
        parts.push(`${JSON.stringify(k)}:${stableStringify(value[k])}`)
      }
      return `{${parts.join(',')}}`
    }
    // Fallback for unsupported types
    return JSON.stringify(String(value))
  }

  // Business Logic Functions
  function checkForDuplicate($app, hash) {
    try {
      return $app.findFirstRecordByFilter(
        CONFIG.COLLECTIONS.DATA_IMPORTS,
        "content_hash = {:hash}",
        { hash }
      )
    } catch (err) {
      // "sql: no rows" is expected when no duplicate exists
      if (err.message && err.message.includes("no rows")) {
        return null
      }
      throw err // Re-throw actual errors
    }
  }

  function createImportRecord($app, requestData, computedHash) {
    const collection = $app.findCollectionByNameOrId(CONFIG.COLLECTIONS.DATA_IMPORTS)
    const record = new Record(collection, {
      import_date: new Date().toISOString(),
      content_hash: computedHash,
      json_content: requestData.content,
      source: requestData.source || CONFIG.SOURCES.API,
      status: CONFIG.STATUSES.PENDING,
      item_count: getItemCount(requestData.content),
      error_message: null
    })

    $app.save(record)
    return record
  }

  // TODO: Use from utils
  function getItemCount(content) {
    return Array.isArray(content) ? content.length : 1
  }

  // Response Builders
  function buildResponse(status, data = {}) {
    return { status, timestamp: new Date().toISOString(), ...data }
  }

  function buildSuccessResponse(record, itemCount) {
    return buildResponse(CONFIG.STATUSES.OK, {
      import_id: record.get("id"),
      items_count: itemCount
    })
  }

  function buildDuplicateResponse(existingRecord) {
    return buildResponse(CONFIG.STATUSES.DUPLICATED, {
      import_id: existingRecord.get("id"),
      imported_at: existingRecord.get("import_date")
    })
  }

  function buildErrorResponse(message) {
    return {
      status: CONFIG.STATUSES.ERROR,
      error: message,
      timestamp: new Date().toISOString()
    }
  }

  console.log("[Data Import] Request received at:", new Date().toISOString())

  try {
    const { body } = e.requestInfo()

    // 1. Validate request
    const validation = validateImportRequest(body)
    if (!validation.valid) {
      console.log("[Data Import] Validation failed:", validation.error)
      return e.json(400, buildErrorResponse(validation.error))
    }

    console.log("[Data Import] Valid import format detected")
    console.log("[Data Import] Content type:", ImportUtils.getContentType(body.content))

    // 2. Compute server-side hash from canonical JSON
    const computedHash = $security.md5(stableStringify(body.content))
    const providedHash = body.md5 && isValidMd5Hash(body.md5) ? body.md5 : null
    console.log("[Data Import] Provided hash:", providedHash || "<none>")
    console.log("[Data Import] Computed hash:", computedHash)

    // 3. Check for duplicates using computed hash first
    let duplicate = checkForDuplicate($app, computedHash)
    // Backward-compat: also check provided hash if computed not found
    if (!duplicate && providedHash) {
      duplicate = checkForDuplicate($app, providedHash)
    }
    if (duplicate) {
      console.log("[Data Import] Duplicate found, ID:", duplicate.get("id"))
      const resp = buildDuplicateResponse(duplicate)
      resp.computed_hash = computedHash
      if (providedHash) resp.provided_hash = providedHash
      resp.hash_match = providedHash ? (providedHash === computedHash) : null
      return e.json(200, resp)
    }

    // 4. Create new import record
    console.log("[Data Import] Creating new import record...")
    const record = createImportRecord($app, body, computedHash)
    const itemCount = getItemCount(body.content)

    console.log("[Data Import] ✅ Import saved successfully with computed hash:", computedHash)
    const resp = buildSuccessResponse(record, itemCount)
    resp.computed_hash = computedHash
    if (providedHash) resp.provided_hash = providedHash
    resp.hash_match = providedHash ? (providedHash === computedHash) : null
    return e.json(200, resp)

  } catch (error) {
    console.error("[Data Import] Unexpected error:", error.message)
    return e.json(500, buildErrorResponse(error.message))
  }
})

console.log("[Data Import] POST /recv endpoint registered - Clean refactored version ✨")
