/// <reference path="../pb_data/types.d.ts" />

// API endpoint to get just the data array from latest import (for DuckDB compatibility)
routerAdd("GET", "/api/latest-import-data", (e) => {
    console.log("[Latest Import Data API] Request received")
    
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
            console.log("[Latest Import Data API] No imports found")
            // Return empty array for DuckDB compatibility
            return e.json(200, [])
        }
        
        const latestImport = records[0]
        console.log("[Latest Import Data API] Found latest import:", latestImport.get("id"))
        
        // Get the JSON content
        let jsonContentRaw = latestImport.get("json_content")
        let jsonContent
        
        // Convert to string first if needed (same as in hooks)
        let jsonStr = ""
        if (typeof jsonContentRaw === 'object' && jsonContentRaw.length) {
            // It's a byte array or character array - convert to string
            console.log("[Latest Import Data API] Converting byte array to string...")
            for (let i = 0; i < jsonContentRaw.length; i++) {
                jsonStr += String.fromCharCode(jsonContentRaw[i])
            }
        } else if (typeof jsonContentRaw === 'string') {
            jsonStr = jsonContentRaw
        } else {
            console.log("[Latest Import Data API] Unexpected data type:", typeof jsonContentRaw)
            // Return empty array for DuckDB compatibility
            return e.json(200, [])
        }
        
        // Now parse the JSON string
        try {
            jsonContent = JSON.parse(jsonStr)
            console.log("[Latest Import Data API] Parsed JSON, type:", typeof jsonContent, 
                "Is Array?:", Array.isArray(jsonContent))
        } catch (err) {
            console.error("[Latest Import Data API] Failed to parse JSON:", err.message)
            // Return empty array for DuckDB compatibility
            return e.json(200, [])
        }
        
        // Return just the array data
        if (Array.isArray(jsonContent)) {
            return e.json(200, jsonContent)
        } else {
            // If it's a single object, wrap it in an array
            return e.json(200, [jsonContent])
        }
        
    } catch (error) {
        console.error("[Latest Import Data API] Error:", error.message)
        // Return empty array for DuckDB compatibility
        return e.json(200, [])
    }
})

console.log("[Latest Import Data API] Registered GET /api/latest-import-data endpoint")