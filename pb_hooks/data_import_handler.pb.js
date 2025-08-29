/// <reference path="../pb_data/types.d.ts" />

// Data import handler - receives JSON data with MD5 hash and stores in data_imports collection
// Test with: jq -n --slurpfile data Items.data '{md5: "hash", content: $data[0]}' | curl -X POST http://localhost:8090/recv -H "Content-Type: application/json" -d @-

routerAdd("POST", "/recv", (e) => {
  // Helper function to process pet locations from imported data
  function processPetLocations(importRecord, items) {
    let processed = 0
    let duplicates = 0
    let errors = 0
    
    for (const item of items) {
      try {
        // Filter for Tag items only
        if (!item.name || !item.name.match(/^Tag \d+$/)) {
          continue
        }
        
        // Skip if no location data
        if (!item.location || !item.location.latitude || !item.location.longitude) {
          continue
        }
        
        const loc = item.location
        
        // Create location hash for deduplication
        const hashInput = item.name + 
                         (loc.timeStamp || new Date().toISOString()) + 
                         loc.latitude.toString() + 
                         loc.longitude.toString() + 
                         (loc.horizontalAccuracy || 0).toString()
        const locationHash = $security.md5(hashInput)
        
        // Check for duplicates
        let isDuplicate = false
        try {
          const existing = $app.findFirstRecordByFilter(
            "pet_locations", 
            "location_hash = {:hash}",
            { hash: locationHash }
          )
          if (existing) {
            isDuplicate = true
          }
        } catch (err) {
          // "no rows" is expected - not a duplicate
          if (err.message && !err.message.includes("no rows")) {
            console.error(`[Data Import] Location check error for ${item.name}:`, err.message)
            errors++
            continue
          }
        }
        
        if (isDuplicate) {
          duplicates++
          continue
        }
        
        // Create new location record
        const locCollection = $app.findCollectionByNameOrId("pet_locations")
        const locRecord = new Record(locCollection, {
          pet_name: item.name,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.horizontalAccuracy || 0,
          timestamp: new Date(loc.timeStamp).toISOString(),
          battery_status: item.batteryStatus || 1,
          is_inaccurate: loc.isInaccurate || false,
          location_hash: locationHash
        })
        
        $app.save(locRecord)
        processed++
        
      } catch (recordError) {
        console.error(`[Data Import] Error processing ${item.name}:`, recordError.message)
        errors++
      }
    }
    
    console.log(`[Data Import] Location processing complete: ${processed} new, ${duplicates} duplicates, ${errors} errors`)
    
    // Update import record with processing results
    if (errors > 0) {
      importRecord.set("error_message", `Processing completed with ${errors} errors`)
    }
    
    return processed
  }
  
  console.log("[Data Import] Request received at:", new Date().toISOString())
  
  try {
    // Get request body using verified requestInfo() method
    const info = e.requestInfo()
    
    // Check if request has the expected format: { md5: "hash", content: [...] }
    if (info.body && info.body.md5 && info.body.content) {
      console.log("[Data Import] Valid import format detected")
      console.log("[Data Import] MD5 hash:", info.body.md5)
      console.log("[Data Import] Content type:", Array.isArray(info.body.content) ? "array" : typeof info.body.content)
      
      // Calculate item count
      let itemCount = 1
      if (Array.isArray(info.body.content)) {
        itemCount = info.body.content.length
        console.log("[Data Import] Array with", itemCount, "items")
      }
      
      // Check for duplicate import by hash
      let existingRecord = null
      try {
        existingRecord = $app.findFirstRecordByFilter(
          "data_imports",
          "content_hash = {:hash}",
          { hash: info.body.md5 }
        )
      } catch (err) {
        // "sql: no rows" is expected when no duplicate exists
        if (err.message && !err.message.includes("no rows")) {
          console.error("[Data Import] Database error:", err.message)
          return e.json(500, {
            success: false,
            error: "Database error while checking for duplicates"
          })
        }
      }
      
      if (existingRecord) {
        const existingId = existingRecord.get("id")
        console.log("[Data Import] Duplicate found, ID:", existingId)
        return e.json(200, {
          success: false,
          message: "Data already imported",
          import_id: existingId,
          imported_at: existingRecord.get("import_date"),
          status: existingRecord.get("status")
        })
      }
      
      // Create new import record
      console.log("[Data Import] Creating new import record...")
      const collection = $app.findCollectionByNameOrId("data_imports")
      const record = new Record(collection, {
        import_date: new Date().toISOString(),
        content_hash: info.body.md5,
        json_content: info.body.content,
        source: info.body.source || "api",
        status: "pending",
        item_count: itemCount,
        error_message: null
      })
      
      try {
        $app.save(record)
        const recordId = record.get("id")
        console.log("[Data Import] ✅ Import saved successfully, ID:", recordId)
        
        // Optional: Process pet locations immediately if it's Items.data format
        let processedCount = 0
        if (Array.isArray(info.body.content)) {
          const firstItem = info.body.content[0]
          if (firstItem && firstItem.name && firstItem.name.match(/^Tag \d+$/)) {
            console.log("[Data Import] Detected pet tracker data, processing locations...")
            processedCount = processPetLocations(record, info.body.content)
            
            // Update status based on processing result
            record.set("status", processedCount > 0 ? "processed" : "skipped")
            $app.save(record)
          }
        }
        
        return e.json(200, {
          success: true,
          import_id: recordId,
          items_count: itemCount,
          status: record.get("status"),
          processed_locations: processedCount,
          message: processedCount > 0 
            ? `Import successful, ${processedCount} new locations added`
            : "Import successful, data stored for processing"
        })
        
      } catch (saveError) {
        console.error("[Data Import] Failed to save:", saveError.message)
        return e.json(500, {
          success: false,
          error: "Failed to save import: " + saveError.message
        })
      }
      
    } else {
      // Fallback to original debug behavior for backward compatibility
      console.log("[Data Import] Legacy format or debug request")
      
      // Try to parse as direct array/object (original behavior)
      if (Array.isArray(info.body)) {
        console.log("[Data Import] Direct array received, length:", info.body.length)
        return e.json(200, {
          success: true,
          message: "Debug mode - direct array received",
          data_type: "array",
          count: info.body.length,
          first_item: info.body[0] ? {
            name: info.body[0].name,
            has_location: !!info.body[0].location
          } : null,
          data: info.body
        })
      } else {
        console.log("[Data Import] Direct object received")
        return e.json(200, {
          success: true,
          message: "Debug mode - direct object received",
          data_type: typeof info.body,
          data: info.body
        })
      }
    }
    
  } catch (error) {
    console.error("[Data Import] Unexpected error:", error.message)
    return e.json(500, {
      success: false,
      error: error.message
    })
  }
})

console.log("[Data Import] POST /recv endpoint registered - accepts {md5, content} format")