/// <reference path="../pb_data/types.d.ts" />

// Track data_imports record creation - simplified version
// The actual data processing happens in data_import_handler.pb.js
onRecordCreate((e) => {
    console.log("[HOOK TEST] Record create fired for collection:", e.record.tableName())
    if (e.record.tableName() !== "data_imports") {
        e.next()
        return
    }
    console.log("========================================")
    console.log("[Data Import Hook] 🎯 New import created!")
    console.log("[Data Import Hook] Record ID:", e.record.get("id"))
    console.log("[Data Import Hook] Source:", e.record.get("source"))
    console.log("[Data Import Hook] Import date:", e.record.get("import_date"))
    console.log("[Data Import Hook] Content hash:", e.record.get("content_hash"))
    
    // Get item count and status which were already calculated and stored
    const itemCount = e.record.get("item_count")
    const status = e.record.get("status")
    
    console.log("[Data Import Hook] Item count:", itemCount)
    console.log("[Data Import Hook] Status:", status)
    
    // The actual data processing happens in data_import_handler.pb.js
    // This hook is just for logging/monitoring
    console.log("[Data Import Hook] ✅ Hook processing complete")
    console.log("========================================")
    
    e.next()
}, "data_imports")

console.log("[Data Import Hooks] 🎣 Registered onRecordCreate hook for data_imports collection")