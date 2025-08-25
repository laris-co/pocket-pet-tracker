/// <reference path="../pb_data/types.d.ts" />

// Pet tracker import with Apple Find My integration
// Fixed version with proper JSVM scoping

// Global counter for scheduled imports
let $importCount = 0

// Global import function for cron access
function $importPetLocations() {
    const startTime = Date.now()
    
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
      const totalItems = items.filter(item => item.name && item.name.match(/^Tag \d+$/)).length
      
      console.log(`[Pet Tracker] Starting import of ${totalItems} pet locations...`)
      
      let processed = 0
      let duplicates = 0
      let errors = 0
      let currentIndex = 0
      
      for (const item of items) {
        try {
          // Filter for Tag items only
          if (!item.name || !item.name.match(/^Tag \d+$/)) {
            continue
          }
          
          currentIndex++
          
          // Show progress every 10 items
          if (currentIndex % 10 === 0) {
            console.log(`[Pet Tracker] Processing... ${currentIndex}/${totalItems} tags`)
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
      
      const duration = Date.now() - startTime
      const totalProcessed = processed + duplicates
      
      console.log(`[Pet Tracker] ✅ Import complete in ${duration}ms`)
      console.log(`[Pet Tracker] 📊 Results: ${totalProcessed}/${totalItems} processed (${processed} new, ${duplicates} existing, ${errors} errors)`)
      
      // Show database totals
      try {
        const collection = $app.findCollectionByNameOrId("pet_locations")
        const totalRecords = $app.countRecordsByFilter(collection.id, "")
        console.log(`[Pet Tracker] 💾 Database now contains ${totalRecords} total location records`)
      } catch (e) {
        // Ignore count error
      }
      
    } catch (error) {
      console.error("[Pet Tracker] ❌ Import failed:", error.message)
    }
}

// Bootstrap hook - runs once when server starts
onBootstrap((e) => {
  console.log("[Pet Tracker] Bootstrap starting...")
  
  // Complete bootstrap first
  e.next()
  
  // Run initial import
  console.log("[Pet Tracker] Running initial import...")
  $importPetLocations()
  
  // Schedule 1-minute updates
  cronAdd("pet_location_import", "* * * * *", () => {
    $importCount++
    const now = new Date().toLocaleTimeString()
    console.log(`[Pet Tracker] 🔄 Running scheduled import #${$importCount} at ${now}`)
    $importPetLocations()
  })
})