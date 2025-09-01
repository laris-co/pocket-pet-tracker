/// <reference path="../pb_data/types.d.ts" />

// Track data_imports record creation and log tag names
onRecordCreate((e) => {
  // Load utilities module inside handler
  const utils = require(`${__hooks}/utils.js`);
  const { ImportUtils } = utils;

  // Check if already processed to prevent infinite loop
  const currentStatus = e.record.get("status");
  if (currentStatus === "full" || currentStatus === "partial" || currentStatus === "duplicate" || currentStatus === "error") {
    console.log("[Import Hook] Already processed, skipping. Status:", currentStatus);
    return e.next();
  }
  
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
      // Access ID as a direct property
      const importId = e.record.id;
      console.log("[Import Hook] Import ID:", importId);
      
      const results = ImportUtils.processPetLocations($app, $security, jsonContent, importId);
      console.log(`[Import Hook] ✅ Done: ${results.processed} saved, ${results.duplicates} dupes, ${results.errors} errors`);
      
      // Update status based on results
      const totalExpected = itemCount || jsonContent.length;
      
      // Determine status:
      // "full" = all items saved as NEW records (no duplicates)
      // "partial" = some new records saved, but had duplicates or errors  
      // "duplicate" = all items were duplicates (nothing new saved)
      let status;
      if (results.processed === totalExpected && results.duplicates === 0 && results.errors === 0) {
        status = "full";  // All items were new
      } else if (results.processed === 0 && results.duplicates > 0 && results.errors === 0) {
        status = "duplicate";  // All items were duplicates
      } else if (results.processed > 0) {
        status = "partial";  // Mix of new and duplicates/errors
      } else {
        status = "error";  // No items processed successfully
      }
      
      // Just set the status on the record - it will be saved by the framework
      e.record.set("status", status);
      console.log(`[Import Hook] Status set to: ${status} (${results.processed} new, ${results.duplicates} dupes, ${results.errors} errors)`)
      
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
