const express = require('express');
const BinController = require('../controllers/binController');
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');

const router = express.Router();

// Public routes (for IoT sensors and citizen app)
router.put('/:binId/sensor-data',
  ValidationMiddleware.validateSensorData(),
  BinController.updateSensorData
);

router.get('/nearby',
  ValidationMiddleware.validateLocationQuery(),
  BinController.getNearbyBins
);

// Protected routes
router.use(AuthMiddleware.verifyToken);

// Bin registration (admin only)
router.post('/register',
  AuthMiddleware.authorizeRoles('admin'),
  ValidationMiddleware.validateBinRegistration(),
  BinController.registerBin
);

// Get bin status
router.get('/:binId/status',
  AuthMiddleware.authorizeRoles('admin', 'driver'),
  BinController.getBinStatus
);

// Get collection priority list (admin only)
router.get('/collection-priority',
  AuthMiddleware.authorizeRoles('admin'),
  BinController.getCollectionPriority
);

// Mark bin as collected (driver only)
router.post('/:binId/collect',
  AuthMiddleware.authorizeRoles('driver'),
  BinController.collectBin
);

// Report maintenance issue
router.post('/:binId/maintenance',
  AuthMiddleware.authorizeRoles('admin', 'driver', 'citizen'),
  BinController.reportMaintenance
);

// Get bin analytics (admin only)
router.get('/analytics',
  AuthMiddleware.authorizeRoles('admin'),
  BinController.getBinAnalytics
);

module.exports = router;