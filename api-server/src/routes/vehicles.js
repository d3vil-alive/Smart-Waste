const express = require('express');
const VehicleController = require('../controllers/vehicleController');
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');

const router = express.Router();

// Public routes (for IoT devices)
router.put('/:vehicleId/status', 
  ValidationMiddleware.validateSensorData(),
  VehicleController.updateVehicleStatus
);

// Protected routes
router.use(AuthMiddleware.verifyToken);

// Vehicle registration (admin only)
router.post('/register',
  AuthMiddleware.authorizeRoles('admin'),
  ValidationMiddleware.validateVehicleRegistration(),
  VehicleController.registerVehicle
);

// Get vehicle location
router.get('/:vehicleId/location',
  AuthMiddleware.authorizeRoles('admin', 'driver'),
  VehicleController.getVehicleLocation
);

// Get vehicle route (for driver app)
router.get('/:vehicleId/route',
  AuthMiddleware.authorizeRoles('admin', 'driver'),
  VehicleController.getVehicleRoute
);

// Vehicle analytics (admin only)
router.get('/analytics',
  AuthMiddleware.authorizeRoles('admin'),
  VehicleController.getVehicleAnalytics
);

// Add maintenance record
router.post('/:vehicleId/maintenance',
  AuthMiddleware.authorizeRoles('admin', 'driver'),
  VehicleController.addMaintenance
);

// Get all vehicles overview (admin only)
router.get('/overview',
  AuthMiddleware.authorizeRoles('admin'),
  VehicleController.getVehiclesOverview
);

module.exports = router;