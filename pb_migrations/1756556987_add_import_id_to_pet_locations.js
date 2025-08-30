/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pet_locations")
  const importsCollection = app.findCollectionByNameOrId("data_imports")
  
  // Add import_id field using the simpler approach
  collection.fields.push(
    new Field({
      name: "import_id",
      type: "relation",
      required: false,
      options: {
        collectionId: importsCollection.id,
        cascadeDelete: false,
        minSelect: null,
        maxSelect: 1,
        displayFields: null
      }
    })
  )
  
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pet_locations")
  
  // Remove import_id field on rollback
  collection.fields = collection.fields.filter(f => f.name !== "import_id")
  
  return app.save(collection)
})