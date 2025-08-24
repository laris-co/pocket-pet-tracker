/// <reference path="../pb_data/types.d.ts" />

// Pet Tracker API Endpoints
// GraphQL-style pagination with clean numeric URLs

// GET /api/pets/current?page=1&limit=20
// Get current status of all pets with pagination
routerAdd("GET", "/api/pets/current", (e) => {
  const page = parseInt(e.request.url.query().get("page") || "1")
  const limit = parseInt(e.request.url.query().get("limit") || "20")
  const offset = (page - 1) * limit
  
  try {
    // Get all records to find unique pets
    const allRecords = $app.findRecordsByFilter(
      "pet_locations", 
      "pet_name ~ 'Tag '", 
      "-timestamp", 
      0, 
      0
    )
    
    // Extract unique pet names
    const uniquePets = [...new Set(allRecords.map(r => r.get("pet_name")))]
    uniquePets.sort((a, b) => {
      const numA = parseInt(a.replace("Tag ", ""))
      const numB = parseInt(b.replace("Tag ", ""))
      return numA - numB
    })
    
    // Paginate the unique pets
    const paginatedPets = uniquePets.slice(offset, offset + limit)
    const currentStatuses = []
    
    for (const petName of paginatedPets) {
      try {
        const records = $app.findRecordsByFilter(
          "pet_locations",
          "pet_name = {:name}",
          "-timestamp",
          1,
          0,
          { name: petName }
        )
        
        if (records && records.length > 0) {
          const latest = records[0]
          currentStatuses.push({
            id: parseInt(petName.replace("Tag ", "")),
            name: petName,
            latitude: latest.get("latitude"),
            longitude: latest.get("longitude"),
            accuracy: latest.get("accuracy"),
            timestamp: latest.get("timestamp"),
            battery_status: latest.get("battery_status"),
            is_inaccurate: latest.get("is_inaccurate")
          })
        }
      } catch (err) {
        console.error(`[Pet Tracker API] Error getting latest for ${petName}:`, err.message)
      }
    }
    
    return e.json(200, {
      data: currentStatuses,
      pagination: {
        page: page,
        limit: limit,
        total_pets: uniquePets.length,
        has_more: (offset + limit) < uniquePets.length
      }
    })
    
  } catch (error) {
    // GraphQL-style: return empty array on error
    return e.json(200, {
      data: [],
      pagination: {
        page: page,
        limit: limit,
        total_pets: 0,
        has_more: false
      },
      error: error.message
    })
  }
})

// GET /api/pets/1/current
// Get current status of a specific pet by numeric ID
routerAdd("GET", "/api/pets/{id}/current", (e) => {
  const petId = e.request.pathValue("id")
  const petName = `Tag ${petId}` // Auto-prefix "Tag " to numeric ID
  
  // Validate numeric ID
  if (!/^\d+$/.test(petId)) {
    return e.json(400, {
      error: "Invalid pet ID",
      message: "Pet ID must be numeric"
    })
  }
  
  try {
    const records = $app.findRecordsByFilter(
      "pet_locations",
      "pet_name = {:name}",
      "-timestamp",
      1,
      0,
      { name: petName }
    )
    
    const latest = (records && records.length > 0) ? records[0] : null
    
    return e.json(200, {
      data: latest ? {
        id: parseInt(petId),
        name: petName,
        latitude: latest.get("latitude"),
        longitude: latest.get("longitude"),
        accuracy: latest.get("accuracy"),
        timestamp: latest.get("timestamp"),
        battery_status: latest.get("battery_status"),
        is_inaccurate: latest.get("is_inaccurate")
      } : null
    })
    
  } catch (error) {
    return e.json(200, {
      data: null,
      error: error.message
    })
  }
})

// GET /api/pets/1/history?page=1&limit=50
// Get location history for a specific pet with pagination
routerAdd("GET", "/api/pets/{id}/history", (e) => {
  const petId = e.request.pathValue("id")
  const petName = `Tag ${petId}` // Auto-prefix "Tag " to numeric ID
  const page = parseInt(e.request.url.query().get("page") || "1")
  const limit = parseInt(e.request.url.query().get("limit") || "50")
  const offset = (page - 1) * limit
  
  // Validate numeric ID
  if (!/^\d+$/.test(petId)) {
    return e.json(400, {
      error: "Invalid pet ID",
      message: "Pet ID must be numeric"
    })
  }
  
  try {
    const records = $app.findRecordsByFilter(
      "pet_locations",
      "pet_name = {:name}",
      "-timestamp",
      limit,
      offset,
      { name: petName }
    ) || []
    
    const history = records.map(r => ({
      latitude: r.get("latitude"),
      longitude: r.get("longitude"),
      accuracy: r.get("accuracy"),
      timestamp: r.get("timestamp"),
      battery_status: r.get("battery_status"),
      is_inaccurate: r.get("is_inaccurate")
    }))
    
    // Check if there's more data
    const nextPage = $app.findRecordsByFilter(
      "pet_locations",
      "pet_name = {:name}",
      "-timestamp",
      1,
      offset + limit,
      { name: petName }
    )
    
    return e.json(200, {
      data: history, // Empty array when no data (GraphQL-style)
      pagination: {
        page: page,
        limit: limit,
        has_more: nextPage && nextPage.length > 0,
        returned: history.length
      },
      pet: {
        id: parseInt(petId),
        name: petName
      }
    })
    
  } catch (error) {
    // GraphQL-style: always return array structure
    return e.json(200, {
      data: [],
      pagination: {
        page: page,
        limit: limit,
        has_more: false,
        returned: 0
      },
      pet: {
        id: parseInt(petId),
        name: petName
      },
      error: error.message
    })
  }
})

// GET /api/pets/timeframe?from=2025-08-24T00:00:00Z&to=2025-08-24T23:59:59Z&page=1&limit=100
// Get all pet locations within a specific timeframe
routerAdd("GET", "/api/pets/timeframe", (e) => {
  const fromDate = e.request.url.query().get("from")
  const toDate = e.request.url.query().get("to")
  const page = parseInt(e.request.url.query().get("page") || "1")
  const limit = parseInt(e.request.url.query().get("limit") || "100")
  const offset = (page - 1) * limit
  
  // Validate required parameters
  if (!fromDate || !toDate) {
    return e.json(400, {
      error: "Missing required parameters",
      message: "Both 'from' and 'to' timestamps are required"
    })
  }
  
  try {
    const records = $app.findRecordsByFilter(
      "pet_locations",
      "pet_name ~ 'Tag ' && timestamp >= {:from} && timestamp <= {:to}",
      "-timestamp",
      limit,
      offset,
      { from: fromDate, to: toDate }
    ) || []
    
    const locations = records.map(r => ({
      id: parseInt(r.get("pet_name").replace("Tag ", "")),
      name: r.get("pet_name"),
      latitude: r.get("latitude"),
      longitude: r.get("longitude"),
      accuracy: r.get("accuracy"),
      timestamp: r.get("timestamp"),
      battery_status: r.get("battery_status"),
      is_inaccurate: r.get("is_inaccurate")
    }))
    
    // Check for more data
    const hasMore = records.length === limit
    
    return e.json(200, {
      data: locations, // Empty array when no data (GraphQL-style)
      pagination: {
        page: page,
        limit: limit,
        has_more: hasMore,
        returned: locations.length
      },
      timeframe: {
        from: fromDate,
        to: toDate
      }
    })
    
  } catch (error) {
    // GraphQL-style: always return array structure
    return e.json(200, {
      data: [],
      pagination: {
        page: page,
        limit: limit,
        has_more: false,
        returned: 0
      },
      timeframe: {
        from: fromDate,
        to: toDate
      },
      error: error.message
    })
  }
})