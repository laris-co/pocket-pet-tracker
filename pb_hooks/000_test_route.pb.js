/// <reference path="../pb_data/types.d.ts" />

// Simple test route
routerAdd("GET", "/test", (e) => {
    e.html(200, "<h1>Test Route Works!</h1>")
})

console.log("[Test Route] Registered /test")