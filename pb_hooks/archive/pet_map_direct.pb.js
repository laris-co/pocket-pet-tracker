/// <reference path="../pb_data/types.d.ts" />

// Pet Map Routes - Direct HTML generation without templates

console.log("[Pet Map Direct] Registering map routes...")

// Route: /map/pet/:id - Display map for specific pet  
routerAdd("GET", "/map/pet/{id}", (e) => {
    try {
        const petId = e.request.pathValue("id")
        const petName = `Tag ${petId}`
        
        console.log(`[Pet Map Direct] Serving map for pet: ${petName}`)
        
        // Generate the complete HTML page directly
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${petName} Location History - Pet Tracker</title>
    
    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossorigin=""/>
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #f5f5f5;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 1.5rem;
            font-weight: 600;
        }
        
        .header .subtitle {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-top: 0.25rem;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 1rem;
        }
        
        .info-panel {
            background: white;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .info-panel h2 {
            font-size: 1.1rem;
            margin-bottom: 0.5rem;
            color: #333;
        }
        
        .stats {
            display: flex;
            gap: 2rem;
            flex-wrap: wrap;
        }
        
        .stat {
            display: flex;
            flex-direction: column;
        }
        
        .stat-label {
            font-size: 0.8rem;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .stat-value {
            font-size: 1.2rem;
            font-weight: 600;
            color: #333;
        }
        
        #map {
            height: 600px;
            width: 100%;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        
        .controls {
            background: white;
            border-radius: 8px;
            padding: 1rem;
            margin-top: 1rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
            margin-right: 0.5rem;
            transition: transform 0.2s;
        }
        
        .button:hover {
            transform: translateY(-1px);
        }
        
        .button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        @media (max-width: 768px) {
            .header {
                padding: 1rem;
            }
            
            #map {
                height: 400px;
            }
            
            .stats {
                gap: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Pet Location Tracker</h1>
        <div class="subtitle">Viewing historical locations for ${petName}</div>
    </div>

    <div class="container">
        <div class="info-panel">
            <h2>Pet Information</h2>
            <div class="stats">
                <div class="stat">
                    <span class="stat-label">Pet Name</span>
                    <span class="stat-value" id="petName">${petName}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Total Locations</span>
                    <span class="stat-value" id="totalLocations">Loading...</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Time Range</span>
                    <span class="stat-value" id="timeRange">Loading...</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Last Update</span>
                    <span class="stat-value" id="lastUpdate">Loading...</span>
                </div>
            </div>
        </div>
        
        <div id="map"></div>
        
        <div class="controls">
            <button class="button" onclick="showAllLocations()">Show All Locations</button>
            <button class="button" onclick="showLastHour()">Last Hour</button>
            <button class="button" onclick="showLastDay()">Last 24 Hours</button>
            <button class="button" onclick="animateJourney()">Animate Journey</button>
            <button class="button" onclick="clearMap()">Clear Map</button>
        </div>
    </div>

    <!-- Leaflet JavaScript -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
            integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
            crossorigin=""></script>
    
    <script>
    // Initialize map centered on Pacific Ocean (our demo location)
    const map = L.map('map').setView([0, -150], 10);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Store locations data
    let allLocations = [];
    let markers = [];
    let polyline = null;
    let animationTimer = null;

    // Custom icon for pet locations
    const petIcon = L.icon({
        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjNjY3ZWVhIiBkPSJNMTIgMkM4LjEzIDIgNSA1LjEzIDUgOWMwIDUuMjUgNyAxMyA3IDEzczctNy43NSA3LTEzYzAtMy44Ny0zLjEzLTctNy03em0wIDkuNWMtMS4zOCAwLTIuNS0xLjEyLTIuNS0yLjVzMS4xMi0yLjUgMi41LTIuNSAyLjUgMS4xMiAyLjUgMi41LTEuMTIgMi41LTIuNSAyLjV6Ii8+PC9zdmc+',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });

    // Fetch and display locations
    async function fetchLocations() {
        try {
            const petId = ${petId};
            const response = await fetch(\`/api/pets/\${petId}/history?page=1&limit=100\`);
            const data = await response.json();
            
            if (data.data && Array.isArray(data.data)) {
                allLocations = data.data;
                updateStats();
                showAllLocations();
            } else {
                console.error('Failed to fetch locations:', data);
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
        }
    }

    // Update statistics panel
    function updateStats() {
        document.getElementById('totalLocations').textContent = allLocations.length;
        
        if (allLocations.length > 0) {
            const firstTime = new Date(allLocations[allLocations.length - 1].timestamp);
            const lastTime = new Date(allLocations[0].timestamp);
            
            const timeRangeText = \`\${formatDate(firstTime)} - \${formatDate(lastTime)}\`;
            document.getElementById('timeRange').textContent = timeRangeText;
            document.getElementById('lastUpdate').textContent = formatDate(lastTime);
        }
    }

    // Format date for display
    function formatDate(date) {
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Clear all markers and lines from map
    function clearMap() {
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
        
        if (polyline) {
            map.removeLayer(polyline);
            polyline = null;
        }
        
        if (animationTimer) {
            clearInterval(animationTimer);
            animationTimer = null;
        }
    }

    // Show all locations on map
    function showAllLocations() {
        clearMap();
        
        if (allLocations.length === 0) return;
        
        const latlngs = [];
        const bounds = L.latLngBounds();
        
        allLocations.forEach((location, index) => {
            const lat = location.latitude;
            const lng = location.longitude;
            const latlng = [lat, lng];
            latlngs.push(latlng);
            bounds.extend(latlng);
            
            // Add marker
            const marker = L.marker(latlng, { 
                icon: petIcon,
                opacity: 0.7 + (index / allLocations.length) * 0.3
            }).addTo(map);
            
            // Add popup with location details
            const popupContent = \`
                <div style="min-width: 200px;">
                    <strong>\${location.pet_name || 'Tag 1'}</strong><br>
                    Time: \${formatDate(new Date(location.timestamp))}<br>
                    Accuracy: \${location.accuracy?.toFixed(2) || 'N/A'} meters<br>
                    Battery: \${location.battery_status === 1 ? 'Full' : location.battery_status || 'Unknown'}<br>
                    Lat: \${lat.toFixed(6)}, Lng: \${lng.toFixed(6)}
                </div>
            \`;
            marker.bindPopup(popupContent);
            markers.push(marker);
        });
        
        // Draw path line
        if (latlngs.length > 1) {
            polyline = L.polyline(latlngs, {
                color: '#667eea',
                weight: 3,
                opacity: 0.7,
                smoothFactor: 1
            }).addTo(map);
        }
        
        // Fit map to bounds
        map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Show locations from last hour
    function showLastHour() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        showFilteredLocations(loc => new Date(loc.timestamp) > oneHourAgo);
    }

    // Show locations from last 24 hours
    function showLastDay() {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        showFilteredLocations(loc => new Date(loc.timestamp) > oneDayAgo);
    }

    // Show filtered locations
    function showFilteredLocations(filterFn) {
        clearMap();
        
        const filtered = allLocations.filter(filterFn);
        if (filtered.length === 0) {
            alert('No locations found in this time range');
            return;
        }
        
        const latlngs = [];
        const bounds = L.latLngBounds();
        
        filtered.forEach((location, index) => {
            const lat = location.latitude;
            const lng = location.longitude;
            const latlng = [lat, lng];
            latlngs.push(latlng);
            bounds.extend(latlng);
            
            const marker = L.marker(latlng, { 
                icon: petIcon,
                opacity: 0.7 + (index / filtered.length) * 0.3
            }).addTo(map);
            
            const popupContent = \`
                <div style="min-width: 200px;">
                    <strong>\${location.pet_name}</strong><br>
                    Time: \${formatDate(new Date(location.timestamp))}<br>
                    Accuracy: \${location.horizontal_accuracy?.toFixed(2) || 'N/A'} meters<br>
                    Battery: \${location.battery_status || 'Unknown'}
                </div>
            \`;
            marker.bindPopup(popupContent);
            markers.push(marker);
        });
        
        if (latlngs.length > 1) {
            polyline = L.polyline(latlngs, {
                color: '#667eea',
                weight: 3,
                opacity: 0.7
            }).addTo(map);
        }
        
        map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Animate the journey
    function animateJourney() {
        if (allLocations.length === 0) return;
        
        clearMap();
        
        let index = allLocations.length - 1;
        const bounds = L.latLngBounds();
        const latlngs = [];
        
        animationTimer = setInterval(() => {
            if (index < 0) {
                clearInterval(animationTimer);
                animationTimer = null;
                return;
            }
            
            const location = allLocations[index];
            const lat = location.latitude;
            const lng = location.longitude;
            const latlng = [lat, lng];
            latlngs.push(latlng);
            bounds.extend(latlng);
            
            // Add marker with animation
            const marker = L.marker(latlng, { 
                icon: petIcon
            }).addTo(map);
            
            const popupContent = \`
                <div style="min-width: 200px;">
                    <strong>\${location.pet_name}</strong><br>
                    Time: \${formatDate(new Date(location.timestamp))}<br>
                    Point \${allLocations.length - index} of \${allLocations.length}
                </div>
            \`;
            marker.bindPopup(popupContent);
            markers.push(marker);
            
            // Update or create polyline
            if (polyline) {
                map.removeLayer(polyline);
            }
            
            if (latlngs.length > 1) {
                polyline = L.polyline(latlngs, {
                    color: '#667eea',
                    weight: 3,
                    opacity: 0.7
                }).addTo(map);
            }
            
            // Pan to latest point
            map.panTo(latlng);
            
            index--;
        }, 500);
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', fetchLocations);
    </script>
</body>
</html>`
        
        // Send HTML response
        e.html(200, html)
    } catch (error) {
        console.error("[Pet Map Direct] Error:", error)
        e.html(500, `<h1>Error</h1><p>Failed to render map: ${error.message}</p>`)
    }
})

console.log("[Pet Map Direct] Routes registered successfully")