// pb_hooks/main.pb.js

routerAdd("GET", "/yay2/{name}", (e) => {
    let name = e.request.pathValue("name")

    return e.json(200, { "message": "Hello " + name })
})

onRecordAfterUpdateSuccess((e) => {
    console.log("user updated...", e.record.get("email"))

    e.next()
}, "users")