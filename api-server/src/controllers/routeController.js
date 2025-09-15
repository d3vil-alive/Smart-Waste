const { db } = require('../config/firebase');
const RouteOptimizationService = require('../services/routeOptimization');
const Helpers = require('../utils/helpers');
const logger = require('../utils/logger');

class RouteController {
  // Generate optimized route
  static async optimizeRoute(req, res) {
    try {
      const { vehicleId, startLocation, maxCapacity, timeConstraints } = req.body;

      // Get vehicle details
      const vehicleDoc = await db.collection('vehicles').doc(vehicleId).get();
      if (!vehicleDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      const vehicleData = vehicleDoc.data();
      const vehicle = {
        vehicleId,
        capacity: maxCapacity || vehicleData.capacity,
        vehicleType: vehicleData.vehicleType
      };

      // Get bins that need collection (fill percentage >= 70)
      const binsSnapshot = await db.collection('smartBins')
        .where('fillPercentage', '>=', 70)
        .get();

      const eligibleBins = [];
      binsSnapshot.forEach(doc => {
        const binData = doc.data();
        eligibleBins.push({
          binId: binData.binId,
          location: binData.location,
          fillPercentage: binData.fillPercentage,
          estimatedWeight: Math.round(binData.capacity * (binData.fillPercentage / 100)),
          lastCollection: binData.lastCollection
        });
      });

      if (eligibleBins.length === 0) {
        return res.json({
          success: true,
          message: 'No bins require collection at this time',
          optimizedSequence: [],
          totalDistance: 0,
          estimatedTime: 0
        });
      }

      // Optimize route
      const optimizedRoute = await RouteOptimizationService.optimizeRoute(
        startLocation,
        eligibleBins,
        vehicle
      );

      // Create route record
      const routeId = Helpers.generateRouteId();
      const routeData = {
        routeId,
        vehicleId,
        binSequence: optimizedRoute.optimizedSequence.map(stop => stop.binId),
        status: 'planned',
        createdAt: new Date(),
        estimatedTime: optimizedRoute.estimatedTime,
        estimatedDistance: optimizedRoute.totalDistance,
        estimatedFuelConsumption: optimizedRoute.estimatedFuelConsumption,
        startLocation,
        timeConstraints,
        progress: 0
      };

      await db.collection('routes').doc(routeId).set(routeData);

      // Assign route to vehicle
      await db.collection('vehicles').doc(vehicleId).update({
        assignedRoute: routeId,
        status: 'assigned',
        lastUpdated: new Date()
      });

      logger.info(`Route optimized for vehicle ${vehicleId}: ${routeId}`);

      res.json({
        success: true,
        routeId,
        optimizedSequence: optimizedRoute.optimizedSequence,
        totalDistance: optimizedRoute.totalDistance,
        estimatedFuelSaved: optimizedRoute.estimatedFuelSaved,
        estimatedTime: optimizedRoute.estimatedTime,
        totalBins: optimizedRoute.optimizedSequence.length
      });

    } catch (error) {
      logger.error('Route optimization error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to optimize route'
      });
    }
  }

  // Get active routes
  static async getActiveRoutes(req, res) {
    try {
      const activeRoutesSnapshot = await db.collection('routes')
        .where('status', 'in', ['active', 'planned', 'in_progress'])
        .get();

      const activeRoutes = [];

      for (const doc of activeRoutesSnapshot.docs) {
        const routeData = doc.data();
        
        // Get current bin being collected
        const completedBins = Math.floor((routeData.progress || 0) * routeData.binSequence.length / 100);
        const currentBinId = completedBins < routeData.binSequence.length ? 
          routeData.binSequence[completedBins] : null;

        // Estimate completion time
        const remainingTime = Math.round(routeData.estimatedTime * (1 - (routeData.progress || 0) / 100));
        const estimatedCompletion = new Date();
        estimatedCompletion.setMinutes(estimatedCompletion.getMinutes() + remainingTime);

        activeRoutes.push({
          routeId: routeData.routeId,
          vehicleId: routeData.vehicleId,
          progress: routeData.progress || 0,
          currentBin: currentBinId,
          estimatedCompletion: estimatedCompletion.toISOString(),
          binsRemaining: routeData.binSequence.length - completedBins,
          totalBins: routeData.binSequence.length,
          status: routeData.status
        });
      }

      res.json({
        activeRoutes
      });

    } catch (error) {
      logger.error('Get active routes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get active routes'
      });
    }
  }

  // Update route progress
  static async updateRouteProgress(req, res) {
    try {
      const { routeId } = req.params;
      const { completedBinId, completionTime, collectedWeight, nextBinId } = req.body;

      const routeDoc = await db.collection('routes').doc(routeId).get();
      if (!routeDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Route not found'
        });
      }

      const routeData = routeDoc.data();
      const binIndex = routeData.binSequence.indexOf(completedBinId);
      
      if (binIndex === -1) {
        return res.status(400).json({
          success: false,
          message: 'Bin not in route sequence'
        });
      }

      // Calculate progress percentage
      const progress = Math.round(((binIndex + 1) / routeData.binSequence.length) * 100);

      // Update route progress
      const updateData = {
        progress,
        lastUpdated: new Date(),
        status: progress === 100 ? 'completed' : 'in_progress'
      };

      await db.collection('routes').doc(routeId).update(updateData);

      // Get next bin details if available
      let nextBinDetails = null;
      if (nextBinId) {
        const nextBinDoc = await db.collection('smartBins').doc(nextBinId).get();
        if (nextBinDoc.exists) {
          const nextBinData = nextBinDoc.data();
          nextBinDetails = {
            binId: nextBinId,
            location: nextBinData.location,
            fillPercentage: nextBinData.fillPercentage,
            estimatedWeight: Math.round(nextBinData.capacity * (nextBinData.fillPercentage / 100))
          };
        }
      }

      // If route completed, update vehicle status
      if (progress === 100) {
        await db.collection('vehicles').doc(routeData.vehicleId).update({
          status: 'idle',
          assignedRoute: null,
          lastUpdated: new Date()
        });
      }

      // Emit real-time update
      if (req.io) {
        req.io.emit('route-progress', {
          routeId,
          progress,
          completedBinId,
          vehicleId: routeData.vehicleId
        });
      }

      logger.info(`Route progress updated: ${routeId} - ${progress}%`);

      res.json({
        success: true,
        routeProgress: progress,
        nextBinDetails,
        routeCompleted: progress === 100
      });

    } catch (error) {
      logger.error('Route progress update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update route progress'
      });
    }
  }

  // Get route analytics
  static async getRouteAnalytics(req, res) {
    try {
      const { period = 'monthly', vehicleId } = req.query;

      let startDate = new Date();
      switch (period) {
        case 'weekly':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'yearly':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      let query = db.collection('routes')
        .where('status', '==', 'completed')
        .where('createdAt', '>=', startDate);

      if (vehicleId) {
        query = query.where('vehicleId', '==', vehicleId);
      }

      const routesSnapshot = await query.get();

      let totalRoutes = 0;
      let totalDistance = 0;
      let totalEstimatedDistance = 0;
      let totalFuelSaved = 0;
      let totalTimeSaved = 0;
      let totalCarbonReduced = 0;

      routesSnapshot.forEach(doc => {
        const routeData = doc.data();
        totalRoutes++;
        totalDistance += routeData.actualDistance || routeData.estimatedDistance;
        totalEstimatedDistance += routeData.estimatedDistance;
        
        // Calculate savings (simplified)
        const distanceSaved = (routeData.estimatedDistance * 1.3) - routeData.actualDistance;
        if (distanceSaved > 0) {
          totalFuelSaved += Helpers.calculateFuelConsumption(distanceSaved, 'truck');
          totalTimeSaved += distanceSaved * 2; // 2 minutes per km saved
          totalCarbonReduced += Helpers.calculateCarbonFootprint(
            Helpers.calculateFuelConsumption(distanceSaved, 'truck')
          );
        }
      });

      const averageEfficiency = totalEstimatedDistance > 0 ? 
        Math.round((totalDistance / totalEstimatedDistance) * 100) : 0;

      res.json({
        totalRoutes,
        averageEfficiency,
        fuelSavings: Math.round(totalFuelSaved * 100) / 100,
        timeSavings: Math.round(totalTimeSaved / 60), // Convert to hours
        carbonReduced: Math.round(totalCarbonReduced),
        totalDistance: Math.round(totalDistance * 10) / 10
      });

    } catch (error) {
      logger.error('Route analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get route analytics'
      });
    }
  }
}

module.exports = RouteController;