/// <reference path="../pb_data/types.d.ts" />

// Debug echo endpoint - prints everything received to console
// Test with: curl -X POST http://localhost:8090/recv -H "Content-Type: application/json" -d @Items.data

routerAdd("POST", "/recv", (e) => {
  console.log("========== /recv DEBUG START ==========")
  
  try {
    // Try different methods to get the body
    console.log("[DEBUG] Request received at:", new Date().toISOString())
    
    // Method 1: Try requestInfo()
    try {
      const info = e.requestInfo()
      console.log("[DEBUG] requestInfo() succeeded")
      console.log("[DEBUG] info.method:", info.method)
      console.log("[DEBUG] info.headers:", JSON.stringify(info.headers))
      console.log("[DEBUG] info.body type:", typeof info.body)
      console.log("[DEBUG] info.body is array?:", Array.isArray(info.body))
      console.log("[DEBUG] info.body:", JSON.stringify(info.body).substring(0, 500) + "...")
      
      // Count items if array
      if (Array.isArray(info.body)) {
        console.log("[DEBUG] Array length:", info.body.length)
        if (info.body[0]) {
          console.log("[DEBUG] First item keys:", Object.keys(info.body[0]))
          console.log("[DEBUG] First item name:", info.body[0].name)
        }
      }
      
      console.log("========== /recv DEBUG END ==========")
      
      return e.json(200, {
        success: true,
        method: "requestInfo",
        data_type: Array.isArray(info.body) ? "array" : typeof info.body,
        count: Array.isArray(info.body) ? info.body.length : null,
        first_item: Array.isArray(info.body) && info.body[0] ? {
          name: info.body[0].name,
          has_location: !!info.body[0].location
        } : null,
        data: info.body
      })
    } catch (err1) {
      console.log("[DEBUG] requestInfo() failed:", err1.message)
    }
    
    // Method 2: Try toString on request.body
    try {
      const rawBody = toString(e.request.body)
      console.log("[DEBUG] toString(e.request.body) succeeded")
      console.log("[DEBUG] Raw body length:", rawBody.length)
      console.log("[DEBUG] Raw body first 500 chars:", rawBody.substring(0, 500))
      
      const parsed = JSON.parse(rawBody)
      console.log("[DEBUG] JSON parse succeeded")
      console.log("[DEBUG] Parsed type:", Array.isArray(parsed) ? "array" : typeof parsed)
      
      if (Array.isArray(parsed)) {
        console.log("[DEBUG] Array length:", parsed.length)
        if (parsed[0]) {
          console.log("[DEBUG] First item name:", parsed[0].name)
        }
      }
      
      console.log("========== /recv DEBUG END ==========")
      
      return e.json(200, {
        success: true,
        method: "toString",
        data_type: Array.isArray(parsed) ? "array" : typeof parsed,
        count: Array.isArray(parsed) ? parsed.length : null,
        first_item: Array.isArray(parsed) && parsed[0] ? {
          name: parsed[0].name,
          has_location: !!parsed[0].location
        } : null,
        data: parsed
      })
    } catch (err2) {
      console.log("[DEBUG] toString/parse failed:", err2.message)
    }
    
    // Method 3: Try bindBody
    try {
      let data = []
      e.bindBody(data)
      console.log("[DEBUG] bindBody to array succeeded")
      console.log("[DEBUG] Bound data length:", data.length)
      
      console.log("========== /recv DEBUG END ==========")
      
      return e.json(200, {
        success: true,
        method: "bindBody",
        data_type: "array",
        count: data.length,
        data: data
      })
    } catch (err3) {
      console.log("[DEBUG] bindBody failed:", err3.message)
    }
    
    console.log("[DEBUG] All methods failed!")
    console.log("========== /recv DEBUG END ==========")
    
    return e.json(500, {
      error: "Could not read request body"
    })
    
  } catch (error) {
    console.log("[DEBUG] Unexpected error:", error.message)
    console.log("========== /recv DEBUG END ==========")
    
    return e.json(500, {
      error: error.message
    })
  }
})

console.log("[Debug Echo] POST /recv endpoint registered - will print debug info to console")