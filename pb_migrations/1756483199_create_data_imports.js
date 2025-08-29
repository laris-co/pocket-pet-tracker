/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    name: "data_imports",
    type: "base",
    system: false,
    fields: [
      {
        name: "import_date",
        type: "date",
        required: true
      },
      {
        name: "content_hash",
        type: "text",
        required: true,
        min: 32,
        max: 32,
        pattern: "^[a-f0-9]{32}$"
      },
      {
        name: "json_content",
        type: "json",
        required: true
      },
      {
        name: "source",
        type: "text",
        required: false,
        max: 100
      },
      {
        name: "status",  
        type: "text",
        required: true,
        max: 20
      },
      {
        name: "item_count",
        type: "number",
        required: false,
        min: 0,
        onlyInt: true
      },
      {
        name: "error_message",
        type: "text",
        required: false
      }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_content_hash ON data_imports (content_hash)",
      "CREATE INDEX idx_import_date ON data_imports (import_date)",
      "CREATE INDEX idx_status ON data_imports (status)"
    ],
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    options: {}
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("data_imports")
  return app.delete(collection)
})