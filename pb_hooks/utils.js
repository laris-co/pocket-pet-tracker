// utils.js - Shared utilities for PocketBase hooks
// Load with: const utils = require(`${__hooks}/utils.js`)

/**
 * Pet tag validation and utilities
 */
const PetUtils = {
  /**
   * Check if a name is a valid pet tag (e.g., "Tag 1", "Tag 25")
   */
  isValidPetTag: function(name) {
    return name && /^Tag \d+$/.test(name)
  },
  
  /**
   * Extract tag ID from pet name
   */
  extractTagId: function(petName) {
    const match = petName.match(/^Tag (\d+)$/)
    return match ? parseInt(match[1]) : null
  }
}

/**
 * Location hashing and processing utilities
 */
const LocationUtils = {
  /**
   * Create a unique hash for location deduplication
   * Requires $security to be passed in
   */
  createLocationHash: function($security, petName, location) {
    const hashInput = petName + 
                     (location.timeStamp || new Date().toISOString()) + 
                     location.latitude.toString() + 
                     location.longitude.toString() + 
                     (location.horizontalAccuracy || 0).toString()
    return $security.md5(hashInput)
  },
  
  /**
   * Check if location has valid coordinates
   */
  hasValidCoordinates: function(location) {
    return location && 
           location.latitude !== undefined && 
           location.longitude !== undefined &&
           !isNaN(location.latitude) &&
           !isNaN(location.longitude)
  },
  
  /**
   * Create location record data
   */
  createLocationData: function(petName, location, locationHash) {
    return {
      pet_name: petName,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.horizontalAccuracy || 0,
      timestamp: location.timeStamp ? new Date(location.timeStamp).toISOString() : new Date().toISOString(),
      battery_status: location.batteryStatus || 1,
      is_inaccurate: location.isInaccurate || false,
      location_hash: locationHash
    }
  }
}

/**
 * Database query utilities
 */
const DbUtils = {
  /**
   * Safely find record without throwing on "no rows"
   * Returns null if no record found
   */
  findRecordSafely: function($app, collection, filter, params) {
    try {
      return $app.findFirstRecordByFilter(collection, filter, params)
    } catch (err) {
      // "sql: no rows" is expected when no record exists
      if (err.message && err.message.includes("no rows")) {
        return null
      }
      throw err // Re-throw actual errors
    }
  },
  
  /**
   * Check if a location hash already exists
   */
  isDuplicateLocation: function($app, locationHash) {
    return this.findRecordSafely(
      $app,
      "pet_locations",
      "location_hash = {:hash}",
      { hash: locationHash }
    ) !== null
  }
}

/**
 * Pagination utilities
 */
const PaginationUtils = {
  /**
   * Calculate offset from page and limit
   */
  calculateOffset: function(page, limit) {
    return (page - 1) * limit
  },
  
  /**
   * Create pagination metadata
   */
  createPaginationInfo: function(page, limit, totalItems) {
    const totalPages = Math.ceil(totalItems / limit)
    return {
      page: page,
      per_page: limit,
      total_items: totalItems,
      total_pages: totalPages,
      has_more: page < totalPages
    }
  }
}

/**
 * Import processing utilities
 */
const ImportUtils = {
  /**
   * Get human-readable content type description
   * Returns "array" for arrays, otherwise the typeof result
   */
  getContentType: function(content) {
    return Array.isArray(content) ? "array" : typeof content
  },
  
  /**
   * Process array of pet location items
   * Returns { processed, duplicates, errors } counts
   */
  processPetLocations: function($app, $security, items, importId = null) {
    let processed = 0
    let duplicates = 0
    let errors = 0
    
    for (const item of items) {
      try {
        // Filter for Tag items only
        if (!PetUtils.isValidPetTag(item.name)) {
          continue
        }
        
        // Skip if no location data
        if (!LocationUtils.hasValidCoordinates(item.location)) {
          continue
        }
        
        const loc = item.location
        
        // Create location hash for deduplication
        const locationHash = LocationUtils.createLocationHash($security, item.name, loc)
        
        // Check for duplicates
        if (DbUtils.isDuplicateLocation($app, locationHash)) {
          duplicates++
          continue
        }
        
        // Create new location record
        const locCollection = $app.findCollectionByNameOrId("pet_locations")
        const locData = LocationUtils.createLocationData(item.name, loc, locationHash)
        
        // Add import_id if provided
        if (importId) {
          locData.import_id = importId
        }
        
        const locRecord = new Record(locCollection, locData)
        
        $app.save(locRecord)
        processed++
        
      } catch (recordError) {
        console.error(`[Import] Error processing ${item.name}:`, recordError.message)
        errors++
      }
    }
    
    return { processed, duplicates, errors }
  }
}

/**
 * Status and battery utilities
 */
const StatusUtils = {
  /**
   * Get battery status info
   */
  getBatteryInfo: function(status) {
    const statusMap = {
      0: { text: "Dead", emoji: "🪫" },
      1: { text: "Low", emoji: "🔋" },
      2: { text: "Good", emoji: "🔋" },
      3: { text: "Full", emoji: "🔋" }
    }
    return statusMap[status] || statusMap[1]
  },
  
  /**
   * Format timestamp for display
   */
  formatTimestamp: function(timestamp) {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
}

// Export all utilities
module.exports = {
  PetUtils,
  LocationUtils,
  DbUtils,
  PaginationUtils,
  ImportUtils,
  StatusUtils
}