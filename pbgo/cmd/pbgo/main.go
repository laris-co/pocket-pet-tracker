package main

import (
    "log"

    "github.com/pocketbase/pocketbase"
    "github.com/laris-co/pocket-pet-tracker/pbgo/internal/app"
)

func main() {
    pb := pocketbase.New()

    // Register our routes and hooks
    app.Register(pb)

    if err := pb.Start(); err != nil {
        log.Fatal(err)
    }
}

