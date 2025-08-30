/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pet_locations")
  
  // Add simple performance indexes
  collection.indexes = [
    // Keep existing unique constraint for deduplication
    "CREATE UNIQUE INDEX idx_location_hash ON pet_locations (location_hash)",
    
    // Add two simple indexes for query performance
    "CREATE INDEX idx_pet_name_timestamp ON pet_locations (pet_name, timestamp DESC)",
    "CREATE INDEX idx_timestamp ON pet_locations (timestamp DESC)"
  ]
  
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pet_locations")
  
  // Rollback: restore only original index
  collection.indexes = [
    "CREATE UNIQUE INDEX idx_location_hash ON pet_locations (location_hash)"
  ]
  
  return app.save(collection)
})