/// <reference path="../pb_data/types.d.ts" />

// Pet tracker import with Apple Find My integration
// Fixed version with proper JSVM scoping

// Bootstrap hook - runs once when server starts
onBootstrap((e) => {
  console.log("[Pet Tracker] Bootstrap starting...")
  
  // Define import function INSIDE the hook to ensure proper scope
  function importPetLocations() {
    try {
      // Read Items.data file
      const rawData = $os.readFile("Items.data")
      
      // Convert byte array to string properly
      let dataStr = ""
      if (typeof rawData === 'object' && rawData.length) {
        // Convert byte array to string - character by character for safety
        for (let i = 0; i < rawData.length; i++) {
          dataStr += String.fromCharCode(rawData[i])
        }
      } else {
        dataStr = rawData
      }
      
      const items = JSON.parse(dataStr)
      
      let processed = 0
      let duplicates = 0
      let errors = 0
      
      for (const item of items) {
        try {
          // Filter for Tag items only
          if (!item.name || !item.name.match(/^Tag \d+$/)) {
            continue
          }
          
          // Validate location data
          if (!item.location || 
              typeof item.location.latitude !== 'number' || 
              typeof item.location.longitude !== 'number' ||
              typeof item.location.timeStamp !== 'number') {
            console.warn(`[Pet Tracker] Invalid location for ${item.name}`)
            errors++
            continue
          }
          
          const loc = item.location
          
          // Generate MD5 hash for deduplication
          const hashInput = item.name + 
                           loc.latitude.toString() + 
                           loc.longitude.toString() + 
                           (loc.horizontalAccuracy || 0).toString()
          const locationHash = $security.md5(hashInput)
          
          // Check for duplicates with proper error handling
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
            // "no rows in result set" is expected - not an error!
            if (err.message && !err.message.includes("no rows")) {
              // This is a real error, log it
              console.error(`[Pet Tracker] Database error for ${item.name}:`, err.message)
              errors++
              continue
            }
            // No rows found = no duplicate, continue with insert
          }
          
          if (isDuplicate) {
            duplicates++
            continue
          }
          
          // Create new location record
          const collection = $app.findCollectionByNameOrId("pet_locations")
          const record = new Record(collection, {
            pet_name: item.name,
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.horizontalAccuracy || 0,
            timestamp: new Date(loc.timeStamp).toISOString(),
            battery_status: item.batteryStatus || 1,
            is_inaccurate: loc.isInaccurate || false,
            location_hash: locationHash
          })
          
          $app.save(record)
          processed++
          
        } catch (recordError) {
          console.error(`[Pet Tracker] Error processing ${item.name}:`, recordError.message)
          errors++
        }
      }
      
      console.log(`[Pet Tracker] Import complete: ${processed} new, ${duplicates} duplicates, ${errors} errors`)
      
    } catch (error) {
      console.error("[Pet Tracker] Import failed:", error.message)
    }
  }
  
  // Complete bootstrap first
  e.next()
  
  // Run initial import
  console.log("[Pet Tracker] Running initial import...")
  importPetLocations()
  
  // Schedule 1-minute updates
  cronAdd("pet_location_import", "* * * * *", () => {
    console.log("[Pet Tracker] Running scheduled import...")
    importPetLocations()
  })
})