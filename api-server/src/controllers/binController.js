const { db, storage } = require('../config/firebase');
const Helpers = require('../utils/helpers');
const logger = require('../utils/logger');

class BinController {
  // Register new smart bin
  static async registerBin(req, res) {
    try {
      const { binId, location, capacity, type } = req.body;

      // Check if bin already exists
      const existingBin = await db.collection('smartBins').doc(binId).get();
      if (existingBin.exists) {
        return res.status(409).json({
          success: false,
          message: 'Bin already registered'
        });
      }

      // Generate QR code
      const qrCode = Helpers.generateQRCode(binId);

      const binData = {
        binId,
        location,
        capacity,
        type,
        fillPercentage: 0,
        weight: 0,
        status: 'empty',
        batteryLevel: 100,
        temperature: null,
        lastCollection: null,
        qrCode,
        createdAt: new Date(),
        lastUpdated: new Date()
      };

      await db.collection('smartBins').doc(binId).set(binData);

      logger.info(`Smart bin registered: ${binId}`);

      res.status(201).json({
        success: true,
        binId,
        qrCode
      });
    } catch (error) {
      logger.error('Bin registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register bin'
      });
    }
  }

  // Update sensor data
  static async updateSensorData(req, res) {
    try {
      const { binId } = req.params;
      const { fillPercentage, weight, temperature, batteryLevel } = req.body;

      const binDoc = await db.collection('smartBins').doc(binId).get();
      if (!binDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Bin not found'
        });
      }

      // Determine bin status based on fill percentage
      let status = 'normal';
      if (fillPercentage >= 90) {
        status = 'full';
      } else if (fillPercentage >= 70) {
        status = 'needs_collection';
      } else if (fillPercentage <= 10) {
        status = 'empty';
      }

      const updateData = {
        fillPercentage,
        weight,
        temperature,
        batteryLevel,
        status,
        lastUpdated: new Date()
      };

      await db.collection('smartBins').doc(binId).update(updateData);

      // Check for alerts
      let alertTriggered = false;
      const alerts = [];

      if (fillPercentage >= 80) {
        alerts.push('Bin needs collection');
        alertTriggered = true;
      }

      if (batteryLevel <= 20) {
        alerts.push('Low battery');
        alertTriggered = true;
      }

      if (temperature && temperature > 40) {
        alerts.push('High temperature detected');
        alertTriggered = true;
      }

      // Emit real-time update
      if (req.io) {
        req.io.emit('bin-update', {
          binId,
          ...updateData,
          alerts
        });
      }

      // Create alert records if needed
      if (alertTriggered) {
        const alertData = {
          binId,
          alerts,
          triggerTime: new Date(),
          resolved: false
        };
        await db.collection('alerts').add(alertData);
      }

      res.json({
        success: true,
        alertTriggered,
        alerts
      });
    } catch (error) {
      logger.error('Sensor data update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update sensor data'
      });
    }
  }

  // Get bin status
  static async getBinStatus(req, res) {
    try {
      const { binId } = req.params;

      const binDoc = await db.collection('smartBins').doc(binId).get();
      if (!binDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Bin not found'
        });
      }

      const binData = binDoc.data();
      
      res.json({
        binId,
        fillPercentage: binData.fillPercentage,
        weight: binData.weight,
        status: binData.status,
        lastCollection: binData.lastCollection,
        batteryLevel: binData.batteryLevel,
        location: binData.location,
        temperature: binData.temperature
      });
    } catch (error) {
      logger.error('Get bin status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get bin status'
      });
    }
  }

  // Get collection priority list
  static async getCollectionPriority(req, res) {
    try {
      const threshold = parseInt(req.query.threshold) || 70;

      const binsSnapshot = await db.collection('smartBins')
        .where('fillPercentage', '>=', threshold)
        .orderBy('fillPercentage', 'desc')
        .get();

      const urgentBins = [];
      let totalBins = 0;

      // Get total bins count
      const allBinsSnapshot = await db.collection('smartBins').get();
      totalBins = allBinsSnapshot.size;

      binsSnapshot.forEach(doc => {
        const binData = doc.data();
        
        // Calculate time since full
        let timeSinceFull = 0;
        if (binData.fillPercentage >= 90 && binData.lastUpdated) {
          timeSinceFull = Math.floor((new Date() - binData.lastUpdated.toDate()) / (1000 * 60));
        }

        urgentBins.push({
          binId: binData.binId,
          fillPercentage: binData.fillPercentage,
          location: binData.location,
          timeSinceFull,
          weight: binData.weight,
          status: binData.status
        });
      });

      res.json({
        urgentBins,
        totalBins,
        collectionNeeded: urgentBins.length
      });
    } catch (error) {
      logger.error('Collection priority error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get collection priority'
      });
    }
  }

  // Get nearby bins for citizens
  static async getNearbyBins(req, res) {
    try {
      const { lat, lng, radius = 500 } = req.query;

      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const searchRadius = parseInt(radius);

      // Get all bins (in production, use geohash for better performance)
      const binsSnapshot = await db.collection('smartBins').get();
      const nearbyBins = [];

      binsSnapshot.forEach(doc => {
        const binData = doc.data();
        const binLat = binData.location.lat;
        const binLng = binData.location.lng;

        const distance = Helpers.calculateDistance(userLat, userLng, binLat, binLng) * 1000; // Convert to meters

        if (distance <= searchRadius) {
          nearbyBins.push({
            binId: binData.binId,
            distance: Math.round(distance),
            fillPercentage: binData.fillPercentage,
            status: binData.status,
            location: binData.location,
            type: binData.type
          });
        }
      });

      // Sort by distance
      nearbyBins.sort((a, b) => a.distance - b.distance);

      res.json({
        nearbyBins
      });
    } catch (error) {
      logger.error('Nearby bins error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get nearby bins'
      });
    }
  }

  // Mark bin as collected
  static async collectBin(req, res) {
    try {
      const { binId } = req.params;
      const { vehicleId, collectedWeight, collectionTime, beforePhoto, afterPhoto, driverId } = req.body;

      const binDoc = await db.collection('smartBins').doc(binId).get();
      if (!binDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Bin not found'
        });
      }

      const collectionId = Helpers.generateId('COL');
      
      // Create collection record
      const collectionData = {
        collectionId,
        binId,
        vehicleId,
        driverId,
        collectedWeight,
        collectionTime: new Date(collectionTime),
        beforePhoto,
        afterPhoto,
        createdAt: new Date()
      };

      await db.collection('collections').doc(collectionId).set(collectionData);

      // Update bin status
      await db.collection('smartBins').doc(binId).update({
        status: 'empty',
        fillPercentage: 0,
        weight: 0,
        lastCollection: new Date(collectionTime),
        lastUpdated: new Date()
      });

      // Emit real-time update
      if (req.io) {
        req.io.emit('bin-collected', {
          binId,
          collectionId,
          vehicleId,
          collectedWeight
        });
      }

      logger.info(`Bin collected: ${binId} by vehicle ${vehicleId}`);

      res.json({
        success: true,
        collectionId,
        updatedStatus: 'empty'
      });
    } catch (error) {
      logger.error('Bin collection error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record bin collection'
      });
    }
  }

  // Report maintenance issue
  static async reportMaintenance(req, res) {
    try {
      const { binId } = req.params;
      const { issueType, description, reportedBy, priority = 'medium' } = req.body;

      const ticketId = Helpers.generateId('TK');
      
      const maintenanceData = {
        ticketId,
        binId,
        issueType,
        description,
        reportedBy,
        priority,
        status: 'open',
        createdAt: new Date(),
        resolvedAt: null
      };

      await db.collection('maintenanceTickets').doc(ticketId).set(maintenanceData);

      // Update bin status if critical issue
      if (priority === 'urgent' || issueType === 'sensor_malfunction') {
        await db.collection('smartBins').doc(binId).update({
          status: 'maintenance_required',
          lastUpdated: new Date()
        });
      }

      logger.info(`Maintenance ticket created: ${ticketId} for bin ${binId}`);

      res.json({
        success: true,
        ticketId
      });
    } catch (error) {
      logger.error('Report maintenance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to report maintenance issue'
      });
    }
  }

  // Get bin analytics
  static async getBinAnalytics(req, res) {
    try {
      const { binId, period = 'weekly' } = req.query;

      let startDate = new Date();
      
      switch (period) {
        case 'daily':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'weekly':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      // Get collections for the bin in the specified period
      const collectionsSnapshot = await db.collection('collections')
        .where('binId', '==', binId)
        .where('collectionTime', '>=', startDate)
        .get();

      let collectionFrequency = 0;
      let totalWeight = 0;
      const collectionHours = [];

      collectionsSnapshot.forEach(doc => {
        const collection = doc.data();
        collectionFrequency++;
        totalWeight += collection.collectedWeight || 0;
        
        const hour = collection.collectionTime.toDate().getHours();
        collectionHours.push(hour);
      });

      // Calculate frequency per week
      const daysInPeriod = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
      const weeklyFrequency = (collectionFrequency * 7) / daysInPeriod;

      // Calculate average fill time (simplified)
      const averageFillTime = weeklyFrequency > 0 ? (7 * 24) / weeklyFrequency : 0;

      // Find peak hours
      const hourCounts = {};
      collectionHours.forEach(hour => {
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      
      const peakHours = Object.entries(hourCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => parseInt(hour));

      // Calculate efficiency (simplified metric)
      const binDoc = await db.collection('smartBins').doc(binId).get();
      const binCapacity = binDoc.exists ? binDoc.data().capacity : 100;
      const efficiency = totalWeight > 0 ? Math.min((totalWeight / (collectionFrequency * binCapacity)) * 100, 100) : 0;

      res.json({
        collectionFrequency: Math.round(weeklyFrequency * 10) / 10,
        averageFillTime: Math.round(averageFillTime),
        wasteGeneration: totalWeight,
        peakHours,
        efficiency: Math.round(efficiency)
      });
    } catch (error) {
      logger.error('Bin analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get bin analytics'
      });
    }
  }
}

module.exports = BinController;