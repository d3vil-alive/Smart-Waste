const jwt = require('jsonwebtoken');
const { auth } = require('../config/firebase');
const logger = require('../utils/logger');

class AuthMiddleware {
  static async verifyToken(req, res, next) {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. No token provided.'
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      logger.error('Token verification failed:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
  }

  static authorizeRoles(...roles) {
    return (req, res, next) => {
      if (!req.user || !roles.includes(req.user.userType)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }
      next();
    };
  }

  static async verifyFirebaseToken(req, res, next) {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. No Firebase token provided.'
        });
      }

      const decodedToken = await auth.verifyIdToken(token);
      req.firebaseUser = decodedToken;
      next();
    } catch (error) {
      logger.error('Firebase token verification failed:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid Firebase token.'
      });
    }
  }
}

module.exports = AuthMiddleware;