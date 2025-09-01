package app

import (
    "net/http"
    "time"

    "github.com/pocketbase/pocketbase/core"
    "github.com/pocketbase/pocketbase"

    "github.com/laris-co/pocket-pet-tracker/pbgo/internal/handlers"
    "github.com/laris-co/pocket-pet-tracker/pbgo/internal/hooks"
)

// Register wires routes and hooks into the PocketBase app.
func Register(pb *pocketbase.PocketBase) {
    // Simple test route parity
    pb.OnServe().BindFunc(func(e *core.ServeEvent) error {
        e.Router.GET("/test", func(e *core.RequestEvent) error {
            e.Response.Header().Set("Content-Type", "text/html")
            _, _ = e.Response.Write([]byte("<h1>Test Route Works!</h1>"))
            return nil
        })
        return e.Next()
    })

    // POST /recv import endpoint
    handlers.BindRecv(pb)

    // data_imports create processing hook
    hooks.BindDataImportsCreate(pb)

    // Optional: increase server read timeout for large bodies
    pb.OnServe().BindFunc(func(e *core.ServeEvent) error {
        srv := e.Server
        // keep defaults if zero
        if srv.ReadTimeout == 0 {
            srv.ReadTimeout = 30 * time.Second
        }
        if srv.IdleTimeout == 0 {
            srv.IdleTimeout = 60 * time.Second
        }
        return e.Next()
    })
}

