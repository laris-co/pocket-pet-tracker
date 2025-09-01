package app

import (
    "time"

    "github.com/pocketbase/pocketbase/core"
    "github.com/pocketbase/pocketbase"
    "github.com/pocketbase/pocketbase/plugins/jsvm"

    "github.com/laris-co/pocket-pet-tracker/pbgo/internal/handlers"
    "github.com/laris-co/pocket-pet-tracker/pbgo/internal/hooks"
)

// Register wires routes and hooks into the PocketBase app.
func Register(pb *pocketbase.PocketBase) {
    // Ensure JS app migrations are applied on startup
    pb.OnBootstrap().BindFunc(func(e *core.BootstrapEvent) error {
        if err := e.Next(); err != nil {
            return err
        }
        if err := e.App.RunAppMigrations(); err != nil {
            // surface the error but continue so server can still start
            e.App.Logger().Error("run app migrations", "error", err)
        }
        return nil
    })
    // Load JS migrations only; disable JS hooks to avoid duplication.
    jsvm.MustRegister(pb, jsvm.Config{
        // MigrationsDir default resolves to pb_data/../pb_migrations
        // HooksFilesPattern to match nothing so no .pb.js hooks are loaded
        HooksFilesPattern: "^$",
        HooksWatch:        false,
    })

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
