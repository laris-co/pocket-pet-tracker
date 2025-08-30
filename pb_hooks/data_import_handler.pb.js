/// <reference path="../pb_data/types.d.ts" />

// Data import handler - receives JSON data with MD5 hash and stores in data_imports collection
// Test with: jq -n --slurpfile data Items.data '{md5: "hash", content: $data[0]}' | curl -X POST http://localhost:8090/recv -H "Content-Type: application/json" -d @-

routerAdd("POST", "/recv", (e) => {
  // Load utilities module inside handler
  const utils = require(`${__hooks}/utils.js`);
  const { PetUtils, LocationUtils, DbUtils, ImportUtils } = utils;

  console.log("[Data Import] Request received at:", new Date().toISOString());

  try {
    // Get request body using verified requestInfo() method
    const info = e.requestInfo();

    // Check if request has the expected format: { md5: "hash", content: [...] }
    if (info.body && info.body.md5 && info.body.content) {
      console.log("[Data Import] Valid import format detected");
      console.log("[Data Import] MD5 hash:", info.body.md5);
      console.log(
        "[Data Import] Content type:",
        Array.isArray(info.body.content) ? "array" : typeof info.body.content,
      );

      // Calculate item count
      let itemCount = 1;
      if (Array.isArray(info.body.content)) {
        itemCount = info.body.content.length;
        console.log("[Data Import] Array with", itemCount, "items");
      }

      // Check for duplicate import by hash
      let existingRecord = null;
      try {
        existingRecord = $app.findFirstRecordByFilter(
          "data_imports",
          "content_hash = {:hash}",
          { hash: info.body.md5 },
        );
      } catch (err) {
        // "sql: no rows" is expected when no duplicate exists
        if (err.message && !err.message.includes("no rows")) {
          console.error("[Data Import] Database error:", err.message);
          return e.json(500, {
            status: "error",
            error: "Database error",
          });
        }
      }

      if (existingRecord) {
        const existingId = existingRecord.get("id");
        console.log("[Data Import] Duplicate found, ID:", existingId);
        return e.json(200, {
          status: "duplicated",
          import_id: existingId,
          imported_at: existingRecord.get("import_date"),
        });
      }

      // Create new import record
      console.log("[Data Import] Creating new import record...");
      const collection = $app.findCollectionByNameOrId("data_imports");
      const record = new Record(collection, {
        import_date: new Date().toISOString(),
        content_hash: info.body.md5,
        json_content: info.body.content,
        source: info.body.source || "api",
        status: "pending",
        item_count: itemCount,
        error_message: null,
      });

      try {
        $app.save(record);
        const recordId = record.get("id");
        console.log(
          "[Data Import] ✅ Import saved successfully, from Hash:",
          info.body.md5,
        );

        return e.json(200, {
          status: "ok",
          import_id: recordId,
          items_count: itemCount,
          // processed_locations: processedCount,
        });
      } catch (saveError) {
        console.error("[Data Import] Failed to save:", saveError.message);
        return e.json(500, {
          status: "error",
          error: saveError.message,
        });
      }
    } else {
      // Fallback to original debug behavior for backward compatibility
      console.log("[Data Import] Legacy format or debug request");
      // Try to parse as direct array/object (original behavior)
      if (Array.isArray(info.body)) {
        console.log(
          "[Data Import] Direct array received, length:",
          info.body.length,
        );
        return e.json(200, {
          success: true,
          message: "Debug mode - direct array received",
          data_type: "array",
          count: info.body.length,
          first_item: info.body[0]
            ? {
                name: info.body[0].name,
                has_location: !!info.body[0].location,
              }
            : null,
          data: info.body,
        });
      } else {
        console.log("[Data Import] Direct object received");
        return e.json(200, {
          success: true,
          message: "Debug mode - direct object received",
          data_type: typeof info.body,
          data: info.body,
        });
      }
    }
  } catch (error) {
    console.error("[Data Import] Unexpected error:", error.message);
    return e.json(500, {
      success: false,
      error: error.message,
    });
  }
});

console.log(
  "[Data Import] POST /recv endpoint registered - accepts {md5, content} format",
);
