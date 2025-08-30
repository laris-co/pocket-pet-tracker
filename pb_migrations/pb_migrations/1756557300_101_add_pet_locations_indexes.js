/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pet_locations")
  
  // Add performance indexes
  collection.indexes = [
    // Keep existing unique index
    "CREATE UNIQUE INDEX idx_location_hash ON pet_locations (location_hash)",
    
    // Add new performance indexes
    "CREATE INDEX idx_pet_name_timestamp ON pet_locations (pet_name, timestamp DESC)",
    "CREATE INDEX idx_timestamp ON pet_locations (timestamp DESC)"
  ]
  
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pet_locations")
  
  // Rollback to original index only
  collection.indexes = [
    "CREATE UNIQUE INDEX idx_location_hash ON pet_locations (location_hash)"
  ]
  
  return app.save(collection)
})