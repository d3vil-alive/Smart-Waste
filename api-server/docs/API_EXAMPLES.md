# Smart Waste Management API - Usage Examples

## 🚛 Vehicle Management Examples

### Register New Vehicle
```bash
curl -X POST http://localhost:3000/api/vehicles/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbjEyMyIsInVzZXJUeXBlIjoiYWRtaW4iLCJpYXQiOjE3NTc5MzczODgsImV4cCI6MTc1ODAyMzc4OH0.2SLu5d-0IQB6Og98RdXgo2rpqlYnLs4e6SFETSQDLEA" \
  -d '{
    "vehicleId": "VH001",
    "driverName": "Rajesh Kumar",
    "driverPhone": "+91-9876543210",
    "vehicleType": "truck",
    "capacity": 500,
    "fuelType": "diesel"
  }'
```

### Update Vehicle Location (IoT Device)
```bash
curl -X PUT http://localhost:3000/api/vehicles/VH001/status \
  -H "Content-Type: application/json" \
  -d '{
    "location": { "lat": 22.5726, "lng": 88.3639 },
    "fuelLevel": 75,
    "currentWeight": 250,
    "status": "collecting",
    "odometer": 45230,
    "speed": 45,
    "heading": 180
  }'
```

## 🗑️ Smart Bin Examples

### Register Smart Bin
```bash
curl -X POST http://localhost:3000/api/bins/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "binId": "BIN001",
    "location": {
      "lat": 22.5726,
      "lng": 88.3639,
      "address": "Park Street, Kolkata"
    },
    "capacity": 100,
    "type": "mixed"
  }'
```

### IoT Sensor Data Update
```bash
curl -X PUT http://localhost:3000/api/bins/BIN001/sensor-data \
  -H "Content-Type: application/json" \
  -d '{
    "fillPercentage": 75,
    "weight": 80,
    "temperature": 28,
    "batteryLevel": 85,
    "timestamp": "2025-01-14T10:30:00Z"
  }'
```

### Find Nearby Bins (Citizen App)
```bash
curl "http://localhost:3000/api/bins/nearby?lat=22.5726&lng=88.3639&radius=500"
```

### Mark Bin as Collected (Driver App)
```bash
curl -X POST http://localhost:3000/api/bins/BIN001/collect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" \
  -d '{
    "vehicleId": "VH001",
    "collectedWeight": 80,
    "collectionTime": "2025-01-14T10:30:00Z",
    "beforePhoto": "base64_image_string",
    "afterPhoto": "base64_image_string",
    "driverId": "DR001"
  }'
```

## 🛣️ Route Management Examples

### Generate Optimized Route
```bash
curl -X POST http://localhost:3000/api/routes/optimize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "vehicleId": "VH001",
    "startLocation": { "lat": 22.5726, "lng": 88.3639 },
    "maxCapacity": 500,
    "timeConstraints": {
      "startTime": "06:00",
      "maxDuration": 480
    }
  }'
```

### Update Route Progress (Driver App)
```bash
curl -X PUT http://localhost:3000/api/routes/RT001/progress \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" \
  -d '{
    "completedBinId": "BIN001",
    "completionTime": "2025-01-14T10:30:00Z",
    "collectedWeight": 75,
    "nextBinId": "BIN002"
  }'
```

## 👥 User Management Examples

### User Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Priya Sharma",
    "email": "priya@gmail.com",
    "phone": "+91-9876543210",
    "password": "securePass123",
    "userType": "citizen",
    "location": { "lat": 22.5726, "lng": 88.3639 }
  }'
```

### User Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver@wastems.com",
    "password": "securePass123",
    "userType": "driver"
  }'
```

### Get User Profile
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Analytics Examples

### Dashboard Overview
```bash
curl -X GET "http://localhost:3000/api/analytics/dashboard?period=daily&date=2025-01-14" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Environmental Impact Report
```bash
curl -X GET "http://localhost:3000/api/analytics/environmental-impact?period=monthly" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Generate Custom Report
```bash
curl -X POST http://localhost:3000/api/analytics/reports/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "reportType": "waste_collection",
    "dateRange": {
      "startDate": "2025-01-01",
      "endDate": "2025-01-14"
    },
    "filters": {
      "vehicleIds": ["VH001", "VH002"],
      "binIds": ["BIN001", "BIN002"]
    },
    "format": "pdf"
  }'
```

## 🔄 Real-time WebSocket Examples

### JavaScript Client
```javascript
const socket = io('http://localhost:3000');

// Join admin dashboard room
socket.emit('join-room', 'dashboard');

// Listen for real-time updates
socket.on('vehicle-update', (data) => {
  console.log('Vehicle update:', data);
});

socket.on('bin-update', (data) => {
  console.log('Bin update:', data);
});

socket.on('route-progress', (data) => {
  console.log('Route progress:', data);
});

socket.on('bin-collected', (data) => {
  console.log('Bin collected:', data);
});
```

## 📱 Mobile App Integration Examples

### Driver App Workflow
```javascript
// 1. Driver logs in
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'driver@waste.com',
    password: 'password',
    userType: 'driver'
  })
});

const { token } = await loginResponse.json();

// 2. Get assigned route
const routeResponse = await fetch('/api/vehicles/VH001/route', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const routeData = await routeResponse.json();

// 3. Update location periodically
setInterval(async () => {
  await fetch('/api/vehicles/VH001/status', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: getCurrentLocation(),
      status: 'collecting'
    })
  });
}, 30000); // Every 30 seconds

// 4. Mark bin as collected
const collectResponse = await fetch('/api/bins/BIN001/collect', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    vehicleId: 'VH001',
    collectedWeight: 85,
    collectionTime: new Date().toISOString(),
    driverId: 'DR001'
  })
});
```

### Citizen App Workflow
```javascript
// Find nearby bins
const nearbyBins = await fetch(
  `/api/bins/nearby?lat=${userLat}&lng=${userLng}&radius=500`
);

const bins = await nearbyBins.json();

// Report maintenance issue
const reportResponse = await fetch('/api/bins/BIN001/maintenance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${citizenToken}`
  },
  body: JSON.stringify({
    issueType: 'physical_damage',
    description: 'Bin lid is broken',
    reportedBy: 'citizen',
    priority: 'medium'
  })
});
```

## 🔧 Error Handling Examples

### API Error Response Format
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created successfully
- `400` - Bad request / Validation error
- `401` - Unauthorized / Invalid token
- `403` - Forbidden / Insufficient permissions
- `404` - Resource not found
- `409` - Conflict / Resource already exists
- `500` - Internal server error

### Rate Limiting Response
```json
{
  "success": false,
  "message": "Too many requests from this IP",
  "retryAfter": 900
}
```

## 📊 Response Examples

### Successful Vehicle Registration
```json
{
  "success": true,
  "message": "Vehicle registered successfully",
  "vehicleData": {
    "vehicleId": "VH001",
    "driverName": "Rajesh Kumar",
    "driverPhone": "+91-9876543210",
    "vehicleType": "truck",
    "capacity": 500,
    "fuelType": "diesel",
    "status": "idle",
    "createdAt": "2025-01-14T10:30:00Z"
  }
}
```

### Route Optimization Response
```json
{
  "success": true,
  "routeId": "RT001",
  "optimizedSequence": [
    {
      "binId": "BIN003",
      "estimatedWeight": 85,
      "travelTime": 12,
      "priority": 1,
      "location": { "lat": 22.5726, "lng": 88.3639 }
    }
  ],
  "totalDistance": 35.4,
  "estimatedFuelSaved": 25,
  "estimatedTime": 120,
  "totalBins": 8
}
```

### Analytics Dashboard Response
```json
{
  "todayStats": {
    "binsCollected": 45,
    "wasteCollected": 2250,
    "fuelUsed": 85.5,
    "routesCompleted": 8,
    "efficiency": 92
  },
  "alerts": {
    "urgentBins": 3,
    "lowBattery": 2,
    "maintenanceNeeded": 1
  },
  "trends": {
    "efficiencyTrend": "+5%",
    "wasteGeneration": "-2%"
  }
}
```