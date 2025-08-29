/// <reference path="../pb_data/types.d.ts" />

// Track data_imports record creation and log tag names
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
    
    // Try to read and parse JSON content to show tag names
    try {
        let jsonContent = e.record.get("json_content")
        
        // Handle different formats PocketBase might return
        if (typeof jsonContent === 'string') {
            try {
                jsonContent = JSON.parse(jsonContent)
            } catch (err) {
                console.log("[Data Import Hook] Could not parse JSON string")
                return
            }
        }
        
        // Now try to log tag names if we have valid data
        if (Array.isArray(jsonContent)) {
            console.log("[Data Import Hook] Found tags:")
            let tagCount = 0
            let locationCount = 0
            
            // Loop through and log tag names
            for (let i = 0; i < jsonContent.length; i++) {
                const item = jsonContent[i]
                if (item && item.name && typeof item.name === 'string' && item.name.match(/^Tag \d+$/)) {
                    tagCount++
                    const hasLocation = !!(item.location && item.location.latitude && item.location.longitude)
                    if (hasLocation) locationCount++
                    
                    // Log first 10 tags in detail
                    if (tagCount <= 10) {
                        console.log(`  - ${item.name}${hasLocation ? ' ✓ (has location)' : ' ✗ (no location)'}`)
                    }
                }
            }
            
            if (tagCount > 10) {
                console.log(`  ... and ${tagCount - 10} more tags`)
            }
            
            if (tagCount > 0) {
                console.log(`[Data Import Hook] Summary: ${tagCount} tags total, ${locationCount} with locations`)
            }
        }
        
    } catch (err) {
        console.log("[Data Import Hook] Could not process JSON content:", err.message)
    }
    
    console.log("[Data Import Hook] ✅ Hook processing complete")
    console.log("========================================")
    
    e.next()
}, "data_imports")

console.log("[Data Import Hooks] 🎣 Registered onRecordCreate hook for data_imports collection")