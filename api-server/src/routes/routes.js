const express = require('express');
const RouteController = require('../controllers/routeController');
const AuthMiddleware = require('../middleware/auth');

const router = express.Router();

// All route endpoints require authentication
router.use(AuthMiddleware.verifyToken);

// Generate optimized route (admin only)
router.post('/optimize',
  AuthMiddleware.authorizeRoles('admin'),
  RouteController.optimizeRoute
);

// Get active routes status (admin only)
router.get('/active',
  AuthMiddleware.authorizeRoles('admin'),
  RouteController.getActiveRoutes
);

// Update route progress (driver only)
router.put('/:routeId/progress',
  AuthMiddleware.authorizeRoles('driver'),
  RouteController.updateRouteProgress
);

// Get route analytics (admin only)
router.get('/analytics',
  AuthMiddleware.authorizeRoles('admin'),
  RouteController.getRouteAnalytics
);

module.exports = router;