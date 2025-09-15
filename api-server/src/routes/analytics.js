const express = require('express');
const AnalyticsController = require('../controllers/analyticsController');
const AuthMiddleware = require('../middleware/auth');

const router = express.Router();

// All analytics endpoints require authentication
router.use(AuthMiddleware.verifyToken);

// Dashboard overview (admin only)
router.get('/dashboard',
  AuthMiddleware.authorizeRoles('admin'),
  AnalyticsController.getDashboardOverview
);

// Environmental impact analytics (admin only)
router.get('/environmental-impact',
  AuthMiddleware.authorizeRoles('admin'),
  AnalyticsController.getEnvironmentalImpact
);

// Predictive analytics (admin only)
router.get('/predictions',
  AuthMiddleware.authorizeRoles('admin'),
  AnalyticsController.getPredictions
);

// Generate custom reports (admin only)
router.post('/reports/generate',
  AuthMiddleware.authorizeRoles('admin'),
  AnalyticsController.generateReport
);

module.exports = router;