/// <reference path="../pb_data/types.d.ts" />

// Track data_imports record creation and log tag names
onRecordCreate((e) => {
  if (e.record.tableName() !== "data_imports") {
    e.next()
    return
  }

  // Load utilities module inside handler
  const utils = require(`${__hooks}/utils.js`);
  const { PetUtils } = utils;
  
  console.log("========================================");
  console.log("[onRecordCreate Import Hook] 🎯 New import created!");
  console.log("[onRecordCreate Import Hook] Record ID:", e.record.get("id"));
  console.log("[onRecordCreate Import Hook] Source:", e.record.get("source"));
  console.log("[onRecordCreate Import Hook] Import date:", e.record.get("import_date"));
  console.log("[onRecordCreate Import Hook] Content hash:", e.record.get("content_hash"));

  // Get item count and status which were already calculated and stored
  const itemCount = e.record.get("item_count");
  const status = e.record.get("status");

  console.log("[onRecordCreate Import Hook] Item count:", itemCount);
  console.log("[onRecordCreate Import Hook] Status:", status);

  // Try to read and parse JSON content to show tag names
  try {
    // Always parse the JSON content - PocketBase returns it as string/byte array
    let jsonContent = JSON.parse(e.record.get("json_content"));
    
    // Now try to log tag names if we have valid data
    if (Array.isArray(jsonContent)) {
      console.log("[onRecordCreate Import Hook] Found tags:");
      let tagCount = 0;
      let locationCount = 0;

      // Loop through and log tag names using PetUtils
      for (let i = 0; i < jsonContent.length; i++) {
        const item = jsonContent[i];
        if (item && item.name && PetUtils.isValidPetTag(item.name)) {
          tagCount++;
          const hasLocation = !!(
            item.location &&
            item.location.latitude &&
            item.location.longitude
          );
          if (hasLocation) locationCount++;

          // Log first 10 tags in detail
          if (tagCount <= 10) {
            console.log(
              `  - ${item.name}${hasLocation ? " ✓ (has location)" : " ✗ (no location)"}`,
            );
          }
        }
      }

      if (tagCount > 10) {
        console.log(`  ... and ${tagCount - 10} more tags`);
      }

      if (tagCount > 0) {
        console.log(
          `[onRecordCreate Import Hook] Summary: ${tagCount} tags total, ${locationCount} with locations`,
        );
      }
    }
  } catch (err) {
    console.log(
      "[onRecordCreate Import Hook] Could not parse JSON content:",
      err.message,
    );
  }

  console.log("[onRecordCreate Import Hook] ✅ Hook processing complete");
  console.log("========================================");

  e.next();
}, "data_imports");

console.log(
  "[Data Import Hooks] 🎣 Registered onRecordCreate hook for data_imports collection",
);