/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    name: "pet_locations",
    type: "base",
    system: false,
    fields: [
      {
        name: "pet_name",
        type: "text",
        required: true,
        min: 1,
        max: 20,
        pattern: "^Tag \\d+$"
      },
      {
        name: "latitude",
        type: "number",
        required: true,
        min: -90,
        max: 90
      },
      {
        name: "longitude",
        type: "number",
        required: true,
        min: -180,
        max: 180
      },
      {
        name: "accuracy",
        type: "number",
        required: true,
        min: 0
      },
      {
        name: "timestamp",
        type: "date",
        required: true
      },
      {
        name: "battery_status",
        type: "number",
        required: true,
        min: 0,
        max: 4,
        onlyInt: true
      },
      {
        name: "is_inaccurate",
        type: "bool",
        required: false
      },
      {
        name: "location_hash",
        type: "text",
        required: true,
        min: 32,
        max: 32,
        pattern: "^[a-f0-9]{32}$"
      },
      {
        name: "import_id",
        type: "text",
        required: false,
        min: null,
        max: null,
        pattern: ""
      }
    ],
    indexes: ["CREATE UNIQUE INDEX idx_location_hash ON pet_locations (location_hash)"],
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    options: {}
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pet_locations")
  return app.delete(collection)
})
