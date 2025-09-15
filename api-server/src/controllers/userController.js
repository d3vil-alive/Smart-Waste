const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, auth } = require('../config/firebase');
const Helpers = require('../utils/helpers');
const logger = require('../utils/logger');

class UserController {
  // User login
  static async login(req, res) {
    try {
      const { email, password, userType } = req.body;

      // Find user in database
      const usersSnapshot = await db.collection('users')
        .where('email', '==', email)
        .where('userType', '==', userType)
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or user type'
        });
      }

      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, userData.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: userData.userId,
          email: userData.email,
          userType: userData.userType
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Prepare user permissions based on userType
      let permissions = [];
      switch (userData.userType) {
        case 'admin':
          permissions = ['manage_vehicles', 'manage_bins', 'view_analytics', 'manage_routes'];
          break;
        case 'driver':
          permissions = ['collect_waste', 'update_routes', 'view_assigned_route'];
          break;
        case 'citizen':
          permissions = ['report_issues', 'view_nearby_bins'];
          break;
      }

      // Update last login
      await db.collection('users').doc(userDoc.id).update({
        lastLogin: new Date()
      });

      logger.info(`User logged in: ${userData.email}`);

      res.json({
        success: true,
        token,
        user: {
          userId: userData.userId,
          name: userData.name,
          email: userData.email,
          userType: userData.userType,
          permissions
        }
      });

    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  }

  // User registration
  static async register(req, res) {
    try {
      const { name, email, phone, password, userType, location } = req.body;

      // Check if user already exists
      const existingUserSnapshot = await db.collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (!existingUserSnapshot.empty) {
        return res.status(409).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Generate user ID
      const userId = Helpers.generateId('USR');

      // Create user data
      const userData = {
        userId,
        name,
        email,
        phone,
        password: hashedPassword,
        userType,
        location: location || null,
        status: 'active',
        createdAt: new Date(),
        lastLogin: null,
        preferences: {
          notifications: true,
          language: 'english',
          collectionReminders: userType === 'citizen'
        }
      };

      // Add driver-specific fields
      if (userType === 'driver') {
        userData.assignedVehicle = null;
        userData.performance = {
          collectionsToday: 0,
          efficiency: 0,
          rating: 5.0
        };
      }

      await db.collection('users').doc(userId).set(userData);

      logger.info(`New user registered: ${email} (${userType})`);

      res.status(201).json({
        success: true,
        userId,
        verificationSent: false // In production, implement email verification
      });

    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed'
      });
    }
  }

  // Get user profile
  static async getProfile(req, res) {
    try {
      const userId = req.user.userId;

      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const userData = userDoc.data();

      // Remove sensitive information
      delete userData.password;

      // Add performance data for drivers
      if (userData.userType === 'driver') {
        // Get today's collections
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const collectionsSnapshot = await db.collection('collections')
          .where('driverId', '==', userId)
          .where('collectionTime', '>=', today)
          .get();

        userData.performance = {
          collectionsToday: collectionsSnapshot.size,
          efficiency: userData.performance?.efficiency || 0,
          rating: userData.performance?.rating || 5.0
        };
      }

      res.json(userData);

    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user profile'
      });
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const { name, phone, location } = req.body;

      const updateData = {
        lastUpdated: new Date()
      };

      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;
      if (location) updateData.location = location;

      await db.collection('users').doc(userId).update(updateData);

      res.json({
        success: true,
        message: 'Profile updated successfully'
      });

    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }

  // Update user settings
  static async updateSettings(req, res) {
    try {
      const userId = req.user.userId;
      const { notifications, language, collectionReminders, privacySettings } = req.body;

      const settingsData = {};
      if (notifications !== undefined) settingsData['preferences.notifications'] = notifications;
      if (language) settingsData['preferences.language'] = language;
      if (collectionReminders !== undefined) settingsData['preferences.collectionReminders'] = collectionReminders;
      if (privacySettings) settingsData['preferences.privacySettings'] = privacySettings;

      settingsData.lastUpdated = new Date();

      await db.collection('users').doc(userId).update(settingsData);

      res.json({
        success: true,
        message: 'Settings updated successfully'
      });

    } catch (error) {
      logger.error('Update settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update settings'
      });
    }
  }

  // Update driver performance (admin only)
  static async updatePerformance(req, res) {
    try {
      const { userId } = req.params;
      const { collectionsCompleted, routeCompletionTime, wasteCollected, customerRating } = req.body;

      const performanceData = {};
      
      if (collectionsCompleted !== undefined) {
        performanceData['performance.collectionsToday'] = collectionsCompleted;
      }
      
      if (routeCompletionTime !== undefined) {
        // Calculate efficiency based on expected vs actual time
        const expectedTime = 480; // 8 hours in minutes
        const efficiency = Helpers.calculateEfficiency(expectedTime, routeCompletionTime);
        performanceData['performance.efficiency'] = efficiency;
      }
      
      if (customerRating !== undefined) {
        performanceData['performance.rating'] = customerRating;
      }

      performanceData.lastUpdated = new Date();

      await db.collection('users').doc(userId).update(performanceData);

      res.json({
        success: true,
        message: 'Performance updated successfully'
      });

    } catch (error) {
      logger.error('Update performance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update performance'
      });
    }
  }
}

module.exports = UserController;