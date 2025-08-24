/// <reference path="../pb_data/types.d.ts" />

routerAdd("GET", "/yay3/{name}", (e) => {
    let name = e.request.pathValue("name")

    return e.json(200, { "message": "yay" + name })
})