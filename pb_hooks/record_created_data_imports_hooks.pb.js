/// <reference path="../pb_data/types.d.ts" />

// Track data_imports record creation and process tag names
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
    
    // Get the JSON content from the record
    let jsonContent = e.record.get("json_content")
    
    // Debug: Check what we're actually getting
    console.log("[Data Import Hook] Raw content type:", typeof jsonContent)
    
    // PocketBase JSON fields can return the data in different formats depending on how it was stored
    // If it's a string, it might be JSON-encoded
    if (typeof jsonContent === 'string') {
        console.log("[Data Import Hook] Got string with length:", jsonContent.length)
        console.log("[Data Import Hook] First 200 chars:", jsonContent.substring(0, 200))
        
        // Try to parse as JSON
        try {
            jsonContent = JSON.parse(jsonContent)
            console.log("[Data Import Hook] ✅ Parsed JSON! Type:", typeof jsonContent, 
                "Is Array?:", Array.isArray(jsonContent))
            if (Array.isArray(jsonContent)) {
                console.log("[Data Import Hook] Array has", jsonContent.length, "items")
            }
        } catch (err) {
            console.log("[Data Import Hook] ❌ Failed to parse as JSON:", err.message)
            console.log("[Data Import Hook] Treating as raw string data")
            e.next()
            return
        }
    } else if (Array.isArray(jsonContent)) {
        console.log("[Data Import Hook] ✅ Already an array with", jsonContent.length, "items")
    } else if (typeof jsonContent === 'object' && jsonContent !== null) {
        // Could be an object or a special type
        console.log("[Data Import Hook] Got object type")
        
        // Check if it looks like a byte array or has a length property
        if (jsonContent.length !== undefined) {
            console.log("[Data Import Hook] Object has length:", jsonContent.length)
            console.log("[Data Import Hook] Might be byte array, attempting conversion...")
            
            // Try to convert byte array to string
            let jsonStr = ""
            try {
                for (let i = 0; i < jsonContent.length; i++) {
                    jsonStr += String.fromCharCode(jsonContent[i])
                }
                console.log("[Data Import Hook] Converted to string with length:", jsonStr.length)
                console.log("[Data Import Hook] First 200 chars:", jsonStr.substring(0, 200))
                
                // Now parse the JSON string
                jsonContent = JSON.parse(jsonStr)
                console.log("[Data Import Hook] ✅ Parsed! Type:", typeof jsonContent,
                    "Is Array?:", Array.isArray(jsonContent))
                if (Array.isArray(jsonContent)) {
                    console.log("[Data Import Hook] Array has", jsonContent.length, "items")
                }
            } catch (err) {
                console.log("[Data Import Hook] ❌ Conversion/parsing failed:", err.message)
                e.next()
                return
            }
        } else {
            console.log("[Data Import Hook] Regular object, checking structure...")
        }
    } else {
        console.log("[Data Import Hook] ❌ Unexpected type:", typeof jsonContent)
        e.next()
        return
    }
    
    // Check if it's an array of items
    if (Array.isArray(jsonContent)) {
        console.log("[Data Import Hook] 📦 Processing", jsonContent.length, "items")
        console.log("----------------------------------------")
        
        // Loop through and print tag names (limit output for large arrays)
        let validTagCount = 0
        let locationCount = 0
        const maxItemsToShow = 30 // Limit console output
        
        jsonContent.forEach((item, index) => {
            if (item.name) {
                // Only print first N items to avoid spam
                if (index < maxItemsToShow) {
                    console.log(`[Data Import Hook] Item ${index + 1}/${jsonContent.length}: "${item.name}"`)
                }
                
                // Check if it's a valid pet tag
                if (item.name.match(/^Tag \d+$/)) {
                    validTagCount++
                    console.log(`  ✅ Valid pet tag detected: ${item.name}`)
                    
                    // Show location details if available
                    if (item.location) {
                        locationCount++
                        const loc = item.location
                        console.log(`  📍 Location:`)
                        console.log(`     - Latitude: ${loc.latitude}`)
                        console.log(`     - Longitude: ${loc.longitude}`)
                        if (loc.horizontalAccuracy !== undefined) {
                            console.log(`     - Accuracy: ${loc.horizontalAccuracy}m`)
                        }
                        if (loc.timeStamp) {
                            console.log(`     - Timestamp: ${new Date(loc.timeStamp).toISOString()}`)
                        }
                    } else {
                        console.log(`  ⚠️ No location data`)
                    }
                    
                    // Show battery status
                    if (item.batteryStatus !== undefined) {
                        const batteryLabels = ["Unknown", "Low", "Medium", "Full"]
                        const batteryEmojis = ["❓", "🔴", "🟡", "🟢"]
                        const status = item.batteryStatus
                        console.log(`  🔋 Battery: ${batteryEmojis[status] || "❓"} ${batteryLabels[status] || "Unknown"} (${status})`)
                    }
                    
                    // Show other interesting fields
                    if (item.productType && item.productType.productInformation) {
                        const info = item.productType.productInformation
                        if (info.modelName) {
                            console.log(`  📱 Device: ${info.modelName}`)
                        }
                    }
                    
                    // Check if old or inaccurate
                    if (item.isOld) {
                        console.log(`  ⏰ Status: OLD DATA`)
                    }
                    if (item.location && item.location.isInaccurate) {
                        console.log(`  ⚠️ Location accuracy: INACCURATE`)
                    }
                    
                } else {
                    // Not a tag pattern
                    console.log(`  ℹ️ Not a pet tag (name: "${item.name}")`)
                }
                
                console.log("") // Empty line for readability
            } else {
                console.log(`[Data Import Hook] Item ${index + 1}: (no name field)`)
            }
        })
        
        // Print summary
        console.log("========================================")
        console.log("[Data Import Hook] 📊 IMPORT SUMMARY:")
        console.log(`  - Total items: ${jsonContent.length}`)
        console.log(`  - Valid pet tags: ${validTagCount}`)
        console.log(`  - Tags with location: ${locationCount}`)
        console.log(`  - Tags without location: ${validTagCount - locationCount}`)
        
        // List all tag names for quick reference
        if (validTagCount > 0) {
            const tagNames = jsonContent
                .filter(item => item.name && item.name.match(/^Tag \d+$/))
                .map(item => item.name)
                .sort((a, b) => {
                    const numA = parseInt(a.replace('Tag ', ''))
                    const numB = parseInt(b.replace('Tag ', ''))
                    return numA - numB
                })
            console.log(`  - Tag list: ${tagNames.join(", ")}`)
        }
        
    } else if (typeof jsonContent === 'object' && jsonContent !== null) {
        // Single object imported
        console.log("[Data Import Hook] 📦 Single object imported")
        
        if (jsonContent.name) {
            console.log("[Data Import Hook] Object name:", jsonContent.name)
            
            if (jsonContent.name.match(/^Tag \d+$/)) {
                console.log("  ✅ Valid pet tag")
                
                if (jsonContent.location) {
                    console.log("  📍 Has location data")
                }
                if (jsonContent.batteryStatus !== undefined) {
                    console.log("  🔋 Battery status:", jsonContent.batteryStatus)
                }
            }
        } else {
            console.log("[Data Import Hook] Object has no name field")
        }
    } else {
        console.log("[Data Import Hook] ⚠️ Unknown content type:", typeof jsonContent)
    }
    
    console.log("========================================")
    console.log("[Data Import Hook] ✅ Hook processing complete")
    console.log("")
    
    // Continue with the record creation
    e.next()
}, "data_imports")

console.log("[Data Import Hooks] 🎣 Registered onRecordCreate hook for data_imports collection")