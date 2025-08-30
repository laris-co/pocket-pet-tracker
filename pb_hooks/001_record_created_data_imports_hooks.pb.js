/// <reference path="../pb_data/types.d.ts" />

// Track data_imports record creation and log tag names
onRecordCreate((e) => {
  // Load utilities module inside handler
  const utils = require(`${__hooks}/utils.js`);
  const { PetUtils } = utils;

  console.log("========================================");
  console.log("[onRecordCreate Import Hook] 🎯 New import created!");
  console.log("[onRecordCreate Import Hook] Record ID:", e.record.get("id"));
  console.log("[onRecordCreate Import Hook] Source:", e.record.get("source"));
  console.log("[Import Hook] Import date:", e.record.get("import_date"));
  console.log("[Import Hook] Content hash:", e.record.get("content_hash"));

  // Get item count and status which were already calculated and stored
  const itemCount = e.record.get("item_count");
  const status = e.record.get("status");

  console.log("[Import Hook] Item count:", itemCount);
  console.log("[Import Hook] Status:", status);

  let jsonContent;
  try {
    // Cat Lab's workaround:
    jsonContent = JSON.parse(e.record.get("json_content"));
  } catch (err) {
    console.log("[Import Hook] Could not parse JSON content:", err.message);
  }

  // Now try to log tag names if we have valid data
  if (Array.isArray(jsonContent)) {
    console.log("[onRecordCreate Import Hook] Found tags:");
    let tagCount = jsonContent.length;
    let locationCount = 0;

    // Loop through and log tag names using PetUtils
    for (let i = 0; i < tagCount; i++) {
      const item = jsonContent[i];
      if (item && item.name && PetUtils.isValidPetTag(item.name)) {
      }
    }


  }

  console.log("[onRecordCreate Import Hook] ✅ Hook processing complete");
  console.log("========================================");

  e.next();
}, "data_imports");

console.log(
  "[Data Import Hooks] 🎣 Registered onRecordCreate hook for data_imports collection",
);
