/// <reference path="../pb_data/types.d.ts" />

// Track data_imports record creation and log tag names
onRecordCreate((e) => {
  // Load utilities module inside handler
  const utils = require(`${__hooks}/utils.js`);
  const { ImportUtils } = utils;

  console.log("========================================");
  console.log("[Import Hook] 🎯 Processing import:", e.record.get("id"));
  console.log("[Import Hook] Source:", e.record.get("source"));
  console.log("[Import Hook] Content hash:", e.record.get("content_hash"));

  // Get item count for reference
  const itemCount = e.record.get("item_count");
  console.log("[Import Hook] Item count:", itemCount);

  let jsonContent;
  try {
    jsonContent = JSON.parse(e.record.get("json_content"));
  } catch (err) {
    console.log("[Import Hook] Bad JSON, skipping:", err.message);
    return e.next();
  }

  // Process locations into pet_locations table
  if (Array.isArray(jsonContent) && jsonContent.length > 0) {
    console.log("[Import Hook] Processing", jsonContent.length, "items...");
    
    try {
      // Pass import_id to link locations to this import
      const results = ImportUtils.processPetLocations($app, $security, jsonContent, e.record.id);
      console.log(`[Import Hook] ✅ Done: ${results.processed} saved, ${results.duplicates} dupes, ${results.errors} errors`);
    } catch (err) {
      console.error("[Import Hook] Processing failed:", err.message);
    }
  } else {
    console.log("[Import Hook] No valid data to process");
  }

  console.log("========================================");
  e.next();
}, "data_imports");

console.log(
  "[Data Import Hooks] 🎣 Registered onRecordCreate hook for data_imports collection",
);
