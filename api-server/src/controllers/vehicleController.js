const { db, realtimeDb } = require('../config/firebase');
const Helpers = require('../utils/helpers');
const logger = require('../utils/logger');

class VehicleController {
  // Register new vehicle
  static async registerVehicle(req, res) {
    try {
      const { vehicleId, driverName, driverPhone, vehicleType, capacity, fuelType } = req.body;

      // Check if vehicle already exists
      const existingVehicle = await db.collection('vehicles').doc(vehicleId).get();
      if (existingVehicle.exists) {
        return res.status(409).json({
          success: false,
          message: 'Vehicle already registered'
        });
      }

      const vehicleData = {
        vehicleId,
        driverName,
        driverPhone,
        vehicleType,
        capacity,
        fuelType,
        status: 'idle',
        currentLocation: null,
        fuelLevel: 100,
        currentWeight: 0,
        odometer: 0,
        assignedRoute: null,
        createdAt: new Date(),
        lastUpdated: new Date()
      };

      await db.collection('vehicles').doc(vehicleId).set(vehicleData);

      logger.info(`Vehicle registered: ${vehicleId}`);

      res.status(201).json({
        success: true,
        message: 'Vehicle registered successfully',
        vehicleData
      });
    } catch (error) {
      logger.error('Vehicle registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register vehicle'
      });
    }
  }

  // Get vehicle location
  static async getVehicleLocation(req, res) {
    try {
      const { vehicleId } = req.params;

      const vehicleDoc = await db.collection('vehicles').doc(vehicleId).get();
      if (!vehicleDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      const vehicleData = vehicleDoc.data();
      
      res.json({
        vehicleId,
        location: vehicleData.currentLocation,
        speed: vehicleData.speed || 0,
        heading: vehicleData.heading || 0,
        timestamp: vehicleData.lastUpdated,
        status: vehicleData.status
      });
    } catch (error) {
      logger.error('Get vehicle location error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get vehicle location'
      });
    }
  }

  // Update vehicle status
  static async updateVehicleStatus(req, res) {
    try {
      const { vehicleId } = req.params;
      const { location, fuelLevel, currentWeight, status, odometer, speed, heading } = req.body;

      const updateData = {
        lastUpdated: new Date()
      };

      if (location) updateData.currentLocation = location;
      if (fuelLevel !== undefined) updateData.fuelLevel = fuelLevel;
      if (currentWeight !== undefined) updateData.currentWeight = currentWeight;
      if (status) updateData.status = status;
      if (odometer !== undefined) updateData.odometer = odometer;
      if (speed !== undefined) updateData.speed = speed;
      if (heading !== undefined) updateData.heading = heading;

      await db.collection('vehicles').doc(vehicleId).update(updateData);

      // Update real-time database for live tracking
      if (location) {
        await realtimeDb.ref(`vehicles/${vehicleId}/location`).set({
          ...location,
          timestamp: new Date().toISOString()
        });
      }

      // Emit real-time update
      if (req.io) {
        req.io.emit('vehicle-update', {
          vehicleId,
          ...updateData
        });
      }

      res.json({
        success: true,
        updated: true
      });
    } catch (error) {
      logger.error('Vehicle status update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update vehicle status'
      });
    }
  }

  // Get vehicle route
  static async getVehicleRoute(req, res) {
    try {
      const { vehicleId } = req.params;

      const vehicleDoc = await db.collection('vehicles').doc(vehicleId).get();
      if (!vehicleDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      const vehicleData = vehicleDoc.data();
      const assignedRouteId = vehicleData.assignedRoute;

      if (!assignedRouteId) {
        return res.json({
          success: true,
          message: 'No route assigned',
          route: null
        });
      }

      const routeDoc = await db.collection('routes').doc(assignedRouteId).get();
      if (!routeDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Assigned route not found'
        });
      }

      const routeData = routeDoc.data();
      
      res.json({
        routeId: assignedRouteId,
        assignedBins: routeData.binSequence,
        estimatedTime: routeData.estimatedTime,
        estimatedDistance: routeData.estimatedDistance,
        status: routeData.status
      });
    } catch (error) {
      logger.error('Get vehicle route error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get vehicle route'
      });
    }
  }

  // Get vehicle analytics
  static async getVehicleAnalytics(req, res) {
    try {
      const { startDate, endDate, vehicleId } = req.query;

      let query = db.collection('collections');
      
      if (vehicleId) {
        query = query.where('vehicleId', '==', vehicleId);
      }

      if (startDate && endDate) {
        query = query
          .where('collectionTime', '>=', new Date(startDate))
          .where('collectionTime', '<=', new Date(endDate));
      }

      const collectionsSnapshot = await query.get();
      
      let totalDistance = 0;
      let fuelConsumed = 0;
      let wasteCollected = 0;
      let completedRoutes = 0;

      collectionsSnapshot.forEach(doc => {
        const collection = doc.data();
        wasteCollected += collection.collectedWeight || 0;
      });

      // Get route data for distance calculation
      const routesSnapshot = await db.collection('routes')
        .where('vehicleId', '==', vehicleId)
        .where('status', '==', 'completed')
        .get();

      routesSnapshot.forEach(doc => {
        const route = doc.data();
        totalDistance += route.actualDistance || 0;
        completedRoutes++;
      });

      // Calculate fuel consumption based on distance
      const vehicleDoc = await db.collection('vehicles').doc(vehicleId).get();
      if (vehicleDoc.exists) {
        const vehicleData = vehicleDoc.data();
        fuelConsumed = Helpers.calculateFuelConsumption(totalDistance, vehicleData.vehicleType);
      }

      const efficiency = Helpers.calculateEfficiency(wasteCollected, completedRoutes * 500);

      res.json({
        totalDistance,
        fuelConsumed: Math.round(fuelConsumed * 100) / 100,
        wasteCollected,
        efficiency,
        completedRoutes
      });
    } catch (error) {
      logger.error('Vehicle analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get vehicle analytics'
      });
    }
  }

  // Add vehicle maintenance record
  static async addMaintenance(req, res) {
    try {
      const { vehicleId } = req.params;
      const { maintenanceType, description, cost, nextSchedule } = req.body;

      const maintenanceId = Helpers.generateId('MT');
      const maintenanceData = {
        maintenanceId,
        vehicleId,
        maintenanceType,
        description,
        cost,
        nextSchedule: new Date(nextSchedule),
        createdAt: new Date(),
        status: 'completed'
      };

      await db.collection('maintenance').doc(maintenanceId).set(maintenanceData);

      res.json({
        success: true,
        maintenanceId
      });
    } catch (error) {
      logger.error('Add maintenance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add maintenance record'
      });
    }
  }

  // Get all vehicles overview
  static async getVehiclesOverview(req, res) {
    try {
      const vehiclesSnapshot = await db.collection('vehicles').get();
      
      let totalVehicles = 0;
      let activeVehicles = 0;
      let idleVehicles = 0;
      let maintenanceVehicles = 0;
      const vehicles = [];

      vehiclesSnapshot.forEach(doc => {
        const vehicleData = doc.data();
        totalVehicles++;
        
        switch (vehicleData.status) {
          case 'collecting':
          case 'returning':
            activeVehicles++;
            break;
          case 'idle':
            idleVehicles++;
            break;
          case 'maintenance':
            maintenanceVehicles++;
            break;
        }

        vehicles.push({
          vehicleId: vehicleData.vehicleId,
          status: vehicleData.status,
          location: vehicleData.currentLocation,
          driverName: vehicleData.driverName
        });
      });

      res.json({
        totalVehicles,
        activeVehicles,
        idleVehicles,
        maintenanceVehicles,
        vehicles
      });
    } catch (error) {
      logger.error('Vehicles overview error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get vehicles overview'
      });
    }
  }
}

module.exports = VehicleController;