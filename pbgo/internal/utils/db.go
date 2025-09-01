package utils

import (
    "database/sql"
    "github.com/pocketbase/dbx"
    "github.com/pocketbase/pocketbase/core"
)

func FindFirstRecordByHash(app core.App, collection, hashField, hash string) (*core.Record, error) {
    return app.FindFirstRecordByFilter(collection, hashField+"={:hash}", dbx.Params{"hash": hash})
}

func ExistsByHash(app core.App, collection, hashField, hash string) (bool, error) {
    _, err := FindFirstRecordByHash(app, collection, hashField, hash)
    if err == nil {
        return true, nil
    }
    if err == sql.ErrNoRows {
        return false, nil
    }
    return false, err
}

