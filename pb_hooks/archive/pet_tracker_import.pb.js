/// <reference path="../pb_data/types.d.ts" />

// Import utilities
const utils = require('./utils.js')
const { PetUtils, LocationUtils, DataUtils, DbUtils } = utils

// Pet tracker import with Apple Find My integration
// Fixed version with proper JSVM scoping for cron jobs

// Shared import function
function performImport() {
  const startTime = Date.now()

  try {
    // Read Items.data file
    const rawData = $os.readFile("Items.data")

    // Convert byte array to string using utility
    const dataStr = DataUtils.byteArrayToString(rawData)
    const items = JSON.parse(dataStr)
    const totalItems = items.filter(item => item.name && PetUtils.isValidPetTag(item.name)).length

    console.log(`[Pet Tracker] Starting import of ${totalItems} pet locations...`)

    let processed = 0
    let duplicates = 0
    let errors = 0
    let currentIndex = 0

    for (const item of items) {
      try {
        // Filter for Tag items only using utility
        if (!item.name || !PetUtils.isValidPetTag(item.name)) {
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
            typeof item.location.longitude !== 'number') {
          continue
        }

        const loc = item.location

        // Generate MD5 hash for deduplication using utility
        const locationHash = LocationUtils.createLocationHash(
          item.name,
          loc.latitude,
          loc.longitude,
          loc.horizontalAccuracy,
          loc.timeStamp
        )

        // Check for duplicates using utility
        if (DbUtils.isDuplicateLocation(locationHash)) {
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

    return { processed, duplicates, errors, duration }

  } catch (error) {
    console.error("[Pet Tracker] ❌ Import failed:", error.message)
    return { processed: 0, duplicates: 0, errors: 1, duration: Date.now() - startTime }
  }
}

// Bootstrap hook - runs once when server starts
onBootstrap((e) => {
  console.log("[Pet Tracker] Bootstrap starting...")

  // Store import count in app store for persistence across cron executions
  if (!$app.store().has("importCount")) {
    $app.store().set("importCount", 0)
  }

  // Complete bootstrap first
  e.next()

  // Run initial import
  console.log("[Pet Tracker] Running initial import...")
  performImport()
})

// Register cron job separately - cron jobs run in their own context
cronAdd("pet_location_import", "* * * * *", () => {
  try {
    // Increment counter from app store
    const count = ($app.store().get("importCount") || 0) + 1
    $app.store().set("importCount", count)

    const now = new Date().toLocaleTimeString()
    console.log(`[Pet Tracker] 🔄 Running scheduled import #${count} at ${now}`)

    // Run the shared import function
    performImport()

  } catch (error) {
    console.error("[Pet Tracker] ❌ Cron import failed:", error.message)
  }
})
