package hooks

import (
    "database/sql"
    "encoding/json"
    "time"

    "github.com/pocketbase/pocketbase"
    "github.com/pocketbase/pocketbase/core"
    "github.com/pocketbase/dbx"
    pbtypes "github.com/pocketbase/pocketbase/tools/types"

    u "github.com/laris-co/pocket-pet-tracker/pbgo/internal/utils"
)

// BindDataImportsCreate wires a create-request hook to process json_content
// into pet_locations with dedup and import_id.
func BindDataImportsCreate(pb *pocketbase.PocketBase) {
    pb.OnRecordAfterCreateSuccess("data_imports").BindFunc(func(e *core.RecordEvent) error {
        e.App.Logger().Info("[import] after create success fired", "id", e.Record.Id, "status", e.Record.GetString("status"))
        // Only process imports marked as processing (set by /recv)
        if e.Record.GetString("status") != "processing" {
            e.App.Logger().Info("[import] skipping non-processing", "status", e.Record.GetString("status"))
            return nil
        }

        // Decode json_content flexibly
        var items []any
        raw := e.Record.Get("json_content")
        switch v := raw.(type) {
        case nil:
            // nothing to do
            e.App.Logger().Error("[import] empty json_content")
            e.Record.Set("status", "error")
            _ = pb.Save(e.Record)
            return nil
        case []any:
            items = v
        case string:
            _ = json.Unmarshal([]byte(v), &items)
            if len(items) == 0 {
                // Maybe it is a single object
                var obj map[string]any
                if err := json.Unmarshal([]byte(v), &obj); err == nil && len(obj) > 0 {
                    items = []any{obj}
                }
            }
        case []byte:
            _ = json.Unmarshal(v, &items)
            if len(items) == 0 {
                var obj map[string]any
                if err := json.Unmarshal(v, &obj); err == nil && len(obj) > 0 {
                    items = []any{obj}
                }
            }
        case pbtypes.JSONRaw:
            b := []byte(v)
            _ = json.Unmarshal(b, &items)
            if len(items) == 0 {
                var obj map[string]any
                if err := json.Unmarshal(b, &obj); err == nil && len(obj) > 0 {
                    items = []any{obj}
                }
            }
        default:
            // try marshaling back and decoding
            if b, err := json.Marshal(v); err == nil {
                _ = json.Unmarshal(b, &items)
            }
        }

        if len(items) == 0 {
            e.App.Logger().Error("[import] failed to decode items from json_content")
            e.Record.Set("status", "error")
            _ = pb.Save(e.Record)
            return nil
        }

        importId := e.Record.Id
        processed, duplicates, errors := 0, 0, 0

        locCol, err := pb.FindCollectionByNameOrId("pet_locations")
        if err != nil {
            e.App.Logger().Error("[import] missing pet_locations collection", "error", err)
            e.Record.Set("status", "error")
            _ = pb.Save(e.Record)
            return nil
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
                e.App.Logger().Error("[import] duplicate check error", "error", err)
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

            // Best-effort type coercion for battery_status
            if rec.GetFloat("battery_status") == 0 {
                // try int from obj
                if v, ok := obj["batteryStatus"].(float64); ok {
                    rec.Set("battery_status", int(v))
                }
            }

            if err := pb.Save(rec); err != nil {
                e.App.Logger().Error("[import] save pet_location failed", "error", err)
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

        e.App.Logger().Info("[import] summary", "processed", processed, "duplicates", duplicates, "errors", errors, "status", status)
        e.Record.Set("status", status)
        // Update timestamp (if collection has updated)
        e.Record.Set("updated", time.Now().UTC().Format(time.RFC3339))
        _ = pb.Save(e.Record)
        return nil
    })
}
