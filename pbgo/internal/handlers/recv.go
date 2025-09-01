package handlers

import (
    "database/sql"
    "net/http"
    "time"

    "github.com/pocketbase/dbx"
    "github.com/pocketbase/pocketbase"
    "github.com/pocketbase/pocketbase/core"

    u "github.com/laris-co/pocket-pet-tracker/pbgo/internal/utils"
)

type recvBody struct {
    MD5     string      `json:"md5"`
    Content interface{} `json:"content"`
    Source  string      `json:"source"`
}

func BindRecv(pb *pocketbase.PocketBase) {
    pb.OnServe().BindFunc(func(e *core.ServeEvent) error {
        e.Router.POST("/recv", func(e *core.RequestEvent) error {
            var body recvBody
            if err := e.BindBody(&body); err != nil {
                return e.BadRequestError("invalid body", err)
            }
            if body.Content == nil || body.MD5 == "" {
                return e.BadRequestError("Missing required fields: md5 and content", nil)
            }

            // Server-side canonical content hash
            computed := u.MD5Hex(u.StableStringify(body.Content))

            // Dedup by computed hash
            duplicate, err := pb.FindFirstRecordByFilter("data_imports", "content_hash={:hash}", dbx.Params{"hash": computed})
            if err == nil && duplicate != nil {
                return e.JSON(http.StatusOK, map[string]any{
                    "status":      "duplicated",
                    "import_id":   duplicate.Id,
                    "imported_at": duplicate.GetString("import_date"),
                    // Compatibility: processing happens asynchronously in the hook
                    "processed_locations": 0,
                })
            }
            if err != nil && err != sql.ErrNoRows {
                return e.InternalServerError("dup check error", err)
            }

            // Create data_imports record
            col, err := pb.FindCollectionByNameOrId("data_imports")
            if err != nil {
                return e.InternalServerError("missing collection", err)
            }
            rec := core.NewRecord(col)
            rec.Set("import_date", time.Now().UTC().Format(time.RFC3339))
            rec.Set("content_hash", computed)
            rec.Set("json_content", body.Content)
            if body.Source == "" {
                rec.Set("source", "api")
            } else {
                rec.Set("source", body.Source)
            }
            rec.Set("status", "processing")

            // item_count: if array, use len; else 1
            itemCount := 1
            if arr, ok := body.Content.([]any); ok {
                itemCount = len(arr)
            }
            rec.Set("item_count", itemCount)

            if err := pb.Save(rec); err != nil {
                return e.InternalServerError("save import failed", err)
            }

            return e.JSON(http.StatusOK, map[string]any{
                "status":               "ok",
                "import_id":            rec.Id,
                "items_count":          itemCount,
                "processed_locations":  0,
            })
        })
        return e.Next()
    })
}
