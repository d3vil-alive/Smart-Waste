const { body, param, query, validationResult } = require('express-validator');
const Helpers = require('../utils/helpers');

class ValidationMiddleware {
  static handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }

  static validateVehicleRegistration() {
    return [
      body('vehicleId').notEmpty().withMessage('Vehicle ID is required'),
      body('driverName').isLength({ min: 2 }).withMessage('Driver name must be at least 2 characters'),
      body('driverPhone').isMobilePhone().withMessage('Valid phone number is required'),
      body('vehicleType').isIn(['truck', 'van', 'auto']).withMessage('Invalid vehicle type'),
      body('capacity').isNumeric().withMessage('Capacity must be a number'),
      body('fuelType').isIn(['diesel', 'petrol', 'electric']).withMessage('Invalid fuel type'),
      this.handleValidationErrors
    ];
  }

  static validateBinRegistration() {
    return [
      body('binId').notEmpty().withMessage('Bin ID is required'),
      body('location.lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
      body('location.lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
      body('location.address').notEmpty().withMessage('Address is required'),
      body('capacity').isNumeric().withMessage('Capacity must be a number'),
      body('type').isIn(['mixed', 'organic', 'recyclable']).withMessage('Invalid bin type'),
      this.handleValidationErrors
    ];
  }

  static validateSensorData() {
    return [
      param('binId').notEmpty().withMessage('Bin ID is required'),
      body('fillPercentage').isFloat({ min: 0, max: 100 }).withMessage('Fill percentage must be between 0 and 100'),
      body('weight').isNumeric().withMessage('Weight must be a number'),
      body('temperature').isNumeric().withMessage('Temperature must be a number'),
      body('batteryLevel').isFloat({ min: 0, max: 100 }).withMessage('Battery level must be between 0 and 100'),
      this.handleValidationErrors
    ];
  }

  static validateUserRegistration() {
    return [
      body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
      body('email').isEmail().withMessage('Valid email is required'),
      body('phone').isMobilePhone().withMessage('Valid phone number is required'),
      body('userType').isIn(['admin', 'driver', 'citizen']).withMessage('Invalid user type'),
      this.handleValidationErrors
    ];
  }

  static validateLogin() {
    return [
      body('email').isEmail().withMessage('Valid email is required'),
      body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
      body('userType').isIn(['admin', 'driver', 'citizen']).withMessage('Invalid user type'),
      this.handleValidationErrors
    ];
  }

  static validateLocationQuery() {
    return [
      query('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
      query('lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
      query('radius').optional().isNumeric().withMessage('Radius must be a number'),
      this.handleValidationErrors
    ];
  }
}

module.exports = ValidationMiddleware;