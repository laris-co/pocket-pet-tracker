package hooks

import (
    "database/sql"

    "github.com/pocketbase/pocketbase"
    "github.com/pocketbase/pocketbase/core"
    "github.com/pocketbase/dbx"

    u "github.com/laris-co/pocket-pet-tracker/pbgo/internal/utils"
)

// BindDataImportsCreate wires a create-request hook to process json_content
// into pet_locations with dedup and import_id.
func BindDataImportsCreate(pb *pocketbase.PocketBase) {
    pb.OnRecordCreateRequest("data_imports").BindFunc(func(e *core.RecordRequestEvent) error {
        // Prevent recursion/duplicates: only process when status is processing
        if e.Record.GetString("status") != "processing" {
            return e.Next()
        }

        var content any
        if raw := e.Record.Get("json_content"); raw != nil {
            content = raw
        }

        items, ok := content.([]any)
        if !ok || len(items) == 0 {
            // no valid data
            e.Record.Set("status", "error")
            return e.Next()
        }

        importId := e.Record.Id
        processed, duplicates, errors := 0, 0, 0

        locCol, err := pb.FindCollectionByNameOrId("pet_locations")
        if err != nil {
            e.Record.Set("status", "error")
            return e.Next()
        }

        for _, it := range items {
            obj, _ := it.(map[string]any)
            name, _ := obj["name"].(string)
            if !u.IsValidPetTag(name) {
                continue
            }
            // location object
            locMap, _ := obj["location"].(map[string]any)
            if locMap == nil {
                continue
            }
            rl := &u.RawLocation{}
            if v, ok := locMap["latitude"].(float64); ok { rl.Latitude = v }
            if v, ok := locMap["longitude"].(float64); ok { rl.Longitude = v }
            if v, ok := locMap["horizontalAccuracy"].(float64); ok { rl.HorizontalAccuracy = v }
            if v, ok := locMap["isInaccurate"].(bool); ok { rl.IsInaccurate = v }
            if v, ok := locMap["timeStamp"]; ok { rl.TimeStamp = v }

            if !u.HasValidCoordinates(rl) {
                continue
            }

            hash := u.LocationHash(name, rl)
            // check duplicate
            _, err := pb.FindFirstRecordByFilter("pet_locations", "location_hash={:hash}", dbx.Params{"hash": hash})
            if err == nil {
                duplicates++
                continue
            }
            if err != nil && err != sql.ErrNoRows {
                errors++
                continue
            }

            rec := core.NewRecord(locCol)
            rec.Set("pet_name", name)
            rec.Set("latitude", rl.Latitude)
            rec.Set("longitude", rl.Longitude)
            rec.Set("accuracy", rl.HorizontalAccuracy)
            rec.Set("timestamp", u.ToISO(rl.TimeStamp))
            rec.Set("battery_status", obj["batteryStatus"]) // best-effort
            rec.Set("is_inaccurate", rl.IsInaccurate)
            rec.Set("location_hash", hash)
            rec.Set("import_id", importId)

            if err := pb.Save(rec); err != nil {
                errors++
                continue
            }
            processed++
        }

        totalExpected := e.Record.GetInt("item_count")
        if totalExpected == 0 {
            totalExpected = len(items)
        }

        status := "error"
        if processed == totalExpected && duplicates == 0 && errors == 0 {
            status = "full"
        } else if processed == 0 && duplicates > 0 && errors == 0 {
            status = "duplicate"
        } else if processed > 0 {
            status = "partial"
        }

        e.Record.Set("status", status)
        return e.Next()
    })
}

