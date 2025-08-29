/// <reference path="../pb_data/types.d.ts" />

// API endpoint to get the latest data import
routerAdd("GET", "/api/latest-import", (e) => {
    console.log("[Latest Import API] Request received")
    
    try {
        // Find the most recent data_imports record
        const records = $app.findRecordsByFilter(
            "data_imports",
            "", // no filter - get all
            "-import_date", // sort by import_date descending
            1, // limit to 1 record
            0  // offset 0
        )
        
        if (!records || records.length === 0) {
            console.log("[Latest Import API] No imports found")
            return e.json(404, {
                success: false,
                message: "No data imports found"
            })
        }
        
        const latestImport = records[0]
        console.log("[Latest Import API] Found latest import:", latestImport.get("id"))
        
        // Get the JSON content
        let jsonContentRaw = latestImport.get("json_content")
        let jsonContent
        
        // Convert to string first if needed (same as in hooks)
        let jsonStr = ""
        if (typeof jsonContentRaw === 'object' && jsonContentRaw.length) {
            // It's a byte array or character array - convert to string
            console.log("[Latest Import API] Converting byte array to string...")
            for (let i = 0; i < jsonContentRaw.length; i++) {
                jsonStr += String.fromCharCode(jsonContentRaw[i])
            }
        } else if (typeof jsonContentRaw === 'string') {
            jsonStr = jsonContentRaw
        } else {
            console.log("[Latest Import API] Unexpected data type:", typeof jsonContentRaw)
            return e.json(500, {
                success: false,
                message: "Unexpected data format"
            })
        }
        
        // Now parse the JSON string
        try {
            jsonContent = JSON.parse(jsonStr)
            console.log("[Latest Import API] Parsed JSON, type:", typeof jsonContent, 
                "Is Array?:", Array.isArray(jsonContent))
        } catch (err) {
            console.error("[Latest Import API] Failed to parse JSON:", err.message)
            return e.json(500, {
                success: false,
                message: "Failed to parse import data"
            })
        }
        
        // Calculate summary statistics
        let summary = {
            total_items: 0,
            valid_tags: 0,
            tags_with_location: 0,
            tag_list: []
        }
        
        if (Array.isArray(jsonContent)) {
            summary.total_items = jsonContent.length
            
            jsonContent.forEach(item => {
                if (item.name && item.name.match(/^Tag \d+$/)) {
                    summary.valid_tags++
                    summary.tag_list.push(item.name)
                    
                    if (item.location && item.location.latitude && item.location.longitude) {
                        summary.tags_with_location++
                    }
                }
            })
            
            // Sort tag list numerically
            summary.tag_list.sort((a, b) => {
                const numA = parseInt(a.replace('Tag ', ''))
                const numB = parseInt(b.replace('Tag ', ''))
                return numA - numB
            })
        }
        
        // Return the latest import data with summary
        return e.json(200, {
            success: true,
            import: {
                id: latestImport.get("id"),
                import_date: latestImport.get("import_date"),
                source: latestImport.get("source"),
                status: latestImport.get("status"),
                content_hash: latestImport.get("content_hash"),
                item_count: latestImport.get("item_count"),
                created: latestImport.get("created"),
                updated: latestImport.get("updated")
            },
            summary: summary,
            data: jsonContent
        })
        
    } catch (error) {
        console.error("[Latest Import API] Error:", error.message)
        return e.json(500, {
            success: false,
            error: error.message
        })
    }
})

// API endpoint to get just the latest import metadata (without full JSON data)
routerAdd("GET", "/api/latest-import-info", (e) => {
    console.log("[Latest Import Info API] Request received")
    
    try {
        // Find the most recent data_imports record
        const records = $app.findRecordsByFilter(
            "data_imports",
            "", // no filter - get all
            "-import_date", // sort by import_date descending
            1, // limit to 1 record
            0  // offset 0
        )
        
        if (!records || records.length === 0) {
            console.log("[Latest Import Info API] No imports found")
            return e.json(404, {
                success: false,
                message: "No data imports found"
            })
        }
        
        const latestImport = records[0]
        console.log("[Latest Import Info API] Found latest import:", latestImport.get("id"))
        
        // Return just the metadata
        return e.json(200, {
            success: true,
            import: {
                id: latestImport.get("id"),
                import_date: latestImport.get("import_date"),
                source: latestImport.get("source"),
                status: latestImport.get("status"),
                content_hash: latestImport.get("content_hash"),
                item_count: latestImport.get("item_count"),
                created: latestImport.get("created"),
                updated: latestImport.get("updated")
            }
        })
        
    } catch (error) {
        console.error("[Latest Import Info API] Error:", error.message)
        return e.json(500, {
            success: false,
            error: error.message
        })
    }
})

console.log("[Latest Import API] Registered GET /api/latest-import endpoint")
console.log("[Latest Import API] Registered GET /api/latest-import-info endpoint")