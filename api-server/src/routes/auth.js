const express = require('express');
const UserController = require('../controllers/userController');
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');

const router = express.Router();

// Public authentication routes
router.post('/login',
  ValidationMiddleware.validateLogin(),
  UserController.login
);

router.post('/register',
  ValidationMiddleware.validateUserRegistration(),
  UserController.register
);

// Protected routes
router.use(AuthMiddleware.verifyToken);

// Get user profile
router.get('/profile',
  UserController.getProfile
);

// Update user profile
router.put('/profile',
  UserController.updateProfile
);

// Update user settings
router.put('/settings',
  UserController.updateSettings
);

// Update driver performance (system only)
router.put('/performance',
  AuthMiddleware.authorizeRoles('admin'),
  UserController.updatePerformance
);

module.exports = router;