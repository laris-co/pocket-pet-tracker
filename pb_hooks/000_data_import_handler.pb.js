/// <reference path="../pb_data/types.d.ts" />

// Data import handler - receives JSON data with MD5 hash and stores in data_imports collection
// Test with: jq -n --slurpfile data Items.data '{md5: "hash", content: $data[0]}' | curl -X POST http://localhost:8090/recv -H "Content-Type: application/json" -d @-

// Main Handler - Clean and Focused (All functions inside handler for PocketBase compatibility)
routerAdd("POST", "/recv", (e) => {
  const utils = require(`${__hooks}/utils.js`)
  const { DbUtils } = utils

  // Configuration constants
  const CONFIG = {
    COLLECTIONS: { DATA_IMPORTS: "data_imports" },
    STATUSES: { PENDING: "pending", OK: "ok", DUPLICATED: "duplicated", ERROR: "error" },
    SOURCES: { API: "api", MANUAL: "manual_import" }
  }

  // Validation Functions
  function validateImportRequest(body) {
    if (!body?.md5 || !body?.content) {
      return { valid: false, error: "Missing required fields: md5 and content" }
    }

    // if (!isValidMd5Hash(body.md5)) {
    //   return { valid: false, error: "Invalid MD5 hash format (must be 32 hex characters)" }
    // }

    return { valid: true }
  }

  // function isValidMd5Hash(hash) {
  //   return typeof hash === 'string' && /^[a-f0-9]{32}$/i.test(hash)
  // }

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

  function createImportRecord($app, requestData) {
    const collection = $app.findCollectionByNameOrId(CONFIG.COLLECTIONS.DATA_IMPORTS)
    const record = new Record(collection, {
      import_date: new Date().toISOString(),
      content_hash: requestData.md5,
      json_content: requestData.content,
      source: requestData.source || CONFIG.SOURCES.API,
      status: CONFIG.STATUSES.PENDING,
      item_count: getItemCount(requestData.content),
      error_message: null
    })

    $app.save(record)
    return record
  }

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
    console.log("[Data Import] MD5 hash:", body.md5)
    console.log("[Data Import] Content type:", Array.isArray(body.content) ? "array" : typeof body.content)

    // 2. Check for duplicates
    const duplicate = checkForDuplicate($app, body.md5)
    if (duplicate) {
      console.log("[Data Import] Duplicate found, ID:", duplicate.get("id"))
      return e.json(200, buildDuplicateResponse(duplicate))
    }

    // 3. Create new import record
    console.log("[Data Import] Creating new import record...")
    const record = createImportRecord($app, body)
    const itemCount = getItemCount(body.content)

    console.log("[Data Import] ✅ Import saved successfully, Hash:", body.md5)
    return e.json(200, buildSuccessResponse(record, itemCount))

  } catch (error) {
    console.error("[Data Import] Unexpected error:", error.message)
    return e.json(500, buildErrorResponse(error.message))
  }
})

console.log("[Data Import] POST /recv endpoint registered - Clean refactored version ✨")
